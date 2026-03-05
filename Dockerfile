FROM python:3.11-slim

WORKDIR /app

# System deps for native extensions (numpy, scipy, catboost, etc.)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy & install Python deps first (Docker layer cache)
COPY Backend/requirements.txt Backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r Backend/requirements.txt

# Copy entire project (Backend + ML models + datasets)
COPY . .

EXPOSE 8000

# Port is read in Backend.api.main from PORT env var (default 8000)
CMD ["python", "-m", "Backend.api.main"]
