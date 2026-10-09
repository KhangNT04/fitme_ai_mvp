"""Guards every server-side fetch of a caller-supplied image URL (SSRF protection).

Only public https URLs are fetched: the host must resolve exclusively to globally routable
addresses (no loopback, private, link-local/cloud-metadata, CGNAT or reserved ranges),
redirects are re-validated hop by hop, and downloads are capped in size. Plain-http
localhost URLs are accepted only when VTON_ALLOW_LOCAL_URLS=true (local development).
"""

from __future__ import annotations

import ipaddress
import os
import socket
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import httpx

LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "0.0.0.0", "::1"})
_MAX_REDIRECTS = 3
_TRUE = {"1", "true", "yes"}


class UnsafeUrlError(ValueError):
    """The URL points somewhere ai-vton must not fetch from."""


def allow_local_urls() -> bool:
    return os.getenv("VTON_ALLOW_LOCAL_URLS", "false").strip().lower() in _TRUE


def max_image_bytes() -> int:
    return int(os.getenv("VTON_MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))


def is_local_url(url: str) -> bool:
    try:
        return (urlsplit(url).hostname or "").lower() in LOCAL_HOSTS
    except ValueError:
        return False


def check_url(url: str, label: str) -> None:
    """Raises UnsafeUrlError unless ``url`` may be fetched by this service."""
    if not url or not url.strip():
        raise UnsafeUrlError(f"{label} URL is required")
    try:
        parts = urlsplit(url.strip())
        port = parts.port
    except ValueError as exc:
        raise UnsafeUrlError(f"{label} URL is malformed") from exc
    host = (parts.hostname or "").lower()
    if not host:
        raise UnsafeUrlError(f"{label} URL has no host")
    if parts.username or parts.password:
        raise UnsafeUrlError(f"{label} URL must not contain credentials")

    if host in LOCAL_HOSTS:
        if allow_local_urls() and parts.scheme in {"http", "https"}:
            return
        raise UnsafeUrlError(f"{label} URL must be a public https URL")
    if parts.scheme != "https":
        raise UnsafeUrlError(f"{label} URL must use https")

    try:
        infos = socket.getaddrinfo(host, port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise UnsafeUrlError(f"{label} URL host cannot be resolved") from exc
    if not infos:
        raise UnsafeUrlError(f"{label} URL host cannot be resolved")
    for info in infos:
        address = ipaddress.ip_address(info[4][0].split("%", 1)[0])
        if not address.is_global or address.is_multicast:
            raise UnsafeUrlError(f"{label} URL resolves to a non-public address")


@dataclass
class FetchedImage:
    url: str
    content: bytes
    content_type: str


def fetch(url: str, label: str, *, timeout: float, method: str = "GET") -> FetchedImage:
    """Fetches ``url`` after validating it and every redirect hop; GET bodies are size-capped."""
    limit = max_image_bytes()
    current = url.strip()
    with httpx.Client(timeout=timeout, follow_redirects=False) as client:
        for _ in range(_MAX_REDIRECTS + 1):
            check_url(current, label)
            with client.stream(method, current) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise UnsafeUrlError(f"{label} URL redirected without a location")
                    current = urljoin(current, location)
                    continue
                response.raise_for_status()
                content_type = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
                if method == "HEAD":
                    return FetchedImage(current, b"", content_type)
                declared = response.headers.get("content-length")
                if declared and declared.isdigit() and int(declared) > limit:
                    raise UnsafeUrlError(f"{label} image is larger than {limit} bytes")
                body = bytearray()
                for chunk in response.iter_bytes():
                    body.extend(chunk)
                    if len(body) > limit:
                        raise UnsafeUrlError(f"{label} image is larger than {limit} bytes")
                return FetchedImage(current, bytes(body), content_type)
    raise UnsafeUrlError(f"{label} URL redirected too many times")
