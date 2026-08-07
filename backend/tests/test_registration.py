"""
Self-registration tests.

The security property under all of these: **a collector can never claim a
child.** A driver registers himself and gets nothing. Only a parent grants
access, and only to their own children.
"""

import uuid

import pytest

from app.models import Guardianship, PickupAuthorization, Role, SchoolClass, Student
from app.routers.registration import normalise_cnic


def token(client, phone, password="testpass123"):
    r = client.post("/v1/auth/login", json={"phone": phone, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def klass(db, school):
    c = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
    db.add(c)
    db.flush()
    return c


def driver_payload(school_id, **over):
    body = {
        "name": "Ahmed Khan",
        "phone": "+923215559991",
        "password": "driverpass123",
        "cnic": "35202-1234567-1",
        "selfie_url": "/photos/selfie.jpg",
        "id_photo_url": "/photos/cnic.jpg",
        "registration_no": "ICT-9911",
        "school_id": str(school_id),
        "expected_arrival": "13:15",
    }
    body.update(over)
    return body


class TestCnicNormalisation:
    def test_strips_formatting(self):
        # CNICs are written both ways; the stored form must be one of them.
        assert normalise_cnic("35202-1234567-1") == "3520212345671"
        assert normalise_cnic("3520212345671") == "3520212345671"

    def test_both_written_forms_match_each_other(self):
        assert normalise_cnic("35202-1234567-1") == normalise_cnic("3520212345671")


class TestDriverRegistration:
    def test_a_driver_can_register_himself(self, client, school):
        r = client.post("/v1/auth/register/driver", json=driver_payload(school.id))
        assert r.status_code == 201, r.text
        assert r.json()["status"] == "UNASSIGNED"

    def test_registering_grants_access_to_nobody(self, client, db, school, klass):
        """The whole security property: registration confers nothing."""
        child = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali Raza"
        )
        db.add(child)
        db.flush()

        client.post("/v1/auth/register/driver", json=driver_payload(school.id))
        h = token(client, "+923215559991", "driverpass123")

        # He exists, he can log in, and he can see nothing.
        assert client.get("/v1/students", headers=h).status_code == 403
        assert client.get("/v1/students/search?q=Ali", headers=h).status_code == 403
        assert client.get("/v1/me/manifest", headers=h).json() == []

    def test_duplicate_phone_is_refused(self, client, school):
        client.post("/v1/auth/register/driver", json=driver_payload(school.id))
        again = client.post("/v1/auth/register/driver", json=driver_payload(school.id))
        assert again.status_code == 409

    def test_a_bad_arrival_time_is_rejected(self, client, school):
        r = client.post(
            "/v1/auth/register/driver",
            json=driver_payload(school.id, expected_arrival="quarter past one"),
        )
        assert r.status_code == 422


class TestParentRegistration:
    def test_matched_on_cnic_and_linked_to_their_children(
        self, client, db, school, klass
    ):
        cnic = "3520277777771"
        for name in ("Ali Raza", "Zara Raza"):
            db.add(
                Student(
                    id=uuid.uuid4(),
                    school_id=school.id,
                    class_id=klass.id,
                    name=name,
                    guardian_cnic=cnic,
                )
            )
        db.flush()

        r = client.post(
            "/v1/auth/register/parent",
            json={
                "name": "Tariq Raza",
                "phone": "+923331119991",
                "password": "parentpass123",
                "cnic": "35202-7777777-1",  # written form, same number
                "school_id": str(school.id),
            },
        )
        assert r.status_code == 201, r.text
        # Both children, matched by CNIC, not by name.
        assert len(r.json()["matched_children"]) == 2

    def test_no_match_tells_the_parent_to_phone_the_school(
        self, client, db, school, klass
    ):
        db.add(
            Student(
                id=uuid.uuid4(),
                school_id=school.id,
                class_id=klass.id,
                name="Someone Else",
                guardian_cnic="3520200000001",
            )
        )
        db.flush()

        r = client.post(
            "/v1/auth/register/parent",
            json={
                "name": "Unknown Person",
                "phone": "+923331119992",
                "password": "parentpass123",
                "cnic": "35202-9999999-9",
                "school_id": str(school.id),
            },
        )
        assert r.status_code == 201
        # Registered but linked to nothing. Never matched loosely — a false
        # positive here hands one man another man's children.
        assert r.json()["matched_children"] == []
        assert "phone the school" in r.json()["message"].lower()

    def test_a_parent_is_never_matched_to_another_familys_child(
        self, client, db, school, klass
    ):
        db.add(
            Student(
                id=uuid.uuid4(),
                school_id=school.id,
                class_id=klass.id,
                name="Not Yours",
                guardian_cnic="3520211111111",
            )
        )
        db.flush()

        r = client.post(
            "/v1/auth/register/parent",
            json={
                "name": "Different Parent",
                "phone": "+923331119993",
                "password": "parentpass123",
                "cnic": "3520222222222",
                "school_id": str(school.id),
            },
        )
        assert r.json()["matched_children"] == []


class TestCollectorLookup:
    def test_a_parent_can_look_up_a_driver_by_exact_phone(self, client, school, make_user):
        client.post("/v1/auth/register/driver", json=driver_payload(school.id))
        parent = make_user(Role.parent)

        r = client.get(
            "/v1/collectors/lookup?phone=+923215559991", headers=token(client, parent.phone)
        )
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Ahmed Khan"
        # She decides from the photos — there is no automated face match.
        assert body["selfie_url"] and body["id_photo_url"]
        assert body["vehicle"]["registration_no"] == "ICT-9911"

    def test_an_unknown_number_returns_nothing(self, client, school, make_user):
        parent = make_user(Role.parent)
        r = client.get(
            "/v1/collectors/lookup?phone=+923000000000",
            headers=token(client, parent.phone),
        )
        assert r.status_code == 404

    def test_a_driver_cannot_look_up_other_drivers(self, client, school, make_user):
        client.post("/v1/auth/register/driver", json=driver_payload(school.id))
        other = make_user(Role.driver)
        r = client.get(
            "/v1/collectors/lookup?phone=+923215559991", headers=token(client, other.phone)
        )
        assert r.status_code == 403


class TestSchoolVisibility:
    def test_a_driver_is_invisible_to_the_school_until_a_parent_links_him(
        self, client, db, school, klass, make_user
    ):
        """
        The core of the model: the school approves nobody. A driver appears
        only through the children linked to him.
        """
        client.post("/v1/auth/register/driver", json=driver_payload(school.id))
        admin = make_user(Role.admin)
        h = token(client, admin.phone)

        before = client.get(f"/v1/schools/{school.id}/drivers", headers=h).json()
        assert all(d["driver"]["phone"] != "+923215559991" for d in before)

        # A parent links him to her child.
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
        db.flush()

        driver = client.get(
            "/v1/collectors/lookup?phone=+923215559991", headers=token(client, parent.phone)
        ).json()

        grant = client.post(
            f"/v1/students/{child.id}/authorizations",
            headers=token(client, parent.phone),
            json={"collector_user_id": driver["id"]},
        )
        assert grant.status_code == 201, grant.text

        after = client.get(f"/v1/schools/{school.id}/drivers", headers=h).json()
        assert any(d["driver"]["phone"] == "+923215559991" for d in after)
