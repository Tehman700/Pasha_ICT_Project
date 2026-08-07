"""
Handover tests.

The moment a child is released. Every case here is one a real gate produces,
and the rule under all of them is the same: authorization is enforced for
manual handovers exactly as it is for scanned ones.
"""

import uuid
from datetime import date, time

import pytest

from app.models import (
    AuditLog,
    Guardianship,
    Handover,
    PickupAuthorization,
    PickupRequest,
    PickupStatus,
    Role,
    SchoolClass,
    Student,
    Trip,
)
from app.db import utcnow


@pytest.fixture
def gate(db, school, make_user):
    """A class, a guard, a parent, a child, and today's pickup request."""
    klass = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
    db.add(klass)
    db.flush()

    guard = make_user(Role.guard)
    parent = make_user(Role.parent)
    child = Student(
        id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali Raza"
    )
    db.add(child)
    db.flush()
    db.add(
        Guardianship(
            id=uuid.uuid4(),
            student_id=child.id,
            user_id=parent.id,
            relation="parent",
            is_primary=True,
            can_delegate=True,
        )
    )
    req = PickupRequest(
        id=uuid.uuid4(),
        student_id=child.id,
        collector_id=parent.id,
        date=date.today(),
        scheduled_time=time(13, 15),
        status=PickupStatus.AT_GATE,
    )
    db.add(req)
    db.flush()
    return {
        "klass": klass,
        "guard": guard,
        "parent": parent,
        "child": child,
        "request": req,
        "school": school,
    }


def guard_headers(client, gate):
    r = client.post(
        "/v1/auth/login",
        json={"phone": gate["guard"].phone, "password": "testpass123"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestQrHandover:
    def test_a_guardian_can_collect(self, client, db, gate):
        r = client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "qr",
                "device_id": "GUARD-TAB-01",
            },
        )
        assert r.status_code == 201, r.text
        db.refresh(gate["request"])
        assert gate["request"].status == PickupStatus.HANDED_OVER

    def test_the_same_child_cannot_be_handed_over_twice(self, client, gate):
        h = guard_headers(client, gate)
        body = {
            "pickup_request_id": str(gate["request"].id),
            "method": "qr",
            "device_id": "GUARD-TAB-01",
        }
        assert client.post("/v1/handovers", headers=h, json=body).status_code == 201
        # A child recorded as released to two different people is the worst
        # failure this system can produce.
        assert client.post("/v1/handovers", headers=h, json=body).status_code == 409


class TestAuthorizationIsEnforced:
    def test_an_unauthorized_collector_is_refused(self, client, db, gate, make_user):
        stranger = make_user(Role.parent)
        gate["request"].collector_id = stranger.id
        db.flush()

        r = client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "qr",
                "device_id": "GUARD-TAB-01",
            },
        )
        assert r.status_code == 403
        assert "not authorized" in r.json()["detail"].lower()

    def test_manual_is_refused_for_an_unauthorized_collector_too(
        self, client, db, gate, make_user
    ):
        # The rule that matters most: manual means the QR could not be
        # scanned, NOT that the check is waived.
        stranger = make_user(Role.parent)
        gate["request"].collector_id = stranger.id
        db.flush()

        r = client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "manual",
                "fallback_reason": "phone_dead",
                "device_id": "GUARD-TAB-01",
            },
        )
        assert r.status_code == 403

    def test_a_refusal_is_logged_and_flagged(self, client, db, gate, make_user):
        stranger = make_user(Role.parent)
        gate["request"].collector_id = stranger.id
        db.flush()

        client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "qr",
                "device_id": "GUARD-TAB-01",
            },
        )
        logs = db.query(AuditLog).filter(AuditLog.action == "handover.refused").all()
        assert logs, "an attempted unauthorized collection must leave a record"
        assert logs[0].flagged is True

    def test_a_revoked_driver_is_refused(self, client, db, gate, make_user):
        driver = make_user(Role.driver)
        db.add(
            PickupAuthorization(
                id=uuid.uuid4(),
                student_id=gate["child"].id,
                collector_user_id=driver.id,
                granted_by_user_id=gate["parent"].id,
                valid_from=date.today(),
                revoked_at=utcnow(),
            )
        )
        gate["request"].collector_id = driver.id
        db.flush()

        r = client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "qr",
                "device_id": "GUARD-TAB-01",
            },
        )
        assert r.status_code == 403


class TestManualFallback:
    def test_manual_requires_a_reason(self, client, gate):
        r = client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "manual",
                "device_id": "GUARD-TAB-01",
            },
        )
        assert r.status_code == 422

    def test_manual_with_a_reason_succeeds_and_is_flagged(self, client, db, gate):
        r = client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "manual",
                "fallback_reason": "no_app",
                "device_id": "GUARD-TAB-01",
            },
        )
        assert r.status_code == 201

        logs = db.query(AuditLog).filter(AuditLog.action == "handover.manual").all()
        assert logs and logs[0].flagged is True
        assert logs[0].payload.get("reason") == "no_app"

    def test_a_qr_handover_is_not_flagged(self, client, db, gate):
        client.post(
            "/v1/handovers",
            headers=guard_headers(client, gate),
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "qr",
                "device_id": "GUARD-TAB-01",
            },
        )
        logs = db.query(AuditLog).filter(AuditLog.action == "handover.qr").all()
        assert logs and logs[0].flagged is False


