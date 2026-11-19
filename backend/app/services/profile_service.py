from bson import ObjectId

from app.core.errors import AppError, field_error
from app.core.security import hash_password, password_matches
from app.repositories import job_repository, match_repository, resume_repository, token_repository, user_repository
from app.schemas.auth import ChangePasswordIn
from app.services.auth_service import Session, create_session


def account_gone() -> AppError:
    # The access token can outlive a deleted account by a few minutes; treat that as logged out.
    return AppError(401, "UNAUTHENTICATED", "Please log in.")


def ensure_not_demo(user: dict) -> None:
    if user.get("isDemo"):
        raise AppError(403, "DEMO_ACCOUNT_LOCKED", "Demo accounts cannot change their password or be deleted.")


async def verify_password(user: dict, password: str, field: str) -> None:
    # A wrong password here is a form error (400), not 401: the frontend logs the user out on
    # any 401, and a typo must not end their session.
    if not await password_matches(password, user["passwordHash"]):
        raise field_error(400, "WRONG_PASSWORD", field, "That password isn't right.")


async def get_profile(user_id: ObjectId) -> dict:
    user = await user_repository.find_by_id(user_id)
    if user is None:
        raise account_gone()
    return user


async def update_name(user_id: ObjectId, name: str) -> dict:
    user = await user_repository.update_name(user_id, name)
    if user is None:
        raise account_gone()
    return user


async def change_password(user_id: ObjectId, data: ChangePasswordIn) -> tuple[dict, Session]:
    """Changes the password, signs out every other session and returns a new session for this one."""
    user = await get_profile(user_id)
    ensure_not_demo(user)
    await verify_password(user, data.current_password, "currentPassword")

    await user_repository.update_password_hash(user_id, await hash_password(data.new_password))
    await token_repository.delete_all_refresh_tokens(user_id)
    # Not "kept logged in": the refresh cookie (path /api/auth) never reaches this endpoint, so the
    # earlier choice is unknown here. The new session lasts until the browser closes, the safer default.
    return user, await create_session(user_id, remember=False)


async def delete_account(user_id: ObjectId, password: str) -> None:
    """Permanently removes the user and everything they own: matches, jobs, resumes (files and text)."""
    user = await get_profile(user_id)
    ensure_not_demo(user)
    await verify_password(user, password, "password")

    # The resume files and their text are stored inside the resume documents, so deleting
    # those deletes them. The user record goes last.
    await match_repository.delete_all_for_user(user_id)
    await job_repository.delete_all_for_user(user_id)
    await resume_repository.delete_all_for_user(user_id)
    await token_repository.delete_all_reset_tokens(user_id)
    await user_repository.delete(user_id)
    await token_repository.delete_all_refresh_tokens(user_id)
