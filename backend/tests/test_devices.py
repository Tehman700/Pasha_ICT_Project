"""
Classroom display tests.

The failure this system has to avoid is silence. A display that stops
announcing has no other symptom — nobody in the room knows it is broken, they
just stop hearing names and assume nobody is arriving.
"""

import io
import uuid

import pytest

from app.models import (
    AudioSubject,
    ClassroomDevice,
    Guardianship,
    NameAudio,
    Role,
    SchoolClass,
    Student,
)


def token(client, user):
    r = client.post(
        "/v1/auth/login", json={"phone": user.phone, "password": "testpass123"}
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def klass(db, school):
    c = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery")
    db.add(c)
    db.flush()
    return c


class TestPairing:
    def test_admin_creates_a_device_and_gets_a_code(self, client, make_user, klass):
        admin = make_user(Role.admin)
        r = client.post(
            "/v1/devices", headers=token(client, admin), json={"class_id": str(klass.id)}
        )
        assert r.status_code == 201
        assert len(r.json()["pairing_code"]) == 6

    def test_the_code_avoids_ambiguous_characters(self, client, make_user, klass):
        """
        Someone reads this off a dashboard and types it into a tablet across
        the room. O/0 and I/1/l cost more support calls than the entropy is
        worth.
        """
        admin = make_user(Role.admin)
        for _ in range(8):
            code = client.post(
                "/v1/devices",
                headers=token(client, admin),
                json={"class_id": str(klass.id)},
            ).json()["pairing_code"]
            assert not set(code) & set("O0I1L")

    def test_a_tablet_pairs_without_logging_in(self, client, make_user, klass):
        # Nobody is going to log a wall-mounted display in every morning.
        admin = make_user(Role.admin)
        code = client.post(
            "/v1/devices", headers=token(client, admin), json={"class_id": str(klass.id)}
        ).json()["pairing_code"]

        r = client.post(
            "/v1/devices/classroom/pair",
            json={"pairing_code": code, "device_identifier": "TEST-PAIR-01"},
        )
        assert r.status_code == 200
        assert r.json()["class_name"] == "Nursery"

    def test_a_code_burns_on_use(self, client, make_user, klass):
        # Otherwise a code written on a whiteboard pairs a second tablet later.
        admin = make_user(Role.admin)
        code = client.post(
            "/v1/devices", headers=token(client, admin), json={"class_id": str(klass.id)}
        ).json()["pairing_code"]

        first = client.post(
            "/v1/devices/classroom/pair",
            json={"pairing_code": code, "device_identifier": "TEST-BURN-1"},
        )
        second = client.post(
            "/v1/devices/classroom/pair",
            json={"pairing_code": code, "device_identifier": "TEST-BURN-2"},
        )
        assert first.status_code == 200
        assert second.status_code == 404

    def test_pairing_is_case_insensitive(self, client, make_user, klass):
        admin = make_user(Role.admin)
        code = client.post(
            "/v1/devices", headers=token(client, admin), json={"class_id": str(klass.id)}
        ).json()["pairing_code"]

        r = client.post(
            "/v1/devices/classroom/pair",
            json={"pairing_code": code.lower(), "device_identifier": "TEST-BURN-1"},
        )
        assert r.status_code == 200

    def test_a_bad_code_is_refused(self, client):
        r = client.post(
            "/v1/devices/classroom/pair",
            json={"pairing_code": "ZZZZZZ", "device_identifier": "TEST-BAD-1"},
        )
        assert r.status_code == 404


class TestHealth:
    def test_a_heartbeat_marks_the_display_online(self, client, db, make_user, klass):
        admin = make_user(Role.admin)
        device = client.post(
            "/v1/devices", headers=token(client, admin), json={"class_id": str(klass.id)}
        ).json()

        assert client.post(f"/v1/devices/{device['id']}/heartbeat").status_code == 204

        listed = client.get("/v1/devices", headers=token(client, admin)).json()
        mine = next(d for d in listed if d["id"] == device["id"])
        assert mine["online"] is True

    def test_a_display_that_never_checked_in_reads_offline(
        self, client, db, make_user, klass, school
    ):
        """
        The whole point of the health view: silence has no other symptom.
        """
        admin = make_user(Role.admin)
        db.add(
            ClassroomDevice(
                id=uuid.uuid4(),
                school_id=school.id,
                class_id=klass.id,
                device_identifier="TEST-DEAD-01",
                last_seen_at=None,
            )
        )
        db.flush()

        listed = client.get("/v1/devices", headers=token(client, admin)).json()
        dead = next(d for d in listed if d["device_identifier"] == "TEST-DEAD-01")
        assert dead["online"] is False


class TestAudioManifest:
    def test_missing_clips_are_reported_rather_than_hidden(
        self, client, db, make_user, klass, school
    ):
        """
        A name with no clip must degrade to class + count, not be silently
        skipped — a child whose name never gets called is the worst outcome.
        """
        admin = make_user(Role.admin)
        with_clip = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali Raza"
        )
        without = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Sara Malik"
        )
        db.add_all([with_clip, without])
        db.flush()
        db.add(
            NameAudio(
                id=uuid.uuid4(),
                subject_type=AudioSubject.student,
                subject_id=with_clip.id,
                audio_url="/media/name-audio/ali.m4a",
                duration_ms=900,
            )
        )
        db.flush()

        r = client.get(
            f"/v1/classes/{klass.id}/audio-manifest", headers=token(client, admin)
        )
        assert r.status_code == 200
        assert "Sara Malik" in r.json()["missing_names"]
        assert "Ali Raza" not in r.json()["missing_names"]

    def test_template_phrases_ship_in_both_languages(self, client, make_user, klass):
        # One clip per NAME covers both languages — a name sounds the same
        # either way. Only these surrounding phrases are recorded twice.
        admin = make_user(Role.admin)
        r = client.get(
            f"/v1/classes/{klass.id}/audio-manifest", headers=token(client, admin)
        )
        phrases = r.json()["template_phrases"]
        assert phrases["ur"] and phrases["en"]


