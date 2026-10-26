FROM python:3.11-slim

WORKDIR /app

# System deps needed by asyncpg + ffmpeg for future video support
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Install Playwright + Chromium for screenshots (optional, graceful fallback if fails)
RUN pip install playwright && playwright install --with-deps chromium || echo "Playwright/Chromium install failed — screenshots will be unavailable"

# Copy application
COPY . .

# Create database directory
RUN mkdir -p database

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
