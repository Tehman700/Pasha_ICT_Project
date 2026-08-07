"""
Who can see a child's record.

Being authorized to COLLECT a child is not the same as being allowed to READ
their record. A driver needs a name and a face at the gate; he does not need
the roster, the guardians' phone numbers, or confirmation of which children
attend the school.

A search endpoint is itself the leak — even a zero-result query confirms
whether a child is enrolled. These tests exist because every one of these
endpoints was open to any authenticated user, including drivers, in production.
"""

import uuid
from datetime import date, time

import pytest

from app.models import Guardianship, PickupRequest, PickupStatus, Role, SchoolClass, Student


@pytest.fixture
def roster(db, school, make_user):
    klass = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
    db.add(klass)
    db.flush()

    parent = make_user(Role.parent)
    other_parent = make_user(Role.parent)
    driver = make_user(Role.driver)
    guard = make_user(Role.guard)
    teacher = make_user(Role.teacher)

    child = Student(id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali Raza")
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
    return {
        "child": child,
        "parent": parent,
        "other_parent": other_parent,
        "driver": driver,
        "guard": guard,
        "teacher": teacher,
    }


def token(client, user):
    r = client.post(
        "/v1/auth/login", json={"phone": user.phone, "password": "testpass123"}
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestDriverCannotReadStudentData:
    """A driver's only view of student data is /me/manifest."""

    def test_cannot_list_the_roster(self, client, roster):
        r = client.get("/v1/students", headers=token(client, roster["driver"]))
        assert r.status_code == 403

    def test_cannot_search_students(self, client, roster):
        # The search IS the leak: a zero-result query still confirms enrolment.
        r = client.get("/v1/students/search?q=a", headers=token(client, roster["driver"]))
        assert r.status_code == 403

    def test_cannot_read_a_childs_guardians(self, client, roster):
        r = client.get(
            f"/v1/students/{roster['child'].id}/guardians",
            headers=token(client, roster["driver"]),
        )
        assert r.status_code == 403

    def test_cannot_read_a_childs_authorizations(self, client, roster):
        r = client.get(
            f"/v1/students/{roster['child'].id}/authorizations",
            headers=token(client, roster["driver"]),
        )
        assert r.status_code == 403

    def test_cannot_read_a_childs_collector_list(self, client, roster):
        r = client.get(
            f"/v1/students/{roster['child'].id}/collectors",
            headers=token(client, roster["driver"]),
        )
        assert r.status_code == 403

    def test_cannot_enumerate_vehicles(self, client, roster):
        r = client.get("/v1/vehicles", headers=token(client, roster["driver"]))
        assert r.status_code == 403

    def test_can_still_see_their_own_manifest(self, client, db, roster):
        """The one endpoint a driver does get — and it must keep working."""
        db.add(
            PickupRequest(
                id=uuid.uuid4(),
                student_id=roster["child"].id,
                collector_id=roster["driver"].id,
                date=date.today(),
                scheduled_time=time(13, 15),
                status=PickupStatus.SCHEDULED,
            )
        )
        db.flush()
        r = client.get("/v1/me/manifest", headers=token(client, roster["driver"]))
        assert r.status_code == 200
        assert len(r.json()) == 1


class TestParentScoping:
    def test_a_parent_can_read_their_own_childs_authorizations(self, client, roster):
        r = client.get(
            f"/v1/students/{roster['child'].id}/authorizations",
            headers=token(client, roster["parent"]),
        )
        assert r.status_code == 200

    def test_a_parent_cannot_read_another_familys_child(self, client, roster):
        r = client.get(
            f"/v1/students/{roster['child'].id}/authorizations",
            headers=token(client, roster["other_parent"]),
        )
        assert r.status_code == 403

    def test_a_parent_cannot_search_the_roster(self, client, roster):
        r = client.get("/v1/students/search?q=a", headers=token(client, roster["parent"]))
        assert r.status_code == 403


class TestStaffAccess:
    def test_a_guard_can_search_for_the_manual_fallback(self, client, roster):
        r = client.get("/v1/students/search?q=Ali", headers=token(client, roster["guard"]))
        assert r.status_code == 200

    def test_a_guard_can_read_a_childs_authorized_collectors(self, client, roster):
        # Without this the manual fallback cannot work at all.
        r = client.get(
            f"/v1/students/{roster['child'].id}/collectors",
            headers=token(client, roster["guard"]),
        )
        assert r.status_code == 200

    def test_a_teacher_can_list_students(self, client, roster):
        r = client.get("/v1/students", headers=token(client, roster["teacher"]))
        assert r.status_code == 200
