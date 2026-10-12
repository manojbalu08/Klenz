# Klenz website: one container that serves the website, the admin and the API.
# Railway builds this file on every push to GitHub (see DEPLOY.md). To try it locally:
#   docker build -t klenz .
#   docker run --rm -p 8000:8000 -e DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/klenz klenz

# 1) Build the React site into frontend/dist.
FROM node:22-slim AS site
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2) FastAPI serves the API and the built site on $PORT.
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000
# The host's proxy sends the visitor's IP in X-Forwarded-For; trust it so the
# login and order limits count each visitor, not the proxy.
ENV FORWARDED_ALLOW_IPS=*
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt
COPY backend/app ./app
COPY --from=site /app/frontend/dist /app/frontend/dist

# Run as a normal user. It owns backend/ so the app can write .secret_key when SECRET_KEY is not set.
RUN useradd --create-home --uid 10001 klenz && chown klenz /app/backend
USER klenz
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\" --proxy-headers"]
