import io
import time
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.providers import reset_provider


@pytest.fixture(autouse=True)
def mock_mode(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    reset_provider()
    yield
    reset_provider()


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["mode"] == "mock"


def test_submit_unsupported_category(client):
    response = client.post(
        "/v1/try-on",
        json={
            "person_image_url": "https://example.com/person.jpg",
            "garment_image_url": "https://example.com/shirt.jpg",
            "category": "shoes",
        },
    )
    assert response.status_code == 422


def test_submit_and_poll_mock(client):
    response = client.post(
        "/v1/try-on",
        json={
            "person_image_url": "https://example.com/person.jpg",
            "garment_image_url": "https://example.com/shirt.jpg",
            "category": "tops",
        },
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "processing"
    job_id = body["job_id"]

    deadline = time.monotonic() + 5
    status = "processing"
    while time.monotonic() < deadline and status == "processing":
        poll = client.get(f"/v1/try-on/{job_id}")
        assert poll.status_code == 200
        status = poll.json()["status"]
        if status == "processing":
            time.sleep(0.2)

    assert status == "completed"
    assert poll.json().get("output_image_url")


@patch("app.providers.hf_idmvton.validate_image_url")
@patch("app.providers.hf_idmvton.Client")
def test_hf_provider_submit(mock_client_cls, _mock_validate, monkeypatch):
    monkeypatch.setenv("AI_MODE", "hf")
    monkeypatch.setenv("HF_FALLBACK_COMPOSITE", "false")
    reset_provider()

    mock_gradio_job = MagicMock()
    mock_gradio_job.result.return_value = "https://hf.example/output.png"
    mock_client = MagicMock()
    mock_client.submit.return_value = mock_gradio_job
    mock_client_cls.return_value = mock_client

    from app.main import app

    client = TestClient(app)
    response = client.post(
        "/v1/try-on",
        json={
            "person_image_url": "https://example.com/person.jpg",
            "garment_image_url": "https://example.com/shirt.jpg",
            "category": "tops",
        },
    )
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        poll = client.get(f"/v1/try-on/{job_id}")
        if poll.json()["status"] != "processing":
            break
        time.sleep(0.1)

    assert poll.json()["status"] == "completed"
    assert "output" in poll.json()["output_image_url"]


@patch("app.providers.hf_idmvton.build_composite_url")
@patch("app.providers.hf_idmvton.validate_image_url")
@patch("app.providers.hf_idmvton.Client")
def test_hf_composite_fallback_when_gradio_fails(
    mock_client_cls,
    _mock_validate,
    mock_composite,
    monkeypatch,
):
    monkeypatch.setenv("AI_MODE", "hf")
    monkeypatch.setenv("HF_MAX_RETRIES", "1")
    monkeypatch.setenv("HF_FALLBACK_COMPOSITE", "true")
    monkeypatch.setenv("VTON_PUBLIC_BASE_URL", "https://vton.test")
    reset_provider()

    mock_client = MagicMock()
    mock_gradio_job = MagicMock()
    mock_gradio_job.result.side_effect = RuntimeError("upstream Gradio app has raised an exception")
    mock_client.submit.return_value = mock_gradio_job
    mock_client_cls.return_value = mock_client
    mock_composite.return_value = "https://vton.test/outputs/demo.jpg"

    from app.main import app

    client = TestClient(app)
    response = client.post(
        "/v1/try-on",
        json={
            "person_image_url": "https://example.com/person.jpg",
            "garment_image_url": "https://example.com/shirt.jpg",
            "category": "tops",
        },
    )
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        poll = client.get(f"/v1/try-on/{job_id}")
        if poll.json()["status"] != "processing":
            break
        time.sleep(0.1)

    body = poll.json()
    assert body["status"] == "completed"
    assert body["fallback_mode"] == "composite"
    assert body["output_image_url"] == "https://vton.test/outputs/demo.jpg"


def test_compose_overlay():
    from app.composite import _compose

    person = Image.new("RGB", (400, 600), color=(200, 180, 170))
    garment = Image.new("RGBA", (200, 200), color=(20, 40, 200, 255))
    person_buf = io.BytesIO()
    garment_buf = io.BytesIO()
    person.save(person_buf, format="JPEG")
    garment.save(garment_buf, format="PNG")

    result = _compose(person_buf.getvalue(), garment_buf.getvalue())
    assert result.size == (600, 800)
