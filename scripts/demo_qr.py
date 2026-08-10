"""
Mint one real pickup code for the demo driver and print it, so a guard phone
can scan something without a second phone running the parent app.

    python scripts/demo_qr.py                  # the real thing, valid 90s
    python scripts/demo_qr.py --minutes 30     # filming only, see below
    python scripts/demo_qr.py --collector 03009900010

Run it on the server — the token has to be signed with the production demo
school's private key and reference a trip that exists in that database, or the
guard app's verify call resolves to nothing.

What "verified" actually requires
---------------------------------
A green verdict is four separate things passing, not one:

  1. the ES256 signature checks out against the school's public key,
  2. the token is inside its validity window,
  3. its jti has not already been redeemed today,
  4. and the collector is *still* authorised for those children today.

This script sets up 4 by using the demo driver, who the demo parents have
already linked. It does not weaken 1-3.

--minutes, and why it is not the default
----------------------------------------
Tokens live 90 seconds by design: a screenshot forwarded to someone else is
worthless a minute later, and that is the entire premise of the feature. So a
PNG sitting on a desktop is dead almost immediately — which is correct
behaviour, not a bug to work around.

--minutes mints a token with a longer expiry for filming, when re-running this
between takes is impractical. It changes nothing in the apps or on the server:
rotation, TOKEN_LIFETIME_SECONDS and the parent app's batch are all untouched,
and the long-lived token is still single-use once redeemed. Treat the file it
produces as a live credential for as long as you asked for, and delete it
after. Do not use it in front of judges — scan a rotating code from the parent
app for that, since the rotation is the thing worth showing.
"""

from __future__ import annotations

import argparse
import sys
import uuid
from datetime import date as Date
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

import jwt  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import PickupRequest, School, Student, Trip, User  # noqa: E402
from app.services.qr_tokens import TOKEN_LIFETIME_SECONDS, mint_batch  # noqa: E402

DEMO_ADMIN_PHONE = "03009900001"
DEMO_DRIVER_PHONE = "03009900020"


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--collector",
        default=DEMO_DRIVER_PHONE,
        help="phone of the collector the code is minted for (default: demo driver)",
    )
    ap.add_argument(
        "--minutes",
        type=float,
        default=None,
        help="filming only — validity in minutes instead of the real 90 seconds",
    )
    args = ap.parse_args()

    db = SessionLocal()
    try:
        # The demo school is found via its admin, not by name: the name is
        # editable from the dashboard and two schools can legitimately share one.
        admin = db.execute(
            select(User).where(User.phone == DEMO_ADMIN_PHONE)
        ).scalar_one_or_none()
        if admin is None:
            fail(f"no demo admin {DEMO_ADMIN_PHONE} — run scripts/seed_demo.py first")

        school = db.get(School, admin.school_id)
        if school is None or not school.private_key_enc:
            fail("the demo school has no signing key configured")

        collector = db.execute(
            select(User).where(User.phone == args.collector)
        ).scalar_one_or_none()
        if collector is None:
            fail(f"no user with phone {args.collector}")

        today = Date.today()
        requests = db.execute(
            select(PickupRequest).where(
                PickupRequest.collector_id == collector.id,
                PickupRequest.date == today,
            )
        ).scalars().all()
        if not requests:
            fail(
                f"{collector.name} has no pickups for {today}. The nightly job "
                "generates these from the weekly schedule — run scripts/seed_demo.py, "
                "or pick a collector who is on today's schedule."
            )

        # A trip is what "On my way" creates. Reuse today's if one exists —
        # there is a unique constraint on (collector, date).
        trip = db.execute(
            select(Trip).where(
                Trip.collector_user_id == collector.id, Trip.date == today
            )
        ).scalar_one_or_none()
        if trip is None:
            trip = Trip(
                collector_user_id=collector.id,
                date=today,
                started_at=datetime.now(timezone.utc),
            )
            db.add(trip)
            db.flush()
            print(f"started a trip for {collector.name} ({trip.id})", file=sys.stderr)

        for req in requests:
            req.trip_id = trip.id
        db.commit()

        student_ids = [r.student_id for r in requests]
        names = db.execute(
            select(Student.name).where(Student.id.in_(student_ids))
        ).scalars().all()

        if args.minutes is None:
            token = mint_batch(
                private_key_pem=school.private_key_enc,
                trip_id=trip.id,
                collector_id=collector.id,
                school_id=school.id,
                student_ids=student_ids,
                count=1,
            )[0]["token"]
            lifetime = f"{TOKEN_LIFETIME_SECONDS}s"
        else:
            # Same claims, same key, same single-use jti — only exp differs.
            # Deliberately not routed through mint_batch: that function defines
            # the product's rotation and must not grow a "make it last longer"
            # parameter that a caller could reach from the app.
            now = datetime.now(timezone.utc)
            token = jwt.encode(
                {
                    "rq": str(trip.id),
                    "gid": str(collector.id),
                    "sch": str(school.id),
                    "sid": [str(s) for s in student_ids],
                    "iat": int(now.timestamp()),
                    "exp": int((now + timedelta(minutes=args.minutes)).timestamp()),
                    "jti": uuid.uuid4().hex,
                },
                school.private_key_enc,
                algorithm="ES256",
            )
            lifetime = f"{args.minutes:g} min (filming token)"

        print(f"collector : {collector.name} ({collector.phone})", file=sys.stderr)
        print(f"children  : {', '.join(names)}", file=sys.stderr)
        print(f"valid for : {lifetime}", file=sys.stderr)
        print(token)
    finally:
        db.close()


if __name__ == "__main__":
    main()
