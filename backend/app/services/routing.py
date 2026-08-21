"""
Road distance from TomTom, folded into the existing ETA maths.

The queue orders by ETA, and until now that ETA came from a straight line. A
straight line is systematically short: a van 2km from the school as the crow
flies has more road than that to drive, and how much more depends on the city.
The queue still ordered *correctly* most of the time, because the error is in
the same direction for everyone — but "4 minutes" was optimistic in a way a
parent notices at a gate.

What this does NOT do is call TomTom on every location ping. That would put an
external HTTP request in the hot path of the busiest endpoint in the system,
which services/eta.py deliberately avoided, and a gate cannot stall because a
maps API is slow. Instead:

  first ping, in the    ask TomTom for the real route, divide by the straight
  BACKGROUND            line, cache the ratio for the life of the trip
  every ping            haversine * ratio, with the existing rolling speed

The measurement happens off the request path entirely, via BackgroundTasks, so
even the first ping never waits on TomTom. That ping uses 1.0 and is therefore
exactly as accurate as the system was yesterday; every ping after it is better.

The ratio is stable for a given origin/destination pair — it is a property of
the road network between two points, not of where the van has got to. Typical
urban values land between 1.2 and 1.6.

Failure is not an error. If TomTom is slow, down, or the key is missing, the
ratio stays 1.0 and the system behaves exactly as it did before.

    ── STATUS: DORMANT, and deliberately so ─────────────────────────────

    This is switched off in production by leaving TOMTOM_API_KEY empty,
    because TomTom cannot route in Pakistan.

    Measured 21 Aug 2026 across 31 pairs in Lahore, Islamabad and Karachi:
    31 declined. Some fail outright with MAP_MATCHING_FAILURE or
    NO_ROUTE_FOUND. The rest are worse - they return HTTP 200 with a
    confident, plausible-looking route between points TomTom dragged
    kilometres onto its road network. Two examples:

      Gulberg -> Model Town   origin snapped 2,172m, dest 2,319m
                              "route" 3,333m vs 5,529m straight line,
                              a ratio of 0.60, i.e. shorter than the
                              straight line, which is impossible

      TomTom's OWN POI coords for three Lahore landmarks snapped
      846m, 2,703m and 2,703m off its own road network

    A 200 that answers a question nobody asked is more dangerous than an
    error, which is why the snap check exists rather than a bare status
    check. It is what turns this from "works" into "declines".

    The code stays because it is inert and correct: every failure path
    returns 1.0, which is the straight-line behaviour the queue has always
    had. Set TOMTOM_API_KEY and it starts contributing the day coverage
    improves, or the day this deploys somewhere TomTom maps properly.
    Verify with the snap check before trusting it - a 200 is not evidence.
"""

from __future__ import annotations

import logging

import httpx

from app.config import settings
from app.services.eta import haversine_m

log = logging.getLogger(__name__)

DEFAULT_RATIO = 1.0

# A route longer than 3x the straight line is not a school run. Clamped rather
# than trusted, so one strange response cannot push a collector to the back of
# a queue.
MAX_RATIO = 3.0
MIN_RATIO = 1.0

# How far TomTom may move our coordinates onto its road network before the
# answer stops being about the journey we asked for.
#
# This is not theoretical. Measured against Lahore, a point in Gulberg was
# snapped 2,172m and a point in Model Town 2,319m - so the "route" returned was
# between two places kilometres from either. It came back SHORTER than the
# straight line, a ratio of 0.60, which is physically impossible and is the
# tell. Against the snapped points the same route gives 1.01, i.e. TomTom was
# right about a journey nobody asked about.
#
# A real GPS fix from a moving van sits on a road and snaps by metres. A school
# gate pinned on the map snaps by tens. Anything beyond this means TomTom's
# Pakistan road data does not cover the point, and the honest answer is to
# decline rather than to invent a ratio.
MAX_SNAP_M = 250.0

# This runs in a background task, so nothing is waiting on it - but a request
# that hangs forever would pin a threadpool worker.
TIMEOUT_SECONDS = 4.0


def road_ratio(
    *, from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> float:
    """
    road distance / straight-line distance, for this origin and destination.

    Returns DEFAULT_RATIO (1.0) on any failure, which reproduces the previous
    straight-line behaviour exactly.
    """
    key = settings.tomtom_api_key
    if not key:
        return DEFAULT_RATIO

    straight = haversine_m(from_lat, from_lng, to_lat, to_lng)
    # Below ~50m the ratio is dominated by GPS noise and the answer is
    # meaningless. They have arrived anyway.
    if straight < 50:
        return DEFAULT_RATIO

    url = (
        "https://api.tomtom.com/routing/1/calculateRoute/"
        f"{from_lat},{from_lng}:{to_lat},{to_lng}/json"
    )
    params = {
        "key": key,
        # Traffic is enabled on the key, so this is a live-traffic route rather
        # than a free-flow one. That is the whole point of asking TomTom at all
        # rather than multiplying by a constant.
        "traffic": "true",
        "travelMode": "car",
        "routeType": "fastest",
        "computeTravelTimeFor": "all",
    }

    try:
        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            res = client.get(url, params=params)
        if res.status_code != 200:
            log.warning("tomtom routing %s: %s", res.status_code, res.text[:200])
            return DEFAULT_RATIO

        route = res.json()["routes"][0]
        road_m = float(route["summary"]["lengthInMeters"])

        # Where did TomTom actually start and finish? If it had to drag our
        # coordinates onto a road far away, the route is not ours.
        points = route["legs"][0]["points"]
        snapped_from = (points[0]["latitude"], points[0]["longitude"])
        snapped_to = (points[-1]["latitude"], points[-1]["longitude"])
        drift = max(
            haversine_m(from_lat, from_lng, *snapped_from),
            haversine_m(to_lat, to_lng, *snapped_to),
        )
        if drift > MAX_SNAP_M:
            log.info("tomtom snapped %.0fm off route, declining", drift)
            return DEFAULT_RATIO
    except Exception as exc:  # noqa: BLE001
        # Never let the maps provider decide whether a trip can start.
        log.warning("tomtom routing failed: %s", type(exc).__name__)
        return DEFAULT_RATIO

    ratio = road_m / straight
    if ratio < MIN_RATIO or ratio > MAX_RATIO:
        log.info("tomtom ratio %.2f out of range, ignoring", ratio)
        return DEFAULT_RATIO
    return ratio
