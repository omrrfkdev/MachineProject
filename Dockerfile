# Production Dockerfile for NASA Spacecraft Anomaly Detection API
FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (libgomp is required for XGBoost)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend application code
COPY backend /app/backend

# Copy model artifacts
COPY models /app/models

# Copy sample archive test data (for sample evaluation endpoint)
COPY archive/data/data/test /app/archive/data/data/test

WORKDIR /app/backend

# Render / Railway dynamically binds PORT
ENV PORT=8000
ENV HOST=0.0.0.0
ENV ALLOWED_ORIGINS="*"

EXPOSE 8000

# Healthcheck for orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
