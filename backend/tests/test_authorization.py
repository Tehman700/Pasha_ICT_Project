"""
Authorization tests.

This is the safety-critical logic in the whole system: it decides whether a
person may take a child. Every case below is one a real gate produces.
"""

import uuid
from datetime import date, timedelta

import pytest

from app.models import (
    AuthorizationKind,
    Guardianship,
    PickupAuthorization,
    Role,
    SchoolClass,
    Student,
)
from app.services.authorization import (
    authorized_collectors,
    may_collect,
    may_delegate,
)


@pytest.fixture
def klass(db, school):
    c = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
    db.add(c)
    db.flush()
    return c


@pytest.fixture
def make_student(db, school, klass):
    n = {"i": 0}

    def _make(name: str | None = None) -> Student:
        n["i"] += 1
        s = Student(
            id=uuid.uuid4(),
            school_id=school.id,
            class_id=klass.id,
            name=name or f"Child {n['i']}",
        )
        db.add(s)
        db.flush()
        return s

    return _make


@pytest.fixture
def link_guardian(db):
    def _link(student, user, *, can_delegate: bool = True):
        g = Guardianship(
            id=uuid.uuid4(),
            student_id=student.id,
            user_id=user.id,
            relation="parent",
            is_primary=True,
            can_delegate=can_delegate,
        )
        db.add(g)
        db.flush()
        return g

    return _link


@pytest.fixture
def grant(db):
    def _grant(student, collector, granter, **kw):
        a = PickupAuthorization(
            id=uuid.uuid4(),
            student_id=student.id,
            collector_user_id=collector.id,
            granted_by_user_id=granter.id,
            kind=kw.get("kind", AuthorizationKind.standing),
            valid_from=kw.get("valid_from", date.today() - timedelta(days=1)),
            valid_until=kw.get("valid_until"),
            revoked_at=kw.get("revoked_at"),
        )
        db.add(a)
        db.flush()
        return a

    return _grant


class TestGuardians:
    def test_a_parent_may_collect_their_own_child(
        self, db, make_user, make_student, link_guardian
    ):
        parent, child = make_user(Role.parent), make_student()
        link_guardian(child, parent)
        r = may_collect(db, collector_id=parent.id, student_id=child.id)
        assert r.allowed and r.basis == "guardian"

    def test_a_stranger_may_not(self, db, make_user, make_student):
        stranger, child = make_user(Role.parent), make_student()
        r = may_collect(db, collector_id=stranger.id, student_id=child.id)
        assert not r.allowed
        assert r.reason == "not_authorized"

    def test_another_parent_may_not_collect_your_child(
        self, db, make_user, make_student, link_guardian
    ):
        mine, theirs = make_user(Role.parent), make_user(Role.parent)
        child = make_student()
        link_guardian(child, mine)
        assert not may_collect(db, collector_id=theirs.id, student_id=child.id).allowed


class TestDrivers:
    def test_a_granted_driver_may_collect(
        self, db, make_user, make_student, link_guardian, grant
    ):
        parent, driver = make_user(Role.parent), make_user(Role.driver)
        child = make_student()
        link_guardian(child, parent)
        grant(child, driver, parent)
        r = may_collect(db, collector_id=driver.id, student_id=child.id)
        assert r.allowed and r.basis == "authorization"

    def test_revoking_one_family_leaves_the_others_intact(
        self, db, make_user, make_student, link_guardian, grant
    ):
        """The property the whole collector model rests on."""
        driver = make_user(Role.driver)
        p1, p2 = make_user(Role.parent), make_user(Role.parent)
        c1, c2 = make_student("Ali"), make_student("Sara")
        link_guardian(c1, p1)
        link_guardian(c2, p2)
        a1 = grant(c1, driver, p1)
        grant(c2, driver, p2)

        from app.db import utcnow

        a1.revoked_at = utcnow()
        db.flush()

        assert not may_collect(db, collector_id=driver.id, student_id=c1.id).allowed
        # The other family is untouched.
        assert may_collect(db, collector_id=driver.id, student_id=c2.id).allowed

    def test_revoked_is_distinguishable_from_never_granted(
        self, db, make_user, make_student, link_guardian, grant
    ):
        # At the gate, "their access was removed" is a different conversation
        # with a parent than "they were never added".
        from app.db import utcnow

        parent, driver = make_user(Role.parent), make_user(Role.driver)
        child = make_student()
        link_guardian(child, parent)
        grant(child, driver, parent, revoked_at=utcnow())
        r = may_collect(db, collector_id=driver.id, student_id=child.id)
        assert not r.allowed
        assert r.reason == "authorization_revoked_or_expired"


