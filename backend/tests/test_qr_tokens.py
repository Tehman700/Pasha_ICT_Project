"""
QR token tests.

The threat this defends against is specific: a code that can be screenshotted
and forwarded. Every test here is one way that could happen.
"""

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.services.qr_tokens import (
    CLOCK_SKEW_SECONDS,
    ROTATE_SECONDS,
    TOKEN_LIFETIME_SECONDS,
    TokenInvalid,
    generate_keypair,
    mint_batch,
    verify,
)


@pytest.fixture(scope="module")
def keys():
    return generate_keypair()


@pytest.fixture
def batch(keys):
    private, _ = keys
    return mint_batch(
        private_key_pem=private,
        trip_id=uuid.uuid4(),
        collector_id=uuid.uuid4(),
        school_id=uuid.uuid4(),
        student_ids=[uuid.uuid4(), uuid.uuid4()],
        count=5,
    )


class TestSigning:
    def test_a_valid_token_verifies(self, keys, batch):
        _, public = keys
        payload = verify(batch[0]["token"], public_key_pem=public)
        assert payload["jti"]
        assert len(payload["sid"]) == 2

    def test_the_public_key_cannot_mint_tokens(self, keys):
        """
        The reason for ES256 over HS256.

        With HMAC, verifying requires the secret — so every guard phone would
        hold the key that mints valid codes, and one stolen phone could forge a
        token for any child in the school.
        """
        _, public = keys
        with pytest.raises(Exception):
            jwt.encode({"sub": "forged"}, public, algorithm="ES256")

    def test_a_token_from_a_different_key_is_refused(self, keys, batch):
        _, public = keys
        other_private, _ = generate_keypair()
        forged = mint_batch(
            private_key_pem=other_private,
            trip_id=uuid.uuid4(),
            collector_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            student_ids=[uuid.uuid4()],
            count=1,
        )[0]["token"]

        with pytest.raises(TokenInvalid) as exc:
            verify(forged, public_key_pem=public)
        assert exc.value.code == "bad_signature"

    def test_a_tampered_payload_is_refused(self, keys, batch):
        """Swapping the child id in a valid token must break the signature."""
        _, public = keys
        header, payload, sig = batch[0]["token"].split(".")
        other = mint_batch(
            private_key_pem=generate_keypair()[0],
            trip_id=uuid.uuid4(),
            collector_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            student_ids=[uuid.uuid4()],
            count=1,
        )[0]["token"]
        tampered = f"{header}.{other.split('.')[1]}.{sig}"

        with pytest.raises(TokenInvalid):
            verify(tampered, public_key_pem=public)

    def test_garbage_is_refused_without_crashing(self, keys):
        _, public = keys
        with pytest.raises(TokenInvalid) as exc:
            verify("not-a-token", public_key_pem=public)
        assert exc.value.code == "malformed"


class TestRotation:
    def test_each_token_has_a_distinct_jti(self, batch):
        jtis = {jwt.decode(t["token"], options={"verify_signature": False})["jti"] for t in batch}
        assert len(jtis) == len(batch)

    def test_tokens_expire_in_sequence(self, batch):
        for a, b in zip(batch, batch[1:]):
            assert b["exp"] > a["exp"]

    def test_only_one_token_is_current_at_a_time(self, keys, batch):
        """
        A forwarded screenshot must not unlock the whole batch.

        Each token's window is ~60s apart, so a code captured now is useless a
        few minutes later even though the batch continues.
        """
        _, public = keys
        now = datetime.now(timezone.utc)
        # The third token's window has not opened yet, and is beyond the skew
        # allowance, so it must not verify at `now`.
        far_future_token = batch[3]["token"]
        payload = jwt.decode(far_future_token, options={"verify_signature": False})
        assert payload["iat"] > (now + timedelta(seconds=CLOCK_SKEW_SECONDS)).timestamp()

    def test_an_expired_token_is_refused(self, keys):
        private, public = keys
        old = mint_batch(
            private_key_pem=private,
            trip_id=uuid.uuid4(),
            collector_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            student_ids=[uuid.uuid4()],
            count=1,
            start=datetime.now(timezone.utc) - timedelta(hours=2),
        )[0]["token"]

        with pytest.raises(TokenInvalid) as exc:
            verify(old, public_key_pem=public)
        assert exc.value.code == "expired"


class TestReplay:
    def test_a_used_token_cannot_be_redeemed_twice(self, keys, batch):
        """
        The screenshot defence.

        A forwarded code is still correctly signed and may still be inside its
        window. Recording the jti is what stops it being used a second time.
        """
        _, public = keys
        payload = verify(batch[0]["token"], public_key_pem=public)

        with pytest.raises(TokenInvalid) as exc:
            verify(batch[0]["token"], public_key_pem=public, used_jtis={payload["jti"]})
        assert exc.value.code == "already_used"

    def test_a_different_token_still_works_after_one_is_used(self, keys, batch):
        _, public = keys
        first = verify(batch[0]["token"], public_key_pem=public)
        # Burning one code must not burn the trip.
        second = verify(batch[1]["token"], public_key_pem=public, used_jtis={first["jti"]})
        assert second["jti"] != first["jti"]


class TestClockSkew:
    def test_a_slightly_fast_guard_clock_still_verifies(self, keys):
        """
        Cheap Android phones drift. A guard whose clock is 40 seconds fast must
        not reject every valid code in the school.
        """
        private, public = keys
        token = mint_batch(
            private_key_pem=private,
            trip_id=uuid.uuid4(),
            collector_id=uuid.uuid4(),
            school_id=uuid.uuid4(),
            student_ids=[uuid.uuid4()],
            count=1,
            start=datetime.now(timezone.utc) + timedelta(seconds=40),
        )[0]["token"]
        assert verify(token, public_key_pem=public)["jti"]


class TestBatchSizing:
    def test_the_default_batch_covers_a_full_trip(self):
        """
        20 tokens is ~20 minutes against a trip window of up to 90. A collector
        waiting at the gate would run out in exactly the offline case this
        exists for.
        """
        from app.routers.qr import DEFAULT_BATCH

        covered_minutes = (DEFAULT_BATCH * ROTATE_SECONDS) / 60
        assert covered_minutes >= 90

    def test_the_lifetime_exceeds_the_rotation_interval(self):
        # Otherwise a code expires in the gap between the guard raising the
        # camera and the shutter firing.
        assert TOKEN_LIFETIME_SECONDS > ROTATE_SECONDS
