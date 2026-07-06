from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_REPLICATE_MODEL = os.getenv(
    "REPLICATE_IDM_VTON_MODEL",
    "cuuupid/idm-vton:906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f",
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


def run_replicate_tryon(
    person_image_url: str,
    garment_image_url: str,
    category: str,
    garment_description: str,
) -> str:
    if not is_replicate_configured():
        raise RuntimeError("REPLICATE_API_TOKEN is not configured")

    import replicate

    rep_category = _CATEGORY_MAP.get(category.strip().lower(), "upper_body")
    logger.info(
        "Replicate IDM-VTON category=%s human=%s garment=%s",
        rep_category,
        person_image_url[:80],
        garment_image_url[:80],
    )

    output = replicate.run(
        _REPLICATE_MODEL,
        input={
            "human_img": person_image_url,
            "garm_img": garment_image_url,
            "garment_des": garment_description or "garment",
            "category": rep_category,
            "crop": True,
            "steps": 30,
            "seed": 42,
        },
    )
    if output is None:
        raise RuntimeError("Replicate returned empty output")
    url = str(output)
    if not url.startswith("http"):
        raise RuntimeError(f"Unexpected Replicate output: {url[:120]}")
    return url
