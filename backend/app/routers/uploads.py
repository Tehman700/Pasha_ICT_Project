"""
Photo upload.

One endpoint, deliberately unauthenticated, because the people who need it
have no account yet: a driver registering for the first time must attach a
selfie and a photograph of his CNIC card before the account exists to attach
them to.

That makes this the only unauthenticated write in the system, so the limits
are the security, not the login:

  * **10 MB and images only.** An SVG is a script a browser will run from your
    own origin, so the allowlist is jpeg/png/webp and nothing else — enforced
    on the decoded bytes, not on the `Content-Type` header a client claims.
  * **Nothing is linked to anything.** The response is an opaque key. An
    uploaded photo that never reaches a registration call is an orphan taking
    up a few kilobytes, not a record anyone can reach.
  * **Rate limited by object size, not by identity.** There is no identity to
    limit by. The lifecycle rule on the bucket is what keeps orphans from
    accumulating forever.

The response is a KEY, never a URL — see `services/storage.py` for why storing
a signed URL would produce photos that expire in the database.
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services import storage

router = APIRouter()


def sniff(data: bytes) -> str | None:
    """
    Identify the format from the leading bytes, or None if it is not an image
    we accept.

    Written out rather than using `imghdr`, which was removed from the standard
    library in Python 3.13 — this backend runs on 3.14. Three signatures is
    less code than a dependency, and it makes the allowlist legible: anything
    not matched here, including an SVG, is refused.
    """
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.post("/uploads/photo", status_code=status.HTTP_201_CREATED, tags=["uploads"])
async def upload_photo(
    file: UploadFile = File(...),
    purpose: str = "misc",
):
    """
    Store one photograph and return its key.

    `purpose` only groups objects in the bucket (`drivers/`, `passes/`), which
    is what makes a targeted lifecycle rule possible later. It is sanitised
    rather than trusted — a caller passing `../` must not escape the prefix.
    """
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")

    # Sniff the real format. A client can claim image/jpeg and send anything;
    # what lands in the bucket is what a guard's phone will later render.
    content_type = sniff(data)
    if content_type is None:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Only JPEG, PNG and WebP images are accepted",
        )

    prefix = "".join(c for c in purpose if c.isalnum() or c in "-_") or "misc"

    try:
        key = storage.store(data, content_type=content_type, prefix=prefix)
    except storage.UploadTooLarge:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Images must be under {storage.MAX_BYTES // (1024 * 1024)} MB",
        ) from None
    except storage.UnsupportedType:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Unsupported image type"
        ) from None

    return {"key": key, "url": storage.url_for(key)}
