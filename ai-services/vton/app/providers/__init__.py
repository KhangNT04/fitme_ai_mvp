from __future__ import annotations

import os

from app.providers.base import VtonProvider
from app.providers.mock import MockVtonProvider

_provider: VtonProvider | None = None


def get_provider() -> VtonProvider:
    global _provider
    if _provider is not None:
        return _provider

    mode = os.getenv("AI_MODE", "mock").strip().lower()
    if mode == "hf":
        from app.providers.hf_idmvton import HfIdmVtonProvider

        _provider = HfIdmVtonProvider()
    elif mode == "local":
        from app.providers.fashn_local import FashnLocalProvider

        _provider = FashnLocalProvider()
    else:
        _provider = MockVtonProvider(delay_seconds=1.0)
    return _provider


def reset_provider() -> None:
    global _provider
    _provider = None
