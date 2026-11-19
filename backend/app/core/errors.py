import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("resumify")


class AppError(Exception):
    """
    An expected error with an HTTP status and a stable code for the client, for example
    AppError(409, "EMAIL_TAKEN", "That email already has an account."). details is a list of
    {"field": ..., "message": ...} for form errors.
    """

    def __init__(self, status: int, code: str, message: str, details: list[dict] | None = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details or []


def not_found(what: str) -> AppError:
    # Also used when the item belongs to another user, so we never reveal that it exists.
    return AppError(404, "NOT_FOUND", f"{what} not found.")


def field_error(status: int, code: str, field: str, message: str) -> AppError:
    return AppError(status, code, message, [{"field": field, "message": message}])


def error_response(request: Request, status: int, code: str, message: str, details: list[dict] | None = None) -> JSONResponse:
    # The shared error format used by every backend in the portfolio.
    request_id = getattr(request.state, "request_id", "")
    body = {"error": {"code": code, "message": message, "details": details or [], "requestId": request_id}}
    return JSONResponse(status_code=status, content=body, headers={"X-Request-Id": request_id})


def _validation_details(error: RequestValidationError) -> list[dict]:
    details = []
    for issue in error.errors():
        # loc is ("body", "jobId") or ("query", "page"): the first part is where, not which field.
        field = ".".join(str(part) for part in issue["loc"][1:])
        message = "This field is required." if issue["type"] == "missing" else issue["msg"]
        details.append({"field": field, "message": message})
    return details


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, error: AppError):
        return error_response(request, error.status, error.code, error.message, error.details)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, error: RequestValidationError):
        if any(issue["type"] == "json_invalid" for issue in error.errors()):
            return error_response(request, 400, "INVALID_JSON", "The request body is not valid JSON.")
        return error_response(request, 400, "VALIDATION_FAILED", "Some fields are not valid.", _validation_details(error))

    @app.exception_handler(DuplicateKeyError)
    async def handle_duplicate_key(request: Request, error: DuplicateKeyError):
        # The message holds the duplicated value (for example an email), so it is not logged.
        logger.warning("Unexpected duplicate key id=%s", request.state.request_id)
        return error_response(request, 409, "CONFLICT", "That item already exists.")

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(request: Request, error: StarletteHTTPException):
        if error.status_code == 404:
            return error_response(request, 404, "ROUTE_NOT_FOUND", f"No route for {request.method} {request.url.path}.")
        if error.status_code == 405:
            return error_response(request, 405, "METHOD_NOT_ALLOWED", f"{request.method} is not allowed here.")
        return error_response(request, error.status_code, "HTTP_ERROR", str(error.detail))
