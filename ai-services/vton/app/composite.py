from __future__ import annotations

import io
import logging
import os
import uuid
from pathlib import Path

import httpx
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

_OUTPUT_DIR = Path(os.getenv("VTON_OUTPUT_DIR", "/tmp/vton-outputs"))
_PUBLIC_BASE = os.getenv("VTON_PUBLIC_BASE_URL", "").rstrip("/")

_CATEGORY_LAYOUT: dict[str, tuple[float, float]] = {
    "tops": (0.55, 0.22),
    "bottoms": (0.62, 0.45),
    "one-pieces": (0.68, 0.18),
    "outerwear": (0.65, 0.15),
}


def ensure_output_dir() -> Path:
    _OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return _OUTPUT_DIR


def build_composite_url(
    person_image_url: str,
    garment_image_url: str,
    category: str | None = None,
) -> str:
    """Download images and build a demo composite when HF/Replicate VTON is unavailable."""
    person_bytes = _fetch_image(person_image_url)
    garment_bytes = _fetch_image(garment_image_url)
    image = _compose(person_bytes, garment_bytes, category)

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


def _trim_garment(garment: Image.Image) -> Image.Image:
    """Crop white margins and isolate garment bounding box."""
    rgba = garment.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    mask = Image.new("L", (width, height), 0)

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < 16:
                continue
            if r > 245 and g > 245 and b > 245:
                continue
            mask.putpixel((x, y), 255)

    bbox = mask.getbbox()
    if bbox is None:
        bbox = rgba.getbbox()
    if bbox is None:
        return rgba
    return rgba.crop(bbox)


def _feather_alpha(garment: Image.Image, opacity: float = 0.82) -> Image.Image:
    alpha = garment.split()[3]
    alpha = alpha.point(lambda pixel: int(pixel * opacity))
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=1.5))
    garment = garment.copy()
    garment.putalpha(alpha)
    return garment


def _resolve_layout(category: str | None) -> tuple[float, float]:
    if not category:
        return _CATEGORY_LAYOUT["tops"]
    key = category.strip().lower().replace(" ", "-")
    if key in ("outerwear",):
        return _CATEGORY_LAYOUT["outerwear"]
    return _CATEGORY_LAYOUT.get(key, _CATEGORY_LAYOUT["tops"])


def _compose(person_bytes: bytes, garment_bytes: bytes, category: str | None = None) -> Image.Image:
    target_w, target_h = 600, 800
    person = Image.open(io.BytesIO(person_bytes)).convert("RGBA")
    garment = Image.open(io.BytesIO(garment_bytes)).convert("RGBA")

    person = ImageOps.fit(person, (target_w, target_h), Image.Resampling.LANCZOS)
    garment = _trim_garment(garment)

    scale, y_ratio = _resolve_layout(category)
    g_w = int(target_w * scale)
    g_h = max(1, int(g_w * garment.height / max(garment.width, 1)))
    garment = garment.resize((g_w, g_h), Image.Resampling.LANCZOS)
    garment = _feather_alpha(garment)

    x = (target_w - g_w) // 2
    y = int(target_h * y_ratio)
    person.paste(garment, (x, y), garment)
    return person
