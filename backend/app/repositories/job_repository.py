from datetime import datetime

from bson import ObjectId

from app.core.database import get_db
from app.core.dates import utc_now

WITHOUT_DESCRIPTION = {"description": 0}


def _jobs():
    return get_db().jobs


async def insert(user_id: ObjectId, title: str, company: str | None, description: str) -> dict:
    job = {
        "userId": user_id,
        "title": title,
        "company": company,
        "description": description,
        "characterCount": len(description),
        "lastMatchedAt": None,
        "matchSaves": 0,
        "createdAt": utc_now(),
    }
    result = await _jobs().insert_one(job)
    job["_id"] = result.inserted_id
    return job


async def find(user_id: ObjectId, job_id: ObjectId) -> dict | None:
    return await _jobs().find_one({"_id": job_id, "userId": user_id})


async def find_summary(user_id: ObjectId, job_id: ObjectId) -> dict | None:
    return await _jobs().find_one({"_id": job_id, "userId": user_id}, WITHOUT_DESCRIPTION)


async def list_page(user_id: ObjectId, sort: list, skip: int, limit: int) -> tuple[list[dict], int]:
    query = {"userId": user_id}
    cursor = _jobs().find(query, WITHOUT_DESCRIPTION).sort(sort).skip(skip).limit(limit)
    jobs = await cursor.to_list()
    total = await _jobs().count_documents(query)
    return jobs, total


async def mark_matched(user_id: ObjectId, job_id: ObjectId, matched_at: datetime, session) -> bool:
    """
    Like resume_repository.mark_matched: succeeds only while the job exists, and conflicts with
    a delete. The $inc makes it a real write even when lastMatchedAt doesn't change.
    """
    result = await _jobs().update_one(
        {"_id": job_id, "userId": user_id},
        {"$set": {"lastMatchedAt": matched_at}, "$inc": {"matchSaves": 1}},
        session=session,
    )
    return result.matched_count == 1


async def delete(user_id: ObjectId, job_id: ObjectId, session=None) -> bool:
    result = await _jobs().delete_one({"_id": job_id, "userId": user_id}, session=session)
    return result.deleted_count == 1


async def delete_all_for_user(user_id: ObjectId) -> None:
    await _jobs().delete_many({"userId": user_id})
