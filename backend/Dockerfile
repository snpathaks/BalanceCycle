# ══════════════════════════════════════════════
#  BalanceCycle — Backend Dockerfile
#  FastAPI + uvicorn on Python 3.12-slim
# ══════════════════════════════════════════════

# ── Stage 1: dependency layer (cached separately for fast rebuilds) ──────────
FROM python:3.12-slim AS deps

WORKDIR /deps

# Install system libs needed by psycopg (libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime image ───────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy only the installed packages from the deps stage (keeps image lean)
COPY --from=deps /install /usr/local

# Runtime libpq (no compiler needed here)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy application source
COPY . .

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8000

# Health-check so Docker/Compose knows when the API is ready
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
