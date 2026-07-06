from __future__ import annotations

import logging
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

_PRIVATE_HOSTS = frozenset({"localhost", "127.0.0.1", "0.0.0.0"})


def validate_image_url(url: str, label: str) -> None:
    if not url or not url.strip():
        raise ValueError(f"{label} URL is required")

    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host in _PRIVATE_HOSTS:
        return

    if not url.startswith("http://") and not url.startswith("https://"):
        return

    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        response = _fetch_with_fallback(client, url)
        response.raise_for_status()
        content_type = (response.headers.get("content-type") or "").lower()
        if content_type and not content_type.startswith("image/"):
            logger.warning("%s URL content-type is %s, continuing anyway", label, content_type)


def _fetch_with_fallback(client: httpx.Client, url: str) -> httpx.Response:
    try:
        response = client.head(url)
        if response.status_code < 400:
            return response
    except httpx.HTTPError:
        pass
    return client.get(url)
