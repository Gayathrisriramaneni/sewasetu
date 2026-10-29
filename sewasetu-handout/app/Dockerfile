FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /var/sewasetu/uploads /var/sewasetu/uploads/ack /var/log/sewasetu \
    && chmod +x /app/entrypoint.sh

ENV PORT=8000
EXPOSE $PORT
CMD ["/bin/bash", "/app/entrypoint.sh"]
