"""
One-off pass tests.

The threat this feature has to survive: the QR is sent over WhatsApp, so it is
a forwardable image. Screenshot it, forward it, leave the phone unlocked — and
without the photo, whoever holds that picture collects a child.
"""

import uuid
from datetime import date, time

import pytest

from app.models import (
    AuditLog,
    Guardianship,
    PickupAuthorization,
    PickupRequest,
    PickupStatus,
    Role,
    SchoolClass,
    Student,
)
from app.services.qr_tokens import generate_keypair


def token(client, user):
    r = client.post(
        "/v1/auth/login", json={"phone": user.phone, "password": "testpass123"}
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def signed_school(db, school):
    private, public = generate_keypair()
    school.private_key_enc = private
    school.public_key = public
    db.flush()
    return school


@pytest.fixture
def family(db, signed_school, make_user):
    klass = SchoolClass(id=uuid.uuid4(), school_id=signed_school.id, name="Nursery")
    db.add(klass)
    db.flush()

    parent = make_user(Role.parent)
    guard = make_user(Role.guard)
    child = Student(
        id=uuid.uuid4(), school_id=signed_school.id, class_id=klass.id, name="Ali Raza"
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
    return {"parent": parent, "guard": guard, "child": child, "request": req}


class TestIssuing:
    def test_a_parent_can_issue_a_pass(self, client, family):
        r = client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={"name": "Kamran Ali", "phone": "+923339998877", "photo_url": "/p/k.jpg"},
        )
        assert r.status_code == 201, r.text
        assert r.json()["token"]
        assert r.json()["warning"] is None

    def test_a_pass_without_a_photo_warns_and_is_flagged(self, client, db, family):
        """
        Allowed, but never silently. A code with no photo means the guard has
        nothing to check the bearer against.
        """
        r = client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={"name": "Kamran Ali", "phone": "+923339998877"},
        )
        assert r.status_code == 201
        assert "anyone who receives this code" in r.json()["warning"].lower()

        log = (
            db.query(AuditLog).filter(AuditLog.action == "pass.issued").first()
        )
        assert log is not None and log.flagged is True

    def test_a_stranger_cannot_issue_a_pass_for_someone_elses_child(
        self, client, family, make_user
    ):
        stranger = make_user(Role.parent)
        r = client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, stranger),
            json={"name": "Someone", "phone": "+923330000001", "photo_url": "/p/x.jpg"},
        )
        assert r.status_code == 403

    def test_the_bearer_cannot_log_in(self, client, db, family):
        """
        The pass is the credential, not a password. A login-less account means
        a leaked pass cannot become a persistent foothold.
        """
        from app.models import User

        client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={"name": "Kamran Ali", "phone": "+923339998877", "photo_url": "/p/k.jpg"},
        )
        bearer = db.query(User).filter(User.phone == "+923339998877").one()
        assert bearer.is_active is False

    def test_a_pass_expires_the_same_day(self, client, db, family):
        issued = client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={"name": "Kamran Ali", "phone": "+923339998877", "photo_url": "/p/k.jpg"},
        ).json()
        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        # Never persists silently into tomorrow.
        assert auth.valid_until == date.today()


class TestVerifying:
    def issue(self, client, family, photo="/p/k.jpg"):
        return self.issue_full(client, family, photo)["token"]

    def issue_full(self, client, family, photo="/p/k.jpg"):
        return client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={"name": "Kamran Ali", "phone": "+923339998877", "photo_url": photo},
        ).json()

    def test_a_valid_pass_shows_both_photos_and_fires_the_speaker(self, client, family):
        tok = self.issue(client, family)
        r = client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": tok},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["valid"] is True
        assert body["bearer"]["name"] == "Kamran Ali"
        assert body["student"]["name"] == "Ali Raza"
        # Automate the announcement; never automate the release.
        assert body["announce"] is True
        assert body["photo_warning"] is None

    def test_a_photoless_pass_tells_the_guard_what_to_do_instead(self, client, family):
        # Degraded, not blind.
        tok = self.issue(client, family, photo=None)
        body = client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": tok},
        ).json()
        assert body["valid"] is True
        assert "verify the name and phone" in body["photo_warning"].lower()

    def test_garbage_is_refused(self, client, family):
        body = client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": "not-a-token"},
        ).json()
        assert body["valid"] is False
        assert body["code"] == "malformed"

    def test_a_pass_signed_by_another_school_is_refused(self, client, family):
        import jwt

        other_private, _ = generate_keypair()
        forged = jwt.encode(
            {
                "typ": "pass",
                "pid": str(uuid.uuid4()),
                "sid": [str(family["child"].id)],
                "gid": str(uuid.uuid4()),
                "sch": str(family["child"].school_id),
                "exp": 9999999999,
                "jti": "x",
            },
            other_private,
            algorithm="ES256",
        )
        body = client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": forged},
        ).json()
        assert body["valid"] is False

    def test_a_forwarded_pass_is_useless_once_the_child_is_collected(
        self, client, db, family
    ):
        """
        The forwarded-screenshot case. The first scan collects the child; the
        second gets nothing, whoever is holding it.
        """
        tok = self.issue(client, family)
        h = token(client, family["guard"])

        first = client.post("/v1/passes/verify", headers=h, json={"token": tok}).json()
        assert first["valid"] is True

        client.post(
            "/v1/handovers",
            headers=h,
            json={
                "pickup_request_id": str(family["request"].id),
                "method": "qr",
                "device_id": "GATE-01",
            },
        )

        second = client.post("/v1/passes/verify", headers=h, json={"token": tok}).json()
        assert second["valid"] is False
        assert second["code"] == "already_used"

    def test_a_revoked_pass_is_refused(self, client, db, family):
        from app.db import utcnow

        issued = self.issue_full(client, family)
        tok = issued["token"]
        # By id, not by kind — the seeded dataset also has a one_time pass.
        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        auth.revoked_at = utcnow()
        db.flush()

        body = client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": tok},
        ).json()
        assert body["valid"] is False
        assert body["code"] == "revoked"
