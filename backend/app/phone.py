"""
One canonical shape for a Pakistani mobile number: `03xxxxxxxxx`.

Eleven digits, leading zero, no `+`, no spaces, no dashes. Everything that
stores or looks up a phone number goes through `normalise` first, so the same
person typing `+92 300 123 4567`, `0300-1234567` or `3001234567` reaches the
same account.

Why canonicalise at all rather than just accepting variants at lookup time:
`users.phone` is UNIQUE. Without a single stored form, the same human can
register twice — once as `+923001234567` and once as `03001234567` — and the
database is perfectly happy, because those are different strings. Two accounts
for one parent means half their children are invisible from whichever one they
happen to sign into, which is exactly the kind of fault nobody diagnoses at a
school gate.
"""

from __future__ import annotations

import re

#: Pakistani mobiles are 03 followed by nine digits.
CANONICAL = re.compile(r"^03\d{9}$")

LENGTH = 11


def normalise(raw: str | None) -> str:
    """
    Reduce any plausible input to `03xxxxxxxxx`.

    Returns the digits-only best effort even when it does not match the
    expected shape — validation is `is_valid`'s job, so a caller can report a
    useful error rather than this silently inventing a number.
    """
    if not raw:
        return ""

    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""

    # +923001234567 / 923001234567 -> 03001234567
    if digits.startswith("92") and len(digits) >= 12:
        digits = "0" + digits[2:]
    # 3001234567 (leading zero dropped, as when typed after a +92 prefix
    # someone then deleted) -> 03001234567
    elif len(digits) == 10 and digits.startswith("3"):
        digits = "0" + digits
    # 00923001234567, the international-dialling form
    elif digits.startswith("0092"):
        digits = "0" + digits[4:]

    return digits


def is_valid(raw: str | None) -> bool:
    return bool(CANONICAL.match(normalise(raw)))