class TestAudioUpload:
    def test_a_non_audio_file_is_refused(self, client, db, make_user, klass, school):
        admin = make_user(Role.admin)
        student = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali Raza"
        )
        db.add(student)
        db.flush()

        r = client.post(
            f"/v1/students/{student.id}/name-audio",
            headers=token(client, admin),
            files={"file": ("hack.exe", io.BytesIO(b"MZ..."), "application/x-msdownload")},
        )
        assert r.status_code == 415

    def test_re_recording_replaces_rather_than_accumulates(
        self, client, db, make_user, klass, school
    ):
        # Two clips for one person would make the announcement
        # non-deterministic.
        admin = make_user(Role.admin)
        student = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali Raza"
        )
        db.add(student)
        db.flush()

        for _ in range(2):
            r = client.post(
                f"/v1/students/{student.id}/name-audio",
                headers=token(client, admin),
                files={"file": ("ali.m4a", io.BytesIO(b"\x00\x01audio"), "audio/m4a")},
            )
            assert r.status_code == 201

        count = (
            db.query(NameAudio)
            .filter(NameAudio.subject_id == student.id)
            .count()
        )
        assert count == 1

    def test_only_an_admin_can_upload(self, client, db, make_user, klass, school):
        teacher = make_user(Role.teacher)
        student = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=klass.id, name="Ali Raza"
        )
        db.add(student)
        db.flush()

        r = client.post(
            f"/v1/students/{student.id}/name-audio",
            headers=token(client, teacher),
            files={"file": ("ali.m4a", io.BytesIO(b"\x00\x01audio"), "audio/m4a")},
        )
        assert r.status_code == 403


class TestRepairing:
    def test_a_tablet_can_be_moved_to_another_classroom(
        self, client, db, make_user, klass, school
    ):
        """
        Tablets get moved between rooms. The identifier column is globally
        unique, so without releasing the previous row this fails with an
        integrity error and the display simply never pairs — with nothing on
        screen explaining why.
        """
        admin = make_user(Role.admin)
        other = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Prep A")
        db.add(other)
        db.flush()

        first_code = client.post(
            "/v1/devices", headers=token(client, admin), json={"class_id": str(klass.id)}
        ).json()["pairing_code"]
        client.post(
            "/v1/devices/classroom/pair",
            json={"pairing_code": first_code, "device_identifier": "TAB-MOVER"},
        )

        second_code = client.post(
            "/v1/devices", headers=token(client, admin), json={"class_id": str(other.id)}
        ).json()["pairing_code"]
        moved = client.post(
            "/v1/devices/classroom/pair",
            json={"pairing_code": second_code, "device_identifier": "TAB-MOVER"},
        )

        assert moved.status_code == 200
        assert moved.json()["class_name"] == "Prep A"