class TestValidity:
    def test_a_future_grant_is_not_yet_valid(
        self, db, make_user, make_student, link_guardian, grant
    ):
        parent, rel = make_user(Role.parent), make_user(Role.parent)
        child = make_student()
        link_guardian(child, parent)
        grant(child, rel, parent, valid_from=date.today() + timedelta(days=3))
        assert not may_collect(db, collector_id=rel.id, student_id=child.id).allowed

    def test_an_expired_one_time_pass_is_refused(
        self, db, make_user, make_student, link_guardian, grant
    ):
        parent, rel = make_user(Role.parent), make_user(Role.parent)
        child = make_student()
        link_guardian(child, parent)
        grant(
            child,
            rel,
            parent,
            kind=AuthorizationKind.one_time,
            valid_from=date.today() - timedelta(days=2),
            valid_until=date.today() - timedelta(days=1),
        )
        assert not may_collect(db, collector_id=rel.id, student_id=child.id).allowed

    def test_a_one_time_pass_is_valid_on_its_day(
        self, db, make_user, make_student, link_guardian, grant
    ):
        parent, rel = make_user(Role.parent), make_user(Role.parent)
        child = make_student()
        link_guardian(child, parent)
        grant(
            child,
            rel,
            parent,
            kind=AuthorizationKind.one_time,
            valid_from=date.today(),
            valid_until=date.today(),
        )
        assert may_collect(db, collector_id=rel.id, student_id=child.id).allowed


class TestDelegation:
    def test_a_guardian_with_can_delegate_may_grant(
        self, db, make_user, make_student, link_guardian
    ):
        parent, child = make_user(Role.parent), make_student()
        link_guardian(child, parent, can_delegate=True)
        assert may_delegate(db, granter_id=parent.id, student_id=child.id)

    def test_a_guardian_without_can_delegate_may_not(
        self, db, make_user, make_student, link_guardian
    ):
        parent, child = make_user(Role.parent), make_student()
        link_guardian(child, parent, can_delegate=False)
        assert not may_delegate(db, granter_id=parent.id, student_id=child.id)

    def test_a_driver_cannot_pass_access_on(
        self, db, make_user, make_student, link_guardian, grant
    ):
        # Otherwise a driver could authorize another driver and the parent
        # would never know.
        parent, driver = make_user(Role.parent), make_user(Role.driver)
        child = make_student()
        link_guardian(child, parent)
        grant(child, driver, parent)
        assert may_collect(db, collector_id=driver.id, student_id=child.id).allowed
        assert not may_delegate(db, granter_id=driver.id, student_id=child.id)


class TestManualFallbackList:
    def test_lists_guardians_and_live_grants_only(
        self, db, make_user, make_student, link_guardian, grant
    ):
        from app.db import utcnow

        parent = make_user(Role.parent, name="Parent")
        driver = make_user(Role.driver, name="Driver")
        revoked = make_user(Role.parent, name="Revoked")
        child = make_student()
        link_guardian(child, parent)
        grant(child, driver, parent)
        grant(child, revoked, parent, revoked_at=utcnow())

        names = {u.name for u, _ in authorized_collectors(db, student_id=child.id)}
        assert "Parent" in names
        assert "Driver" in names
        # The guard must never be offered someone whose access was removed.
        assert "Revoked" not in names

    def test_nobody_authorized_returns_empty(self, db, make_student):
        assert authorized_collectors(db, student_id=make_student().id) == []
