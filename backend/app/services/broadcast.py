"""
Publishing queue changes and classroom announcements.

Publishing is deliberately best-effort: a failure to notify must never fail the
action that caused it. If Redis is down, a handover must still complete — the
child is standing at the gate. The teacher's screen falling back to a manual
refresh is a far better outcome than a guard being unable to release a child
because a cache was unavailable.
"""

from __future__ import annotations

import json
import logging
import uuid

import redis

from app.config import settings

log = logging.getLogger(__name__)

QUEUE_CHANNEL = "rukhsat:queue"
ANNOUNCE_CHANNEL = "rukhsat:announce"


def _publish(channel: str, message: dict) -> bool:
    try:
        client = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        client.publish(channel, json.dumps(message))
        return True
    except Exception as exc:  # noqa: BLE001
        # Logged, never raised. See the module docstring.
        log.warning("broadcast to %s failed: %s", channel, exc)
        return False


def queue_changed(
    *,
    school_id: uuid.UUID,
    class_id: uuid.UUID | None = None,
    reason: str = "update",
) -> bool:
    """
    Tell listeners the queue moved.

    Carries the reason rather than the whole queue: subscribers re-read the
    snapshot themselves, so a message that arrives out of order cannot show a
    stale queue. Ordering guarantees across two workers are not worth relying
    on for something a teacher is reading at a glance.
    """
    return _publish(
        QUEUE_CHANNEL,
        {
            "school_id": str(school_id),
            "class_id": str(class_id) if class_id else None,
            "reason": reason,
        },
    )


def announce(
    *,
    class_id: uuid.UUID,
    trip_id: uuid.UUID,
    collector_name: str,
    students: list[dict],
    eta_seconds: int | None,
) -> bool:
    """
    Tell one classroom display to speak.

    Every child of one trip in this class is batched into a SINGLE
    announcement. Without batching, thirty arrivals across a 90-minute
    dismissal is an announcement every ~30 seconds in every room, and everyone
    stops listening — which is worse than not announcing at all.
    """
    return _publish(
        ANNOUNCE_CHANNEL,
        {
            "class_id": str(class_id),
            "trip_id": str(trip_id),
            "collector_name": collector_name,
            "students": students,
            "eta_seconds": eta_seconds,
            "kind": "arrival",
        },
    )
