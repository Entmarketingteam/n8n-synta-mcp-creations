# Creator Dashboard Data Flow — LTK + Amazon → Analytics & Dashboard

How to **call and gather** LTK and Amazon creator data, normalize it, and land it in one place (Google Sheets first) for analytics, performance, brands, and earnings. Then use that as the source for your dashboard.

---

## 1. Data sources and how to call them

| Source | How to call | What you get |
|--------|-------------|--------------|
| **LTK** | (A) **LTK Token Rotation** workflow: reads refresh token from Airtable → refreshes → calls LTK API (or runner) → returns `user_info`, `commissions_summary`, `performance_summary`. (B) **LTK Browserbase runner:** `POST /run-ltk` with `{ "refresh_token": "..." }` (or email+password once) → same JSON. | User profile, commission totals by period, performance (clicks, conversions, etc.). |
| **Amazon** | (A) **Report ingest webhook:** `POST` to n8n webhook with `creator_id` + `csvData` (paste or send CSV from Associates report). (B) **Scraper** (optional): run Python scraper → upload CSV to ingest. | Rows normalized to canonical schema (earnings, period, tracking id, etc.). |

**LTK (recommended flow):**

1. **One-time:** Get refresh token (login at creator.shopltk.com → DevTools → Local Storage → copy refresh token). Put it in Airtable `LTK_Credentials` (see ltk-refresh-token-sync).
2. **Every run:** Use **LTK Token Rotation (Airtable)** workflow: Schedule or Manual → Airtable Get Creators → Refresh Token → (on success) call LTK API (get_user_info, commissions_summary, performance_summary) → **Store to Sheets** (existing) and/or **Normalize → Append to Creator Earnings sheet** (see below).

**Amazon:**

1. **Manual:** Export CSV from Associates Central (Tools → Reports) → POST to your n8n webhook:  
   `POST https://entagency.app.n8n.cloud/webhook/amazon-report-ingest`  
   Body: `{ "creator_id": "nicki", "csvData": "<paste CSV content>" }`
2. **Optional:** Run scraper (from Downloads or `amazon-associates-scraper/`), then POST the CSV to the same webhook.

---

## 2. One place to land: Google Sheets (easiest right now)

Using **one Google Sheet** as the dashboard source is the fastest way to get analytics and performance in one view.

### Suggested structure (one spreadsheet, multiple sheets/tabs)

| Sheet name | Purpose | Columns (examples) |
|------------|---------|--------------------|
| **Earnings** | Canonical rows from all platforms (LTK + Amazon). Use for pivot tables, charts, SUM by platform/creator/period. | creator_id, source_platform, period_start, period_end, normalized_earnings, currency, raw_type, recorded_at |
| **LTK Snapshots** | Full LTK API response per run (for deeper analytics, brands, performance breakdown). | creator_id, extracted_at, user_info, commissions, performance_summary |
| **Amazon Raw** (optional) | Raw Amazon rows before normalization, if you want to audit. | Same as one row from ingest, or skip and use only Earnings. |

- **Earnings** = single source of truth for “how much, which platform, which period.” LTK and Amazon workflows both append here (canonical rows).
- **LTK Snapshots** = what the existing “Store to Sheets” in the LTK sync already does (Creator, extracted_at, user_info, commissions, performance_summary). Keep it for full JSON and future breakdown (brands, links, etc.).
- **Dashboard:** Build pivot tables and charts in Sheets on **Earnings** (e.g. earnings by source_platform, by creator_id, by month). Optionally use **LTK Snapshots** for LTK-specific metrics (e.g. commissions by brand if you parse the JSON).

---

## 3. Process: from data to dashboard

### Step 1 — Get data into the sheet

