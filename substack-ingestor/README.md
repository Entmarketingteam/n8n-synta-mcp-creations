# Substack Ingestor

Flask app that ingests paid Substack articles into Airtable as Markdown. Triggered from an Airtable "Scrape" button; runs on Railway with secrets from Doppler.

## Quick start

1. **Secrets (Doppler):** `SUBSTACK_EMAIL`, `SUBSTACK_PASSWORD`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`. Optional: `AIRTABLE_TABLE_NAME` (default: `Substack Articles`).
2. **Deploy:** Push to GitHub, connect repo to Railway, add Doppler integration. Use Procfile/railway.toml start command.
3. **Airtable:** Create base with URL, Status, Content, Author/Pub. Add Scripting extension and call `POST /scrape` with `record_id` and `url`.

See [../docs/SUBSTACK-INGESTOR-SETUP.md](../docs/SUBSTACK-INGESTOR-SETUP.md) for full setup and the Airtable script.

## Local run

```bash
cd substack-ingestor
doppler run -- pip install -r requirements.txt
doppler run -- gunicorn -w 1 -b 0.0.0.0:5000 --timeout 120 app:app
```

Use Doppler project/config where the secrets are defined (e.g. `ent-agency-automation` / `prd`).

## API

- `GET /health` – Liveness.
- `POST /scrape` – Body: `{ "record_id": "recXXX", "url": "https://...substack.com/..." }`. Returns 202 and runs scraper in background; updates Airtable when done.
