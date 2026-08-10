"""
Admin create flows.

The dashboard rendered forms for all of these before any endpoint existed, so
Save silently discarded whatever was typed. Beyond "it works now", the property
worth holding is **scoping**: a school id is never read from a request body, so
no admin can reach into another school by crafting one.
"""

import uuid

from app.models import Guardianship, Role, SchoolClass, Student


def token(client, phone, password="testpass123"):
    r = client.post("/v1/auth/login", json={"phone": phone, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def admin_headers(client, make_user):
    admin = make_user(Role.admin, password="adminpass123", phone="03001110001")
    return admin, token(client, "03001110001", "adminpass123")


class TestCreateClass:
    def test_an_admin_can_create_a_class(self, client, db, make_user):
        admin, h = admin_headers(client, make_user)
        r = client.post("/v1/classes", json={"name": "Prep A"}, headers=h)
        assert r.status_code == 201, r.text

        c = db.get(SchoolClass, uuid.UUID(r.json()["id"]))
        # School comes from the token, never the body.
        assert c.school_id == admin.school_id

    def test_a_non_teacher_cannot_be_made_the_class_teacher(
        self, client, make_user
    ):
        _, h = admin_headers(client, make_user)
        guard = make_user(Role.guard)
        r = client.post(
            "/v1/classes",
            json={"name": "Prep A", "teacher_id": str(guard.id)},
            headers=h,
        )
        assert r.status_code == 422

    def test_a_teacher_cannot_create_a_class(self, client, make_user):
        make_user(Role.teacher, password="tpass12345", phone="03001110002")
        h = token(client, "03001110002", "tpass12345")
        r = client.post("/v1/classes", json={"name": "Prep A"}, headers=h)
        assert r.status_code == 403


class TestCreateStudent:
    def test_an_admin_can_enrol_a_student(self, client, db, make_user):
        admin, h = admin_headers(client, make_user)
        klass = client.post("/v1/classes", json={"name": "Nursery"}, headers=h).json()

        r = client.post(
            "/v1/students",
            json={"name": "Zoya Ahmed", "class_id": klass["id"], "guardian_cnic": "35201-1234567-1"},
            headers=h,
        )
        assert r.status_code == 201, r.text
        s = db.get(Student, uuid.UUID(r.json()["id"]))
        assert s.school_id == admin.school_id
        # Stored digits-only, the same shape registration matches on — a CNIC
        # kept with dashes would silently never match a self-registering parent.
        assert s.guardian_cnic == "3520112345671"

    def test_a_class_from_another_school_is_refused(self, client, db, make_user):
        """
        The class id is the only school-derived value a caller supplies here,
        so it is the one thing that could reach across schools.
        """
        _, h = admin_headers(client, make_user)
        from app.models import School

        other = School(
            id=uuid.uuid4(), name="Other School", lat=0, lng=0,
            geofence_radius_m=1000, dismissal_time=__import__("datetime").time(13, 0),
        )
        db.add(other)
        db.flush()
        foreign = SchoolClass(id=uuid.uuid4(), school_id=other.id, name="Theirs")
        db.add(foreign)
        db.flush()

        r = client.post(
            "/v1/students",
            json={"name": "Someone", "class_id": str(foreign.id)},
            headers=h,
        )
        assert r.status_code == 404


class TestLinkGuardian:
    def test_an_admin_can_link_a_guardian(self, client, db, make_user):
        _, h = admin_headers(client, make_user)
        klass = client.post("/v1/classes", json={"name": "Nursery"}, headers=h).json()
        student = client.post(
            "/v1/students", json={"name": "Zoya", "class_id": klass["id"]}, headers=h
        ).json()
        parent = make_user(Role.parent)

        r = client.post(
            f"/v1/students/{student['id']}/guardians",
            json={"user_id": str(parent.id)},
            headers=h,
        )
        assert r.status_code == 201, r.text
        assert (
            db.query(Guardianship)
            .filter(Guardianship.student_id == uuid.UUID(student["id"]))
            .count()
            == 1
        )

    def test_linking_the_same_guardian_twice_is_refused(self, client, make_user):
        """A duplicate would double every child in that parent's app."""
        _, h = admin_headers(client, make_user)
        klass = client.post("/v1/classes", json={"name": "Nursery"}, headers=h).json()
        student = client.post(
            "/v1/students", json={"name": "Zoya", "class_id": klass["id"]}, headers=h
        ).json()
        parent = make_user(Role.parent)

        body = {"user_id": str(parent.id)}
        assert client.post(f"/v1/students/{student['id']}/guardians", json=body, headers=h).status_code == 201
        assert client.post(f"/v1/students/{student['id']}/guardians", json=body, headers=h).status_code == 409


class TestCreateUser:
    def test_a_phone_is_stored_canonically(self, client, db, make_user):
        """
        The uniqueness check normalised but the insert wrote the raw value, so
        a number checked in one form was stored in another — which is exactly
        how a duplicate slips past a UNIQUE column.
        """
        from app.models import User

        _, h = admin_headers(client, make_user)
        r = client.post(
            "/v1/users",
            json={
                "role": "teacher",
                "name": "Sadia Iqbal",
                "phone": "+923004445599",
                "password": "teacherpass1",
            },
            headers=h,
        )
        assert r.status_code == 201, r.text
        u = db.get(User, uuid.UUID(r.json()["id"]))
        assert u.phone == "03004445599"

    def test_a_malformed_phone_is_refused(self, client, make_user):
        _, h = admin_headers(client, make_user)
        r = client.post(
            "/v1/users",
            json={"role": "guard", "name": "X", "phone": "123", "password": "guardpass1"},
            headers=h,
        )
        assert r.status_code == 422
