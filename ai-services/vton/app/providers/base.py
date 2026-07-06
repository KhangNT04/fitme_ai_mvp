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


class VtonProvider(Protocol):
    def submit(
        self,
        job_id: str,
        person_image_url: str,
        garment_image_url: str,
        category: str,
    ) -> VtonJobResult: ...

    def poll(self, job_id: str) -> VtonJobResult: ...
