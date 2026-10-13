"""Minimal Week 3 auth: optional Bearer via SECRET_KEY; open local if unset."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status

from app.settings import Settings, get_settings


async def require_auth_if_configured(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    """
    When SECRET_KEY is set, require `Authorization: Bearer <SECRET_KEY>`.
    When unset, allow open local mode (Gap: FR-AUTH product login deferred).
    """
    if not settings.auth_enabled:
        return

    expected = settings.secret_key.strip()
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "unauthorized",
                    "message": "Missing or invalid Authorization Bearer token",
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "unauthorized",
                    "message": "Invalid Bearer token",
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
