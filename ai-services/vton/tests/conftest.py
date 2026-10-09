from __future__ import annotations

import socket

import pytest

PUBLIC_IP = "93.184.216.34"


@pytest.fixture(autouse=True)
def dns(monkeypatch):
    """Offline DNS for app.url_safety: hosts resolve to a public IP unless a test maps them elsewhere."""
    records: dict[str, str] = {}

    def fake_getaddrinfo(host, port, *args, **kwargs):
        address = records.get(host, PUBLIC_IP)
        family = socket.AF_INET6 if ":" in address else socket.AF_INET
        return [(family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", (address, port or 443))]

    monkeypatch.setattr("app.url_safety.socket.getaddrinfo", fake_getaddrinfo)
    monkeypatch.delenv("VTON_INTERNAL_TOKEN", raising=False)
    monkeypatch.delenv("VTON_ALLOW_LOCAL_URLS", raising=False)
    return records
