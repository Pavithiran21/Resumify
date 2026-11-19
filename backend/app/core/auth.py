import jwt
from bson import ObjectId
from fastapi import Header

from app.core.errors import AppError
from app.core.security import verify_access_token


def current_user_id(authorization: str | None = Header(default=None)) -> ObjectId:
    """
    Route dependency: lets the request through only with a valid "Authorization: Bearer <token>"
    header and returns the logged-in user's id. Every repository call filters by this id,
    which is the ownership check on every resource.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError(401, "UNAUTHENTICATED", "Please log in.")

    try:
        user_id = verify_access_token(authorization.removeprefix("Bearer "))
        return ObjectId(user_id)
    except jwt.ExpiredSignatureError:
        raise AppError(401, "TOKEN_EXPIRED", "Your session has expired. Please log in again.") from None
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise AppError(401, "TOKEN_INVALID", "Please log in again.") from None
