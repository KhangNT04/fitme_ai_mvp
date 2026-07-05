from __future__ import annotations

import threading
import time
import uuid

from app.providers.base import VtonJobResult

_MOCK_OUTPUT = (
    "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446"
    "?auto=format&fit=crop&w=600&h=800&q=80"
)


class MockVtonProvider:
    """Placeholder VTON for CI and local dev without HF credentials."""

    def __init__(self, delay_seconds: float = 1.0) -> None:
        self._delay = delay_seconds
        self._jobs: dict[str, dict] = {}
        self._lock = threading.Lock()

    def submit(
        self,
        job_id: str,
        person_image_url: str,
        garment_image_url: str,
        category: str,
    ) -> VtonJobResult:
        with self._lock:
            self._jobs[job_id] = {
                "started_at": time.monotonic(),
                "done": False,
                "error": None,
            }

        def _complete() -> None:
            time.sleep(self._delay)
            with self._lock:
                job = self._jobs.get(job_id)
                if job is not None:
                    job["done"] = True

        threading.Thread(target=_complete, daemon=True).start()
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
            if not job["done"]:
                return VtonJobResult(job_id=job_id, status="processing")
            if job.get("error"):
                return VtonJobResult(
                    job_id=job_id,
                    status="failed",
                    error_code="PROVIDER_ERROR",
                    error_message=str(job["error"]),
                )
        return VtonJobResult(
            job_id=job_id,
            status="completed",
            output_image_url=_MOCK_OUTPUT,
        )


def new_job_id() -> str:
    return str(uuid.uuid4())
