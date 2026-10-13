# BusinessFlow API — Week 3 localhost packaging (crewai).
# Bind to loopback via Compose port mapping; do not publish beyond 127.0.0.1 for Week 3.
FROM python:3.12.10-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app ./app
COPY config ./config
COPY crew.py ./crew.py

EXPOSE 8000

# Default host 0.0.0.0 inside container; Compose MUST map host to 127.0.0.1 only.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
