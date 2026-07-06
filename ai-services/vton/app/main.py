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

AI_MODE = os.getenv("AI_MODE", "mock")
_HF_FALLBACK_COMPOSITE = os.getenv("HF_FALLBACK_COMPOSITE", "true").strip().lower() in {
    "1",
    "true",
    "yes",
}

app = FastAPI(title="FitMe AI VTON", version="1.0.0")

_output_dir = ensure_output_dir()
app.mount("/outputs", StaticFiles(directory=str(_output_dir)), name="outputs")


class TryOnRequest(BaseModel):
    person_image_url: str = Field(..., min_length=1)
    garment_image_url: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    mode: str = Field(default="balanced")


class TryOnJobResponse(BaseModel):
    job_id: str
    status: str
    output_image_url: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    fallback_mode: str | None = None


@app.get("/health")
def health() -> dict[str, str | bool]:
    from app.providers.replicate_idmvton import is_replicate_configured

    return {
        "status": "ok",
        "mode": AI_MODE,
        "hf_fallback_composite": _HF_FALLBACK_COMPOSITE,
        "provider_chain": os.getenv("VTON_PROVIDER_CHAIN", "hf,replicate,composite"),
        "replicate_configured": is_replicate_configured(),
    }


@app.post("/v1/try-on", status_code=202, response_model=TryOnJobResponse)
def submit_try_on(body: TryOnRequest) -> TryOnJobResponse:
    normalized = normalize_category(body.category)
    if not is_supported(normalized):
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "UNSUPPORTED_CATEGORY",
                "error_message": f"Category not supported: {body.category}",
            },
        )

    job_id = new_job_id()
    provider = get_provider()
    result = provider.submit(
        job_id=job_id,
        person_image_url=body.person_image_url,
        garment_image_url=body.garment_image_url,
        category=normalized or body.category,
    )
    if result.status == "failed":
        return TryOnJobResponse(
            job_id=job_id,
            status="failed",
            error_code=result.error_code,
            error_message=result.error_message,
        )
    return TryOnJobResponse(job_id=job_id, status="processing")


@app.get("/v1/try-on/{job_id}", response_model=TryOnJobResponse)
def poll_try_on(job_id: uuid.UUID) -> TryOnJobResponse:
    provider = get_provider()
    result = provider.poll(str(job_id))
    return TryOnJobResponse(
        job_id=str(job_id),
        status=result.status,
        output_image_url=result.output_image_url,
        error_code=result.error_code,
        error_message=result.error_message,
        fallback_mode=result.fallback_mode,
    )
