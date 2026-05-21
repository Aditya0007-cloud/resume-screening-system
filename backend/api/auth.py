from fastapi import Header, HTTPException, Query

from backend.config import get_settings


def require_admin(
    x_admin_token: str | None = Header(default=None),
    admin_token: str | None = Query(default=None),
) -> None:
    token = get_settings().admin_token
    supplied_token = x_admin_token or admin_token
    if token and supplied_token != token:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")
