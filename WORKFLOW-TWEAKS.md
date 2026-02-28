# Workflow tweaks (plug and play)

How we customize vendor and template workflows (e.g. RoboNuggets) for our use case. No code changes in the JSON are required; configure in n8n after import and document “our use” in the workflow README.

## Standard tweak types

| Tweak type | Where to set | Where to document |
|------------|--------------|-------------------|
| **Credentials** | n8n: open workflow → select node → pick or create credential (Google Sheets, OpenAI, Apify, Blotato, etc.) | Per-workflow README (e.g. [workflows/robonuggets/README.md](../workflows/robonuggets/README.md), [README-content-repurposing.md](../workflows/robonuggets/README-content-repurposing.md)) |
| **API keys / env vars** | n8n environment variables or credential; use `{{ $env.VAR }}` in nodes. Never hardcode in workflow JSON. | [CREDENTIALS-STORAGE.md](./CREDENTIALS-STORAGE.md); per-workflow README |
| **Document / sheet IDs** | In the node: Google Sheets “Document” and “Sheet” (or Airtable base/table) | Per-workflow README “Our use” column or section |
| **Schedule (cron)** | Schedule Trigger node: rule expression (e.g. `0 9 * * *` for daily 9:00) | Per-workflow README if you changed from default |
| **Webhook path** | Webhook node: path (e.g. `/my-webhook`) | Per-workflow README if you expose a custom path |
| **API base URL / endpoint** | HTTP Request node: URL (or use `$env.API_BASE_URL`) | Per-workflow README or [ent-tools shared/config](../ent-tools/shared/config/env-keys.md) |

## Where to document

- **RoboNuggets and other vendor workflows:** [workflows/robonuggets/README.md](../workflows/robonuggets/README.md) — attribution, list of workflows, and a tweak table template. Each workflow can have its own README (e.g. [README-content-repurposing.md](../workflows/robonuggets/README-content-repurposing.md)) with credentials and “our use” notes.
- **Our own workflows:** Same idea — use the README next to the workflow JSON (e.g. [README-amazon-report-ingest.md](../workflows/README-amazon-report-ingest.md)) to list credentials, sheet IDs, and any env vars.

## Import then configure

1. Import: `node scripts/import-workflows-to-n8n.js` (all) or `node scripts/import-workflows-to-n8n.js robonuggets/<file>.json` (one).
2. Open each workflow in n8n and attach credentials, set sheet/doc IDs, and adjust schedule or webhook if needed.
3. Optionally note “our use” in the repo README so the next person (or you later) knows what was configured.
