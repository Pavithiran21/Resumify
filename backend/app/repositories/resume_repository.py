from datetime import datetime

from bson import Binary, ObjectId
from pymongo import ReturnDocument

from app.core.database import get_db
from app.core.dates import utc_now
from app.core.text_extraction import ExtractedText

# The file bytes ("data") and the extracted text live in the resume document itself. Queries
# that only need the details leave both out, so listing resumes never loads them.
DETAILS_ONLY = {"data": 0, "text": 0}
WITH_TEXT = {"data": 0}


def _resumes():
    return get_db().resumes


def _file_fields(file_name: str, content_type: str, content: bytes, extracted: ExtractedText) -> dict:
    return {
        "fileName": file_name,
        "contentType": content_type,
        "size": len(content),
        "data": Binary(content),
        "text": extracted.text,
        "pageCount": extracted.page_count,
        "wordCount": extracted.word_count,
    }


async def insert(user_id: ObjectId, file_name: str, content_type: str, content: bytes, extracted: ExtractedText) -> dict:
    now = utc_now()
    resume = {
        "userId": user_id,
        **_file_fields(file_name, content_type, content, extracted),
        "version": 1,
        "lastMatchedAt": None,
        "matchSaves": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await _resumes().insert_one(resume)
    resume["_id"] = result.inserted_id
    del resume["data"], resume["text"]
    return resume


async def replace_file(
    user_id: ObjectId, resume_id: ObjectId, file_name: str, content_type: str, content: bytes, extracted: ExtractedText
) -> dict | None:
    """A new version: new file and text, version + 1. Earlier matches keep their own results."""
    return await _resumes().find_one_and_update(
        {"_id": resume_id, "userId": user_id},
        {"$set": {**_file_fields(file_name, content_type, content, extracted), "updatedAt": utc_now()}, "$inc": {"version": 1}},
        projection=DETAILS_ONLY,
        return_document=ReturnDocument.AFTER,
    )


async def count_for_user(user_id: ObjectId) -> int:
    return await _resumes().count_documents({"userId": user_id})


async def find_details(user_id: ObjectId, resume_id: ObjectId, session=None) -> dict | None:
    return await _resumes().find_one({"_id": resume_id, "userId": user_id}, DETAILS_ONLY, session=session)


async def find_with_text(user_id: ObjectId, resume_id: ObjectId) -> dict | None:
    """The details and the extracted text, for a match. Always filtered by owner."""
    return await _resumes().find_one({"_id": resume_id, "userId": user_id}, WITH_TEXT)


async def find_with_file(user_id: ObjectId, resume_id: ObjectId) -> dict | None:
    """The details and the file bytes, for a download. Always filtered by owner."""
    return await _resumes().find_one({"_id": resume_id, "userId": user_id}, {"text": 0})


async def list_page(user_id: ObjectId, sort: list, skip: int, limit: int) -> tuple[list[dict], int]:
    query = {"userId": user_id}
    cursor = _resumes().find(query, DETAILS_ONLY).sort(sort).skip(skip).limit(limit)
    resumes = await cursor.to_list()
    total = await _resumes().count_documents(query)
    return resumes, total


async def mark_matched(user_id: ObjectId, resume_id: ObjectId, version: int, matched_at: datetime, session) -> bool:
    """
    Called inside the transaction that saves a match. It only succeeds while the resume still
    exists at the version the match was worked out from. Because it writes the resume document,
    it also conflicts with a delete, a new version or another match save running at the same
    moment, so MongoDB lets only one of them go first (see BACKEND.md, "Saving a match safely").
    The $inc makes sure it really writes: a $set alone to the same millisecond is a no-op,
    which takes no write and so conflicts with nothing.
    """
    result = await _resumes().update_one(
        {"_id": resume_id, "userId": user_id, "version": version},
        {"$set": {"lastMatchedAt": matched_at}, "$inc": {"matchSaves": 1}},
        session=session,
    )
    return result.matched_count == 1


async def delete(user_id: ObjectId, resume_id: ObjectId, session=None) -> bool:
    result = await _resumes().delete_one({"_id": resume_id, "userId": user_id}, session=session)
    return result.deleted_count == 1


async def delete_all_for_user(user_id: ObjectId, session=None) -> int:
    result = await _resumes().delete_many({"userId": user_id}, session=session)
    return result.deleted_count