1. **LTK:** Run **LTK Token Rotation (Airtable)** workflow on a schedule (e.g. daily). It already stores to **LTK Snapshots**. Optionally add a “Normalize LTK → canonical” step and append those rows to **Earnings** (see CREATOR-EARNINGS-CANONICAL-SCHEMA.md § LTK mapping).
2. **Amazon:** When you have a new Associates report CSV, send it to the ingest webhook (or run scraper and POST CSV). The **Amazon Associates Report Ingest** workflow normalizes and appends to **Earnings** (once you add the “Append to Google Sheets” node and set Document + Sheet to your **Earnings** sheet).

### Step 2 — Define metrics

- **Earnings:** `SUM(normalized_earnings)` by creator, platform, month.
- **Performance:** From LTK Snapshots, use `performance_summary` (and optionally `commissions_summary`) for clicks, conversions, top brands.
- **Brands:** Parse `commissions_summary` or snapshot JSON for brand-level data; either in Sheets (formulas) or in a later Code node that flattens to rows and appends to a “Brands” sheet.

### Step 3 — Build the dashboard

- **In Google Sheets:** Create a tab “Dashboard” with pivot tables and charts sourced from **Earnings** (and optionally **LTK Snapshots**). Filter by date range, creator, source_platform.
- **Later:** Connect the same Sheet to Looker Studio (or export to a DB) for a richer dashboard; the schema stays the same.

---

## 4. Workflows involved

| Workflow | Trigger | What it does |
|----------|---------|---------------|
| **LTK Token Rotation (Airtable)** | Schedule / Manual | Airtable → Refresh LTK token → Update Airtable → Call LTK API → Store to Sheets (LTK Snapshots). |
| **Amazon Associates Report Ingest** | Webhook / Manual | Accepts creator_id + csvData → Parse CSV → Normalize to canonical → Append to **Earnings** sheet → Respond. |
| **Amazon Creators API – Get Token** | Manual | Airtable → Get OAuth2 token for Creators API (for catalog, not reports). |

---

## 5. Google Sheet setup (quick)

1. Create a new Google Sheet (or use existing, e.g. `1ogyNXDfZbqtnIY1S4lHzihJHv0e6RLbj80ZrFHYZ1lo`).
2. Add a sheet tab named **Earnings** with header row:  
   `creator_id`, `source_platform`, `period_start`, `period_end`, `normalized_earnings`, `currency`, `raw_type`, `recorded_at`
3. Keep **Sheet1** (or rename to **LTK Snapshots**) for the existing LTK sync columns: Creator, extracted_at, user_info, commissions, performance_summary.
4. In n8n: **Amazon Associates Report Ingest** → add node **Append to Google Sheets** after **Normalize to canonical schema** → set Document ID and sheet name **Earnings** → map columns to the canonical fields above.
5. In n8n: **LTK Token Rotation** → ensure “Store to Sheets” points to your **LTK Snapshots** sheet.

---

## 6. HAR files

You mentioned HAR files for LTK and Amazon. Those were useful for debugging the LTK connection; now that LTK is working:

- **LTK:** Use the refresh token + API (or runner) flow above; no need to replay HAR for normal data pull.
- **Amazon:** No public report API; HAR doesn’t give you a stable API for reports. Use CSV export + ingest webhook (or scraper) as the repeatable process.

Keep HARs in a folder for reference if you need to re-check request/response shapes for new endpoints.

---

## 7. Summary

- **Call LTK:** LTK Token Rotation workflow (Airtable refresh token → LTK API → Store to Sheets).
- **Call Amazon:** POST CSV to report ingest webhook (or scraper → webhook).
- **Land in one place:** One Google Sheet with **Earnings** (canonical) + **LTK Snapshots** (full LTK JSON).
- **Dashboard:** Pivot and chart from **Earnings** in Sheets; optionally parse **LTK Snapshots** for brands/performance. Later, connect the same Sheet to Looker Studio or a DB for a fuller dashboard.

See **CREATOR-EARNINGS-CANONICAL-SCHEMA.md** for LTK → canonical mapping and **PRD-NEXT-STEPS.md** for next steps.
