from fastapi import APIRouter

from app.core.config import get_settings
from app.core.errors import AppError

router = APIRouter(prefix="/api/demo", tags=["demo"])

DEMO_USER_EMAIL = "user@demo.resumify.test"


@router.get("")
async def demo_accounts():
    """
    With DEMO_MODE=true the login page shows the demo account and its public, demo-only
    password, with a "Log in as User" button. Off otherwise.
    """
    settings = get_settings()
    if not settings.demo_mode:
        raise AppError(404, "NOT_FOUND", "Demo mode is off.")
    return {"accounts": [{"role": "User", "email": DEMO_USER_EMAIL, "password": settings.demo_password}]}
