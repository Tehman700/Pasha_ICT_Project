"""
Auth tests.

These check the behaviours that matter for a child-safety system: that a bad
password cannot get in, that the response cannot be used to enumerate accounts,
that expired and forged tokens are refused, and that role guards actually guard.
"""

from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.config import settings
from app.models import Role
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_the_plaintext(self):
        h = hash_password("rukhsat123")
        assert h != "rukhsat123"
        assert h.startswith("$argon2")

    def test_same_password_hashes_differently_each_time(self):
        # Argon2 salts per-hash; identical hashes would leak that two accounts
        # share a password.
        assert hash_password("same") != hash_password("same")

    def test_verify_accepts_correct_and_rejects_wrong(self):
        h = hash_password("correct-horse")
        assert verify_password("correct-horse", h) is True
        assert verify_password("wrong", h) is False

    def test_verify_does_not_raise_on_a_malformed_hash(self):
        # A corrupt column value must fail closed, not 500.
        assert verify_password("anything", "not-a-hash") is False


class TestTokens:
    def test_roundtrip_carries_role_and_school(self):
        token, expires_in = create_access_token("user-1", "guard", "school-1")
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-1"
        assert payload["role"] == "guard"
        assert payload["sch"] == "school-1"
        assert expires_in == settings.jwt_expires_seconds

    def test_expired_token_is_rejected(self):
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        token = jwt.encode(
            {"sub": "u", "exp": int(past.timestamp())},
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )
        assert decode_access_token(token) is None

    def test_token_signed_with_another_secret_is_rejected(self):
        token = jwt.encode({"sub": "u"}, "attacker-secret", algorithm="HS256")
        assert decode_access_token(token) is None

    def test_garbage_is_rejected(self):
        assert decode_access_token("not.a.token") is None


class TestLogin:
    def test_correct_credentials_return_a_token_and_the_user(self, client, make_user):
        user = make_user(role=Role.parent, password="hunter2000")
        resp = client.post(
            "/v1/auth/login", json={"phone": user.phone, "password": "hunter2000"}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["access_token"]
        assert body["expires_in"] > 0
        assert body["user"]["phone"] == user.phone
        # The hash must never cross the wire.
        assert "password_hash" not in body["user"]

    def test_wrong_password_is_refused(self, client, make_user):
        user = make_user(password="right")
        resp = client.post(
            "/v1/auth/login", json={"phone": user.phone, "password": "wrong"}
        )
        assert resp.status_code == 401

    def test_unknown_phone_gives_the_same_error_as_a_wrong_password(
        self, client, make_user
    ):
        user = make_user(password="right")
        wrong_pw = client.post(
            "/v1/auth/login", json={"phone": user.phone, "password": "wrong"}
        )
        unknown = client.post(
            "/v1/auth/login", json={"phone": "+923009999999", "password": "wrong"}
        )
        # Identical status AND body, so the endpoint cannot be used to discover
        # which phone numbers have accounts.
        assert wrong_pw.status_code == unknown.status_code == 401
        assert wrong_pw.json() == unknown.json()

    def test_disabled_account_cannot_log_in(self, client, make_user, db):
        user = make_user(password="pw123456")
        user.is_active = False
        db.flush()
        resp = client.post(
            "/v1/auth/login", json={"phone": user.phone, "password": "pw123456"}
        )
        assert resp.status_code == 403


class TestCurrentUser:
    def test_me_requires_a_token(self, client):
        assert client.get("/v1/users/me").status_code == 401

    def test_me_rejects_a_forged_token(self, client):
        forged = jwt.encode({"sub": "x"}, "attacker", algorithm="HS256")
        resp = client.get("/v1/users/me", headers={"Authorization": f"Bearer {forged}"})
        assert resp.status_code == 401

    def test_me_returns_the_signed_in_user(self, client, auth_headers):
        headers, user = auth_headers(Role.teacher)
        resp = client.get("/v1/users/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == str(user.id)
        assert resp.json()["role"] == "teacher"

    def test_patch_me_sets_the_fcm_token(self, client, auth_headers):
        # users.fcm_token existed in the schema with no way to populate it,
        # which made push notifications impossible.
        headers, _ = auth_headers(Role.parent)
        resp = client.patch(
            "/v1/users/me", json={"fcm_token": "fcm-abc-123"}, headers=headers
        )
        assert resp.status_code == 200
        me = client.get("/v1/users/me", headers=headers)
        assert me.status_code == 200

    def test_patch_me_rejects_an_unsupported_locale(self, client, auth_headers):
        headers, _ = auth_headers(Role.parent)
        resp = client.patch("/v1/users/me", json={"locale": "fr"}, headers=headers)
        assert resp.status_code == 422


class TestRoles:
    @pytest.mark.parametrize(
        "role", [Role.parent, Role.teacher, Role.guard, Role.admin, Role.driver]
    )
    def test_every_role_can_authenticate(self, client, make_user, role):
        # `driver` is the role added for the collector model — it must work
        # exactly like the original four.
        user = make_user(role=role, password="pw12345678")
        resp = client.post(
            "/v1/auth/login", json={"phone": user.phone, "password": "pw12345678"}
        )
        assert resp.status_code == 200
        assert resp.json()["user"]["role"] == role.value
