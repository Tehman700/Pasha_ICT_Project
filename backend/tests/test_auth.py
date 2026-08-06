"""Auth and role guards (M1.2)."""

from tests.conftest import DEMO_PASSWORD, auth


def test_health_reports_both_dependencies(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["database"] == "ok"
    assert body["redis"] == "ok"
    assert body["status"] == "ok"


def test_login_returns_token_and_expiry(client):
    r = client.post(
        "/v1/auth/login",
        json={"phone": "+923001112233", "password": DEMO_PASSWORD},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    # The original contract omitted this, so no client could know when to refresh.
    assert body["expires_in"] > 0
    assert body["user"]["role"] == "admin"


def test_every_seeded_role_can_log_in(client):
    """
    The original seed script omitted password_hash entirely, so not one seeded
    account could authenticate. This is the regression test for that.
    """
    for phone in [
        "+923001112233",  # admin
        "+923004445566",  # teacher
        "+923007778899",  # guard
        "+923331000001",  # parent
        "+923215000011",  # driver
    ]:
        r = client.post(
            "/v1/auth/login", json={"phone": phone, "password": DEMO_PASSWORD}
        )
        assert r.status_code == 200, f"{phone} could not log in"


def test_wrong_password_is_rejected(client):
    r = client.post(
        "/v1/auth/login", json={"phone": "+923001112233", "password": "wrong"}
    )
    assert r.status_code == 401


def test_unknown_phone_gives_the_same_error_as_wrong_password(client):
    """Responses must not let an attacker enumerate registered phone numbers."""
    unknown = client.post(
        "/v1/auth/login", json={"phone": "+920000000000", "password": "x"}
    )
    wrong = client.post(
        "/v1/auth/login", json={"phone": "+923001112233", "password": "x"}
    )
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]


def test_passwords_are_hashed_not_stored_plain(db):
    from sqlalchemy import select

    from app.models import User

    for user in db.execute(select(User)).scalars().all():
        assert DEMO_PASSWORD not in user.password_hash
        assert user.password_hash.startswith("$argon2")


def test_me_requires_a_token(client):
    assert client.get("/v1/users/me").status_code == 401


def test_me_rejects_a_garbage_token(client):
    r = client.get("/v1/users/me", headers=auth("not-a-real-token"))
    assert r.status_code == 401


def test_me_returns_the_signed_in_user(client, parent_token):
    r = client.get("/v1/users/me", headers=auth(parent_token))
    assert r.status_code == 200
    assert r.json()["name"] == "Tariq Raza"
    assert r.json()["role"] == "parent"


def test_me_never_leaks_the_password_hash(client, admin_token):
    body = client.get("/v1/users/me", headers=auth(admin_token)).json()
    assert "password_hash" not in body
    assert "fcm_token" not in body


def test_fcm_token_can_be_registered(client, parent_token):
    """
    users.fcm_token existed in the schema with no endpoint able to set it,
    which meant push notifications could never work at all.
    """
    r = client.patch(
        "/v1/users/me",
        headers=auth(parent_token),
        json={"fcm_token": "test-device-token-abc123"},
    )
    assert r.status_code == 200

    from sqlalchemy import select

    from app.db import SessionLocal
    from app.models import User

    with SessionLocal() as s:
        user = s.execute(
            select(User).where(User.phone == "+923331000001")
        ).scalar_one()
        assert user.fcm_token == "test-device-token-abc123"


def test_locale_must_be_en_or_ur(client, parent_token):
    ok = client.patch("/v1/users/me", headers=auth(parent_token), json={"locale": "ur"})
    assert ok.status_code == 200
    bad = client.patch("/v1/users/me", headers=auth(parent_token), json={"locale": "fr"})
    assert bad.status_code == 422
