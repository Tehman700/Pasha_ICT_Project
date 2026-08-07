"""
Nightly generation tests.

This job is what keeps the system from going quietly empty. Without it the data
is correct on the day it was seeded and blank the morning after — the failure
mode that would have emptied the demo overnight, and one nobody notices until
they open the app in front of judges.
"""

import uuid
from datetime import date, time, timedelta

from app.jobs.generate_requests import generate_for_date, lapse_stale_requests
from app.models import (
    Guardianship,
    PickupRequest,
    PickupStatus,
    RequestSource,
    Role,
    Schedule,
    SchoolClass,
    Student,
)

import pytest


def next_weekday(base: date, weekday: int) -> date:
    """The next date on or after `base` falling on `weekday`."""
    delta = (weekday - base.weekday()) % 7
    return base + timedelta(days=delta)


@pytest.fixture
def family(db, school, make_user):
    klass = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
    db.add(klass)
    db.flush()

    parent = make_user(Role.parent)
    driver = make_user(Role.driver)
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
    return {"class": klass, "parent": parent, "driver": driver, "child": child}


def add_schedule(db, child, collector, weekday, hhmm=(13, 15)):
    s = Schedule(
        id=uuid.uuid4(),
        student_id=child.id,
        collector_id=collector.id,
        weekday=weekday,
        pickup_time=time(*hhmm),
    )
    db.add(s)
    db.flush()
    return s


class TestGeneration:
    def test_creates_a_request_from_a_schedule(self, db, family):
        target = next_weekday(date.today() + timedelta(days=1), 2)  # a Wednesday
        add_schedule(db, family["child"], family["parent"], weekday=2)

        result = generate_for_date(db, target)
        assert result["created"] >= 1

        req = (
            db.query(PickupRequest)
            .filter(
                PickupRequest.student_id == family["child"].id,
                PickupRequest.date == target,
            )
            .one()
        )
        assert req.status == PickupStatus.SCHEDULED
        assert req.source == RequestSource.default
        assert req.collector_id == family["parent"].id

    def test_generates_nothing_for_a_weekday_with_no_schedule(self, db, family):
        add_schedule(db, family["child"], family["parent"], weekday=2)
        saturday = next_weekday(date.today() + timedelta(days=1), 5)
        # Not a bug — schools do not dismiss on Saturdays.
        assert generate_for_date(db, saturday)["created"] == 0

    def test_uses_the_collector_for_that_specific_weekday(self, db, family):
        """Van Monday-Thursday, parent Friday — the whole point of the column."""
        add_schedule(db, family["child"], family["driver"], weekday=0)
        add_schedule(db, family["child"], family["parent"], weekday=4)

        monday = next_weekday(date.today() + timedelta(days=1), 0)
        friday = next_weekday(date.today() + timedelta(days=1), 4)

        generate_for_date(db, monday)
        generate_for_date(db, friday)

        mine = lambda d: db.query(PickupRequest).filter(
            PickupRequest.date == d,
            PickupRequest.student_id == family["child"].id,
        ).one()
        mon, fri = mine(monday), mine(friday)
        assert mon.collector_id == family["driver"].id
        assert fri.collector_id == family["parent"].id


class TestIdempotency:
    def test_running_twice_does_not_duplicate(self, db, family):
        target = next_weekday(date.today() + timedelta(days=1), 2)
        add_schedule(db, family["child"], family["parent"], weekday=2)

        first = generate_for_date(db, target)
        second = generate_for_date(db, target)

        assert first["created"] >= 1
        # The second pass must create nothing and skip everything the first made.
        assert second["created"] == 0
        assert second["skipped"] >= first["created"]
        assert (
            db.query(PickupRequest)
            .filter(
                PickupRequest.date == target,
                PickupRequest.student_id == family["child"].id,
            )
            .count()
            == 1
        )

    def test_never_overwrites_a_parents_exception(self, db, family):
        """
        A parent who said "absent today" must stay absent.

        If the job ran again — late, retried, or after a restart — and
        overwrote that, the child would be called to the gate for a pickup the
        parent had already cancelled.
        """
        target = next_weekday(date.today() + timedelta(days=1), 2)
        add_schedule(db, family["child"], family["parent"], weekday=2)

        db.add(
            PickupRequest(
                id=uuid.uuid4(),
                student_id=family["child"].id,
                collector_id=family["parent"].id,
                date=target,
                scheduled_time=time(14, 0),
                status=PickupStatus.CANCELLED,
                source=RequestSource.exception,
            )
        )
        db.flush()

        generate_for_date(db, target)

        req = (
            db.query(PickupRequest)
            .filter(
                PickupRequest.date == target,
                PickupRequest.student_id == family["child"].id,
            )
            .one()
        )
        assert req.status == PickupStatus.CANCELLED
        assert req.source == RequestSource.exception
        assert req.scheduled_time == time(14, 0)


class TestLapsing:
    def test_a_request_past_its_grace_window_lapses(self, db, family):
        today = date.today()
        db.add(
            PickupRequest(
                id=uuid.uuid4(),
                student_id=family["child"].id,
                collector_id=family["parent"].id,
                date=today,
                scheduled_time=time(0, 1),  # long past
                status=PickupStatus.SCHEDULED,
                source=RequestSource.default,
            )
        )
        db.flush()

        assert lapse_stale_requests(db, today, grace_minutes=20) >= 1
        req = (
            db.query(PickupRequest)
            .filter(
                PickupRequest.date == today,
                PickupRequest.student_id == family["child"].id,
            )
            .one()
        )
        assert req.status == PickupStatus.LAPSED

    def test_a_request_still_inside_its_window_does_not_lapse(self, db, family):
        today = date.today()
        db.add(
            PickupRequest(
                id=uuid.uuid4(),
                student_id=family["child"].id,
                collector_id=family["parent"].id,
                date=today,
                scheduled_time=time(23, 59),  # not due yet
                status=PickupStatus.SCHEDULED,
                source=RequestSource.default,
            )
        )
        db.flush()
        before = (
            db.query(PickupRequest)
            .filter(
                PickupRequest.date == today,
                PickupRequest.student_id == family["child"].id,
            )
            .one()
        )
        lapse_stale_requests(db, today, grace_minutes=20)
        db.refresh(before)
        assert before.status == PickupStatus.SCHEDULED

    def test_lapsing_never_touches_a_child_already_handed_over(self, db, family):
        today = date.today()
        db.add(
            PickupRequest(
                id=uuid.uuid4(),
                student_id=family["child"].id,
                collector_id=family["parent"].id,
                date=today,
                scheduled_time=time(0, 1),
                status=PickupStatus.HANDED_OVER,
                source=RequestSource.default,
            )
        )
        db.flush()
        lapse_stale_requests(db, today)
        req = (
            db.query(PickupRequest)
            .filter(
                PickupRequest.date == today,
                PickupRequest.student_id == family["child"].id,
            )
            .one()
        )
        assert req.status == PickupStatus.HANDED_OVER
