"""
Phone canonicalisation.

`users.phone` is UNIQUE, so the shape a number is stored in is a correctness
concern, not formatting. If the same human can be stored as `+923001234567`
and `03001234567`, the database accepts both as different people — and half
their children become invisible from whichever account they happen to sign
into. That is the fault these tests exist to prevent.
"""

import pytest

from app.models import Role
from app.phone import is_valid, normalise


class TestNormalise:
    @pytest.mark.parametrize(
        "raw",
        [
            "03001234567",
            "+923001234567",
            "923001234567",
            "0092 3001234567",
            "0300-123-4567",
            "0300 123 4567",
            "3001234567",  # leading zero dropped, as when a +92 prefix is deleted
        ],
    )
    def test_every_way_a_pakistani_number_is_written_collapses_to_one(self, raw):
        assert normalise(raw) == "03001234567"

    @pytest.mark.parametrize("raw", ["", None, "abc", "0300123456", "0300123456789"])
    def test_what_cannot_be_a_pakistani_mobile_is_not_claimed_to_be(self, raw):
        assert not is_valid(raw)

    def test_normalising_twice_changes_nothing(self):
        once = normalise("+923001234567")
        assert normalise(once) == once


class TestLoginAcceptsAnySpelling:
    """
    A parent who typed +92 when registering months ago, and 0300 today, is the
    same person and must reach the same account.
    """

    @pytest.mark.parametrize(
        "typed", ["03009998877", "+923009998877", "0300-999-8877", "0300 999 8877"]
    )
    def test_a_stored_canonical_number_is_reachable_however_it_is_typed(
        self, client, make_user, typed
    ):
        make_user(Role.parent, password="testpass123", phone="03009998877")
        r = client.post(
            "/v1/auth/login", json={"phone": typed, "password": "testpass123"}
        )
        assert r.status_code == 200, r.text


class TestRegistrationEnforcesTheFormat:
    def test_a_malformed_number_is_refused_with_a_useful_message(self, client):
        r = client.post(
            "/v1/auth/register-admin",
            json={
                "name": "Imran Qureshi",
                "phone": "12345",
                "password": "adminpass123",
                "school": {"name": "Test School", "lat": 33.6, "lng": 73.0},
            },
        )
        assert r.status_code == 422
        # One consistent message whatever the input is wrong about.
        assert "03xxxxxxxxx" in r.text

    def test_a_number_typed_with_the_country_code_is_stored_canonically(
        self, client, db
    ):
        from app.models import User

        r = client.post(
            "/v1/auth/register-admin",
            json={
                "name": "Imran Qureshi",
                "phone": "+923005551234",
                "password": "adminpass123",
                "school": {"name": "Test School", "lat": 33.6, "lng": 73.0},
            },
        )
        assert r.status_code == 201, r.text
        admin = db.get(User, __import__("uuid").UUID(r.json()["user"]["id"]))
        # Stored canonically regardless of how it arrived — otherwise the same
        # person could register again in the other spelling.
        assert admin.phone == "03005551234"
