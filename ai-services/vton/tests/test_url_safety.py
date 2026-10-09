from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from app.providers import reset_provider
from app.url_safety import UnsafeUrlError, check_url, fetch


@pytest.mark.parametrize(
    "address",
    ["127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1",
     "fd00::1", "fe80::1", "::ffff:127.0.0.1"],
)
def test_hosts_resolving_to_non_public_addresses_are_rejected(dns, address):
    dns["internal.example"] = address
    with pytest.raises(UnsafeUrlError):
        check_url("https://internal.example/a.jpg", "garment")


def test_public_https_url_is_allowed():
    check_url("https://cdn.example.com/a.jpg", "garment")


@pytest.mark.parametrize(
    "url",
    ["http://cdn.example.com/a.jpg", "ftp://cdn.example.com/a.jpg", "file:///etc/passwd",
     "https://user:pw@cdn.example.com/a.jpg", "https:///a.jpg", ""],
)
def test_non_https_or_malformed_urls_are_rejected(url):
    with pytest.raises(UnsafeUrlError):
        check_url(url, "person")


def test_localhost_needs_explicit_dev_opt_in(monkeypatch):
    with pytest.raises(UnsafeUrlError):
        check_url("http://localhost:8080/uploads/a.jpg", "person")
    monkeypatch.setenv("VTON_ALLOW_LOCAL_URLS", "true")
    check_url("http://localhost:8080/uploads/a.jpg", "person")


def _patch_client(monkeypatch, handler):
    real_client = httpx.Client

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_client(*args, **kwargs)

    monkeypatch.setattr("app.url_safety.httpx.Client", factory)


def test_redirects_are_revalidated_hop_by_hop(dns, monkeypatch):
    dns["metadata.example"] = "169.254.169.254"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "cdn.example.com":
            return httpx.Response(302, headers={"location": "https://metadata.example/latest/meta-data"})
        return httpx.Response(200, content=b"secret")

    _patch_client(monkeypatch, handler)
    with pytest.raises(UnsafeUrlError):
        fetch("https://cdn.example.com/a.jpg", "garment", timeout=5)


def test_safe_redirect_is_followed(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/old.jpg":
            return httpx.Response(301, headers={"location": "/new.jpg"})
        return httpx.Response(200, content=b"img", headers={"content-type": "image/jpeg"})

    _patch_client(monkeypatch, handler)
    image = fetch("https://cdn.example.com/old.jpg", "garment", timeout=5)
    assert image.content == b"img"
    assert image.url.endswith("/new.jpg")


def test_downloads_are_size_capped(monkeypatch):
    monkeypatch.setenv("VTON_MAX_IMAGE_BYTES", "10")
    _patch_client(monkeypatch, lambda request: httpx.Response(200, content=b"x" * 100))
    with pytest.raises(UnsafeUrlError):
        fetch("https://cdn.example.com/big.jpg", "garment", timeout=5)


@pytest.fixture
def hf_client(monkeypatch):
    monkeypatch.setenv("AI_MODE", "hf")
    reset_provider()
    from app.main import app

    yield TestClient(app)
    reset_provider()


def test_try_on_rejects_private_image_urls_before_any_fetch(dns, hf_client):
    dns["intranet.example"] = "10.1.2.3"
    response = hf_client.post(
        "/v1/try-on",
        json={
            "person_image_url": "https://intranet.example/person.jpg",
            "garment_image_url": "https://cdn.example.com/shirt.jpg",
            "category": "tops",
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"]["error_code"] == "INVALID_IMAGE"


def test_internal_token_is_required_when_configured(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    monkeypatch.setenv("VTON_INTERNAL_TOKEN", "expected-token")
    reset_provider()
    from app.main import app

    client = TestClient(app)
    body = {
        "person_image_url": "https://cdn.example.com/person.jpg",
        "garment_image_url": "https://cdn.example.com/shirt.jpg",
        "category": "tops",
    }
    assert client.get("/health").status_code == 200
    assert client.post("/v1/try-on", json=body).status_code == 401
    assert client.post("/v1/try-on", json=body, headers={"X-Internal-Token": "wrong"}).status_code == 401
    accepted = client.post("/v1/try-on", json=body, headers={"X-Internal-Token": "expected-token"})
    assert accepted.status_code == 202
    job_id = accepted.json()["job_id"]
    assert client.get(f"/v1/try-on/{job_id}").status_code == 401
    assert client.get(f"/v1/try-on/{job_id}", headers={"X-Internal-Token": "expected-token"}).status_code == 200
    reset_provider()
