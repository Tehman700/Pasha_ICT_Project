"""
Rotating pickup tokens — ES256-signed, verified offline.

A static code can be screenshotted and forwarded to anyone, which defeats the
entire premise. So the collector's phone displays a code that changes roughly
every 60 seconds, and the guard verifies it without a network call.

Why ES256 rather than HS256: HMAC verification requires the SECRET, so every
guard phone would have to hold the key that mints valid codes. One stolen guard
phone would then be able to forge a token for any child in the school. With
ES256 the guard holds only the public key — enough to verify, useless for
forging.

The batch matters as much as the signature. Tokens are minted in advance and
sent to the phone when the trip starts, so the code keeps rotating at a gate
with no signal. The gate never blocks on the network.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

#: How long each token is valid. Slightly longer than the rotation interval so
#: a code does not expire in the half-second between the guard raising the
#: camera and the shutter firing.
TOKEN_LIFETIME_SECONDS = 90

#: How often the phone advances to the next token.
ROTATE_SECONDS = 60

#: Clock skew tolerated on the guard's device. Cheap Android phones drift, and
#: a guard whose clock is 40 seconds fast must not reject every valid code.
CLOCK_SKEW_SECONDS = 60


def generate_keypair() -> tuple[str, str]:
    """A fresh P-256 keypair. Returns (private_pem, public_pem)."""
    private = ec.generate_private_key(ec.SECP256R1())
    return (
        private.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode(),
        private.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode(),
    )


def mint_batch(
    *,
    private_key_pem: str,
    trip_id: uuid.UUID,
    collector_id: uuid.UUID,
    school_id: uuid.UUID,
    student_ids: list[uuid.UUID],
    count: int,
    start: datetime | None = None,
) -> list[dict]:
    """
    Mint `count` tokens, each valid for a successive 60-second window.

    Sizing note: 20 tokens covers ~20 minutes, but a trip can run 90. A
    collector waiting 25 minutes at the gate would run out of valid codes in
    exactly the offline scenario this exists for — so callers should size the
    batch to the trip window, not to a round number.
    """
    now = start or datetime.now(timezone.utc)
    out: list[dict] = []

    for i in range(count):
        issued = now + timedelta(seconds=i * ROTATE_SECONDS)
        expires = issued + timedelta(seconds=TOKEN_LIFETIME_SECONDS)
        payload = {
            "rq": str(trip_id),
            "gid": str(collector_id),
            "sch": str(school_id),
            "sid": [str(s) for s in student_ids],
            "iat": int(issued.timestamp()),
            "exp": int(expires.timestamp()),
            # Unique per token. The guard records used jtis for the day, so a
            # forwarded screenshot of a still-valid code cannot be redeemed a
            # second time on the same device.
            "jti": uuid.uuid4().hex,
        }
        out.append(
            {
                "token": jwt.encode(payload, private_key_pem, algorithm="ES256"),
                "exp": expires.isoformat(),
            }
        )

    return out


class TokenInvalid(Exception):
    """Why a scan was refused. The reason is shown to the guard verbatim."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def verify(
    token: str,
    *,
    public_key_pem: str,
    used_jtis: set[str] | None = None,
    now: datetime | None = None,
) -> dict:
    """
    Verify a scanned token. Pure — no database, no network.

    This is deliberately importable by itself so the guard app's offline check
    and the server's online check cannot drift apart.

    Order matters: signature first. An unsigned token's claims are attacker
    controlled, so nothing inside it may be trusted before the signature holds.
    """
    now = now or datetime.now(timezone.utc)

    try:
        payload = jwt.decode(
            token,
            public_key_pem,
            algorithms=["ES256"],
            leeway=CLOCK_SKEW_SECONDS,
            options={"require": ["exp", "iat", "jti"]},
        )
    except jwt.ExpiredSignatureError:
        raise TokenInvalid("expired", "This code has expired. Ask for a fresh one.") from None
    except jwt.InvalidSignatureError:
        raise TokenInvalid("bad_signature", "This code was not issued by the school.") from None
    except jwt.PyJWTError:
        raise TokenInvalid("malformed", "This is not a valid pickup code.") from None

    # Replay. A screenshot forwarded to someone else is still correctly signed
    # and may still be inside its window — this is what stops it being used.
    if used_jtis and payload["jti"] in used_jtis:
        raise TokenInvalid("already_used", "This code has already been used today.")

    return payload
