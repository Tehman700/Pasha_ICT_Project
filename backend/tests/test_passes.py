"""
One-off pass tests.

The threat this feature has to survive: the QR is sent over WhatsApp, so it is
a forwardable image. Screenshot it, forward it, leave the phone unlocked — and
without the photo, whoever holds that picture collects a child.
"""

import uuid
from datetime import date, time, timedelta

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
    # A sibling, because one relative fetching two children is one errand and
    # the pass has to model it as one.
    sibling = Student(
        id=uuid.uuid4(), school_id=signed_school.id, class_id=klass.id, name="Zara Raza"
    )
    db.add_all([child, sibling])
    db.flush()
    for s in (child, sibling):
        db.add(
            Guardianship(
                id=uuid.uuid4(),
                student_id=s.id,
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
    sibling_req = PickupRequest(
        id=uuid.uuid4(),
        student_id=sibling.id,
        collector_id=parent.id,
        date=date.today(),
        scheduled_time=time(13, 15),
        status=PickupStatus.AT_GATE,
    )
    db.add_all([req, sibling_req])
    db.flush()
    return {
        "parent": parent,
        "guard": guard,
        "child": child,
        "sibling": sibling,
        "request": req,
        "sibling_request": sibling_req,
    }


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


class TestManualExpiry:
    """
    The parent knows the collection window and the system does not: "my brother
    is coming between 1 and 3." Letting her say so shrinks the window in which a
    forwarded screenshot is worth anything.
    """

    def issue(self, client, family, **extra):
        return client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={
                "name": "Kamran Ali",
                "phone": "+923339998877",
                "photo_url": "/p/k.jpg",
                **extra,
            },
        )

    def test_a_parent_can_set_an_exact_expiry(self, client, db, family):
        from datetime import datetime, timedelta, timezone

        soon = datetime.now(timezone(timedelta(hours=5))) + timedelta(hours=2)
        issued = self.issue(client, family, expires_at=soon.isoformat()).json()

        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        assert auth.expires_at is not None
        # Stored to the second — a date column could not hold this.
        assert abs((auth.expires_at - soon).total_seconds()) < 2
        assert issued["expiry_capped"] is False

    def test_no_expiry_given_falls_back_to_midnight(self, client, db, family):
        issued = self.issue(client, family).json()
        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        assert auth.expires_at is not None
        # Tonight, not tomorrow night.
        assert auth.expires_at.date() <= date.today() + timedelta(days=1)

    def test_an_expiry_past_midnight_is_capped_and_the_parent_is_told(
        self, client, db, family
    ):
        """
        A parent who fat-fingers next week gets a pass that works today, not a
        validation error to decode at the school gate — but she is told.
        """
        from datetime import datetime, timedelta, timezone

        far = datetime.now(timezone(timedelta(hours=5))) + timedelta(days=7)
        issued = self.issue(client, family, expires_at=far.isoformat()).json()

        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        assert auth.expires_at.date() <= date.today() + timedelta(days=1)
        assert issued["expiry_capped"] is True

    def test_an_already_past_expiry_does_not_produce_a_dead_pass(
        self, client, db, family
    ):
        from datetime import datetime, timedelta, timezone

        past = datetime.now(timezone(timedelta(hours=5))) - timedelta(hours=3)
        issued = self.issue(client, family, expires_at=past.isoformat()).json()

        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        # Born expired would be a support call, not a security win.
        assert auth.expires_at > datetime.now(timezone.utc)

    def test_an_expired_pass_is_refused_at_the_gate(self, client, db, family):
        """
        Enforced against the database, not only the signature. A parent who
        shortens a live pass cannot recall the token from WhatsApp.
        """
        from app.db import utcnow
        from datetime import timedelta as td

        issued = self.issue(client, family).json()
        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        auth.expires_at = utcnow() - td(minutes=1)
        db.flush()

        body = client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": issued["token"]},
        ).json()
        assert body["valid"] is False
        assert body["code"] == "expired"


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

    def test_a_forwarded_pass_is_dead_after_the_first_scan(self, client, db, family):
        """
        The forwarded-screenshot case, and the reason the burn is keyed to the
        pass. The first scan spends the code; the second gets nothing, whoever
        is holding it — and no handover is needed in between, because the scan
        itself is the moment we know the code was presented.
        """
        tok = self.issue(client, family)
        h = token(client, family["guard"])

        first = client.post("/v1/passes/verify", headers=h, json={"token": tok}).json()
        assert first["valid"] is True

        second = client.post("/v1/passes/verify", headers=h, json={"token": tok}).json()
        assert second["valid"] is False
        assert second["code"] == "already_used"

    def test_the_scan_records_the_burn(self, client, db, family):
        issued = self.issue_full(client, family)
        client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": issued["token"]},
        )
        db.expire_all()
        auth = db.get(PickupAuthorization, uuid.UUID(issued["pass_id"]))
        assert auth.used_at is not None

    def test_a_burned_pass_still_permits_the_handover_it_authorized(
        self, client, db, family
    ):
        """
        The ordering that makes the burn safe. The guard scans (burning the
        code), then records the handover seconds later. If the burn also killed
        `may_collect`, the scan would refuse the very collection it authorized.
        """
        tok = self.issue(client, family)
        h = token(client, family["guard"])

        assert client.post(
            "/v1/passes/verify", headers=h, json={"token": tok}
        ).json()["valid"] is True

        r = client.post(
            "/v1/handovers",
            headers=h,
            json={
                "pickup_request_id": str(family["request"].id),
                "method": "qr",
                "device_id": "GATE-01",
            },
        )
        assert r.status_code == 201, r.text

    def test_two_passes_for_one_child_are_independent(self, client, db, family):
        """
        The case the child-keyed burn got wrong. A parent hedging between two
        relatives issues two codes; scanning one must not strand the other at
        the gate holding a code that was never presented.
        """
        first = self.issue(client, family)
        second = self.issue(client, family)
        h = token(client, family["guard"])

        assert client.post(
            "/v1/passes/verify", headers=h, json={"token": first}
        ).json()["valid"] is True

        # The second pass has not been scanned, so it is still live.
        body = client.post("/v1/passes/verify", headers=h, json={"token": second}).json()
        assert body["valid"] is True

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


