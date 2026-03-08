# ENT Agency — OpenClaw Operations Repo

## Project Overview

This repository contains the automation infrastructure for ENT Agency's OpenClaw instance ("Claw") — an autonomous operations agent for influencer marketing. It manages creator relationships, tracks performance across platforms, automates campaign workflows, and surfaces insights.

**Owner:** Emily Atchley
**Instance:** openclaw23onubuntu (DigitalOcean droplet)
**Model:** Anthropic Claude (Haiku default, Sonnet for council/complex tasks)
**Channels:** WhatsApp, Telegram (12 topics)

## Repository Structure

- `workflows/` — n8n automation workflow JSON files (import to entagency.app.n8n.cloud)
- `shopmy-browserbase-runner/` — Node.js Browserbase + Playwright runner for ShopMy login automation
- `amazon-associates-scraper/` — Python scraper for Amazon Associates data
- `creative-engine-r57/` — AI content generation with Blotato + Modal
- `ltk-refresh-token-sync/` — LTK OAuth token management
- `auth-patterns/` — Reference authentication patterns (API-key, OAuth2, session-cookie)
- `scripts/` — Node.js and bash utility scripts
- `docs/` — Comprehensive documentation (45+ files)
- `data/migrations/` — SQLite database migration SQL files for the OpenClaw workspace
- `workspace/` — OpenClaw workspace file templates (SOUL.md, skills, memory)

## Secret Management

**All secrets are managed via Doppler. Never hardcode API keys.**

- Do NOT create `.env` files with real secrets
- Do NOT commit `.env` files to git
- All environment variables are injected via `doppler run --`
- Example: `doppler run -- npm run dev`
- Doppler project: `example-project`, config: `dev`

## Key Commands

```bash
# Install Node.js dependencies (shopmy-browserbase-runner)
cd shopmy-browserbase-runner && npm install

# Install Python dependencies (amazon-associates-scraper)
pip install -r amazon-associates-scraper/requirements.txt

# Install Python dependencies (creative-engine tools)
pip install -r creative-engine-r57/tools/requirements.txt

# Verify creator data pipelines
bash scripts/verify-creator-pipelines.sh

# Lint JavaScript files
npx eslint 'shopmy-browserbase-runner/**/*.js' 'scripts/**/*.js'

# Validate SQL migrations
for f in data/migrations/**/*.sql; do sqlite3 ":memory:" ".read $f" ".quit" && echo "OK: $f"; done

# Run integration smoke tests
node --test tests/
```

## Database Architecture

Six SQLite databases (WAL mode) power the OpenClaw data layer:

| Database | Purpose |
|----------|---------|
| `creators.db` | Creator profiles, brand contacts, partnerships |
| `campaigns.db` | Campaign lifecycle, deliverables, notes |
| `analytics.db` | Instagram, TikTok, LTK, Amazon metrics |
| `knowledge.db` | RAG knowledge base with embeddings |
| `logs.db` | Event logs, cron history |
| `supplement.db` | Beauty Creatine Plus operations |

Migration files live in `data/migrations/{db_name}/` with numeric prefixes.

## Development Guidelines

- Prefer editing existing files over creating new ones
- Follow the Doppler-first pattern — never hardcode secrets
- SQL migrations use numeric prefixes: `001_initial.sql`, `002_add_column.sql`
- n8n workflows are JSON exports — import via n8n cloud UI or API script
- All monetary values stored in cents (INTEGER) for precision
- Cron jobs follow: log start → execute → log end → notify → on failure notify Emily
