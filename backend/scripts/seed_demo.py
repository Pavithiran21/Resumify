"""
Creates the demo accounts (password DEMO_PASSWORD, public on purpose):
  user@demo.resumify.test   Meera Iyer: two resumes (one with two versions), three jobs, four matches
  other@demo.resumify.test  a second normal account, only to show that another user's resume is "not found"

On resumify_demo (the from-scratch demo database) it empties every collection first.
On resumify (development) it replaces only the demo accounts.
Any other database is refused, so it can never touch the test data.
The match model must be reachable (the stand-in: node e2e/mocks/llm-stub.js).

Usage (from backend/):
  set ENV_FILE=.env.demo   (PowerShell: $env:ENV_FILE='.env.demo')
  .venv\\Scripts\\python.exe -m scripts.seed_demo
"""

import asyncio

from app.core import database
from app.core.config import get_settings
from scripts.seed_helpers import create_job_seeker, create_other_user, remove_account

DEMO_USER = ("Meera Iyer", "user@demo.resumify.test")
OTHER_USER = ("Arjun Mehta", "other@demo.resumify.test")
ALLOWED_DATABASES = ("resumify_demo", "resumify")


async def seed_demo_accounts() -> list[dict]:
    password = get_settings().demo_password
    if len(password) < 8:
        raise SystemExit("DEMO_PASSWORD in backend/.env must be at least 8 characters.")

    for _, email in (DEMO_USER, OTHER_USER):
        await remove_account(email)
    return [
        await create_job_seeker(*DEMO_USER, password, is_demo=True),
        await create_other_user(*OTHER_USER, password, is_demo=True),
    ]


def print_summary(database_name: str, summaries: list[dict]) -> None:
    for summary in summaries:
        print(
            f"{database_name}: {summary['email']} with {summary['resumes']} resumes, {summary['jobs']} jobs, "
            f"{summary['matches']} matches ({summary['scores']})"
        )


async def main() -> None:
    await database.connect()
    try:
        name = database.get_db().name
        if name not in ALLOWED_DATABASES:
            raise SystemExit(f"seed_demo only runs on {' or '.join(ALLOWED_DATABASES)}, not on {name}.")

        if name == "resumify_demo":
            for collection in await database.get_db().list_collection_names():
                await database.get_db()[collection].delete_many({})
        await database.ensure_indexes()

        print_summary(name, await seed_demo_accounts())
    finally:
        await database.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
