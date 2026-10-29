-- Migration 001: Add API session tables and decision_reason column
-- Applied automatically via entrypoint.sh on cloud deployments.

CREATE TABLE IF NOT EXISTS api_sessions (
    id          SERIAL PRIMARY KEY,
    mobile      VARCHAR(15) NOT NULL,
    token       VARCHAR(64) UNIQUE NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_sessions_token ON api_sessions (token);

CREATE TABLE IF NOT EXISTS officer_sessions (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50) NOT NULL,
    token       VARCHAR(64) UNIQUE NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_officer_sessions_token ON officer_sessions (token);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS decision_reason TEXT;
