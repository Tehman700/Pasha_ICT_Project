"""
Road distance from an OpenStreetMap routing engine, folded into the ETA maths.

The queue orders by ETA, and that ETA came from a straight line. A straight
line is systematically short: a van 2km from the school as the crow flies has
more road than that to drive. The queue still ordered correctly most of the
time, because the error runs the same way for everyone - but "4 minutes" was
optimistic in a way a parent notices at a gate.

This does NOT call out on every location ping. That would put an external HTTP
request in the hot path of the busiest endpoint in the system, and a gate
cannot stall because a maps API is slow. Instead:

  first ping, in the    ask for the real route, divide by the straight line,
  BACKGROUND            cache the ratio for the life of the trip
  every ping            haversine * ratio, with the existing rolling speed

The ratio is a property of the road network between two points, not of where
the van has got to, so measuring it once is enough. Typical urban values land
between 1.2 and 1.6.

    ── Why OSM and not a commercial provider ────────────────────────────

    TomTom was tried first and cannot route in Pakistan. Measured across 31
    origin/destination pairs in Lahore, Islamabad and Karachi: 31 declined.
    Some failed honestly with MAP_MATCHING_FAILURE. The rest were worse -
    HTTP 200, confident numbers, for a journey between points it had
    silently dragged kilometres onto its road network. One Lahore pair came
    back with a road SHORTER than the straight line between its endpoints,
    which is impossible, and is the only reason any of it was caught.

    The same 12 pairs through OSM data: 12 routed, snapping 0-52m, ratios
    1.11 to 1.90. OSM's Pakistan coverage is community-mapped and is simply
    better than the commercial alternative here.

Failure is never an error. Any problem returns 1.0, which reproduces the
straight-line behaviour this system has always had.
"""

from __future__ import annotations

import logging

import httpx

from app.config import settings
from app.services.eta import haversine_m

log = logging.getLogger(__name__)

DEFAULT_RATIO = 1.0

# A route longer than 3x the straight line is not a school run. Clamped rather
# than trusted, so one strange answer cannot push a collector down the queue.
MAX_RATIO = 3.0
MIN_RATIO = 1.0

# How far the engine may move our coordinates onto its road network before the
# answer stops being about the journey we asked for. A real GPS fix from a
# moving van sits on a road and snaps by metres; OSM snapped 0-52m across the
# whole test set. This is the check that caught TomTom.
MAX_SNAP_M = 250.0

# Nothing waits on this - it runs in a background task - but a request that
# hangs forever would pin a threadpool worker.
TIMEOUT_SECONDS = 6.0


def road_ratio(
    *, from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> float:
    """
    road distance / straight-line distance for this origin and destination.

    Returns DEFAULT_RATIO (1.0) on any failure, which is exactly the
    straight-line behaviour, not a degraded one.
    """
    base = settings.routing_base_url.rstrip("/")
    if not base:
        return DEFAULT_RATIO

    straight = haversine_m(from_lat, from_lng, to_lat, to_lng)
    # Below ~50m the ratio is dominated by GPS noise and means nothing. They
    # have arrived anyway.
    if straight < 50:
        return DEFAULT_RATIO

    # OSRM takes lng,lat - the opposite order to everything else in this file.
    url = f"{base}/route/v1/driving/{from_lng},{from_lat};{to_lng},{to_lat}"

    try:
        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            res = client.get(url, params={"overview": "false"})
        if res.status_code != 200:
            log.warning("routing %s: %s", res.status_code, res.text[:200])
            return DEFAULT_RATIO

        body = res.json()
        if body.get("code") != "Ok" or not body.get("routes"):
            log.info("routing declined: %s", body.get("code"))
            return DEFAULT_RATIO

        road_m = float(body["routes"][0]["distance"])

        # OSRM reports, per waypoint, how far it had to move the coordinate to
        # reach a road. If it had to go far, this route is not ours.
        drift = max(float(w.get("distance", 0.0)) for w in body.get("waypoints", []))
        if drift > MAX_SNAP_M:
            log.info("routing snapped %.0fm off, declining", drift)
            return DEFAULT_RATIO
    except Exception as exc:  # noqa: BLE001
        # Never let a maps provider decide whether a trip can be estimated.
        log.warning("routing failed: %s", type(exc).__name__)
        return DEFAULT_RATIO

    ratio = road_m / straight
    if ratio < MIN_RATIO or ratio > MAX_RATIO:
        log.info("routing ratio %.2f out of range, ignoring", ratio)
        return DEFAULT_RATIO
    return ratio
