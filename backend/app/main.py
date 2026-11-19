import logging
import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core import database
from app.core.config import get_settings
from app.core.errors import error_response, register_error_handlers
from app.core.frontend import serve_frontend
from app.core.request_body import discard_body
from app.routers import auth, demo, health, jobs, matches, profile, resumes

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("resumify")
# One line per request comes from request_context below (method, path with ids only, status,
# time, request id). Uvicorn's own access line would repeat it with the client's IP address and
# the full query string, which Resumify never logs (SECURITY.md, "Personal data never in logs").
logging.getLogger("uvicorn.access").disabled = True

REQUEST_ID_PATTERN = re.compile(r"^[\w-]{1,64}$")
# A job description is up to 20,000 characters (up to 4 bytes each in UTF-8), plus the JSON around it.
MAX_JSON_BODY_BYTES = 128 * 1024
# An oversized body up to this size is read and dropped before the 413 (core/request_body.py).
MAX_DISCARDED_JSON_BYTES = 1024 * 1024
UPLOAD_PATHS = re.compile(r"^/api/(resumes|resumes/[^/]+/versions|jobs/extract-text)$")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await database.connect()
    await database.ensure_indexes()
    logger.info("Resumify API ready on database %s", database.get_db().name)
    yield
    await database.disconnect()


def _is_upload(request: Request) -> bool:
    # Uploads have their own 5 MB limit (app/routers/uploads.py).
    return request.method == "POST" and UPLOAD_PATHS.match(request.url.path) is not None


async def request_context(request: Request, call_next):
    """
    Request id, body size limit, security headers and one log line per request. Only the
    method, path and status are logged: no headers, IPs, bodies or query strings. Paths hold
    only ids, never a file name, resume text or job text.
    """
    incoming = request.headers.get("x-request-id", "")
    request.state.request_id = incoming if REQUEST_ID_PATTERN.match(incoming) else str(uuid.uuid4())
    started = time.perf_counter()

    length = request.headers.get("content-length", "")
    if not _is_upload(request) and length.isdigit() and int(length) > MAX_JSON_BODY_BYTES:
        await discard_body(request, MAX_DISCARDED_JSON_BYTES)
        response = error_response(request, 413, "PAYLOAD_TOO_LARGE", "The request body is too large.")
    else:
        try:
            response = await call_next(request)
        except Exception:
            # No stack trace or personal data in the body; the log has the details.
            logger.exception("Unhandled error id=%s", request.state.request_id)
            response = error_response(request, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.")

    response.headers["X-Request-Id"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path != "/api/health":
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.info("%s %s %d %.0fms id=%s", request.method, request.url.path, response.status_code, elapsed_ms, request.state.request_id)
    return response


def create_app() -> FastAPI:
    # The interactive API docs exist only outside production.
    docs_url = None if settings.is_production else "/api/docs"
    app = FastAPI(
        title="Resumify API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs_url else None,
    )

    # Added first, so it runs inside CORS: error responses from it still get CORS headers.
    app.add_middleware(BaseHTTPMiddleware, dispatch=request_context)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
        expose_headers=["X-Request-Id", "Content-Disposition"],
    )
    register_error_handlers(app)

    for module in (health, auth, profile, resumes, jobs, matches, demo):
        app.include_router(module.router)
    if settings.static_dir:
        serve_frontend(app, settings.static_dir)
    return app


app = create_app()
