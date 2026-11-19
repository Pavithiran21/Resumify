"""
Development data on the resumify database only:
  dev@resumify.test  a normal (non-demo) account with the same resumes, jobs and matches as the demo
  and the two demo accounts (see seed_demo.py)
Every account uses DEMO_PASSWORD. Existing copies of these accounts are replaced; nothing else is touched.
The match model must be reachable (the stand-in: node e2e/mocks/llm-stub.js).

Usage (from backend/): .venv\\Scripts\\python.exe -m scripts.seed_dev
"""

import asyncio

from app.core import database
from app.core.config import get_settings
from scripts.seed_demo import print_summary, seed_demo_accounts
from scripts.seed_helpers import create_job_seeker, remove_account

DEV_USER = ("Dev Jobseeker", "dev@resumify.test")


async def main() -> None:
    await database.connect()
    try:
        name = database.get_db().name
        if name != "resumify":
            raise SystemExit(f"seed_dev only runs on the resumify database, not on {name}.")
        await database.ensure_indexes()

        await remove_account(DEV_USER[1])
        summaries = [await create_job_seeker(*DEV_USER, get_settings().demo_password, is_demo=False)]
        summaries += await seed_demo_accounts()
        print_summary(name, summaries)
    finally:
        await database.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
