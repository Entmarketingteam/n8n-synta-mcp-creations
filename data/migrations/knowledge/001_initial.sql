-- knowledge.db — Initial schema
-- RAG knowledge base for brand research, SOPs, templates, benchmarks

PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT CHECK(category IN ('brand', 'competitor', 'benchmark', 'platform', 'sop', 'template')),
    tags TEXT,
    source_url TEXT,
    embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);
