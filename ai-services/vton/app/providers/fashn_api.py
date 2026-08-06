from __future__ import annotations

import logging
import os
import threading
from typing import Any

import httpx

from app.image_preflight import validate_image_url
from app.local_image_inline import inline_if_local
from app.providers.base import VtonJobResult

logger = logging.getLogger(__name__)

_FASHN_BASE_URL = os.getenv("FASHN_API_BASE_URL", "https://api.fashn.ai").rstrip("/")
_FASHN_MODEL = os.getenv("FASHN_MODEL_NAME", "tryon-v1.6")
_FASHN_MODERATION_LEVEL = os.getenv("FASHN_MODERATION_LEVEL", "permissive")
_REQUEST_TIMEOUT_SECONDS = float(os.getenv("FASHN_REQUEST_TIMEOUT_SECONDS", "30"))
_SUPPORTED_CATEGORIES = frozenset({"tops", "bottoms", "one-pieces"})


def _api_key() -> str | None:
    return os.getenv("FASHN_API_KEY") or None


def is_fashn_configured() -> bool:
    key = _api_key()
    return bool(key and key.strip())


class FashnApiProvider:
    """Virtual try-on via the FASHN hosted API (https://api.fashn.ai).

    One `/v1/run` call renders exactly one garment onto one person photo
    (see https://docs.fashn.ai/api-reference/tryon-v1-6). Composing a full
    outfit (top + bottom, etc.) is done by calling this provider once per
    garment and chaining the output of one step as the `model_image` input
    of the next — see `app.sequence.SequentialVtonRunner`, which the
    `/v1/try-on` endpoint uses automatically when the caller sends more
    than one item in `garments`.
    """

    def __init__(self) -> None:
        if not is_fashn_configured():
            logger.warning(
                "FASHN_API_KEY is not set — FashnApiProvider will fail every submit() call "
                "until the key is configured on the ai-vton service."
            )
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {_api_key() or ''}",
            "Content-Type": "application/json",
        }

    def submit(
        self,
        job_id: str,
        person_image_url: str,
        garment_image_url: str,
        category: str,
        garment_description: str | None = None,
    ) -> VtonJobResult:
        with self._lock:
            self._jobs[job_id] = {
                "status": "processing",
                "prediction_id": None,
                "error": None,
                "error_code": None,
                "output": None,
            }

        if not is_fashn_configured():
            return self._fail(
                job_id, "PROVIDER_ERROR", "FASHN_API_KEY chưa được cấu hình trên ai-vton"
            )

        for label, url in (("person", person_image_url), ("garment", garment_image_url)):
            try:
                validate_image_url(url, label)
            except Exception as exc:  # noqa: BLE001 — best-effort warning only
                logger.warning(
                    "FASHN %s URL may be unreachable from api.fashn.ai for job %s: %s",
                    label,
                    job_id,
                    exc,
                )

        # `localhost`/`127.0.0.1` URLs (typical for local dev backends) are turned into
        # base64 data URIs here — api.fashn.ai can't reach them itself, but FASHN's
        # inputs accept a data URI just as well as a public URL. This is what makes
        # `AI_MODE=api` usable in local dev without an ngrok tunnel. No-op in
        # production, where these are already public URLs. See app/local_image_inline.py.
        resolved_person_url = inline_if_local(person_image_url, "person")
        resolved_garment_url = inline_if_local(garment_image_url, "garment")

        fashn_category = category if category in _SUPPORTED_CATEGORIES else "auto"
        payload = {
            "model_name": _FASHN_MODEL,
            "inputs": {
                "model_image": resolved_person_url,
                "garment_image": resolved_garment_url,
                "category": fashn_category,
                "mode": "balanced",
                "moderation_level": _FASHN_MODERATION_LEVEL,
            },
        }

        try:
            with httpx.Client(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
                response = client.post(
                    f"{_FASHN_BASE_URL}/v1/run", headers=self._headers(), json=payload
                )
        except httpx.HTTPError as exc:
            return self._fail(job_id, "PROVIDER_ERROR", f"FASHN /v1/run request error: {exc}")

        if response.status_code >= 400:
            body = _safe_json(response)
            message = body.get("message") or body.get("error") or f"HTTP {response.status_code}"
            code = "PROVIDER_ERROR"
            if response.status_code == 429:
                code = "RATE_LIMIT" if "credit" not in message.lower() else "OUT_OF_CREDITS"
            elif response.status_code == 401:
                code = "UNAUTHORIZED"
            elif response.status_code == 400:
                code = "INVALID_IMAGE"
            return self._fail(job_id, code, str(message))

        body = _safe_json(response)
        prediction_id = body.get("id")
        if not prediction_id:
            return self._fail(job_id, "PROVIDER_ERROR", "FASHN /v1/run did not return a prediction id")

        with self._lock:
            self._jobs[job_id]["prediction_id"] = prediction_id
        logger.info("FASHN job %s submitted prediction_id=%s category=%s", job_id, prediction_id, fashn_category)
        return VtonJobResult(job_id=job_id, status="processing")

    def poll(self, job_id: str) -> VtonJobResult:
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None:
            return VtonJobResult(
                job_id=job_id, status="failed", error_code="NOT_FOUND", error_message="Job not found"
            )
        if job["status"] == "failed":
            return VtonJobResult(
                job_id=job_id, status="failed", error_code=job.get("error_code"), error_message=job.get("error")
            )
        if job["status"] == "completed":
            return VtonJobResult(job_id=job_id, status="completed", output_image_url=job.get("output"))

        prediction_id = job.get("prediction_id")
        if not prediction_id:
            return VtonJobResult(job_id=job_id, status="processing")

        try:
            with httpx.Client(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
                response = client.get(
                    f"{_FASHN_BASE_URL}/v1/status/{prediction_id}", headers=self._headers()
                )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("FASHN status poll transient error for job %s: %s", job_id, exc)
            return VtonJobResult(job_id=job_id, status="processing")

        body = _safe_json(response)
        status = str(body.get("status") or "").lower()

        if status in {"starting", "in_queue", "processing"}:
            return VtonJobResult(job_id=job_id, status="processing")

        if status == "completed":
            outputs = body.get("output") or []
            output_url = outputs[0] if outputs else None
            if not output_url:
                return self._fail(job_id, "PROVIDER_ERROR", "FASHN trả về completed nhưng không có output")
            with self._lock:
                self._jobs[job_id].update(status="completed", output=output_url)
            return VtonJobResult(job_id=job_id, status="completed", output_image_url=output_url)

        error = body.get("error") or {}
        message = error.get("message") or f"FASHN prediction status: {status or 'unknown'}"
        code = error.get("name") or "PROVIDER_ERROR"
        return self._fail(job_id, code, message)

    def _fail(self, job_id: str, code: str, message: str) -> VtonJobResult:
        with self._lock:
            entry = self._jobs.setdefault(job_id, {})
            entry.update(status="failed", error=message, error_code=code)
        logger.warning("FASHN job %s failed [%s]: %s", job_id, code, message)
        return VtonJobResult(job_id=job_id, status="failed", error_code=code, error_message=message)


def _safe_json(response: httpx.Response) -> dict:
    try:
        return response.json()
    except ValueError:
        return {}
