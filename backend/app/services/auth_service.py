import logging
from dataclasses import dataclass

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core import rate_limit
from app.core.config import get_settings
from app.core.dates import utc_now
from app.core.errors import AppError, field_error
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    REFRESH_TOKEN_TTL,
    RESET_TOKEN_TTL,
    create_opaque_token,
    hash_password,
    hash_token,
    password_matches,
    sign_access_token,
)
from app.repositories import token_repository, user_repository
from app.schemas.auth import LoginIn, RegisterIn
from app.services import mail_service

logger = logging.getLogger("resumify.auth")


@dataclass
class Session:
    access_token: str
    refresh_token: str
    # "Keep me logged in": decides whether the refresh cookie outlives the browser (auth_cookies).
    remember: bool = False


def session_expired() -> AppError:
    return AppError(401, "SESSION_EXPIRED", "Your session has ended. Please log in again.")


async def create_session(user_id: ObjectId, remember: bool = False) -> Session:
    """
    A new access token and a new refresh token (stored hashed). The server keeps the refresh token
    for 7 days either way; remember only decides how long the browser keeps the cookie. It is
    stored with the token, so every rotated cookie keeps the user's choice.
    """
    token, token_hash = create_opaque_token()
    await token_repository.save_refresh_token(user_id, token_hash, utc_now() + REFRESH_TOKEN_TTL, remember)
    return Session(access_token=sign_access_token(str(user_id)), refresh_token=token, remember=remember)


async def register(data: RegisterIn) -> tuple[dict, Session]:
    password_hash = await hash_password(data.password)
    try:
        user = await user_repository.create(data.name, data.email, password_hash)
    except DuplicateKeyError:
        raise field_error(409, "EMAIL_TAKEN", "email", "That email already has an account. Log in instead.") from None
    return user, await create_session(user["_id"])


async def login(data: LoginIn) -> tuple[dict, Session]:
    rate_limit.ensure_login_allowed(data.email)

    user = await user_repository.find_by_email(data.email)
    matches = await password_matches(data.password, user["passwordHash"] if user else DUMMY_PASSWORD_HASH)

    # The same answer for an unknown email and a wrong password, so accounts can't be guessed.
    if user is None or not matches:
        rate_limit.record_failed_login(data.email)
        raise AppError(401, "INVALID_CREDENTIALS", "That email or password doesn't match. Try again.")
    return user, await create_session(user["_id"], remember=data.remember)


async def refresh(refresh_token: str | None) -> tuple[dict, Session]:
    """Rotation: the old refresh token is deleted as it is read, and a new pair is issued."""
    if not refresh_token:
        raise session_expired()

    stored = await token_repository.consume_refresh_token(hash_token(refresh_token))
    if stored is None:
        raise session_expired()

    user = await user_repository.find_by_id(stored["userId"])
    if user is None:
        raise session_expired()
    # The new cookie is the same kind as the old one (tokens from before the choice existed: not kept).
    return user, await create_session(user["_id"], remember=stored.get("remember", False))


async def logout(refresh_token: str | None) -> None:
    if refresh_token:
        await token_repository.delete_refresh_token(hash_token(refresh_token))


async def forgot_password(email: str) -> None:
    """
    Emails a single-use reset link if the account exists. It runs after the response has gone
    (a background task), so the reply never reveals whether the email has an account.
    Demo accounts get no link: their password must not change.
    """
    try:
        user = await user_repository.find_by_email(email)
        if user is None or user.get("isDemo"):
            return

        # Only the newest link works.
        await token_repository.delete_all_reset_tokens(user["_id"])
        token, token_hash = create_opaque_token()
        await token_repository.save_reset_token(user["_id"], token_hash, utc_now() + RESET_TOKEN_TTL)

        reset_link = f"{get_settings().frontend_url}/reset-password?token={token}"
        await mail_service.send_password_reset_email(user, reset_link)
    except Exception:
        # No email address in the log: it is personal data.
        logger.exception("Password reset email failed")


async def reset_password(token: str, new_password: str) -> None:
    stored = await token_repository.consume_reset_token(hash_token(token))
    if stored is None:
        raise AppError(400, "RESET_LINK_EXPIRED", "This link has expired. Ask for a new one.")

    await user_repository.update_password_hash(stored["userId"], await hash_password(new_password))
    # Sign out every session: whoever knew the old password loses access.
    await token_repository.delete_all_refresh_tokens(stored["userId"])
