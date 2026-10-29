#!/usr/bin/env python3
"""Run DB schema + migration on startup. Called by entrypoint.sh."""
import os
import sys
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL set — skipping migration (local Docker mode).")
    sys.exit(0)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    base = os.path.dirname(os.path.abspath(__file__))

    print("Applying schema.sql...")
    cur.execute(open(os.path.join(base, "schema.sql")).read())
    conn.commit()

    print("Applying migration 001...")
    cur.execute(open(os.path.join(base, "migrations", "001_api_support.sql")).read())
    conn.commit()

    cur.close()
    conn.close()
    print("Database ready.")
    sys.exit(0)
except Exception as e:
    print("Migration error: %s" % e)
    sys.exit(1)
