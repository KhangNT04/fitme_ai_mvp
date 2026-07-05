from __future__ import annotations

_ALIASES: dict[str, str] = {
    "top": "tops",
    "tops": "tops",
    "upper": "tops",
    "outerwear": "tops",
    "bottom": "bottoms",
    "bottoms": "bottoms",
    "pants": "bottoms",
    "one-piece": "one-pieces",
    "one_piece": "one-pieces",
    "onepiece": "one-pieces",
    "one-pieces": "one-pieces",
    "dress": "one-pieces",
    "jumpsuit": "one-pieces",
}

_UNSUPPORTED = frozenset({"shoes", "shoe", "accessory", "accessories", "bag", "hat"})


def normalize_category(raw: str | None) -> str | None:
    if not raw or not raw.strip():
        return None
    key = raw.strip().lower().replace(" ", "-")
    if key in _UNSUPPORTED:
        return None
    return _ALIASES.get(key)


def is_supported(category: str | None) -> bool:
    return normalize_category(category) is not None


def garment_description(category: str | None) -> str:
    normalized = normalize_category(category)
    if normalized == "tops":
        return "upper body garment"
    if normalized == "bottoms":
        return "lower body garment"
    if normalized == "one-pieces":
        return "dress"
    return "garment"
