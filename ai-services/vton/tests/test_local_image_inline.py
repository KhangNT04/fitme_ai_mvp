from __future__ import annotations

import base64
import importlib
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def _reload_module():
    """Reload so module-level env-derived constants pick up monkeypatched env vars."""
    import app.local_image_inline as mod

    yield mod
    importlib.reload(mod)


def _mock_get_response(status_code=200, content=b"fake-bytes", content_type="image/jpeg"):
    response = MagicMock()
    response.status_code = status_code
    response.content = content
    response.headers = {"content-type": content_type}
    response.raise_for_status = MagicMock()
    return response


def test_non_local_url_passes_through_unchanged(monkeypatch):
    importlib.reload(__import__("app.local_image_inline", fromlist=["x"]))
    from app.local_image_inline import inline_if_local

    url = "https://cdn.example.com/person.jpg"
    assert inline_if_local(url, "person") == url


@patch("app.local_image_inline.httpx.Client")
def test_localhost_url_is_inlined_as_base64_data_uri(mock_client_cls, monkeypatch):
    importlib.reload(__import__("app.local_image_inline", fromlist=["x"]))
    from app.local_image_inline import inline_if_local

    client_instance = MagicMock()
    client_instance.get.return_value = _mock_get_response(content=b"hello-image-bytes")
    client_instance.__enter__.return_value = client_instance
    client_instance.__exit__.return_value = False
    mock_client_cls.return_value = client_instance

    result = inline_if_local("http://localhost:8080/uploads/user-photos/abc.jpg", "person")

    assert result is not None
    assert result.startswith("data:image/jpeg;base64,")
    encoded = result.split(",", 1)[1]
    assert base64.b64decode(encoded) == b"hello-image-bytes"


@patch("app.local_image_inline.httpx.Client")
def test_internal_fetch_base_url_rewrites_host_for_docker(mock_client_cls, monkeypatch):
    monkeypatch.setenv("AI_VTON_INTERNAL_FETCH_BASE_URL", "http://backend:8080")
    import app.local_image_inline as mod
    importlib.reload(mod)

    client_instance = MagicMock()
    client_instance.get.return_value = _mock_get_response()
    client_instance.__enter__.return_value = client_instance
    client_instance.__exit__.return_value = False
    mock_client_cls.return_value = client_instance

    mod.inline_if_local("http://localhost:8080/uploads/user-photos/abc.jpg", "person")

    called_url = client_instance.get.call_args[0][0]
    assert called_url == "http://backend:8080/uploads/user-photos/abc.jpg"

    monkeypatch.delenv("AI_VTON_INTERNAL_FETCH_BASE_URL", raising=False)
    importlib.reload(mod)


@patch("app.local_image_inline.httpx.Client")
def test_fetch_failure_falls_back_to_raw_url(mock_client_cls, monkeypatch):
    import httpx

    importlib.reload(__import__("app.local_image_inline", fromlist=["x"]))
    from app.local_image_inline import inline_if_local

    client_instance = MagicMock()
    client_instance.get.side_effect = httpx.ConnectError("connection refused")
    client_instance.__enter__.return_value = client_instance
    client_instance.__exit__.return_value = False
    mock_client_cls.return_value = client_instance

    url = "http://localhost:8080/uploads/user-photos/abc.jpg"
    assert inline_if_local(url, "person") == url


def test_disabled_via_env_passes_through(monkeypatch):
    monkeypatch.setenv("FASHN_INLINE_LOCAL_IMAGES", "false")
    import app.local_image_inline as mod
    importlib.reload(mod)

    url = "http://localhost:8080/uploads/user-photos/abc.jpg"
    assert mod.inline_if_local(url, "person") == url

    monkeypatch.delenv("FASHN_INLINE_LOCAL_IMAGES", raising=False)
    importlib.reload(mod)


@patch("app.local_image_inline.httpx.Client")
def test_oversized_image_falls_back_to_raw_url(mock_client_cls, monkeypatch):
    monkeypatch.setenv("FASHN_INLINE_MAX_BYTES", "10")
    import app.local_image_inline as mod
    importlib.reload(mod)

    client_instance = MagicMock()
    client_instance.get.return_value = _mock_get_response(content=b"x" * 100)
    client_instance.__enter__.return_value = client_instance
    client_instance.__exit__.return_value = False
    mock_client_cls.return_value = client_instance

    url = "http://localhost:8080/uploads/user-photos/abc.jpg"
    assert mod.inline_if_local(url, "person") == url

    monkeypatch.delenv("FASHN_INLINE_MAX_BYTES", raising=False)
    importlib.reload(mod)
