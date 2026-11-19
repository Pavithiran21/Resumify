from datetime import UTC, datetime

# Every timestamp (uploads, versions, match runs) is stored in UTC. The backend never needs a
# calendar day of its own, so there is no per-user time zone: the frontend shows each
# timestamp in the browser's time zone.


def utc_now() -> datetime:
    # MongoDB stores dates to the millisecond. Cutting the microseconds here means a response
    # built right after a write shows exactly the timestamp a later read returns.
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)