class TestTripCompletion:
    def test_a_trip_completes_only_when_every_child_is_gone(
        self, client, db, gate, make_user
    ):
        """A van of many children is one journey, not many."""
        trip = Trip(
            id=uuid.uuid4(),
            collector_user_id=gate["parent"].id,
            date=date.today(),
            started_at=utcnow(),
        )
        db.add(trip)
        db.flush()

        sibling = Student(
            id=uuid.uuid4(),
            school_id=gate["school"].id,
            class_id=gate["klass"].id,
            name="Zara Raza",
        )
        db.add(sibling)
        db.flush()
        db.add(
            Guardianship(
                id=uuid.uuid4(),
                student_id=sibling.id,
                user_id=gate["parent"].id,
                relation="parent",
                is_primary=True,
                can_delegate=True,
            )
        )
        req2 = PickupRequest(
            id=uuid.uuid4(),
            student_id=sibling.id,
            collector_id=gate["parent"].id,
            trip_id=trip.id,
            date=date.today(),
            scheduled_time=time(13, 15),
            status=PickupStatus.AT_GATE,
        )
        gate["request"].trip_id = trip.id
        db.add(req2)
        db.flush()

        h = guard_headers(client, gate)

        client.post(
            "/v1/handovers",
            headers=h,
            json={
                "pickup_request_id": str(gate["request"].id),
                "method": "qr",
                "device_id": "G1",
            },
        )
        db.refresh(trip)
        assert trip.arrived_at is None, "one child gone is not the whole trip"

        client.post(
            "/v1/handovers",
            headers=h,
            json={"pickup_request_id": str(req2.id), "method": "qr", "device_id": "G1"},
        )
        db.refresh(trip)
        assert trip.arrived_at is not None, "now every child is gone"


class TestOfflineSync:
    def test_a_replayed_batch_does_not_double_record(self, client, gate):
        h = guard_headers(client, gate)
        batch = [
            {
                "pickup_request_id": str(gate["request"].id),
                "method": "qr",
                "device_id": "G1",
            }
        ]
        first = client.post("/v1/handovers/sync", headers=h, json=batch)
        assert first.status_code == 200 and first.json()[0]["accepted"] is True

        # The gate never blocks on the network, so a batch may well be uploaded
        # twice. The second must be rejected per-item, not crash the request.
        second = client.post("/v1/handovers/sync", headers=h, json=batch)
        assert second.status_code == 200
        assert second.json()[0]["accepted"] is False

    def test_one_bad_item_does_not_block_the_rest(self, client, db, gate, make_user):
        other = Student(
            id=uuid.uuid4(),
            school_id=gate["school"].id,
            class_id=gate["klass"].id,
            name="Hamza Butt",
        )
        db.add(other)
        db.flush()
        db.add(
            Guardianship(
                id=uuid.uuid4(),
                student_id=other.id,
                user_id=gate["parent"].id,
                relation="parent",
                is_primary=True,
                can_delegate=True,
            )
        )
        req2 = PickupRequest(
            id=uuid.uuid4(),
            student_id=other.id,
            collector_id=gate["parent"].id,
            date=date.today(),
            scheduled_time=time(13, 15),
            status=PickupStatus.AT_GATE,
        )
        db.add(req2)
        db.flush()

        h = guard_headers(client, gate)
        r = client.post(
            "/v1/handovers/sync",
            headers=h,
            json=[
                {"pickup_request_id": str(uuid.uuid4()), "method": "qr", "device_id": "G1"},
                {"pickup_request_id": str(req2.id), "method": "qr", "device_id": "G1"},
            ],
        )
        results = r.json()
        assert results[0]["accepted"] is False
        # One already-synced child must not block the other eleven from a van.
        assert results[1]["accepted"] is True


class TestStaging:
    def test_a_teacher_can_mark_a_child_at_the_gate(self, client, db, gate, make_user):
        teacher = make_user(Role.teacher)
        login = client.post(
            "/v1/auth/login", json={"phone": teacher.phone, "password": "testpass123"}
        )
        h = {"Authorization": f"Bearer {login.json()['access_token']}"}

        gate["request"].status = PickupStatus.NEARBY
        db.flush()

        r = client.post(
            f"/v1/pickup-requests/{gate['request'].id}/stage", headers=h
        )
        assert r.status_code == 200
        assert r.json()["status"] == "AT_GATE"

    def test_cannot_stage_a_child_already_handed_over(self, client, db, gate, make_user):
        teacher = make_user(Role.teacher)
        login = client.post(
            "/v1/auth/login", json={"phone": teacher.phone, "password": "testpass123"}
        )
        h = {"Authorization": f"Bearer {login.json()['access_token']}"}

        gate["request"].status = PickupStatus.HANDED_OVER
        db.flush()

        assert (
            client.post(
                f"/v1/pickup-requests/{gate['request'].id}/stage", headers=h
            ).status_code
            == 409
        )
