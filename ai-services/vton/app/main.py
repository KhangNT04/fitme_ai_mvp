from __future__ import annotations

import os
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.category_mapper import is_supported, normalize_category
from app.composite import ensure_output_dir
from app.providers import get_provider
from app.providers.mock import new_job_id
from app.sequence import SequenceGarment, sequence_runner

AI_MODE = os.getenv("AI_MODE", "mock")
_HF_FALLBACK_COMPOSITE = os.getenv("HF_FALLBACK_COMPOSITE", "true").strip().lower() in {
    "1",
    "true",
    "yes",
}

app = FastAPI(title="FitMe AI VTON", version="1.0.0")

_output_dir = ensure_output_dir()
app.mount("/outputs", StaticFiles(directory=str(_output_dir)), name="outputs")


class GarmentInput(BaseModel):
    garment_image_url: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    garment_description: str | None = Field(default=None, max_length=200)


class TryOnRequest(BaseModel):
    person_image_url: str = Field(..., min_length=1)
    mode: str = Field(default="balanced")
    # Legacy single-garment shape (still supported, and what every provider
    # ultimately receives per call — see docs/FASHN_VTON_INTEGRATION.md §1).
    garment_image_url: str | None = Field(default=None, min_length=1)
    category: str | None = Field(default=None, min_length=1)
    garment_description: str | None = Field(default=None, max_length=200)
    # Optional multi-item shape: when the caller wants a full outfit
    # (e.g. top + bottom) rendered on one person photo, it sends every
    # garment here. FASHN (and every other provider wired in this service)
    # still only accepts one garment per underlying call, so these are
    # applied sequentially — see app.sequence.SequentialVtonRunner.
    garments: list[GarmentInput] | None = Field(default=None)


class TryOnJobResponse(BaseModel):
    job_id: str
    status: str
    output_image_url: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    fallback_mode: str | None = None
    # Multi-garment sequential jobs only — lets the caller show step-aware
    # progress (e.g. "Đang mặc áo... (1/2)") instead of one opaque spinner.
    step: int | None = None
    total_steps: int | None = None
    current_category: str | None = None


@app.get("/health")
def health() -> dict[str, str | bool]:
    from app.providers.fashn_api import is_fashn_configured
    from app.providers.replicate_idmvton import is_replicate_configured

    return {
        "status": "ok",
        "mode": AI_MODE,
        "hf_fallback_composite": _HF_FALLBACK_COMPOSITE,
        "provider_chain": os.getenv("VTON_PROVIDER_CHAIN", "hf,replicate,composite"),
        "replicate_configured": is_replicate_configured(),
        "fashn_api_configured": is_fashn_configured(),
    }


def _resolve_garments(body: TryOnRequest) -> list[GarmentInput]:
    if body.garments:
        return body.garments
    if not body.garment_image_url or not body.category:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "INVALID_IMAGE",
                "error_message": "garment_image_url and category are required when garments is omitted",
            },
        )
    return [
        GarmentInput(
            garment_image_url=body.garment_image_url,
            category=body.category,
            garment_description=body.garment_description,
        )
    ]


@app.post("/v1/try-on", status_code=202, response_model=TryOnJobResponse)
def submit_try_on(body: TryOnRequest) -> TryOnJobResponse:
    garments = _resolve_garments(body)

    normalized_garments: list[SequenceGarment] = []
    for garment in garments:
        normalized = normalize_category(garment.category)
        if not is_supported(normalized):
            raise HTTPException(
                status_code=422,
                detail={
                    "error_code": "UNSUPPORTED_CATEGORY",
                    "error_message": f"Category not supported: {garment.category}",
                },
            )
        normalized_garments.append(
            SequenceGarment(
                category=normalized,
                garment_image_url=garment.garment_image_url,
                garment_description=garment.garment_description,
            )
        )

    job_id = new_job_id()

    if len(normalized_garments) == 1:
        provider = get_provider()
        garment = normalized_garments[0]
        result = provider.submit(
            job_id=job_id,
            person_image_url=body.person_image_url,
            garment_image_url=garment.garment_image_url,
            category=garment.category,
            garment_description=garment.garment_description,
        )
        if result.status == "failed":
            return TryOnJobResponse(
                job_id=job_id,
                status="failed",
                error_code=result.error_code,
                error_message=result.error_message,
            )
        return TryOnJobResponse(job_id=job_id, status="processing")

    # Multiple garments: chain single-garment calls sequentially (top → bottom
    # → ...), feeding each step's output back in as the next person photo.
    sequence_runner.submit(job_id, body.person_image_url, normalized_garments)
    return TryOnJobResponse(job_id=job_id, status="processing")


@app.get("/v1/try-on/{job_id}", response_model=TryOnJobResponse)
def poll_try_on(job_id: uuid.UUID) -> TryOnJobResponse:
    job_id_str = str(job_id)
    if sequence_runner.has(job_id_str):
        result = sequence_runner.poll(job_id_str)
    else:
        provider = get_provider()
        result = provider.poll(job_id_str)
    return TryOnJobResponse(
        job_id=job_id_str,
        status=result.status,
        output_image_url=result.output_image_url,
        error_code=result.error_code,
        error_message=result.error_message,
        fallback_mode=result.fallback_mode,
        step=result.step,
        total_steps=result.total_steps,
        current_category=result.current_category,
    )
