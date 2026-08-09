"""
Where photographs live.

Two backends behind one interface: S3 when `S3_BUCKET` is set, local disk
otherwise. Local is not a toy fallback — it is what CI, a fresh clone, and any
developer without AWS credentials actually run on, and uploads have to work
there or the registration flow cannot be tested at all.

**The bucket is private and stays private.** These are photographs of drivers
and, on the outsider path, of the people collecting children. A public bucket
would mean a permanent, unauthenticated, guessable URL for every face in the
system. Instead objects are written with no ACL and read through presigned
URLs that expire — see `url_for`.

That choice has a consequence worth stating plainly: a stored `photo_url` is
NOT a URL. It is a key (`drivers/<uuid>.jpg`), and the API turns it into a
signed link at the moment of serving. Storing a signed URL in the database
would bake in an expiry and produce photos that work on Monday and 403 on
Tuesday.
"""

from __future__ import annotations

import logging
import mimetypes
import uuid
from pathlib import Path
from typing import BinaryIO

from app.config import settings

log = logging.getLogger(__name__)

#: Deliberately narrow. Accepting arbitrary types means accepting an SVG, and
#: an SVG is a script that a browser will happily execute from your own origin.
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

#: A camera photo off a modern phone is 2-5 MB. 10 MB leaves room for a large
#: one without letting an unauthenticated endpoint fill the disk.
MAX_BYTES = 10 * 1024 * 1024

#: Under the directory `main.py` mounts at `/media`, so local uploads are
#: served by the existing static mount with no extra route. Relative on
#: purpose, matching that mount: both resolve against the process working
#: directory, which systemd pins to `backend/`.
LOCAL_ROOT = Path("media") / "uploads"


class UploadTooLarge(Exception):
    pass


class UnsupportedType(Exception):
    pass


def enabled_s3() -> bool:
    return bool(settings.s3_bucket)


def _client():
    import boto3
    from botocore.config import Config

    # SigV4 against the regional endpoint, both stated explicitly.
    #
    # Without them boto3 can presign against the global `s3.amazonaws.com`,
    # which then 307-redirects to the regional host — and the signature does
    # not survive the redirect, so a correctly-generated link returns 403. The
    # failure looks exactly like a permissions problem, which is what makes it
    # expensive to diagnose.
    return boto3.client(
        "s3",
        region_name=settings.s3_region,
        endpoint_url=f"https://s3.{settings.s3_region}.amazonaws.com",
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
    )


def _extension(content_type: str) -> str:
    return {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(
        content_type, mimetypes.guess_extension(content_type) or ".bin"
    )


def store(data: bytes, *, content_type: str, prefix: str) -> str:
    """
    Persist one image and return its KEY — not a URL. See the module docstring.

    `prefix` groups objects by purpose (`drivers/`, `passes/`), which is what
    makes a lifecycle rule or a targeted deletion possible later without
    walking every object in the bucket.
    """
    if content_type not in ALLOWED_TYPES:
        raise UnsupportedType(content_type)
    if len(data) > MAX_BYTES:
        raise UploadTooLarge(len(data))

    key = f"{prefix.strip('/')}/{uuid.uuid4().hex}{_extension(content_type)}"

    if enabled_s3():
        _client().put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            # No ACL argument at all: the bucket blocks public ACLs, and asking
            # for one would fail rather than silently make a face public.
        )
        return key

    path = LOCAL_ROOT / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def url_for(key: str | None) -> str | None:
    """
    Turn a stored key into something a phone can fetch, valid for an hour.

    Returns the input unchanged when it already looks like a URL, so rows
    written before this module existed — and the seeded demo data — keep
    rendering instead of breaking on a migration nobody ran.
    """
    if not key:
        return None
    if key.startswith("http://") or key.startswith("https://") or key.startswith("/"):
        return key

    if enabled_s3():
        try:
            return _client().generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.s3_bucket, "Key": key},
                ExpiresIn=settings.s3_url_ttl_seconds,
            )
        except Exception as exc:  # noqa: BLE001
            # A photo that will not render must never take down the screen it
            # was on — a guard still has the name and the manual fallback.
            log.warning("could not presign %s: %s", key, exc)
            return None

    return f"/media/uploads/{key}"
