# Amazon Associates Report Ingest

Accepts **uploaded Amazon Associates report** content (CSV from Associates Central), parses it, normalizes to the [canonical creator earnings schema](../docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md), appends rows to a **Creator Earnings** Google Sheet (optional), and returns normalized records. Use the same **Earnings** sheet for LTK + Amazon for one dashboard source (see [CREATOR-DASHBOARD-DATA-FLOW.md](../docs/CREATOR-DASHBOARD-DATA-FLOW.md)).

## Workflow file

- **workflows/amazon-associates-report-ingest.json**

## Trigger

- **Manual:** Paste one item with `creator_id` and `csvData` (and optional `period_start`, `period_end`).
- **Webhook:** `POST /webhook/amazon-report-ingest` with JSON body.

## Body (Webhook or Manual input)

```json
{
  "creator_id": "creator-123",
  "csvData": "Date,Earnings,Clicks,Ordered Items\n2025-01-01,10.50,100,5\n2025-01-02,20.00,150,8"
}
```

Optional: `period_start`, `period_end` (ISO dates) to override period when not inferrable from the report.

## Flow

| Node | Role |
|------|------|
| Manual Trigger / Webhook | Entry. |
| Normalize input | Ensures `creator_id`, `csvData` (or `xmlData`), optional period overrides. |
| Parse Amazon CSV | Parses CSV; outputs one item per row with original columns + `creator_id`. |
| Normalize to canonical schema | Maps to `creator_id`, `source_platform: amazon`, `period_start`, `period_end`, `normalized_earnings`, `currency`, `raw_type`, `raw_payload`, `recorded_at`. |
| Append to Creator Earnings Sheet | **Google Sheets** – Appends each normalized row to the **Earnings** sheet. Set Document ID and sheet name in n8n; header row: creator_id, source_platform, period_start, period_end, normalized_earnings, currency, raw_type, recorded_at. |
| Aggregate | Collects items for response. |
| Send Response | Webhook JSON: `success`, `recordsProcessed`, `message`. |

## Persistence

- **Google Sheets (included):** The workflow includes **Append to Creator Earnings Sheet**. In n8n, set the Google Sheets credential, Document ID, and sheet name **Earnings**. Use the same **Earnings** sheet for LTK sync so one sheet holds all platforms (see [CREATOR-DASHBOARD-DATA-FLOW.md](../docs/CREATOR-DASHBOARD-DATA-FLOW.md)).
- **Airtable / DB (optional):** Add an **Airtable – Create record** (or HTTP to your API) after **Normalize to canonical schema** and map the same canonical fields if you prefer Airtable over Sheets.

## Docs

- [AMAZON-REPORT-INGESTION-SPEC.md](../docs/AMAZON-REPORT-INGESTION-SPEC.md) – Full spec.
- [AMAZON-ASSOCIATES-REPORTS.md](../docs/AMAZON-ASSOCIATES-REPORTS.md) – Report types and field mapping.
- [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](../docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md) – Canonical schema.
