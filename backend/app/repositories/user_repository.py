from bson import ObjectId
from pymongo import ReturnDocument

from app.core.database import get_db
from app.core.dates import utc_now


def _users():
    return get_db().users


async def create(name: str, email: str, password_hash: str, is_demo: bool = False) -> dict:
    """The unique index on email is the real duplicate check, so two sign-ups racing for one email are safe."""
    now = utc_now()
    user = {
        "name": name,
        "email": email,
        "passwordHash": password_hash,
        "isDemo": is_demo,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await _users().insert_one(user)
    user["_id"] = result.inserted_id
    return user


async def find_by_email(email: str) -> dict | None:
    return await _users().find_one({"email": email})


async def find_by_id(user_id: ObjectId) -> dict | None:
    return await _users().find_one({"_id": user_id})


async def update_name(user_id: ObjectId, name: str) -> dict | None:
    return await _users().find_one_and_update(
        {"_id": user_id},
        {"$set": {"name": name, "updatedAt": utc_now()}},
        return_document=ReturnDocument.AFTER,
    )


async def update_password_hash(user_id: ObjectId, password_hash: str) -> None:
    await _users().update_one({"_id": user_id}, {"$set": {"passwordHash": password_hash, "updatedAt": utc_now()}})


async def delete(user_id: ObjectId) -> None:
    await _users().delete_one({"_id": user_id})
