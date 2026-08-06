from __future__ import annotations

import base64
import logging
import os
from urllib.parse import urlsplit, urlunsplit

import httpx

logger = logging.getLogger(__name__)

_LOCAL_HOSTS = frozenset(
    h.strip().lower()
    for h in os.getenv("FASHN_LOCAL_HOSTS", "localhost,127.0.0.1,0.0.0.0").split(",")
    if h.strip()
)
# When ai-vton runs in its own Docker container, `http://localhost:8080` in a
# person/garment URL refers to the ai-vton container itself, not the backend.
# Set this to the backend's address as seen from ai-vton's network (e.g.
# `http://backend:8080` in docker-compose) so we can fetch the real bytes.
# Native/local dev (no Docker) doesn't need this — `localhost` already means
# the same machine for both processes.
_INTERNAL_FETCH_BASE_URL = os.getenv("AI_VTON_INTERNAL_FETCH_BASE_URL", "").strip().rstrip("/")
_MAX_INLINE_BYTES = int(os.getenv("FASHN_INLINE_MAX_BYTES", str(10 * 1024 * 1024)))
_ENABLED = os.getenv("FASHN_INLINE_LOCAL_IMAGES", "true").strip().lower() in {"1", "true", "yes"}
_FETCH_TIMEOUT_SECONDS = float(os.getenv("FASHN_INLINE_FETCH_TIMEOUT_SECONDS", "15"))


def _is_local_url(url: str) -> bool:
    try:
        host = (urlsplit(url).hostname or "").lower()
    except ValueError:
        return False
    return host in _LOCAL_HOSTS


def _rewrite_to_internal(url: str) -> str:
    if not _INTERNAL_FETCH_BASE_URL:
        return url
    try:
        internal = urlsplit(_INTERNAL_FETCH_BASE_URL)
        parts = urlsplit(url)
        return urlunsplit(parts._replace(scheme=internal.scheme, netloc=internal.netloc))
    except ValueError:
        return url


def inline_if_local(url: str | None, label: str) -> str | None:
    """Turns `localhost`/`127.0.0.1` image URLs into base64 data URIs.

    FASHN's hosted API (https://api.fashn.ai) runs on the public internet and
    cannot fetch `http://localhost:...` URLs. But FASHN's `model_image` and
    `garment_image` inputs also accept a base64 data URI directly (see
    https://docs.fashn.ai/api-reference/tryon-v1-6#input-parameters) — so
    instead of requiring a public tunnel (ngrok) for local dev, ai-vton fetches
    the image bytes itself (it can usually reach the backend directly — same
    host in native dev, or via `AI_VTON_INTERNAL_FETCH_BASE_URL` in Docker
    Compose) and embeds them inline.

    No-op for any non-local URL — production always uses public URLs
    (Render/Vercel domains or R2), which FASHN fetches directly as before.
    """
    if not url or not _ENABLED or not _is_local_url(url):
        return url

    fetch_url = _rewrite_to_internal(url)
    try:
        with httpx.Client(timeout=_FETCH_TIMEOUT_SECONDS, follow_redirects=True) as client:
            response = client.get(fetch_url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(
            "Could not inline %s image %s (tried %s) as base64 for FASHN — sending raw URL "
            "instead, which will likely fail with ImageLoadError unless FASHN can reach it "
            "directly: %s",
            label,
            url,
            fetch_url,
            exc,
        )
        return url

    content = response.content
    if not content:
        logger.warning("%s image %s returned an empty body — sending raw URL instead", label, url)
        return url
    if len(content) > _MAX_INLINE_BYTES:
        logger.warning(
            "%s image %s too large to inline (%d bytes > %d max) — sending raw URL instead",
            label,
            url,
            len(content),
            _MAX_INLINE_BYTES,
        )
        return url

    content_type = (response.headers.get("content-type") or "image/jpeg").split(";")[0].strip().lower()
    if not content_type.startswith("image/"):
        content_type = "image/jpeg"
    encoded = base64.b64encode(content).decode("ascii")
    logger.info("Inlined %s image (%d bytes, %s) as base64 data URI for FASHN request", label, len(content), content_type)
    return f"data:{content_type};base64,{encoded}"
