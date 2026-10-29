FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends cron \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /var/sewasetu/uploads /var/sewasetu/uploads/ack /var/log/sewasetu \
    && crontab /app/deploy/crontab \
    && chmod +x /app/entrypoint.sh

ENV PORT=8000
EXPOSE $PORT
CMD ["/bin/bash", "/app/entrypoint.sh"]
