# ShopMy CSV Processor (Creators)

Restructured ShopMy workflow using the same pattern as the [web scrape → CSV workflow](README-web-scrape-csv.md): **Trigger → Normalize → Parse → Process → Store**, with **creator identity** (CreatorId, CreatorEmail) on every row.

## On your instance

- **Workflow:** [ShopMy CSV Processor (Creators)](https://entagency.app.n8n.cloud/workflow/QJZ8d0VYinQdzWpC)
- **ID:** `QJZ8d0VYinQdzWpC`
- **Webhook path (when active):** `POST https://entagency.app.n8n.cloud/webhook/shopmy-csv-creators`

## Structure (aligned with web scrape workflow)

| Stage | Node | Role |
|-------|------|------|
| **Trigger** | Manual Trigger | Run with pasted creator + CSV (one or many). |
| **Trigger** | Webhook Trigger | Receive CSV from another workflow (e.g. browser automation). |
| **Normalize** | Normalize creator input | One format for both triggers: `creatorId`, `creatorEmail`, `csvData`, `reportType`. |
| **Parse** | Parse CSV and tag creator | Parse CSV, add CreatorId, CreatorEmail, ReportType, ImportDate to every row. |
| **Process** | Deduplicate → Split Out | Same as before (dedupe by all fields except ImportDate). |
| **Store** | Store to Airtable | Same base/table; autoMap includes CreatorId, CreatorEmail. |
| **Respond** | Send Response | Webhook JSON response (skipped on manual run). |

## Creator logins and where CSV comes from

ShopMy doesn’t expose a public API for creators to pull CSV; they log in and download from the [Links / Earnings tabs](https://guide.shopmy.us/strategy-and-best-practices/43V9gf7CoM5euHvJZVnyN/how-to-analyze-your-performance). This workflow **does not log in to ShopMy**. It assumes CSV is already available and you identify the creator.

### Option A – Manual run (paste CSV + creator)

1. Open the workflow and run **Test workflow** (Manual Trigger).
2. For **Manual Trigger**, set input to one or more items. Each item = one creator’s CSV.

**Single creator (one item):**

```json
{
  "creatorId": "creator-123",
  "creatorEmail": "creator@example.com",
  "csvData": "date,earnings,link\n2025-01-01,10.50,https://...",
  "reportType": "shopmy_export"
}
```

**Multiple creators (multiple items):**  
Add one item per creator with the same shape. Each item is processed and tagged with its `creatorId` / `creatorEmail`.

### Option B – Webhook (from browser automation / “login and download”)

Use when another process (e.g. [Browserbase](https://browserbase.com) + Playwright) logs in as a creator and downloads their CSV, then POSTs to this workflow.

**Request:**

- **URL:** `POST https://entagency.app.n8n.cloud/webhook/shopmy-csv-creators` (workflow must be **active**).
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "creatorId": "creator-123",
  "creatorEmail": "creator@example.com",
  "csvData": "<full CSV string from ShopMy export>",
  "reportType": "shopmy_export"
}
```

You can use `creator_id` / `creator_email` / `csv_data` / `report_type`; the Normalize node maps them.

### Option C – Browser automation (login + download, then call this workflow)

1. **Creators list:** Store in Airtable or a sheet: creator id, email, ShopMy login (or “session” from your auth flow).
2. **Separate workflow:** Schedule or manual → Loop over creators → for each:
   - Use **Browserbase** (or similar) to open ShopMy, log in as that creator, go to Links/Earnings, export/download CSV.
   - POST that CSV + `creatorId` / `creatorEmail` to this workflow’s webhook (`shopmy-csv-creators`).
3. This workflow then: normalizes → parses → dedupes → stores to Airtable with CreatorId/CreatorEmail on every row.

## Airtable

- **Base/table:** Same as before (base `appQnKyfyRyhHX44h`, table `tblZkX1SuNlo2DNOb`).
- **New fields:** Ensure the table has **CreatorId** and **CreatorEmail** (or the names you map). AutoMap will send all parsed fields + ReportType, ImportDate, CreatorId, CreatorEmail.

## Split Out node

The **Split Out Records** node still uses `fieldToSplitOut: "="`. If your CSV has no column named `=`, change that field in the node to a real column name or remove the node if you don’t need it.

## Summary

- **Same base/table** as the old ShopMy processor; **new path** and **creator-aware**.
- **Two triggers:** Manual (paste one/many creators + CSV) and Webhook (for automation that has already obtained CSV per creator).
- **Creator logins:** Handled outside this workflow (e.g. Browserbase + Playwright); this workflow only receives CSV + creatorId/creatorEmail and processes it into Airtable.
