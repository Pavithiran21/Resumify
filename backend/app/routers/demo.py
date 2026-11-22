from typing import Literal

from fastapi import APIRouter, Depends, Response

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.rate_limit import LOGIN_PER_IP, per_ip
from app.repositories import user_repository
from app.routers.auth_cookies import auth_result
from app.schemas.auth import AuthOut
from app.schemas.common import ApiModel
from app.services.auth_service import create_session

router = APIRouter(prefix="/api/demo", tags=["demo"])

DEMO_USER_EMAIL = "user@demo.resumify.test"
OTHER_USER_EMAIL = "other@demo.resumify.test"
DEMO_ACCOUNTS = {"User": DEMO_USER_EMAIL, "Second user": OTHER_USER_EMAIL}


class DemoLoginIn(ApiModel):
    role: Literal["User", "Second user"]


def _require_demo_mode() -> None:
    if not get_settings().demo_mode:
        raise AppError(404, "NOT_FOUND", "Demo mode is off.")


@router.get("")
async def demo_accounts():
    """
    With DEMO_MODE=true the demo page shows the two demo accounts with a "Log in as User" and a
    "Log in as Second user" button. Off otherwise. No password is sent: the buttons log in without
    one (below), and a public page that prints credentials gets flagged as phishing by Google Safe
    Browsing (it happened to another demo, Nov 2026).
    """
    _require_demo_mode()
    return {"accounts": [{"role": role, "email": email} for role, email in DEMO_ACCOUNTS.items()]}


@router.post("/login", response_model=AuthOut, dependencies=[Depends(per_ip(LOGIN_PER_IP, "demo-login"))])
async def demo_login(data: DemoLoginIn, response: Response):
    """
    Starts a session for a role's demo account without a password: the browser never holds it.
    Like a log-in without "Keep me logged in": closing the browser ends it.
    """
    _require_demo_mode()
    user = await user_repository.find_by_email(DEMO_ACCOUNTS[data.role])
    # Only a real demo account: never a normal user who happens to have this email.
    if not user or not user.get("isDemo"):
        raise AppError(404, "NOT_FOUND", "The demo account is not set up. Run seed_demo first.")
    return auth_result(response, user, await create_session(user["_id"]))
