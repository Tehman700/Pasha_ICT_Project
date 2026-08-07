"""
ETA tests.

This feeds both the queue order and the classroom announcement, so its failure
modes are visible to everyone at once: a bad ETA reshuffles the queue and makes
the wrong child's name play in the wrong room.
"""

import pytest

from app.services.eta import (
    DEFAULT_SPEED_KMH,
    Fix,
    estimate,
    eta_seconds,
    haversine_m,
    rolling_speed_kmh,
    should_announce,
    speed_kmh,
)

SCHOOL_LAT, SCHOOL_LNG = 33.6844, 73.0479


class TestDistance:
    def test_same_point_is_zero(self):
        assert haversine_m(SCHOOL_LAT, SCHOOL_LNG, SCHOOL_LAT, SCHOOL_LNG) == 0

    def test_known_distance_is_about_right(self):
        # ~0.01 degrees of latitude is ~1.11 km anywhere on Earth.
        d = haversine_m(SCHOOL_LAT, SCHOOL_LNG, SCHOOL_LAT + 0.01, SCHOOL_LNG)
        assert 1050 < d < 1150

    def test_is_symmetric(self):
        a = haversine_m(33.68, 73.04, 33.70, 73.06)
        b = haversine_m(33.70, 73.06, 33.68, 73.04)
        assert abs(a - b) < 0.001


class TestSpeed:
    def test_measures_a_plausible_speed(self):
        # 500m in 60s = 30 km/h
        prev = Fix(33.6844, 73.0479, 0.0)
        cur = Fix(33.6844 + 0.0045, 73.0479, 60.0)
        s = speed_kmh(prev, cur)
        assert s is not None and 25 < s < 35

    def test_rejects_a_gps_jump(self):
        # 5km in 2 seconds is not movement, it is a bad fix. Returning None
        # rather than a number keeps it out of the rolling average.
        prev = Fix(33.6844, 73.0479, 0.0)
        cur = Fix(33.7300, 73.0479, 2.0)
        assert speed_kmh(prev, cur) is None

    def test_rejects_non_advancing_time(self):
        f = Fix(33.6844, 73.0479, 10.0)
        assert speed_kmh(f, Fix(33.69, 73.05, 10.0)) is None
        assert speed_kmh(f, Fix(33.69, 73.05, 5.0)) is None

    def test_a_single_fix_falls_back_to_the_default(self):
        assert rolling_speed_kmh([Fix(33.68, 73.04, 0.0)]) == DEFAULT_SPEED_KMH

    def test_stopped_at_a_light_does_not_mean_never_arriving(self):
        # Four fixes at the same spot. A literal reading is 0 km/h, which would
        # produce an ETA of hours and drop the parent to the back of the queue
        # for the length of one red light.
        fixes = [Fix(33.6844, 73.0479, float(t)) for t in (0, 15, 30, 45)]
        assert rolling_speed_kmh(fixes) == DEFAULT_SPEED_KMH

    def test_averages_across_fixes_rather_than_using_the_last(self):
        # Steady ~40 km/h: each step is ~0.003 deg lat (~333m) in 30s.
        fixes = [Fix(33.6844 + 0.003 * i, 73.0479, i * 30.0) for i in range(6)]
        s = rolling_speed_kmh(fixes)
        assert 35 < s < 45


class TestEtaSeconds:
    def test_zero_distance_is_zero(self):
        assert eta_seconds(0, 30) == 0

    def test_never_negative(self):
        assert eta_seconds(-100, 30) == 0

    def test_reasonable_estimate(self):
        # 1km at 30km/h = 120s
        assert 110 <= eta_seconds(1000, 30) <= 130

    def test_a_near_zero_speed_does_not_produce_an_absurd_eta(self):
        # Without the floor this divides by ~0 and returns hours.
        assert eta_seconds(1000, 0.0) < 60 * 30


class TestEstimate:
    def test_no_fixes_returns_zeroes(self):
        assert estimate(school_lat=SCHOOL_LAT, school_lng=SCHOOL_LNG, fixes=[]) == (
            0.0,
            0,
            False,
        )

    def test_far_away_is_outside_the_geofence(self):
        far = [Fix(SCHOOL_LAT + 0.05, SCHOOL_LNG, 0.0)]  # ~5.5km
        distance, eta, inside = estimate(
            school_lat=SCHOOL_LAT, school_lng=SCHOOL_LNG, fixes=far, geofence_radius_m=1000
        )
        assert distance > 4000 and not inside and eta > 0

    def test_at_the_gate_is_inside_the_geofence(self):
        here = [Fix(SCHOOL_LAT, SCHOOL_LNG, 0.0)]
        distance, eta, inside = estimate(
            school_lat=SCHOOL_LAT, school_lng=SCHOOL_LNG, fixes=here, geofence_radius_m=1000
        )
        assert distance < 10 and inside and eta == 0

    def test_eta_shrinks_as_the_collector_approaches(self):
        far = estimate(
            school_lat=SCHOOL_LAT,
            school_lng=SCHOOL_LNG,
            fixes=[Fix(SCHOOL_LAT + 0.03, SCHOOL_LNG, 0.0)],
        )[1]
        near = estimate(
            school_lat=SCHOOL_LAT,
            school_lng=SCHOOL_LNG,
            fixes=[Fix(SCHOOL_LAT + 0.005, SCHOOL_LNG, 0.0)],
        )[1]
        assert near < far


class TestAnnouncementTrigger:
    @pytest.mark.parametrize("eta,expected", [(0, True), (60, True), (120, True), (121, False), (600, False)])
    def test_fires_only_inside_the_window(self, eta, expected):
        assert should_announce(eta) is expected

    def test_never_fires_without_an_eta(self):
        assert should_announce(None) is False

    def test_the_trigger_is_eta_not_the_geofence_ring(self):
        # A collector 900m out is INSIDE a 1km ring but, in traffic, still
        # several minutes away. Announcing there would call a child to the gate
        # to stand and wait. This is the distinction the whole design rests on.
        slow_fixes = [
            Fix(SCHOOL_LAT + 0.0081 - 0.00002 * i, SCHOOL_LNG, i * 15.0)
            for i in range(5)
        ]
        distance, eta, inside = estimate(
            school_lat=SCHOOL_LAT,
            school_lng=SCHOOL_LNG,
            fixes=slow_fixes,
            geofence_radius_m=1000,
        )
        assert inside, "should be inside the 1km ring"
        assert not should_announce(eta), "but far too early to call the child"
