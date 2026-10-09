from __future__ import annotations

import logging

import httpx

from app.url_safety import UnsafeUrlError, check_url, fetch, is_local_url

logger = logging.getLogger(__name__)

_PREFLIGHT_TIMEOUT_SECONDS = 20.0


def validate_image_url(url: str, label: str) -> None:
    """Rejects URLs ai-vton must not fetch (see app.url_safety), then checks the image is reachable."""
    if url and url.strip().startswith("data:image/"):
        return
    check_url(url, label)
    if is_local_url(url):
        return

    try:
        image = fetch(url, label, timeout=_PREFLIGHT_TIMEOUT_SECONDS, method="HEAD")
    except UnsafeUrlError:
        raise
    except httpx.HTTPError:
        image = fetch(url, label, timeout=_PREFLIGHT_TIMEOUT_SECONDS)
    if image.content_type and not image.content_type.startswith("image/"):
        logger.warning("%s URL content-type is %s, continuing anyway", label, image.content_type)
