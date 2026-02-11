# Setup: Amazon + ShopMy auth and creator data runs

One-time auth setup, where to store secrets, and how to run the pipeline on a schedule or on demand.

---

## 1. Where secrets live

**Use Doppler only for secrets.** Store all API keys and passwords in **Doppler** (project `ent-agency-automation`, config `prd`). In n8n, use the [Doppler universal node](N8N-DOPPLER-SETUP.md#5-universal-scenario-copy-paste-one-node-everywhere) at the start of workflows, or the [sync script](N8N-VARIABLES-CHECKLIST.md) to copy Doppler → n8n Variables so `$vars.SECRET_NAME` works. Do not store secrets in Airtable or in n8n credential values.

| Secret | Doppler key name(s) | Used by |
|--------|---------------------|---------|
| **Amazon Creators API** (client id + secret) | `AMAZON_CREATORS_API_CLIENT_ID`, `AMAZON_CREATORS_API_CLIENT_SECRET` | Amazon Creators API – Get Token (Doppler node or sync → $vars) |
| **Amazon Associates** | No API; creator exports CSV and POSTs to webhook. No secret. | Amazon Associates Report Ingest (webhook) |
| **ShopMy** (email + password) | `SHOPMY_NICKI_EMAIL`, `SHOPMY_NICKI_PASSWORD` | ShopMy Browserbase; ShopMy Payout Summary (Creator Config uses $vars/Doppler node) |
| **ShopMy cookies** | Not in Doppler (session state). Store in Airtable **ShopMyCookies** column, or refresh login each run. | ShopMy – Browserbase login only |
| **ShopMy Payout Summary** (GSheet/Airtable IDs) | `SHOPMY_GSHEET_URL`, `SHOPMY_AIRTABLE_BASE`, `SHOPMY_AIRTABLE_TABLE` (optional) | ShopMy Payout Summary – Store nodes |
| **Runner URL** (ShopMy Browserbase) | `SHOPMY_RUNNER_URL` (optional) or set in workflow (replace `YOUR_RUNNER_URL`) | ShopMy – Browserbase login |
| **Google Sheet** (Earnings doc ID) | Optional: `CREATOR_EARNINGS_SHEET_ID` in Doppler; or set in n8n node | Append to Creator Earnings Sheet nodes |
| **Airtable** (bases/tables) | Not secrets. Use n8n Airtable credential + base/table IDs for creator lists and cookie storage. | Workflows that read creator list or write cookies |

---

## 2. One-time auth setup

### Amazon Creators API (OAuth2 token)

1. In [Amazon Associates Central](https://affiliate-program.amazon.com): **Tools** → **Creators API** → Create Application → Create Credential.
2. Copy **Credential ID** and **Credential Secret** (secret shown once).
3. Store in **Doppler** (project `ent-agency-automation`, config `prd`):
   - `AMAZON_CREATORS_API_CLIENT_ID` = Credential ID  
   - `AMAZON_CREATORS_API_CLIENT_SECRET` = Credential Secret  
   (Optional: run `doppler run -- node scripts/sync-doppler-to-n8n-variables.js` so n8n Variables get a copy; see [N8N-DOPPLER-SETUP.md](N8N-DOPPLER-SETUP.md).)
4. The **Amazon Creators API – Get Token** workflow uses a **Doppler Secrets** node to read these at runtime (no Airtable). Run it once (Manual) to verify Bearer token.

### Amazon Associates (reports – no API)

- No auth to “create”. Creator logs into Associates Central → **Reports** → **Download Reports** (CSV/XML).
- To ingest: POST the CSV (or XML) to your n8n webhook with `creator_id` (see [AMAZON-REPORT-INGESTION-SPEC.md](AMAZON-REPORT-INGESTION-SPEC.md)). Webhook URL: `https://entagency.app.n8n.cloud/webhook/amazon-report-ingest`.

### ShopMy – Option A: API-only (Payout Summary pipeline, recommended for scheduled sync)

1. **No runner needed.** Use workflow [ShopMy Creator Data Pipeline (Payout Summary)](../workflows/shopmy-payout-summary-creators.json).
2. **Doppler:** Set `SHOPMY_NICKI_EMAIL`, `SHOPMY_NICKI_PASSWORD` (and optionally `SHOPMY_GSHEET_URL`, `SHOPMY_AIRTABLE_BASE`, `SHOPMY_AIRTABLE_TABLE`). Sync to n8n Variables if you use `$vars` / `$env` in the workflow, or add a **Doppler Secrets** node and reference `$node["Doppler Secrets"].json.SHOPMY_NICKI_PASSWORD.raw` etc.
3. **Creator Config:** Set `creators` array with `creator_name`, `email`, `password` (e.g. `$vars.SHOPMY_NICKI_PASSWORD` or Doppler node output), and **user_id** (get once via [ShopMy API (Creators)](../workflows/shopmy-api-creators.json) or from browser).
4. **Schedule:** Workflow runs on its Schedule Trigger (e.g. every 6 h). See [SHOPMY-PAYOUT-SUMMARY-PIPELINE.md](SHOPMY-PAYOUT-SUMMARY-PIPELINE.md).

### ShopMy – Option B: Session cookies via runner (browser export)

1. **Doppler:** Set `SHOPMY_NICKI_EMAIL`, `SHOPMY_NICKI_PASSWORD`, and optionally `SHOPMY_RUNNER_URL`. Deploy the runner with `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` (from Doppler or env). Set runner URL in Doppler or in the workflow (replace `YOUR_RUNNER_URL`).
2. **One-time (or when cookies expire):** Call **POST** `{RUNNER_URL}/auth/refresh` with body `{ "shopmyEmail": "<from Doppler>", "shopmyPassword": "<from Doppler>" }`. Response: `{ "cookies": [ ... ] }`.
3. **Store cookies:** Put the `cookies` array (as JSON string) in Airtable column **ShopMyCookies** (Long text) on your creators table—or use the **ShopMy – Browserbase login** workflow; add a Doppler node for email/password when refreshing.
4. **Every run:** Workflow reads creators from Airtable; if **ShopMyCookies** is present it sends them in **POST /run** (no login); otherwise it calls **POST /auth/refresh** (email/password from Doppler or Airtable), updates Airtable with new cookies, then **POST /run**.

---

## 3. Scheduled vs on-demand runs

| What | How |
|------|-----|
| **Amazon Creators API token** | Run **Amazon Creators API – Get Token** when you need a Bearer token (e.g. before catalog API calls). Token lasts 1 hour; cache in workflow static data or run on demand. |
| **Amazon Associates data** | On demand: creator exports CSV → POST to webhook. Optional: run a scraper (e.g. `amazon-associates-scraper/`) and POST the CSV to the same webhook. |
| **ShopMy payout data (API)** | **Scheduled:** Use **ShopMy Creator Data Pipeline (Payout Summary)** (Schedule Trigger, e.g. every 6 h). No runner; login → payout_summary + payments + brand rates → GSheet/Airtable. See [SHOPMY-PAYOUT-SUMMARY-PIPELINE.md](SHOPMY-PAYOUT-SUMMARY-PIPELINE.md). |
| **ShopMy CSV** | **Scheduled:** Use the **Schedule (optional)** trigger in **ShopMy – Browserbase login** (e.g. weekly `0 9 * * 1`). **On demand:** Trigger manually; same workflow gets cookies (or refreshes) and calls runner → CSV → webhook. |
| **ShopMy CSV → Earnings** | The **ShopMy CSV Processor** webhook runs when the Browserbase workflow (or ShopMy API Creators) POSTs CSV to it; it normalizes to canonical and appends to the **Earnings** sheet. No separate schedule. |
| **Unified Earnings sheet** | Fed by: (1) Amazon Associates Report Ingest (webhook), (2) ShopMy CSV Processor (webhook), (3) optionally LTK sync (normalize step). Build pivot/charts in Sheets or connect to Supabase per [CREATOR-DASHBOARD-DATA-FLOW.md](CREATOR-DASHBOARD-DATA-FLOW.md). |

---

## 4. Workflow checklist

- [ ] **Amazon Creators API – Get Token:** Doppler has `AMAZON_CREATORS_API_CLIENT_ID` and `AMAZON_CREATORS_API_CLIENT_SECRET`; workflow uses Doppler Secrets node. Run once to test.
- [ ] **Amazon Associates Report Ingest:** Webhook path `amazon-report-ingest`; "Append to Creator Earnings Sheet" has Document ID and sheet name **Earnings**.
- [ ] **ShopMy Payout Summary (API):** Doppler has `SHOPMY_NICKI_EMAIL`, `SHOPMY_NICKI_PASSWORD`; Creator Config uses `$vars`/Doppler node for password; at least one creator with `user_id`. Optional: `SHOPMY_GSHEET_URL`, `SHOPMY_AIRTABLE_BASE`, `SHOPMY_AIRTABLE_TABLE`. Set **Append to Creator Earnings Sheet** Document ID (sheet **Earnings**) for unified Earnings. See [SHOPMY-PAYOUT-SUMMARY-PIPELINE.md](SHOPMY-PAYOUT-SUMMARY-PIPELINE.md).
- [ ] **ShopMy – Browserbase login:** Runner URL in Doppler (`SHOPMY_RUNNER_URL`) or set in workflow (replace `YOUR_RUNNER_URL`). Airtable Get creators / Update Airtable with cookies use same base/table; table has **ShopMyCookies**. Use a Doppler node for ShopMy email/password when refreshing cookies.
- [ ] **ShopMy CSV Processor:** “Append to Creator Earnings Sheet” has same **Earnings** Document ID as Amazon; webhook path `shopmy-csv-creators`.
- [ ] **Google Sheet:** One spreadsheet with a tab **Earnings** and header row: `creator_id`, `source_platform`, `period_start`, `period_end`, `normalized_earnings`, `currency`, `raw_type`, `recorded_at`.

---

## 5. References

- [BRIEF-AMAZON-SHOPMY-CREATOR-DATA-PIPELINE.md](BRIEF-AMAZON-SHOPMY-CREATOR-DATA-PIPELINE.md) – Scope and deliverables.
- [AUTH-READINESS-VS-IMPLEMENTATION.md](AUTH-READINESS-VS-IMPLEMENTATION.md) – Comparison with **AUTH_READINESS_ASSESSMENT.md**: ShopMy (API-first vs browser runner), Amazon (webhook vs browser automation), Mavely (not in scope), and how to recreate using either approach.
- [AUTH_PATTERNS.md](AUTH_PATTERNS.md) – OAuth2 vs session cookie.
- [SHOPMY-CREATOR-AUTH.md](SHOPMY-CREATOR-AUTH.md) – Cookie refresh and POST /run.
- [SHOPMY-PAYOUT-SUMMARY-PIPELINE.md](SHOPMY-PAYOUT-SUMMARY-PIPELINE.md) – API-only ShopMy payout pipeline (schedule, session headers, GSheet/Airtable).
- [CREATOR-DASHBOARD-DATA-FLOW.md](CREATOR-DASHBOARD-DATA-FLOW.md) – Where data lands (Earnings sheet, LTK Snapshots).
- [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](CREATOR-EARNINGS-CANONICAL-SCHEMA.md) – Canonical fields and Amazon/LTK/ShopMy mapping.
