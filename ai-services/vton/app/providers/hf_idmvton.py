from __future__ import annotations

import logging
import os
import tempfile
import threading
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from gradio_client import Client, handle_file

from app.category_mapper import garment_description, is_supported, normalize_category
from app.composite import build_composite_url
from app.image_preflight import validate_image_url
from app.providers.base import VtonJobResult
from app.providers.replicate_idmvton import is_replicate_configured, run_replicate_tryon

logger = logging.getLogger(__name__)

_HF_SPACE = os.getenv("HF_SPACE", "yisol/IDM-VTON")
_HF_TOKEN = os.getenv("HF_TOKEN") or None
_PRIVATE_HOSTS = frozenset({"localhost", "127.0.0.1", "0.0.0.0"})


def _hf_max_retries() -> int:
    return max(1, int(os.getenv("HF_MAX_RETRIES", "3")))


def _hf_retry_delay_seconds() -> float:
    return float(os.getenv("HF_RETRY_DELAY_SECONDS", "5"))


def _hf_fallback_composite() -> bool:
    return os.getenv("HF_FALLBACK_COMPOSITE", "true").strip().lower() in {
        "1",
        "true",
        "yes",
    }


def _provider_chain() -> list[str]:
    return [
        step.strip().lower()
        for step in os.getenv("VTON_PROVIDER_CHAIN", "hf,replicate,composite").split(",")
        if step.strip()
    ]


class HfIdmVtonProvider:
    """Virtual try-on via HF Space → Replicate → composite fallback chain."""

    def __init__(self) -> None:
        self._client: Client | None = None
        self._client_lock = threading.Lock()
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def _get_client(self) -> Client:
        with self._client_lock:
            if self._client is None:
                logger.info("Connecting to HF Space %s", _HF_SPACE)
                self._client = Client(_HF_SPACE, token=_HF_TOKEN)
            return self._client

    def _reset_client(self) -> None:
        with self._client_lock:
            self._client = None

    def submit(
        self,
        job_id: str,
        person_image_url: str,
        garment_image_url: str,
        category: str,
    ) -> VtonJobResult:
        normalized = normalize_category(category)
        if not is_supported(normalized):
            return VtonJobResult(
                job_id=job_id,
                status="failed",
                error_code="UNSUPPORTED_CATEGORY",
                error_message=f"Category not supported: {category}",
            )

        description = garment_description(normalized)
        with self._lock:
            self._jobs[job_id] = {
                "status": "processing",
                "error": None,
                "output": None,
                "fallback_mode": None,
            }

        def _run() -> None:
            for label, url in (("person", person_image_url), ("garment", garment_image_url)):
                try:
                    validate_image_url(url, label)
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "VTON %s URL may be unreachable for job %s: %s",
                        label,
                        job_id,
                        exc,
                    )

            last_error: Exception | None = None

            if "hf" in _provider_chain():
                for attempt in range(1, _hf_max_retries() + 1):
                    try:
                        output_url = self._run_hf_job(
                            person_image_url,
                            garment_image_url,
                            description,
                        )
                        self._mark_completed(job_id, output_url, fallback_mode=None)
                        return
                    except Exception as exc:  # noqa: BLE001
                        last_error = exc
                        logger.warning(
                            "HF VTON job %s attempt %s/%s failed: %s",
                            job_id,
                            attempt,
                            _hf_max_retries(),
                            exc,
                        )
                        self._reset_client()
                        if attempt < _hf_max_retries():
                            time.sleep(_hf_retry_delay_seconds())

            if "replicate" in _provider_chain() and is_replicate_configured():
                try:
                    output_url = run_replicate_tryon(
                        person_image_url,
                        garment_image_url,
                        normalized or category,
                        description,
                    )
                    logger.info("Replicate VTON job %s completed", job_id)
                    self._mark_completed(job_id, output_url, fallback_mode="replicate")
                    return
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    logger.warning("Replicate VTON job %s failed: %s", job_id, exc)

            if "composite" in _provider_chain() and _hf_fallback_composite():
                try:
                    composite_url = build_composite_url(
                        person_image_url,
                        garment_image_url,
                        category=normalized,
                    )
                    logger.info("HF VTON job %s using composite fallback", job_id)
                    self._mark_completed(job_id, composite_url, fallback_mode="composite")
                    return
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    logger.warning("Composite fallback failed for job %s: %s", job_id, exc)

            with self._lock:
                entry = self._jobs.get(job_id)
                if entry is not None:
                    entry["status"] = "failed"
                    entry["error"] = str(last_error or "All VTON providers failed")

        threading.Thread(target=_run, daemon=True).start()
        return VtonJobResult(job_id=job_id, status="processing")

    def _mark_completed(self, job_id: str, output_url: str, fallback_mode: str | None) -> None:
        with self._lock:
            entry = self._jobs.get(job_id)
            if entry is not None:
                entry["status"] = "completed"
                entry["output"] = output_url
                entry["fallback_mode"] = fallback_mode

    def _run_hf_job(
        self,
        person_image_url: str,
        garment_image_url: str,
        description: str,
    ) -> str:
        person_ref = _resolve_image_ref(person_image_url)
        garment_ref = _resolve_image_ref(garment_image_url)
        logger.info(
            "HF VTON submit person=%s garment=%s",
            person_image_url[:100],
            garment_image_url[:100],
        )
        client = self._get_client()
        gradio_job = client.submit(
            dict={"background": person_ref, "layers": None, "composite": None},
            garm_img=garment_ref,
            garment_des=description,
            is_checked=True,
            is_checked_crop=True,
            denoise_steps=30,
            seed=42,
            api_name="/tryon",
        )
        result = gradio_job.result(timeout=300)
        output_url = _extract_output_url(result)
        logger.info("HF VTON completed output=%s", output_url[:120] if output_url else "")
        return output_url

    def poll(self, job_id: str) -> VtonJobResult:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return VtonJobResult(
                    job_id=job_id,
                    status="failed",
                    error_code="NOT_FOUND",
                    error_message="Job not found",
                )
            status = job["status"]
            if status == "processing":
                return VtonJobResult(job_id=job_id, status="processing")
            if status == "failed":
                return VtonJobResult(
                    job_id=job_id,
                    status="failed",
                    error_code="PROVIDER_ERROR",
                    error_message=str(job.get("error") or "HF Space error"),
                )
            return VtonJobResult(
                job_id=job_id,
                status="completed",
                output_image_url=str(job.get("output") or ""),
                fallback_mode=job.get("fallback_mode"),
            )


def _resolve_image_ref(url: str) -> Any:
    """Always download remote images locally so HF Gradio does not fetch cold-start URLs."""
    if url.startswith("http://") or url.startswith("https://"):
        return handle_file(_download_to_temp(url))
    path = Path(url)
    if path.is_file():
        return handle_file(str(path))
    return handle_file(_download_to_temp(url))


def _download_to_temp(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix or ".jpg"
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
        logger.debug("Downloaded %s bytes from %s", len(response.content), url[:100])
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(response.content)
            return tmp.name


def _extract_output_url(result: Any) -> str:
    if isinstance(result, str):
        return result
    if isinstance(result, (list, tuple)) and result:
        return _extract_output_url(result[0])
    if isinstance(result, dict):
        for key in ("url", "path", "name"):
            value = result.get(key)
            if value:
                return str(value)
    return str(result)


def new_job_id() -> str:
    return str(uuid.uuid4())