class TestSeveralChildrenOnOnePass:
    """
    One relative fetching three siblings is one errand. Three codes for it
    would mean three scans, three chances to show the wrong one, and three rows
    to revoke when plans change.
    """

    def issue_both(self, client, family, **extra):
        return client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={
                "name": "Kamran Ali",
                "phone": "+923339998877",
                "photo_url": "/p/k.jpg",
                "also_student_ids": [str(family["sibling"].id)],
                **extra,
            },
        )

    def test_one_pass_covers_several_children(self, client, db, family):
        r = self.issue_both(client, family)
        assert r.status_code == 201, r.text
        names = {s["name"] for s in r.json()["students"]}
        assert names == {"Ali Raza", "Zara Raza"}

    def test_each_child_gets_its_own_authorization(self, client, db, family):
        """
        Ordinary `one_time` rows, so `may_collect` and the handover route need
        no knowledge that a pass exists.
        """
        from app.models import User as U

        self.issue_both(client, family)
        bearer = db.query(U).filter(U.phone == "+923339998877").one()
        rows = (
            db.query(PickupAuthorization)
            .filter(PickupAuthorization.collector_user_id == bearer.id)
            .all()
        )
        assert {r.student_id for r in rows} == {
            family["child"].id,
            family["sibling"].id,
        }

    def test_the_guard_sees_every_child_on_one_screen(self, client, family):
        tok = self.issue_both(client, family).json()["token"]
        body = client.post(
            "/v1/passes/verify",
            headers=token(client, family["guard"]),
            json={"token": tok},
        ).json()
        assert body["valid"] is True
        assert len(body["students"]) == 2
        # Each carries its own request id, so the guard app can record a
        # handover per child rather than one for the group.
        assert all(c["pickup_request_id"] for c in body["students"])

    def test_one_scan_burns_the_whole_pass(self, client, db, family):
        """
        Not just the first child's row. Leaving the siblings live would let a
        forwarded copy still collect them after the code was redeemed.
        """
        tok = self.issue_both(client, family).json()["token"]
        h = token(client, family["guard"])

        assert client.post("/v1/passes/verify", headers=h, json={"token": tok}).json()[
            "valid"
        ] is True

        db.expire_all()
        from app.models import User as U

        bearer = db.query(U).filter(U.phone == "+923339998877").one()
        rows = (
            db.query(PickupAuthorization)
            .filter(PickupAuthorization.collector_user_id == bearer.id)
            .all()
        )
        assert all(r.used_at is not None for r in rows)

    def test_a_parent_cannot_attach_someone_elses_child(
        self, client, db, family, make_user, signed_school
    ):
        """
        The whole request fails. Silently dropping the child she is not
        entitled to would hand her a pass she believes covers two.
        """
        from app.models import SchoolClass as SC

        other_class = db.query(SC).first()
        outsider = Student(
            id=uuid.uuid4(),
            school_id=signed_school.id,
            class_id=other_class.id,
            name="Someone Else",
        )
        db.add(outsider)
        db.flush()

        r = client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={
                "name": "Kamran Ali",
                "phone": "+923339998877",
                "photo_url": "/p/k.jpg",
                "also_student_ids": [str(outsider.id)],
            },
        )
        assert r.status_code == 403

    def test_naming_the_same_child_twice_makes_one_authorization(
        self, client, db, family
    ):
        """A client repeating the path child in the list is a natural mistake."""
        from app.models import User as U

        client.post(
            f"/v1/students/{family['child'].id}/temporary-pass",
            headers=token(client, family["parent"]),
            json={
                "name": "Kamran Ali",
                "phone": "+923339998877",
                "photo_url": "/p/k.jpg",
                "also_student_ids": [str(family["child"].id)],
            },
        )
        bearer = db.query(U).filter(U.phone == "+923339998877").one()
        rows = (
            db.query(PickupAuthorization)
            .filter(PickupAuthorization.collector_user_id == bearer.id)
            .all()
        )
        assert len(rows) == 1
