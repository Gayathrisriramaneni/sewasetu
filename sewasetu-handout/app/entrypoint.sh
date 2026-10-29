#!/bin/bash
set -e

echo "=== Sewa Setu startup ==="
mkdir -p /var/sewasetu/uploads /var/sewasetu/uploads/ack /var/log/sewasetu

if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        python /app/migrate.py && break
        echo "DB not ready, retrying in 2s..."
        sleep 2
    done
fi

echo "Starting gunicorn on port ${PORT:-8000}..."
exec gunicorn --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120 app:app
