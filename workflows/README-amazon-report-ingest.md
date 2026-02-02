# Amazon Associates Report Ingest

Accepts **uploaded Amazon Associates report** content (CSV from Associates Central), parses it, normalizes to the [canonical creator earnings schema](../docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md), and outputs normalized records. Connect an Airtable or DB node after **Normalize to canonical schema** to persist.

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
| Aggregate | Collects items for response. |
| Send Response | Webhook JSON: `success`, `recordsProcessed`, `message`. |

## Persistence

The workflow **does not** write to Airtable or a DB by default. To store:

1. Add an **Airtable – Create record** (or HTTP Request to your API) node after **Normalize to canonical schema**.
2. Map canonical fields to your base/table: Creator Id, Source Platform, Period Start, Period End, Normalized Earnings, Currency, Raw Type, Recorded At, Raw Payload (e.g. JSON string).

## Docs

- [AMAZON-REPORT-INGESTION-SPEC.md](../docs/AMAZON-REPORT-INGESTION-SPEC.md) – Full spec.
- [AMAZON-ASSOCIATES-REPORTS.md](../docs/AMAZON-ASSOCIATES-REPORTS.md) – Report types and field mapping.
- [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](../docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md) – Canonical schema.
