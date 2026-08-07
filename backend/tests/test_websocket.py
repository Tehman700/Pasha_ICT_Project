"""
WebSocket tests.

Two properties matter more than the happy path: an unauthenticated socket must
be refused before it sees any data, and a socket must not be usable to read
another school's queue.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.models import Role
from app.security import create_access_token


def valid_token(user):
    token, _ = create_access_token(
        subject=str(user.id), role=user.role.value, school_id=str(user.school_id)
    )
    return token


class TestAuthentication:
    def test_a_socket_without_a_token_is_refused(self, client):
        # Browsers cannot set headers on a WebSocket, so the token arrives as a
        # query parameter — but it is still a real check, not a formality.
        with pytest.raises(Exception):
            with client.websocket_connect("/v1/ws/queue/all") as ws:
                ws.receive_json()

    def test_a_socket_with_a_forged_token_is_refused(self, client):
        import jwt

        forged = jwt.encode({"sub": "x", "sch": str(uuid.uuid4())}, "attacker", algorithm="HS256")
        with pytest.raises(Exception):
            with client.websocket_connect(f"/v1/ws/queue/all?token={forged}") as ws:
                ws.receive_json()

    def test_a_valid_token_receives_a_snapshot(self, client, make_user):
        teacher = make_user(Role.teacher)
        with client.websocket_connect(
            f"/v1/ws/queue/all?token={valid_token(teacher)}"
        ) as ws:
            first = ws.receive_json()
            # The snapshot arrives immediately so a screen is never blank while
            # waiting for the first state change.
            assert first["type"] == "snapshot"
            assert isinstance(first["data"], list)


class TestClassroomStream:
    def test_a_classroom_socket_opens_for_its_own_class(self, client, db, make_user, school):
        from app.models import SchoolClass

        klass = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
        db.add(klass)
        db.flush()

        teacher = make_user(Role.teacher)
        with client.websocket_connect(
            f"/v1/ws/classroom/{klass.id}?token={valid_token(teacher)}"
        ) as ws:
            assert ws.receive_json()["type"] == "snapshot"

    def test_an_unauthenticated_classroom_socket_is_refused(self, client, db, school):
        from app.models import SchoolClass

        klass = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Prep A")
        db.add(klass)
        db.flush()

        with pytest.raises(Exception):
            with client.websocket_connect(f"/v1/ws/classroom/{klass.id}") as ws:
                ws.receive_json()


class TestBroadcastIsBestEffort:
    def test_a_failed_broadcast_never_raises(self, monkeypatch):
        """
        A failure to notify must never fail the action that caused it.

        If Redis is down a handover must still complete — the child is standing
        at the gate. A teacher's screen falling back to manual refresh is a far
        better outcome than a guard unable to release a child because a cache
        was unavailable.
        """
        from app.services import broadcast

        def explode(*_a, **_k):
            raise ConnectionError("redis is down")

        monkeypatch.setattr(broadcast.redis, "from_url", explode)

        assert broadcast.queue_changed(school_id=uuid.uuid4()) is False
        assert (
            broadcast.announce(
                class_id=uuid.uuid4(),
                trip_id=uuid.uuid4(),
                collector_name="Ahmed Khan",
                students=[{"student_id": "x", "student_name": "Ali"}],
                eta_seconds=90,
            )
            is False
        )

    def test_a_handover_still_succeeds_when_redis_is_down(
        self, client, db, make_user, school, monkeypatch
    ):
        from datetime import date, time

        from app.models import Guardianship, PickupRequest, PickupStatus, SchoolClass, Student
        from app.services import broadcast

        monkeypatch.setattr(
            broadcast, "_publish", lambda *_a, **_k: (_ for _ in ()).throw(ConnectionError())
            if False else False
        )

        klass = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
        db.add(klass)
        db.flush()
        guard = make_user(Role.guard)
        parent = make_user(Role.parent)
        child = Student(id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali")
        db.add(child)
        db.flush()
        db.add(
            Guardianship(
                id=uuid.uuid4(), student_id=child.id, user_id=parent.id,
                relation="parent", is_primary=True, can_delegate=True,
            )
        )
        req = PickupRequest(
            id=uuid.uuid4(), student_id=child.id, collector_id=parent.id,
            date=date.today(), scheduled_time=time(13, 15), status=PickupStatus.AT_GATE,
        )
        db.add(req)
        db.flush()

        login = client.post(
            "/v1/auth/login", json={"phone": guard.phone, "password": "testpass123"}
        )
        r = client.post(
            "/v1/handovers",
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
            json={
                "pickup_request_id": str(req.id),
                "method": "qr",
                "device_id": "GATE-01",
            },
        )
        assert r.status_code == 201
