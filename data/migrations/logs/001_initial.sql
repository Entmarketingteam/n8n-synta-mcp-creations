-- logs.db — Initial schema
-- Event logs and cron history for observability

PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    event TEXT NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'critical')),
    source TEXT,
    details_json TEXT,
    session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_level ON events(level);

CREATE TABLE IF NOT EXISTS cron_runs (
    id INTEGER PRIMARY KEY,
    cron_name TEXT NOT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    status TEXT CHECK(status IN ('started', 'completed', 'failed')),
    duration_ms INTEGER,
    result_summary TEXT,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_name ON cron_runs(cron_name);
CREATE INDEX IF NOT EXISTS idx_cron_runs_started ON cron_runs(started_at);
