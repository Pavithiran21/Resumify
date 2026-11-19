from fastapi import APIRouter, Request

from app.core import database
from app.core.errors import error_response

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health(request: Request):
    """Used by the start scripts and run-all-e2e: up only when MongoDB Atlas answers too."""
    if not await database.ping():
        return error_response(request, 503, "DATABASE_UNAVAILABLE", "The database is not reachable.")
    return {"status": "ok", "database": "up"}
