# PRD / TDD / Next Steps — Creator Data & Amazon (Feb 2026)

**Single source of truth** when the context window resets: where we are, what’s done, what to do next, and how to purge/tighten.

- **PRD:** product scope (creator earnings, Amazon + LTK + ShopMy, canonical schema, credentials).
- **TDD:** implemented pieces = docs + n8n workflows + scripts + runners; no public Amazon report API yet.
- **Next steps:** prioritized list below + purge checklist.

---

## 1. Current state (what’s in the repo)

### Amazon / Creator earnings

| Asset | Purpose |
|-------|--------|
| **docs/AMAZON-CREATORS-API.md** | Creators API (OAuth 2.0): registration, token endpoints by region, catalog (GetItems, SearchItems), credentials in n8n/Airtable. |
| **docs/AMAZON-ASSOCIATES-REPORTS.md** | Associates Central reports: types (Tracking ID Summary, Link Type Performance, Daily Trends), formats (XML/CSV/Excel), field mapping to `normalized_earnings`. |
| **docs/AMAZON-REPORT-INGESTION-SPEC.md** | Spec: upload CSV/XML → parse → normalize to canonical schema → store. |
| **docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md** | Canonical fields (`creator_id`, `source_platform`, `normalized_earnings`, etc.) so Amazon + Instagram (later) marry in one dashboard. |
| **docs/AIRTABLE-CREATORS-API.md** | Airtable base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0`: Creator, Credential_ID, Credential_Secret, Version, Email, Password (for scraper login). |
| **workflows/amazon-creators-api-get-token.json** | Manual → Read from Airtable (Nicki) → POST OAuth2 token → Output Token. |
| **workflows/amazon-associates-report-ingest.json** | Webhook/Manual: body `creator_id` + `csvData` → Parse CSV → Normalize to canonical → output (optional: add Store to Airtable). |
| **workflows/README-amazon-report-ingest.md** | How to run ingest workflow; where to add Store node. |
| **amazon-associates-scraper/** | Folder has `.env.example`, `.gitignore`, `requirements.txt`. **No Python scraper in repo** — scraper lives in Downloads (`amazon_associates_scraper.py`); copy in if you want it versioned. |

### Credentials & storage

| Asset | Purpose |
|-------|--------|
| **docs/CREDENTIALS-STORAGE.md** | Where to store emails/passwords: env vars, n8n Credentials, Airtable (with caveats); push-from-.env script. |
| **scripts/set-amazon-assoc-credentials-airtable.js** | One-off: read `.env` (AIRTABLE_API_KEY, AMAZON_ASSOC_EMAIL, AMAZON_ASSOC_PASSWORD) → PATCH Airtable row (Creator = Nicki) with Email, Password. |
| **.env.example** (root) | Placeholders for creator credentials (Amazon, ShopMy, Creators API); never commit `.env`. |
| **amazon-associates-scraper/.env.example** | Placeholders for AMAZON_ASSOC_EMAIL, AMAZON_ASSOC_PASSWORD, AMAZON_TRACKING_IDS. |

### LTK

| Asset | Purpose |
|-------|--------|
| **ltk-refresh-token-sync/** | Airtable `LTK_Credentials` → n8n refresh token → update Airtable; README, AIRTABLE-SCHEMA, SETUP-LTK-NOW, setup-airtable.js. |
| **workflows/ltk-token-rotation-fixed.json** | Schedule/Manual → Read Token from Airtable → Refresh LTK Token → Format for Airtable → Save New Tokens to Airtable. |
| **docs/LTK-*** | OAuth2 setup, token rotation fix, problem summary, alternatives, painless go-live. |

### ShopMy

| Asset | Purpose |
|-------|--------|
| **shopmy-browserbase-runner/** | Node runner: login + CSV export via Browserbase; Railway deploy. |
| **workflows/shopmy-api-creators.json**, **shopmy-csv-processor-creators.json**, **shopmy-browserbase-login.json** | API-first flow, CSV processor (→ Airtable), browserbase login. |
| **docs/SHOPMY-*** | API endpoints, CSV format, processor, creator auth, automation destination. |

### Other

| Asset | Purpose |
|-------|--------|
| **ent-tools/** | Markitdown API, Slack workflows; separate from creator-earnings pipeline. |
| **workflows/** | Content repurposing agents, web-scrape-csv-email-sheets, advanced-content-creator. |
| **scripts/import-workflows-to-n8n.js** | Import workflow JSON into n8n instance. |

---

## 2. What’s done vs not done

| Done | Not done / optional |
|------|----------------------|
| Creators API doc + get-token workflow (Airtable-backed). | Creators API **reporting** — Amazon has not published report endpoints on GitHub; when they do, add HTTP flow. |
| Associates reports doc + ingest workflow (CSV → normalize). | Amazon scraper **in repo** — script is in Downloads; add `amazon_associates_scraper.py` to `amazon-associates-scraper/` if you want it versioned. |
| Canonical schema doc (Amazon + Instagram mapping). | n8n workflow that **reads** Email/Password from Airtable and runs scraper (Execute Command) or passes to runner. |
| Credentials doc + push-to-Airtable script. | Store node on ingest workflow (Airtable/DB) — doc says “add and map”; not in JSON. |
| Airtable table `tblNovDWyu1iHoJf0` documented (Creator, Credential_ID, Credential_Secret, Version, Email, Password). | Instagram API integration and dashboard that marries Amazon + Instagram. |
| Senior automation pattern (normalization layer, parent/child) — planned in a separate plan file; not fully implemented in workflows. | Purging duplicate or obsolete docs (see below). |

---

## 3. Next steps (prioritized)

### Immediate (this week)

1. **Run push-to-Airtable once**  
   Add Email + Password columns to `tblNovDWyu1iHoJf0` if missing. Set `.env` with AIRTABLE_API_KEY, AMAZON_ASSOC_EMAIL, AMAZON_ASSOC_PASSWORD. Run:  
   `node scripts/set-amazon-assoc-credentials-airtable.js`  
   Rotate the Amazon password if it was ever pasted in chat.

2. **Test get-token workflow in n8n**  
   Import `workflows/amazon-creators-api-get-token.json`. Attach Airtable credential to “Read from Airtable.” Run Manual; confirm access_token and credential_version in output.

3. **Optional: add scraper to repo**  
   Copy `amazon_associates_scraper.py` from Downloads into `amazon-associates-scraper/`. Add README there (setup, --setup, env vars, n8n Execute Command). Commit. Or leave scraper out and rely on manual CSV upload + ingest workflow.

4. **Optional: wire ingest to storage**  
   In `amazon-associates-report-ingest.json`, after “Normalize to canonical schema,” add an Airtable “Create record” (or HTTP to your API) and map canonical fields. Or keep output-only and store elsewhere manually.

### Short-term (this month)

5. **Purge / tighten docs**  
   - Merge or archive overlapping LTK docs (e.g. keep SETUP-LTK-NOW + token-rotation-fix; fold OAuth2 setup into one).  
   - Merge or archive overlapping ShopMy docs if needed.  
   - Keep one “start here” index (e.g. YOU-ARE-ALL-SET or this PRD) that points to the 3–5 essential docs per area.

6. **Single “creator credentials” table (optional)**  
   Right now: LTK_Credentials (one table), Creators API table (tblNovDWyu1iHoJf0), ShopMy elsewhere. Optionally document one table per creator (or one row per creator with columns per platform) and a single script to seed from .env.

7. **n8n: read Airtable → run scraper**  
   If scraper is in repo: workflow that reads Email/Password from Airtable (filter Creator = Nicki) → Execute Command `python3 amazon_associates_scraper.py --report earnings --days 1` with env passed through (or write to temp .env). Then read reports from ./reports and POST to ingest webhook.

### Medium-term (next quarter)

8. **Creators API reporting**  
   When Amazon publishes report API (GitHub or docs): add HTTP flow in n8n (or script) to pull earnings/orders; deprecate or keep scraper as fallback.

9. **Dashboard: Amazon + Instagram**  
   Implement consumer of canonical schema (Airtable or DB); add Instagram API mapping to same schema; build one view (creator, platform, period, normalized_earnings).

10. **Senior automation pattern**  
    Apply normalization layer (Edit Fields after each source → `normalized_earnings`) and parent/child workflows (Controller → Auth child, Data Fetcher child) per plan in `.cursor/plans/` or docs.

---

## 4. Suggested purge / consolidation

| Action | Target |
|--------|--------|
| **Keep as single entry points** | PRD-NEXT-STEPS.md (this file), CREDENTIALS-STORAGE.md, AMAZON-CREATORS-API.md, CREATOR-EARNINGS-CANONICAL-SCHEMA.md. |
| **Merge or archive** | LTK: keep LTK-TOKEN-ROTATION-WORKFLOW-FIX + SETUP-LTK-NOW; consider merging LTK-NICKI-OAUTH2-SETUP, LTK-PROBLEM-SUMMARY, LTK-PAINLESS-GO-LIVE into one “LTK setup & run” doc. |
| **Merge or archive** | ShopMy: keep SHOPMY-CSV-FORMAT-AND-API, SHOPMY-CSV-PROCESSOR, SHOPMY-CREATOR-AUTH; consider folding SHOPMY-API-FIRST, SHOPMY-AUTOMATION-AND-DESTINATION into one. |
| **Delete if unused** | ent-tools if not part of creator pipeline; duplicate or obsolete workflow READMEs. |
| **Index** | docs/README.md links to this PRD and the 3–5 essential docs per area (see below). |

---

## 4b. Purge / tighten execution checklist

Use this when you’re ready to purge; tick as you go.

- [ ] **Index:** Ensure `docs/README.md` exists and links to this PRD + Amazon + LTK + ShopMy + credentials + canonical schema.
- [ ] **Amazon:** Keep AMAZON-CREATORS-API, AMAZON-ASSOCIATES-REPORTS, AMAZON-REPORT-INGESTION-SPEC, CREATOR-EARNINGS-CANONICAL-SCHEMA; no delete.
- [ ] **LTK:** Create single `LTK-SETUP-AND-RUN.md` (merge OAuth2, problem summary, painless go-live); keep TOKEN-ROTATION-WORKFLOW-FIX + SETUP-LTK-NOW; archive or delete LTK-NICKI-OAUTH2-SETUP, LTK-PROBLEM-SUMMARY, LTK-PAINLESS-GO-LIVE, LTK-OAUTH2-N8N-VERIFICATION, LTK-ALTERNATIVES-WHILE-CALLBACK-BLOCKED if merged.
- [ ] **ShopMy:** Create single `SHOPMY-SETUP-AND-RUN.md` (merge API-FIRST, AUTOMATION-AND-DESTINATION); keep CSV-FORMAT-AND-API, CSV-PROCESSOR, CREATOR-AUTH; archive duplicates.
- [ ] **ent-tools:** If not used for creator pipeline, move to `_archive/ent-tools` or delete.
- [ ] **Workflow READMEs:** Keep one README per “family” (e.g. README-amazon-report-ingest, README-shopmy-creators); merge or remove redundant ones.
- [ ] **Code:** Ensure no duplicate scripts; single push-to-Airtable script for Amazon creds; scraper either in repo (`amazon-associates-scraper/`) or documented as “run from Downloads.”

---

## 5. Key links (no code)

- **n8n:** https://entagency.app.n8n.cloud  
- **Airtable Creators API table:** base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0`  
- **Associates Central:** https://affiliate-program.amazon.com → Tools → Creators API  
- **Canonical schema:** docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md  
- **Credentials:** docs/CREDENTIALS-STORAGE.md  

---

## 6. One-line summary

**Amazon:** Creators API token (Airtable-backed) and report ingest (CSV → canonical) are in place; scraper script is in Downloads (optional to add to repo). **Credentials:** Stored in .env / n8n / Airtable; push script sends .env → Airtable once. **Next:** Test get-token and ingest, optionally add scraper and Store node, then purge docs and add one index + Creators API reporting when Amazon ships it.
