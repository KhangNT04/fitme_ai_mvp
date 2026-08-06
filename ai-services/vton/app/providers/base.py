from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class VtonJobResult:
    job_id: str
    status: str
    output_image_url: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    fallback_mode: str | None = None
    # Populated by SequentialVtonRunner for multi-garment jobs so callers (Spring
    # Boot) can show "Đang mặc áo... (1/2)" style progress instead of one generic
    # spinner for the whole outfit. `step` is 1-indexed; unset for single-garment jobs.
    step: int | None = None
    total_steps: int | None = None
    current_category: str | None = None


class VtonProvider(Protocol):
    def submit(
        self,
        job_id: str,
        person_image_url: str,
        garment_image_url: str,
        category: str,
        garment_description: str | None = None,
    ) -> VtonJobResult: ...

    def poll(self, job_id: str) -> VtonJobResult: ...
