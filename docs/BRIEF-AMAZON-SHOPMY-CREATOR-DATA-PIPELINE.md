# Brief: Recreate auth + creator data pipeline (Amazon + ShopMy)

**Use this in a new chat:** Paste this file (or the section below) so an agent can implement or recreate the **authentication and data pipeline** that gets creator data out of **Amazon** and **ShopMy** into one place (our consolidated data pool / dashboard).

**Implementation status:** Implemented. See [SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md](./SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md) for one-time auth and scheduled/on-demand runs, and [PLATFORM_REGISTRY.md](./PLATFORM_REGISTRY.md) for workflows and runners.

---

## What I need

1. **Authentication (re)creation**  
   - **Amazon:** OAuth2 client credentials for Creators API (token endpoint → Bearer token). Associates *reports* have no API; use CSV export + ingest (or scraper).  
   - **ShopMy:** Session-cookie auth via a headless runner: one-time (or periodic) login → store cookies → every run call the runner with cookies to get CSV/API data (no login popup).

2. **Data pipeline**  
   - Pull **creator data** (earnings, commissions, links, orders) from both platforms.  
   - Normalize to our **canonical schema** (see CREATOR-EARNINGS-CANONICAL-SCHEMA.md) and land in one place (Google Sheets and/or Supabase per CREATOR-DASHBOARD-DATA-FLOW.md and CREATOR-DATA-CONSOLIDATION-STATE.md).

3. **Deliverables (code-wise)**  
   - n8n workflows (or equivalent) that: get tokens / cookies, call APIs or runner, parse CSVs, map to canonical fields, append to Earnings/sheets or DB.  
   - Any scripts (e.g. Amazon scraper, ShopMy runner) and env/credential wiring.  
   - Clear steps for: one-time auth setup, scheduled/on-demand runs, and where to store secrets (n8n credentials, Airtable, env).  
   - **Setup guide:** [SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md](./SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md).
- **Assessment alignment:** If you have **AUTH_READINESS_ASSESSMENT.md**, see [AUTH-READINESS-VS-IMPLEMENTATION.md](./AUTH-READINESS-VS-IMPLEMENTATION.md) for how it compares to this implementation (ShopMy API-first vs browser runner, Amazon browser option, Mavely).

---

## Repo context (read these)

- **Platform index:** [PLATFORM_REGISTRY.md](./PLATFORM_REGISTRY.md) — Amazon and ShopMy rows + links to docs and workflows.  
- **Auth patterns:** [AUTH_PATTERNS.md](./AUTH_PATTERNS.md) — OAuth2, session cookie, API key; when to use which.  
- **Amazon:**  
  - [AMAZON-CREATORS-API.md](./AMAZON-CREATORS-API.md) — token flow, catalog API, credentials.  
  - [AMAZON-ASSOCIATES-REPORTS.md](./AMAZON-ASSOCIATES-REPORTS.md), [AMAZON-REPORT-INGESTION-SPEC.md](./AMAZON-REPORT-INGESTION-SPEC.md) — report CSV/XML, ingest webhook, normalization.  
- **ShopMy:**  
  - [SHOPMY-CREATOR-AUTH.md](./SHOPMY-CREATOR-AUTH.md) — session cookie, POST /auth/refresh, POST /run, store cookies.  
  - [SHOPMY-CSV-FORMAT-AND-API.md](./SHOPMY-CSV-FORMAT-AND-API.md), [SHOPMY-API-ENDPOINTS.md](./SHOPMY-API-ENDPOINTS.md) — CSV downloads, API endpoints.  
- **Unified schema and flow:**  
  - [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](./CREATOR-EARNINGS-CANONICAL-SCHEMA.md) — canonical fields; Amazon and LTK mapping (ShopMy maps same way).  
  - [CREATOR-DASHBOARD-DATA-FLOW.md](./CREATOR-DASHBOARD-DATA-FLOW.md) — how LTK and Amazon feed one sheet/DB; add ShopMy the same way.  
  - [CREATOR-DATA-CONSOLIDATION-STATE.md](./CREATOR-DATA-CONSOLIDATION-STATE.md) — current state and CreatorMetrics/Supabase target.  
- **Existing workflows (reference):**  
  - `workflows/amazon-creators-api-get-token.json`, `workflows/amazon-associates-report-ingest.json`  
  - `workflows/shopmy-browserbase-login.json`, `workflows/shopmy-csv-processor-creators.json`  
  - `shopmy-browserbase-runner/`, `amazon-associates-scraper/`  
- **New platform (if needed):** [HAR_ANALYSIS_GUIDE.md](./HAR_ANALYSIS_GUIDE.md) + `har-analysis/prompts/analyze-auth-flow.md` to derive auth from a HAR.

---

## One-liner for a new chat

Copy this into a new chat to start:

```
Using the repo docs and workflows in this workspace, implement (or recreate) the full auth and creator data pipeline for Amazon and ShopMy: (1) auth — Amazon Creators API OAuth2 token + Associates CSV ingest; ShopMy session cookies via runner and POST /auth/refresh + /run. (2) data — pull creator earnings/commissions/links from both, normalize to the canonical schema in CREATOR-EARNINGS-CANONICAL-SCHEMA.md, and land in one place per CREATOR-DASHBOARD-DATA-FLOW.md. Use docs/BRIEF-AMAZON-SHOPMY-CREATOR-DATA-PIPELINE.md and PLATFORM_REGISTRY.md as the index.
```
