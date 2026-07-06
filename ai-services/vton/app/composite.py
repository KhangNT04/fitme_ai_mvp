from __future__ import annotations

import io
import logging
import os
import uuid
from pathlib import Path

import httpx
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

_OUTPUT_DIR = Path(os.getenv("VTON_OUTPUT_DIR", "/tmp/vton-outputs"))
_PUBLIC_BASE = os.getenv("VTON_PUBLIC_BASE_URL", "").rstrip("/")


def ensure_output_dir() -> Path:
    _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return _OUTPUT_DIR


def build_composite_url(person_image_url: str, garment_image_url: str) -> str:
    """Download images and build a demo composite when HF VTON is unavailable."""
    person_bytes = _fetch_image(person_image_url)
    garment_bytes = _fetch_image(garment_image_url)
    image = _compose(person_bytes, garment_bytes)

    output_dir = ensure_output_dir()
    filename = f"{uuid.uuid4().hex}.jpg"
    output_path = output_dir / filename
    image.convert("RGB").save(output_path, format="JPEG", quality=88)

    if _PUBLIC_BASE:
        return f"{_PUBLIC_BASE}/outputs/{filename}"
    return str(output_path)


def _fetch_image(url: str) -> bytes:
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.content


def _compose(person_bytes: bytes, garment_bytes: bytes) -> Image.Image:
    target_w, target_h = 600, 800
    person = Image.open(io.BytesIO(person_bytes)).convert("RGBA")
    garment = Image.open(io.BytesIO(garment_bytes)).convert("RGBA")

    person = ImageOps.fit(person, (target_w, target_h), Image.Resampling.LANCZOS)

    g_w = int(target_w * 0.58)
    g_h = max(1, int(g_w * garment.height / max(garment.width, 1)))
    garment = garment.resize((g_w, g_h), Image.Resampling.LANCZOS)

    alpha = garment.split()[3]
    alpha = alpha.point(lambda pixel: int(pixel * 0.82))
    garment.putalpha(alpha)

    x = (target_w - g_w) // 2
    y = int(target_h * 0.2)
    person.paste(garment, (x, y), garment)
    return person
