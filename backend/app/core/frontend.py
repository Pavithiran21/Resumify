"""
Serves the built frontend (frontend/dist) from STATIC_DIR, so one service is the whole site on one
origin: the app, the API and the refresh cookie (the Docker image sets it). Without STATIC_DIR
(development, tests) nothing changes and Vite serves the app.

- /assets/* (hashed file names) is served with a one-year immutable cache.
- Any other GET that the API answered 404 is a page: a real file in the folder (favicon, robots.txt)
  is sent as it is, anything else gets index.html so React Router can show it.
- /api paths are never turned into pages, so an unknown API route keeps its JSON 404.
"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ASSET_CACHE = "public, max-age=31536000, immutable"


def serve_frontend(app: FastAPI, folder: str) -> None:
    root = Path(folder).resolve()
    index = root / "index.html"
    app.mount("/assets", StaticFiles(directory=root / "assets"), name="assets")

    @app.middleware("http")
    async def frontend_pages(request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith("/assets/"):
            if response.status_code == 200:
                response.headers["Cache-Control"] = ASSET_CACHE
            return response
        is_page = request.method in ("GET", "HEAD") and response.status_code == 404 and not (path == "/api" or path.startswith("/api/"))
        if not is_page:
            return response
        file = (root / path.lstrip("/")).resolve()
        if path != "/" and file.is_file() and root in file.parents:
            return FileResponse(file, headers={"Cache-Control": "public, max-age=3600"})
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
