from datetime import datetime

from bson import ObjectId

from app.core.database import get_db
from app.core.dates import utc_now

# Refresh tokens and password-reset tokens: only the SHA-256 hash is stored, and a TTL index
# on expiresAt deletes expired ones. "Consume" reads and deletes in one atomic step, so a
# token works exactly once even if two requests use it at the same moment.


async def save_refresh_token(user_id: ObjectId, token_hash: str, expires_at: datetime, remember: bool) -> None:
    await get_db().refresh_tokens.insert_one(
        {"userId": user_id, "tokenHash": token_hash, "expiresAt": expires_at, "remember": remember, "createdAt": utc_now()}
    )


async def consume_refresh_token(token_hash: str) -> dict | None:
    return await get_db().refresh_tokens.find_one_and_delete({"tokenHash": token_hash, "expiresAt": {"$gt": utc_now()}})


async def delete_refresh_token(token_hash: str) -> None:
    await get_db().refresh_tokens.delete_one({"tokenHash": token_hash})


async def delete_all_refresh_tokens(user_id: ObjectId) -> None:
    await get_db().refresh_tokens.delete_many({"userId": user_id})


async def save_reset_token(user_id: ObjectId, token_hash: str, expires_at: datetime) -> None:
    await get_db().password_reset_tokens.insert_one(
        {"userId": user_id, "tokenHash": token_hash, "expiresAt": expires_at, "createdAt": utc_now()}
    )


async def consume_reset_token(token_hash: str) -> dict | None:
    return await get_db().password_reset_tokens.find_one_and_delete(
        {"tokenHash": token_hash, "expiresAt": {"$gt": utc_now()}}
    )


async def delete_all_reset_tokens(user_id: ObjectId) -> None:
    await get_db().password_reset_tokens.delete_many({"userId": user_id})
