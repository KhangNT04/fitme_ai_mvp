from __future__ import annotations

import logging
import os

from app.providers.base import VtonJobResult
from app.providers.mock import MockVtonProvider

logger = logging.getLogger(__name__)


class FashnLocalProvider:
    """Self-hosted fashn-vton-1.5 wrapper. Falls back to mock when model unavailable."""

    def __init__(self) -> None:
        self._pipeline = None
        self._fallback = MockVtonProvider(delay_seconds=1.0)
        self._jobs: dict[str, dict] = {}
        self._try_load_pipeline()

    def _try_load_pipeline(self) -> None:
        try:
            from fashn_vton import TryOnPipeline  # type: ignore[import-untyped]

            weights = os.getenv("FASHN_WEIGHTS_DIR", "/models/fashn-vton-1.5")
            self._pipeline = TryOnPipeline(weights_dir=weights)
            logger.info("Loaded local FASHN VTON pipeline from %s", weights)
        except Exception as exc:  # noqa: BLE001 — optional GPU dependency
            logger.warning("Local FASHN pipeline unavailable, using mock fallback: %s", exc)
            self._pipeline = None

    def submit(
        self,
        job_id: str,
        person_image_url: str,
        garment_image_url: str,
        category: str,
    ) -> VtonJobResult:
        if self._pipeline is None:
            return self._fallback.submit(job_id, person_image_url, garment_image_url, category)
        self._jobs[job_id] = {
            "person": person_image_url,
            "garment": garment_image_url,
            "category": category,
            "done": False,
            "output_url": None,
            "error": None,
        }
        try:
            output_url = self._pipeline.run(
                person_image=person_image_url,
                garment_image=garment_image_url,
                category=category,
            )
            self._jobs[job_id]["done"] = True
            self._jobs[job_id]["output_url"] = output_url
        except Exception as exc:  # noqa: BLE001
            self._jobs[job_id]["done"] = True
            self._jobs[job_id]["error"] = str(exc)
        return VtonJobResult(job_id=job_id, status="processing")

    def poll(self, job_id: str) -> VtonJobResult:
        if self._pipeline is None:
            return self._fallback.poll(job_id)
        job = self._jobs.get(job_id)
        if not job:
            return VtonJobResult(
                job_id=job_id,
                status="failed",
                error_code="NOT_FOUND",
                error_message="Job not found",
            )
        if not job["done"]:
            return VtonJobResult(job_id=job_id, status="processing")
        if job["error"]:
            return VtonJobResult(
                job_id=job_id,
                status="failed",
                error_code="PROVIDER_ERROR",
                error_message=job["error"],
            )
        return VtonJobResult(
            job_id=job_id,
            status="completed",
            output_image_url=job["output_url"],
        )
