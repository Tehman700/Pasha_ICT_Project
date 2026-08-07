"""
WebSocket queue and classroom-announcement streams.

Both push rather than poll. A teacher watching a queue that only updates when
she pulls to refresh will stop watching it, and a classroom display that polls
is a display that announces late.

Fan-out goes through Redis pub/sub rather than a process-local set of sockets.
Uvicorn runs two workers, so a state change handled by worker A must reach a
teacher connected to worker B — an in-memory registry would silently deliver to
half the room.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import date as Date

import redis.asyncio as aioredis
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.security import decode_access_token

router = APIRouter()

QUEUE_CHANNEL = "rukhsat:queue"
ANNOUNCE_CHANNEL = "rukhsat:announce"

#: Sent every 25s. Without it, mobile networks and proxies drop an idle socket
#: after ~60s and the teacher's screen quietly stops updating with no error.
HEARTBEAT_SECONDS = 25


def _snapshot(db: Session, *, school_id: uuid.UUID, class_id: uuid.UUID | None) -> list[dict]:
    """Reuse the REST queue builder so the socket and the endpoint cannot drift."""
    from app.routers.operations import get_queue
    from app.models import User

    viewer = db.query(User).filter(User.school_id == school_id).first()
    if viewer is None:
        return []
    return get_queue(class_id=class_id, user=viewer, db=db)


async def _authenticate(websocket: WebSocket, token: str | None) -> dict | None:
    """
    Browsers cannot set headers on a WebSocket, so the token arrives as a query
    parameter. It is still a real JWT check — the socket is refused otherwise.
    """
    if not token:
        await websocket.close(code=4401, reason="Not authenticated")
        return None
    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4401, reason="Invalid or expired token")
        return None
    return payload


async def _pump(
    websocket: WebSocket,
    *,
    channel: str,
    match: callable,
    initial: list | dict | None,
) -> None:
    """Send an initial snapshot, then relay matching Redis messages until close."""
    if initial is not None:
        await websocket.send_json({"type": "snapshot", "data": initial})

    redis = aioredis.from_url(settings.redis_url)
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)

    async def heartbeat() -> None:
        while True:
            await asyncio.sleep(HEARTBEAT_SECONDS)
            await websocket.send_json({"type": "ping"})

    beat = asyncio.create_task(heartbeat())
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                payload = json.loads(message["data"])
            except (ValueError, TypeError):
                continue
            if match(payload):
                await websocket.send_json({"type": "update", "data": payload})
    except (WebSocketDisconnect, ConnectionError):
        pass
    finally:
        beat.cancel()
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await redis.aclose()


@router.websocket("/ws/queue/{class_id}")
async def queue_socket(
    websocket: WebSocket, class_id: str, token: str | None = Query(default=None)
):
    """
    Live queue for one class.

    Scoped to a class deliberately: a teacher watching every parent in the
    school all afternoon is both a privacy failure and a demo liability.
    """
    await websocket.accept()
    payload = await _authenticate(websocket, token)
    if payload is None:
        return

    school_id = uuid.UUID(payload["sch"])
    cid = None if class_id in ("all", "*") else uuid.UUID(class_id)

    with SessionLocal() as db:
        initial = _snapshot(db, school_id=school_id, class_id=cid)

    await _pump(
        websocket,
        channel=QUEUE_CHANNEL,
        match=lambda m: m.get("school_id") == str(school_id)
        and (cid is None or m.get("class_id") in (None, str(cid))),
        initial=initial,
    )


@router.websocket("/ws/classroom/{class_id}")
async def classroom_socket(
    websocket: WebSocket, class_id: str, token: str | None = Query(default=None)
):
    """
    Announcement stream for one classroom display.

    This is the only path by which a display learns to speak, and it has NO
    offline fallback — the ETA trigger is computed server-side and pushed. A
    display that loses this socket goes silent with no other symptom, which is
    why the dashboard tracks heartbeats.
    """
    await websocket.accept()
    payload = await _authenticate(websocket, token)
    if payload is None:
        return

    school_id = uuid.UUID(payload["sch"])
    cid = uuid.UUID(class_id)

    with SessionLocal() as db:
        initial = _snapshot(db, school_id=school_id, class_id=cid)

    await _pump(
        websocket,
        channel=ANNOUNCE_CHANNEL,
        match=lambda m: m.get("class_id") == str(cid),
        initial=initial,
    )
