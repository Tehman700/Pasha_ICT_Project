"""
Distance, ETA, and the geofence.

Haversine distance divided by a rolling average speed — NOT the Google Routes
API. It is free, accurate enough to order a queue, and keeps a paid dependency
out of the hot path. The Maps SDK renders a map and nothing else.

This is the busiest dependency in the system: the queue orders by it, and the
classroom announcement fires on it.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# Urban Islamabad during the 1:00–2:30 dismissal window. Used until a trip has
# produced enough real movement to measure its own speed.
DEFAULT_SPEED_KMH = 22.0

# Below this, a collector is stopped — at a light, in traffic, or parked.
# Dividing by a near-zero speed produces an ETA of hours, which is worse than
# no estimate at all, so the fallback speed is used instead.
MIN_MEANINGFUL_SPEED_KMH = 3.0

# A GPS fix can jump hundreds of metres while stationary. Anything implying a
# speed above this is noise, not movement, and must not poison the average.
MAX_PLAUSIBLE_SPEED_KMH = 120.0

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


@dataclass(frozen=True)
class Fix:
    """One position report."""

    lat: float
    lng: float
    at_epoch: float


def speed_kmh(previous: Fix, current: Fix) -> float | None:
    """
    Speed between two fixes, or None when the pair says nothing useful.

    Returns None rather than 0.0 for a rejected sample so the caller can tell
    "we could not measure" from "they are stopped" — those mean different
    things for an ETA.
    """
    dt = current.at_epoch - previous.at_epoch
    if dt <= 0:
        return None

    metres = haversine_m(previous.lat, previous.lng, current.lat, current.lng)
    kmh = (metres / dt) * 3.6

    if kmh > MAX_PLAUSIBLE_SPEED_KMH:
        return None  # GPS jump, not movement
    return kmh


def rolling_speed_kmh(fixes: list[Fix], window: int = 5) -> float:
    """
    Average speed over the last few fixes.

    A single sample is far too jittery to drive a queue position — one red
    light would drop a parent several places and then restore them, and a
    queue that reshuffles every fifteen seconds is unusable at a gate.
    """
    if len(fixes) < 2:
        return DEFAULT_SPEED_KMH

    samples: list[float] = []
    for prev, cur in zip(fixes[-(window + 1) :], fixes[-window:]):
        s = speed_kmh(prev, cur)
        if s is not None:
            samples.append(s)

    if not samples:
        return DEFAULT_SPEED_KMH

    avg = sum(samples) / len(samples)
    # Stopped at a light is not "will never arrive".
    return avg if avg >= MIN_MEANINGFUL_SPEED_KMH else DEFAULT_SPEED_KMH


def eta_seconds(distance_m: float, speed_kmh_value: float) -> int:
    """Seconds to cover a distance. Never negative."""
    if distance_m <= 0:
        return 0
    speed = max(speed_kmh_value, MIN_MEANINGFUL_SPEED_KMH)
    return max(0, int((distance_m / (speed * 1000 / 3600))))


def estimate(
    *,
    school_lat: float,
    school_lng: float,
    fixes: list[Fix],
    geofence_radius_m: int = 1000,
) -> tuple[float, int, bool]:
    """
    Returns (distance_m, eta_seconds, inside_geofence).

    Straight-line distance underestimates road distance, so this is optimistic
    by design — a parent told "4 minutes" who arrives in 5 is a better outcome
    than a child left waiting at a gate because the estimate was pessimistic.
    """
    if not fixes:
        return (0.0, 0, False)

    last = fixes[-1]
    distance = haversine_m(last.lat, last.lng, school_lat, school_lng)
    speed = rolling_speed_kmh(fixes)
    return (distance, eta_seconds(distance, speed), distance <= geofence_radius_m)


def should_announce(eta: int | None, threshold_seconds: int = 120) -> bool:
    """
    Whether the classroom display should speak.

    Fires on ETA, NOT on the geofence ring. "One to two minutes away" is
    roughly 500–650m and varies with traffic; a fixed 1km ring would announce
    a child four minutes early on a clear road and a minute late in traffic.
    The ring still marks `entered_geofence_at` for the audit trail.
    """
    return eta is not None and 0 <= eta <= threshold_seconds
