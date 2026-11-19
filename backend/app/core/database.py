from typing import Awaitable, Callable, TypeVar

from bson import ObjectId
from bson.codec_options import CodecOptions
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import get_settings
from app.core.errors import not_found

T = TypeVar("T")

# tz_aware: datetimes come back as UTC-aware values, never naive ones.
CODEC_OPTIONS = CodecOptions(tz_aware=True)

_client: AsyncMongoClient | None = None
_database: AsyncDatabase | None = None


async def connect() -> None:
    global _client, _database
    # Short timeouts: when the network to Atlas drops, a request fails in seconds with a 500 the
    # app shows as "Try again", instead of hanging for Windows' own 20-30 s socket timeout.
    # The longest normal operation (a 5 MB file write, the match transaction) is far below 15 s.
    _client = AsyncMongoClient(
        get_settings().mongodb_uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000, socketTimeoutMS=15000
    )
    # The database name is the path of MONGODB_URI (resumify, resumify_test or resumify_demo).
    _database = _client.get_default_database(codec_options=CODEC_OPTIONS)
    await _client.admin.command("ping")


async def disconnect() -> None:
    global _client, _database
    if _client is not None:
        await _client.close()
    _client = None
    _database = None


def get_db() -> AsyncDatabase:
    if _database is None:
        raise RuntimeError("Database is not connected.")
    return _database


async def ping() -> bool:
    try:
        await get_db().command("ping")
        return True
    except Exception:
        return False


async def run_in_transaction(work: Callable[[AsyncClientSession], Awaitable[T]]) -> T:
    """
    Runs work(session) in one MongoDB transaction: every write in it is kept, or none is.
    with_transaction retries the whole function on a transient error such as a write conflict
    (a match being saved while its resume is deleted), so work must only use the database.
    """
    if _client is None:
        raise RuntimeError("Database is not connected.")
    async with _client.start_session() as session:
        return await session.with_transaction(work)


def parse_object_id(value: str, what: str) -> ObjectId:
    # An id that isn't even a valid ObjectId can't exist, so it is simply not found.
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise not_found(what) from None


async def ensure_indexes() -> None:
    """Creates every index the queries rely on. Safe to run on every start (create_index is idempotent)."""
    db = get_db()

    await db.users.create_index("email", unique=True)

    # TTL indexes: MongoDB removes expired tokens by itself, so no clean-up job is needed.
    for collection in (db.refresh_tokens, db.password_reset_tokens):
        await collection.create_index("tokenHash", unique=True)
        await collection.create_index("userId")
        await collection.create_index("expiresAt", expireAfterSeconds=0)

    await db.resumes.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
    await db.jobs.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
    await db.matches.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
    await db.matches.create_index([("userId", ASCENDING), ("resumeId", ASCENDING), ("jobId", ASCENDING), ("createdAt", ASCENDING)])
    await db.matches.create_index([("userId", ASCENDING), ("jobId", ASCENDING)])
    await db.matches.create_index([("userId", ASCENDING), ("inputHash", ASCENDING)])
