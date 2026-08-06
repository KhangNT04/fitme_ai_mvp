from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, NamedTuple

from app.providers import get_provider
from app.providers.base import VtonJobResult

logger = logging.getLogger(__name__)

_POLL_INTERVAL_SECONDS = float(os.getenv("VTON_SEQUENCE_POLL_INTERVAL_SECONDS", "2"))
_STEP_TIMEOUT_SECONDS = float(os.getenv("VTON_SEQUENCE_STEP_TIMEOUT_SECONDS", "180"))


class SequenceGarment(NamedTuple):
    category: str
    garment_image_url: str
    garment_description: str | None = None


class SequentialVtonRunner:
    """Runs several single-garment VTON calls back-to-back, feeding the output
    image of each step as the person photo of the next one.

    This is what makes "compose a full outfit" possible on top of providers
    (FASHN hosted API, HF Space, self-hosted) that only accept one garment
    per call: step 1 renders the top on the original photo, step 2 renders
    the bottom on step 1's output, etc. Works with any provider that
    implements the `submit`/`poll` protocol, so it is not FASHN-specific.
    """

    def __init__(self) -> None:
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def has(self, job_id: str) -> bool:
        with self._lock:
            return job_id in self._jobs

    def submit(self, job_id: str, person_image_url: str, garments: list[SequenceGarment]) -> None:
        with self._lock:
            self._jobs[job_id] = {
                "status": "processing",
                "step": 0,
                "total": len(garments),
                "current_category": garments[0].category if garments else None,
                "output": None,
                "error": None,
                "error_code": None,
                "fallback_mode": None,
            }

        def _run() -> None:
            provider = get_provider()
            current_person_url = person_image_url
            fallback_mode: str | None = None

            for index, garment in enumerate(garments):
                with self._lock:
                    self._jobs[job_id]["step"] = index + 1
                    self._jobs[job_id]["current_category"] = garment.category

                sub_job_id = f"{job_id}-step{index}"
                try:
                    result = provider.submit(
                        job_id=sub_job_id,
                        person_image_url=current_person_url,
                        garment_image_url=garment.garment_image_url,
                        category=garment.category,
                        garment_description=garment.garment_description,
                    )
                except Exception as exc:  # noqa: BLE001
                    self._fail(job_id, "PROVIDER_ERROR", str(exc))
                    return

                if result.status == "failed":
                    self._fail(
                        job_id,
                        result.error_code or "PROVIDER_ERROR",
                        result.error_message or f"VTON step {index + 1}/{len(garments)} failed",
                    )
                    return

                result = self._await_step(provider, sub_job_id, result)
                if result.status != "completed" or not result.output_image_url:
                    code = result.error_code or "TIMEOUT"
                    message = result.error_message or (
                        f"VTON step {index + 1}/{len(garments)} vượt quá thời gian chờ"
                    )
                    self._fail(job_id, code, message)
                    return

                current_person_url = result.output_image_url
                fallback_mode = result.fallback_mode or fallback_mode
                logger.info(
                    "Sequential VTON job %s step %s/%s completed output=%s",
                    job_id,
                    index + 1,
                    len(garments),
                    current_person_url[:120],
                )

            with self._lock:
                self._jobs[job_id].update(
                    status="completed", output=current_person_url, fallback_mode=fallback_mode
                )

        threading.Thread(target=_run, daemon=True).start()

    @staticmethod
    def _await_step(provider, sub_job_id: str, initial: VtonJobResult) -> VtonJobResult:
        result = initial
        deadline = time.monotonic() + _STEP_TIMEOUT_SECONDS
        while result.status == "processing" and time.monotonic() < deadline:
            time.sleep(_POLL_INTERVAL_SECONDS)
            result = provider.poll(sub_job_id)
        return result

    def _fail(self, job_id: str, code: str, message: str) -> None:
        with self._lock:
            entry = self._jobs.setdefault(job_id, {})
            entry.update(status="failed", error=message, error_code=code)
        logger.warning("Sequential VTON job %s failed [%s]: %s", job_id, code, message)

    def poll(self, job_id: str) -> VtonJobResult:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return VtonJobResult(
                    job_id=job_id, status="failed", error_code="NOT_FOUND", error_message="Job not found"
                )
            if job["status"] == "processing":
                return VtonJobResult(
                    job_id=job_id,
                    status="processing",
                    step=job.get("step") or None,
                    total_steps=job.get("total"),
                    current_category=job.get("current_category"),
                )
            if job["status"] == "failed":
                return VtonJobResult(
                    job_id=job_id,
                    status="failed",
                    error_code=job.get("error_code"),
                    error_message=job.get("error"),
                )
            return VtonJobResult(
                job_id=job_id,
                status="completed",
                output_image_url=job.get("output"),
                fallback_mode=job.get("fallback_mode"),
            )


sequence_runner = SequentialVtonRunner()
