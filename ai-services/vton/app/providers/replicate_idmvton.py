from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = (
    "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985"
)
_LEGACY_MODEL = (
    "cuuupid/idm-vton:906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f"
)

_CATEGORY_MAP: dict[str, str] = {
    "tops": "upper_body",
    "bottoms": "lower_body",
    "one-pieces": "dresses",
    "outerwear": "upper_body",
}


def _replicate_token() -> str | None:
    return os.getenv("REPLICATE_API_TOKEN") or None


def is_replicate_configured() -> bool:
    token = _replicate_token()
    return bool(token and token.strip())


def _model_candidates() -> list[str]:
    configured = os.getenv("REPLICATE_IDM_VTON_MODEL", "").strip()
    candidates: list[str] = []
    for model in (configured, _DEFAULT_MODEL, _LEGACY_MODEL, "cuuupid/idm-vton"):
        if model and model not in candidates:
            candidates.append(model)
    return candidates


def _extract_output_url(output: Any) -> str:
    if output is None:
        raise RuntimeError("Replicate returned empty output")
    if hasattr(output, "url"):
        url = str(output.url)
        if url.startswith("http"):
            return url
    if isinstance(output, (list, tuple)) and output:
        return _extract_output_url(output[0])
    url = str(output)
    if not url.startswith("http"):
        raise RuntimeError(f"Unexpected Replicate output: {url[:120]}")
    return url


def run_replicate_tryon(
    person_image_url: str,
    garment_image_url: str,
    category: str,
    garment_description: str,
) -> str:
    if not is_replicate_configured():
        raise RuntimeError("REPLICATE_API_TOKEN is not configured")

    import replicate
    from replicate.exceptions import ReplicateError

    rep_category = _CATEGORY_MAP.get(category.strip().lower(), "upper_body")
    payload = {
        "human_img": person_image_url,
        "garm_img": garment_image_url,
        "garment_des": garment_description or "garment",
        "category": rep_category,
        "crop": True,
        "steps": 30,
        "seed": 42,
    }

    last_error: Exception | None = None
    for model in _model_candidates():
        try:
            logger.info(
                "Replicate IDM-VTON model=%s category=%s human=%s garment=%s",
                model,
                rep_category,
                person_image_url[:80],
                garment_image_url[:80],
            )
            output = replicate.run(model, input=payload)
            return _extract_output_url(output)
        except ReplicateError as exc:
            last_error = exc
            status = getattr(exc, "status", None)
            logger.warning("Replicate model %s failed (status=%s): %s", model, status, exc)
            if status == 404:
                continue
            raise
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("Replicate model %s failed: %s", model, exc)

    raise RuntimeError(f"All Replicate models failed: {last_error}")
