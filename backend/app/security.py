"""
Password hashing and JWT.

Uses `pyjwt`, not `python-jose`. The original requirements specified jose,
whose last release was 2021 and which carries open CVEs — and it would have
been signing the QR tokens, which are the security core of a child-safety
system. pyjwt is maintained and supports the same ES256.

Password hashing is argon2 (the original requirements had no hashing library
at all, which meant either plaintext or a scramble on Day 1).
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from app.config import settings

_hasher = PasswordHasher()


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    """argon2 parameters change over time; transparently upgrade on login."""
    try:
        return _hasher.check_needs_rehash(hashed)
    except InvalidHashError:
        return False


def create_access_token(subject: str, role: str, school_id: str) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    expires_in = settings.jwt_expires_seconds
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "sch": school_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError:
        return None
