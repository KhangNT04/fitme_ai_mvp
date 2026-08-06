import time
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.providers import reset_provider


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    reset_provider()
    yield
    reset_provider()


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


def _mock_response(status_code=200, json_body=None):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_body or {}
    response.raise_for_status = MagicMock()
    return response


@patch("app.providers.fashn_api.httpx.Client")
def test_fashn_api_provider_submit_and_poll_completed(mock_client_cls, monkeypatch):
    monkeypatch.setenv("AI_MODE", "api")
    monkeypatch.setenv("FASHN_API_KEY", "test-key")
    reset_provider()

    submit_response = _mock_response(200, {"id": "pred-123"})
    status_response = _mock_response(
        200, {"id": "pred-123", "status": "completed", "output": ["https://cdn.fashn.ai/out.png"]}
    )

    client_instance = MagicMock()
    client_instance.post.return_value = submit_response
    client_instance.get.return_value = status_response
    client_instance.__enter__.return_value = client_instance
    client_instance.__exit__.return_value = False
    mock_client_cls.return_value = client_instance

    from app.main import app

    test_client = TestClient(app)
    response = test_client.post(
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
    poll = test_client.get(f"/v1/try-on/{job_id}")
    while time.monotonic() < deadline and poll.json()["status"] == "processing":
        time.sleep(0.05)
        poll = test_client.get(f"/v1/try-on/{job_id}")

    assert poll.json()["status"] == "completed"
    assert poll.json()["output_image_url"] == "https://cdn.fashn.ai/out.png"


def test_fashn_api_provider_missing_key_fails_fast(monkeypatch):
    monkeypatch.setenv("AI_MODE", "api")
    monkeypatch.delenv("FASHN_API_KEY", raising=False)
    reset_provider()

    from app.main import app

    test_client = TestClient(app)
    response = test_client.post(
        "/v1/try-on",
        json={
            "person_image_url": "https://example.com/person.jpg",
            "garment_image_url": "https://example.com/shirt.jpg",
            "category": "tops",
        },
    )
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    poll = test_client.get(f"/v1/try-on/{job_id}")
    assert poll.json()["status"] == "failed"
    assert poll.json()["error_code"] == "PROVIDER_ERROR"


@patch("app.providers.fashn_api.httpx.Client")
def test_fashn_inlines_localhost_person_url_as_base64(mock_client_cls, monkeypatch):
    """Local dev backends serve photos at http://localhost:8080/... which
    api.fashn.ai cannot fetch. fashn_api.py must inline these as base64 data
    URIs instead of sending the raw localhost URL — see app/local_image_inline.py."""
    monkeypatch.setenv("AI_MODE", "api")
    monkeypatch.setenv("FASHN_API_KEY", "test-key")
    reset_provider()

    submit_response = _mock_response(200, {"id": "pred-456"})
    client_instance = MagicMock()
    client_instance.post.return_value = submit_response
    client_instance.__enter__.return_value = client_instance
    client_instance.__exit__.return_value = False
    mock_client_cls.return_value = client_instance

    with patch("app.providers.fashn_api.inline_if_local") as mock_inline:
        mock_inline.side_effect = lambda url, label: (
            "data:image/jpeg;base64,ZmFrZQ==" if label == "person" else url
        )

        from app.main import app

        test_client = TestClient(app)
        response = test_client.post(
            "/v1/try-on",
            json={
                "person_image_url": "http://localhost:8080/uploads/user-photos/abc.jpg",
                "garment_image_url": "https://example.com/shirt.jpg",
                "category": "tops",
            },
        )
    assert response.status_code == 202

    sent_payload = client_instance.post.call_args.kwargs["json"]
    assert sent_payload["inputs"]["model_image"] == "data:image/jpeg;base64,ZmFrZQ=="
    assert sent_payload["inputs"]["garment_image"] == "https://example.com/shirt.jpg"


def test_sequential_garments_chain_two_mock_steps(monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    monkeypatch.setenv("VTON_SEQUENCE_POLL_INTERVAL_SECONDS", "0.05")
    reset_provider()

    from app.main import app

    test_client = TestClient(app)
    response = test_client.post(
        "/v1/try-on",
        json={
            "person_image_url": "https://example.com/person.jpg",
            "garments": [
                {"garment_image_url": "https://example.com/top.jpg", "category": "tops"},
                {"garment_image_url": "https://example.com/bottom.jpg", "category": "bottoms"},
            ],
        },
    )
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    # First poll should be fast enough to catch the sequential runner mid-step-1
    # and report progress so the frontend can show "Đang mặc áo... (1/2)".
    first_poll = test_client.get(f"/v1/try-on/{job_id}").json()
    if first_poll["status"] == "processing":
        assert first_poll["total_steps"] == 2
        assert first_poll["current_category"] in {"tops", "bottoms"}

    deadline = time.monotonic() + 10
    poll = test_client.get(f"/v1/try-on/{job_id}")
    while time.monotonic() < deadline and poll.json()["status"] == "processing":
        time.sleep(0.1)
        poll = test_client.get(f"/v1/try-on/{job_id}")

    assert poll.json()["status"] == "completed"
    assert poll.json().get("output_image_url")
