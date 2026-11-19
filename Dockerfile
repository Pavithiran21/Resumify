# One image for the whole site: FastAPI serves the React build (STATIC_DIR), so the app, the API and the
# refresh cookie share one origin.

# 1. Build the frontend.
FROM node:26-alpine AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. The API on Python 3.15 with the built frontend.
FROM python:3.15-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/public \
    FORWARDED_ALLOW_IPS=127.0.0.1
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app app
COPY backend/scripts scripts
COPY --from=web /app/frontend/dist /app/public
RUN useradd --system --no-create-home app
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/api/health')"
# --proxy-headers: behind a host's proxy (FORWARDED_ALLOW_IPS='*' on Render) rate limits see the visitor's IP.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers"]
