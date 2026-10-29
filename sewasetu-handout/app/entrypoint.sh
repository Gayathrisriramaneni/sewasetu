#!/bin/bash
# Startup script for Railway/Render cloud deployments.
# Runs schema + migration, then starts gunicorn.
set -e

echo "=== Sewa Setu startup ==="
mkdir -p /var/sewasetu/uploads /var/sewasetu/uploads/ack /var/log/sewasetu

if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    for i in $(seq 1 30); do
        python -c "import psycopg2, os; psycopg2.connect(os.environ['DATABASE_URL'])" \
            2>/dev/null && echo "  DB ready." && break
        echo "  attempt $i/30..."
        sleep 2
    done

    echo "Applying schema..."
    python - <<'EOF'
import psycopg2, os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute(open('/app/schema.sql').read())
conn.commit()
cur.close(); conn.close()
print("Schema done.")
EOF

    echo "Applying migration 001..."
    python - <<'EOF'
import psycopg2, os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute(open('/app/migrations/001_api_support.sql').read())
conn.commit()
cur.close(); conn.close()
print("Migration 001 done.")
EOF
fi

echo "Starting gunicorn on port ${PORT:-8000}..."
exec gunicorn --bind "0.0.0.0:${PORT:-8000}" --workers 4 --timeout 60 app:app
