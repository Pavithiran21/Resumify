from fastapi import Response

from app.core.config import get_settings
from app.core.security import REFRESH_TOKEN_TTL
from app.schemas.auth import AuthOut, UserOut
from app.services.auth_service import Session

REFRESH_COOKIE = "rf_refresh"


def _cookie_options() -> dict:
    # HTTP-only: page scripts can't read it. SameSite=Strict: other sites can't make the browser
    # send it (CSRF). Path: sent only to the auth endpoints that need it.
    return {"httponly": True, "secure": get_settings().is_production, "samesite": "strict", "path": "/api/auth"}


def set_refresh_cookie(response: Response, refresh_token: str, persistent: bool) -> None:
    # Persistent ("Keep me logged in"): kept for 7 days. Otherwise no Max-Age or Expires, so it is
    # a browser-session cookie: closing the browser logs out, while a reload still keeps the session.
    max_age = int(REFRESH_TOKEN_TTL.total_seconds()) if persistent else None
    response.set_cookie(REFRESH_COOKIE, refresh_token, max_age=max_age, **_cookie_options())


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, **_cookie_options())


def auth_result(response: Response, user: dict, session: Session) -> AuthOut:
    """The refresh token goes in the cookie; the access token and the user go in the body."""
    set_refresh_cookie(response, session.refresh_token, persistent=session.remember)
    return AuthOut(user=UserOut.from_doc(user), access_token=session.access_token)
