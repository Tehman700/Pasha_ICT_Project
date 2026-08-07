"""
Firebase Cloud Messaging — the transport layer.

Only the mechanics live here: getting an OAuth access token from the service
account, posting a message, and interpreting the response. What to say and who
to say it to is `services/notify.py`.

Two deliberate choices:

**No `firebase-admin` dependency.** It pulls in google-auth, google-api-core,
grpcio and protobuf — grpcio alone is a ~100MB install that compiles on some
platforms, and this system runs on a 1.9GB EC2 box. All we need is a signed
JWT, which pyjwt already does for the QR tokens, and one HTTP POST. The legacy
`/fcm/send` API this would otherwise tempt us toward was shut down in June
2024; this is the v1 API.

**Sending never raises.** A push that fails must not fail the handover that
triggered it. Same rule as `services/broadcast.py` — the child is standing at
the gate and a notification is the least important thing happening.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import jwt

from app.config import settings

log = logging.getLogger(__name__)

TOKEN_URI = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/firebase.messaging"

#: Google issues 1-hour tokens. Refresh early so a send never races expiry.
TOKEN_SKEW_SECONDS = 300


class PushResult(str):
    """Marker strings returned by :func:`send`, for logging and tests."""


SENT = "sent"
DISABLED = "disabled"
FAILED = "failed"
#: FCM says this token is dead — the app was uninstalled or data cleared.
#: The caller must clear it from the database.
UNREGISTERED = "unregistered"


@dataclass
class _ServiceAccount:
    client_email: str
    private_key: str
    project_id: str


_account: _ServiceAccount | None = None
_account_loaded = False
_token: tuple[str, float] | None = None  # (access_token, expires_at_epoch)
_lock = threading.Lock()


def _load_account() -> _ServiceAccount | None:
    """
    Read the service account JSON once.

    Absence is not an error: local development and CI have no Firebase
    credentials, and the whole system must still run. Push simply becomes a
    no-op — see `enabled()`.
    """
    global _account, _account_loaded
    if _account_loaded:
        return _account
    _account_loaded = True

    path = Path(settings.fcm_service_account_json_path)
    if not path.is_absolute():
        from app.config import REPO_ROOT

        path = (REPO_ROOT / path).resolve()

    if not path.exists():
        log.info("FCM disabled: no service account at %s", path)
        return None

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        _account = _ServiceAccount(
            client_email=data["client_email"],
            private_key=data["private_key"],
            project_id=data["project_id"],
        )
    except Exception as exc:  # noqa: BLE001
        log.error("FCM disabled: service account at %s is unreadable: %s", path, exc)
        return None

    return _account


def enabled() -> bool:
    """True when the backend can actually send. Safe to call anywhere."""
    return _load_account() is not None


def project_id() -> str | None:
    acct = _load_account()
    if acct is None:
        return None
    # settings wins if set — it lets a staging deploy point at another project
    # without swapping the key file.
    return settings.fcm_project_id or acct.project_id


def _access_token() -> str | None:
    """
    Exchange the service account for a short-lived OAuth token.

    Cached under a lock: two uvicorn workers each hold their own cache, but
    within a worker a burst of handovers must not mint a token per send.
    """
    global _token

    acct = _load_account()
    if acct is None:
        return None

    with _lock:
        if _token is not None and _token[1] - TOKEN_SKEW_SECONDS > time.time():
            return _token[0]

        now = int(time.time())
        assertion = jwt.encode(
            {
                "iss": acct.client_email,
                "scope": SCOPE,
                "aud": TOKEN_URI,
                "iat": now,
                "exp": now + 3600,
            },
            acct.private_key,
            algorithm="RS256",
        )

        try:
            resp = httpx.post(
                TOKEN_URI,
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            payload = resp.json()
        except Exception as exc:  # noqa: BLE001
            log.warning("FCM token exchange failed: %s", exc)
            return None

        token = payload.get("access_token")
        if not token:
            log.warning("FCM token exchange returned no access_token")
            return None

        _token = (token, time.time() + int(payload.get("expires_in", 3600)))
        return token


def send(
    *,
    token: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
    collapse_key: str | None = None,
) -> str:
    """
    Deliver one notification. Returns one of the module-level result strings.

    `collapse_key` maps to FCM's Android `tag`: a second notification with the
    same tag REPLACES the first in the tray rather than stacking. A collector
    whose ETA updates four times should leave one notification behind, not
    four — the alternative trains people to swipe the whole app away.
    """
    if not token:
        return DISABLED

    pid = project_id()
    access = _access_token()
    if pid is None or access is None:
        return DISABLED

    message: dict[str, Any] = {
        "message": {
            "token": token,
            "notification": {"title": title, "body": body},
            "android": {
                "priority": "high",
                "notification": {
                    "channel_id": "rukhsat-pickup",
                    "default_sound": True,
                },
            },
        }
    }
    if data:
        # FCM requires every data value to be a string.
        message["message"]["data"] = {k: str(v) for k, v in data.items()}
    if collapse_key:
        message["message"]["android"]["notification"]["tag"] = collapse_key
        message["message"]["android"]["collapse_key"] = collapse_key

    try:
        resp = httpx.post(
            f"https://fcm.googleapis.com/v1/projects/{pid}/messages:send",
            headers={"Authorization": f"Bearer {access}"},
            json=message,
            timeout=10.0,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("FCM send failed: %s", exc)
        return FAILED

    if resp.status_code == 200:
        return SENT

    # 404 UNREGISTERED / 400 INVALID_ARGUMENT on the token both mean this
    # device will never receive again. Reported so the caller can clear it —
    # otherwise the users table accumulates dead tokens forever and every
    # broadcast pays for them.
    detail = resp.text[:300]
    if resp.status_code in (400, 404) and (
        "UNREGISTERED" in detail or "not a valid FCM registration token" in detail
    ):
        log.info("FCM token is dead, clearing")
        return UNREGISTERED

    if resp.status_code == 401:
        # Our cached token was rejected. Drop it so the next send re-mints.
        with _lock:
            globals()["_token"] = None

    log.warning("FCM send returned %s: %s", resp.status_code, detail)
    return FAILED


def reset_cache() -> None:
    """Test hook — forces the account and access token to be re-read."""
    global _account, _account_loaded, _token
    _account = None
    _account_loaded = False
    _token = None
