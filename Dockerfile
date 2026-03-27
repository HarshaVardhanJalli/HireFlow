# ============================================================
#  HireFlow – Production Dockerfile (Backend + Frontend)
# ============================================================

# ---------- Stage 1: Build React frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Python backend + serve frontend ----------
FROM python:3.12-slim
WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY api/ ./api/
COPY core/ ./core/
COPY utils/ ./utils/
COPY data/ ./data/
COPY start_backend.py ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Install a lightweight static server for the frontend
RUN pip install --no-cache-dir uvicorn[standard]

# Expose ports
EXPOSE 8000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/status || exit 1

# Start both services
COPY start_docker.py ./
CMD ["python3", "start_docker.py"]
