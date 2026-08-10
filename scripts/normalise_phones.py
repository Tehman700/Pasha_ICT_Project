"""
Convert every stored phone number to the canonical `03xxxxxxxxx`.

    cd backend
    ./.venv/Scripts/python.exe ../scripts/normalise_phones.py --dry-run
    ./.venv/Scripts/python.exe ../scripts/normalise_phones.py

Run once after deploying `app/phone.py`. Idempotent: a number already in the
canonical form is left alone, so re-running is safe.

`users.phone` is UNIQUE, so this refuses to write if two rows would collapse
onto the same canonical number — that means one human registered twice under
different spellings, and silently deleting one of them is not a decision a
migration script should make on its own.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402
from app.phone import is_valid, normalise  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Show changes, write nothing.")
    args = ap.parse_args()

    with SessionLocal() as db:
        users = db.execute(select(User)).scalars().all()

        planned: dict[str, str] = {}
        collisions: list[tuple[str, str]] = []
        invalid: list[str] = []

        for u in users:
            canonical = normalise(u.phone)
            if canonical == u.phone:
                continue
            if not is_valid(canonical):
                invalid.append(u.phone)
                continue
            if canonical in planned:
                collisions.append((u.phone, canonical))
                continue
            planned[canonical] = u.phone

        # Anything already canonical also occupies the namespace.
        existing = {u.phone for u in users}
        for canonical in list(planned):
            if canonical in existing:
                collisions.append((planned[canonical], canonical))
                del planned[canonical]

        print(f"{len(users)} users")
        print(f"  already canonical : {sum(1 for u in users if normalise(u.phone) == u.phone)}")
        print(f"  to convert        : {len(planned)}")
        print(f"  unconvertible     : {len(invalid)}")
        print(f"  collisions        : {len(collisions)}")

        for canonical, old in sorted(planned.items(), key=lambda kv: kv[1]):
            print(f"    {old}  ->  {canonical}")
        for old, canonical in collisions:
            print(f"    COLLISION {old} -> {canonical} (already taken) — left unchanged")
        for bad in invalid:
            print(f"    UNCONVERTIBLE {bad!r} — left unchanged")

        if args.dry_run:
            print("\ndry run — nothing written")
            return
        if collisions:
            print("\nRefusing to write: resolve the collisions above first.")
            raise SystemExit(1)

        by_old = {old: canonical for canonical, old in planned.items()}
        for u in users:
            if u.phone in by_old:
                u.phone = by_old[u.phone]
        db.commit()
        print(f"\nconverted {len(by_old)} numbers")


if __name__ == "__main__":
    main()
