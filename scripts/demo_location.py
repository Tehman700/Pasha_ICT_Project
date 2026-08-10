"""
Move the demo school, so ETA and the voice announcement work where you are.

    python scripts/demo_location.py --show
    python scripts/demo_location.py --pakistan
    python scripts/demo_location.py --at 31.5204 74.3587          # Lahore
    python scripts/demo_location.py --at 31.5204 74.3587 --radius 1500

Only ever touches the demo school, found via the demo admin's phone rather
than by name — the name is editable from the dashboard now, and two schools
can legitimately share one. Every other school is left alone.

Why this script exists
----------------------
ETA is `haversine distance / rolling speed`, and the classroom announcement
fires on ETA — not on the geofence ring. So from 200 km away the app correctly
reports an ETA of several hours, never reaches NEARBY, and never announces.
Nothing is broken; the school is simply somewhere else. Pointing the school at
wherever you are recording is what makes the whole chain demonstrable.

The two modes, and which to use
-------------------------------
--at LAT LNG   The honest one. A 1 km geofence, real ETA that falls as you
               approach, announcement at the real ~2 minutes out. Walk 600-800 m
               away, tap "On my way", walk back. This is what a demo video wants.

--pakistan     Convenience. Centres the school on the country with a radius
               that covers it, so `inside_geofence` is true anywhere in
               Pakistan with no per-location setup.

               Read this before relying on it: a country-sized geofence does
               NOT by itself make the announcement fire, because that is driven
               by ETA. It also needs ANNOUNCE_ETA_SECONDS raised to roughly
               250000 (~69 h) to cover 1500 km at typical speeds — and at that
               threshold every trip is NEARBY the moment it starts and the
               announcement fires on the first ping. The feature is provable
               but its timing is not. `--at` is strictly better for filming.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import School, User  # noqa: E402

DEMO_ADMIN_PHONE = "03009900001"

# Geographic centre of Pakistan, and a radius that reaches every corner of it
# (furthest points are ~1000 km out; 1200 km leaves margin).
PAKISTAN_LAT = 30.3753
PAKISTAN_LNG = 69.3451
PAKISTAN_RADIUS_M = 1_200_000


def show(school: School) -> None:
    print(f'  "{school.name}"')
    print(f"    lat/lng : {school.lat}, {school.lng}")
    print(f"    geofence: {school.geofence_radius_m:,} m")
    print(f"    dismissal: {school.dismissal_time}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--show", action="store_true", help="Print the current location and exit.")
    g.add_argument("--pakistan", action="store_true", help="Cover the whole country.")
    g.add_argument("--at", nargs=2, metavar=("LAT", "LNG"), type=float, help="Point the school at one place.")
    p.add_argument("--radius", type=int, default=None, help="Geofence radius in metres (default 1000 with --at).")
    args = p.parse_args()

    with SessionLocal() as db:
        # Found through the demo admin rather than by name — the name is
        # editable from the dashboard, and two schools can share one.
        admin = db.execute(
            select(User).where(User.phone == DEMO_ADMIN_PHONE)
        ).scalar_one_or_none()
        school = db.get(School, admin.school_id) if admin else None

        if school is None:
            print(f"No demo school (admin {DEMO_ADMIN_PHONE} not found). Run scripts/seed_demo.py first.")
            raise SystemExit(1)

        if args.show:
            print("Current:")
            show(school)
            return

        print("Before:")
        show(school)

        if args.pakistan:
            school.lat = PAKISTAN_LAT
            school.lng = PAKISTAN_LNG
            school.geofence_radius_m = args.radius or PAKISTAN_RADIUS_M
        else:
            school.lat, school.lng = args.at
            school.geofence_radius_m = args.radius or 1000

        db.commit()
        print("\nAfter:")
        show(school)

        if args.pakistan:
            print(
                "\nNOTE: the geofence now covers Pakistan, but the classroom\n"
                "announcement fires on ETA, not on the ring. For it to fire from\n"
                "anywhere in the country the server also needs:\n\n"
                "    ANNOUNCE_ETA_SECONDS=250000\n\n"
                "and at that threshold every trip is NEARBY immediately and the\n"
                "announcement fires on the first GPS ping. For a demo video, use\n"
                "    python scripts/demo_location.py --at <your lat> <your lng>\n"
                "instead — real ETA, real timing."
            )
        else:
            print("\nWalk 600-800 m away, tap \"On my way\", and come back.")


if __name__ == "__main__":
    main()
