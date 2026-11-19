import math
from typing import Generic, TypeVar

from fastapi import Query
from pymongo import ASCENDING, DESCENDING

from app.core.errors import AppError
from app.schemas.common import ApiModel

T = TypeVar("T")


class PageParams:
    """The same query parameters for every list in every project: page (1-based), size (max 100), sort."""

    def __init__(
        self,
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=100),
        sort: str | None = Query(None, max_length=50),
    ):
        self.page = page
        self.size = size
        self.sort = sort

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.size


class Page(ApiModel, Generic[T]):
    items: list[T]
    page: int
    size: int
    total_items: int
    total_pages: int


def to_page(items: list, total_items: int, params: PageParams) -> dict:
    return {
        "items": items,
        "page": params.page,
        "size": params.size,
        "totalItems": total_items,
        "totalPages": math.ceil(total_items / params.size),
    }


def parse_sort(sort: str | None, allowed_fields: list[str], default: str) -> list[tuple[str, int]]:
    """
    Turns "startDate" or "-startDate" (descending) into a MongoDB sort. Only allow-listed fields
    are accepted. _id is added as a tie-breaker, so items with the same value never move between pages.
    """
    value = sort or default
    descending = value.startswith("-")
    field = value[1:] if descending else value

    if field not in allowed_fields:
        message = f"Sort by one of: {', '.join(allowed_fields)}"
        raise AppError(400, "VALIDATION_FAILED", "Some fields are not valid.", [{"field": "sort", "message": message}])

    direction = DESCENDING if descending else ASCENDING
    return [(field, direction), ("_id", direction)]
