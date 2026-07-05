from __future__ import annotations

import logging
import os
import tempfile
import threading
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from gradio_client import Client, handle_file

from app.category_mapper import garment_description, is_supported, normalize_category
from app.providers.base import VtonJobResult

logger = logging.getLogger(__name__)

_HF_SPACE = os.getenv("HF_SPACE", "yisol/IDM-VTON")
_HF_TOKEN = os.getenv("HF_TOKEN") or None
_PRIVATE_HOSTS = frozenset({"localhost", "127.0.0.1", "0.0.0.0"})


class HfIdmVtonProvider:
    """Virtual try-on via Hugging Face Space yisol/IDM-VTON (gradio_client)."""

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
            self._jobs[job_id] = {"status": "processing", "error": None, "output": None}

        def _run() -> None:
            try:
                person_ref = _resolve_image_ref(person_image_url)
                garment_ref = _resolve_image_ref(garment_image_url)
                client = self._get_client()
                gradio_job = client.submit(
                    dict={"background": person_ref, "layers": [], "composite": None},
                    garm_img=garment_ref,
                    garment_des=description,
                    is_checked=True,
                    is_checked_crop=False,
                    denoise_steps=30,
                    seed=42,
                    api_name="/tryon",
                )
                result = gradio_job.result()
                output_url = _extract_output_url(result)
                with self._lock:
                    entry = self._jobs.get(job_id)
                    if entry is not None:
                        entry["status"] = "completed"
                        entry["output"] = output_url
            except Exception as exc:  # noqa: BLE001
                logger.warning("HF VTON job %s failed: %s", job_id, exc)
                with self._lock:
                    entry = self._jobs.get(job_id)
                    if entry is not None:
                        entry["status"] = "failed"
                        entry["error"] = str(exc)

        threading.Thread(target=_run, daemon=True).start()
        return VtonJobResult(job_id=job_id, status="processing")

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
            )


def _resolve_image_ref(url: str) -> Any:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host in _PRIVATE_HOSTS:
        return handle_file(_download_to_temp(url))
    if url.startswith("http://") or url.startswith("https://"):
        return handle_file(url)
    path = Path(url)
    if path.is_file():
        return handle_file(str(path))
    return handle_file(_download_to_temp(url))


def _download_to_temp(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix or ".jpg"
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
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
