"""
School onboarding tests.

Two properties matter here beyond "the endpoint works":

  1. A school created through the API is immediately *usable* — meaning it has
     an ES256 keypair. Without one it looks healthy and then fails at the gate.
  2. Moving a school or resizing its geofence is an administrator's power and
     nobody else's, because it silently governs whether arrival announcements
     fire at all.
"""

import uuid

import pytest

from app.models import Role, School, User


def signup_payload(**over):
    body = {
        "name": "Imran Qureshi",
        "phone": "03005550001",
        "password": "adminpass123",
        "school": {
            "name": "Bahria Foundation School",
            "lat": 33.6844,
            "lng": 73.0479,
            "geofence_radius_m": 1200,
            "dismissal_time": "13:15",
        },
    }
    body.update(over)
    return body


def token_for(client, phone, password):
    r = client.post("/v1/auth/login", json={"phone": phone, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


class TestAdminSignup:
    def test_creates_both_the_school_and_its_administrator(self, client, db):
        r = client.post("/v1/auth/register-admin", json=signup_payload())
        assert r.status_code == 201, r.text
        body = r.json()

        assert body["user"]["role"] == "admin"
        assert body["school"]["name"] == "Bahria Foundation School"
        assert body["school"]["geofence_radius_m"] == 1200

        admin = db.get(User, uuid.UUID(body["user"]["id"]))
        assert admin is not None
        # The whole reason signup takes both halves at once: this column is
        # NOT NULL, so the administrator cannot predate their school.
        assert str(admin.school_id) == body["school"]["id"]

    def test_the_new_school_can_actually_sign_qr_codes(self, client, db):
        """
        A school without a keypair looks fine until the first code is shown at
        a gate. Generating it at creation is the only way that failure cannot
        happen days later, far from its cause.
        """
        r = client.post("/v1/auth/register-admin", json=signup_payload())
        school = db.get(School, uuid.UUID(r.json()["school"]["id"]))

        assert school.private_key_enc and "PRIVATE KEY" in school.private_key_enc
        assert school.public_key and "PUBLIC KEY" in school.public_key

    def test_returns_a_token_so_the_browser_need_not_log_in_again(self, client):
        r = client.post("/v1/auth/register-admin", json=signup_payload())
        assert r.json()["access_token"]

        me = client.get(
            "/v1/users/me",
            headers={"Authorization": f"Bearer {r.json()['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()["role"] == "admin"

    def test_a_taken_phone_is_refused(self, client):
        client.post("/v1/auth/register-admin", json=signup_payload())
        again = client.post("/v1/auth/register-admin", json=signup_payload())
        assert again.status_code == 409

    @pytest.mark.parametrize("radius", [10, 50_000])
    def test_an_unusable_geofence_is_refused(self, client, radius):
        """
        Too small and the ring sits inside the building so nobody ever enters
        it; too large and it covers a city and stops meaning "nearly here".
        Both look like the feature quietly not working.
        """
        body = signup_payload()
        body["school"]["geofence_radius_m"] = radius
        r = client.post("/v1/auth/register-admin", json=body)
        assert r.status_code == 422

    def test_a_bad_dismissal_time_is_refused(self, client):
        body = signup_payload()
        body["school"]["dismissal_time"] = "half past one"
        r = client.post("/v1/auth/register-admin", json=body)
        assert r.status_code == 422

    def test_nothing_is_left_behind_when_signup_fails(self, client, db):
        """A rejected signup must not leave an orphan school with no admin."""
        before = len(db.execute(School.__table__.select()).all())
        body = signup_payload()
        body["school"]["dismissal_time"] = "nonsense"
        assert client.post("/v1/auth/register-admin", json=body).status_code == 422
        assert len(db.execute(School.__table__.select()).all()) == before


class TestSchoolUpdate:
    def test_an_admin_can_move_the_school_and_resize_the_geofence(self, client, db):
        created = client.post("/v1/auth/register-admin", json=signup_payload()).json()
        headers = token_for(client, "03005550001", "adminpass123")

        r = client.patch(
            f"/v1/schools/{created['school']['id']}",
            json={"lat": 31.5204, "lng": 74.3587, "geofence_radius_m": 800},
            headers=headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["lat"] == 31.5204
        assert r.json()["geofence_radius_m"] == 800

    def test_half_a_coordinate_pair_is_refused(self, client):
        created = client.post("/v1/auth/register-admin", json=signup_payload()).json()
        headers = token_for(client, "03005550001", "adminpass123")

        r = client.patch(
            f"/v1/schools/{created['school']['id']}",
            json={"lat": 31.5204},
            headers=headers,
        )
        # Latitude alone puts the school in the sea and the geofence silently
        # stops matching anyone.
        assert r.status_code == 422

    def test_a_teacher_cannot_move_the_school(self, client, make_user):
        """
        Resizing a geofence decides whether arrival announcements fire at all —
        a much bigger lever than the screen suggests, so it is admin-only.
        """
        teacher = make_user(
            Role.teacher, password="teacherpass123", phone="03004440001"
        )
        headers = token_for(client, "03004440001", "teacherpass123")

        r = client.patch(
            f"/v1/schools/{teacher.school_id}",
            json={"geofence_radius_m": 5000},
            headers=headers,
        )
        assert r.status_code == 403

    def test_an_admin_cannot_move_another_school(self, client, db):
        client.post("/v1/auth/register-admin", json=signup_payload())
        other = client.post(
            "/v1/auth/register-admin",
            json=signup_payload(phone="03005550002"),
        ).json()

        headers = token_for(client, "03005550001", "adminpass123")
        r = client.patch(
            f"/v1/schools/{other['school']['id']}",
            json={"geofence_radius_m": 900},
            headers=headers,
        )
        assert r.status_code == 403
