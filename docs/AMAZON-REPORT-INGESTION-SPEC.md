# Amazon Associates Report Ingestion – Spec

This spec describes how to accept **uploaded Amazon Associates report files** (XML or CSV), parse them, normalize to the [canonical creator earnings schema](CREATOR-EARNINGS-CANONICAL-SCHEMA.md), and store for the dashboard.

---

## 1. Flow overview

1. **Creator** downloads a report from Associates Central (Reports → Download Reports) in **CSV** or **XML**.
2. **Creator** uploads the file to your app (or forwards by email; your system extracts the attachment).
3. **Backend** receives the file (or raw content) and:
   - Identifies format (CSV vs XML).
   - Parses rows (CSV: header row + data rows; XML: repeatable elements).
   - Maps each row to the canonical schema (`creator_id`, `source_platform: amazon`, `period_start`, `period_end`, `normalized_earnings`, `currency`, `raw_type`, `raw_payload`, `recorded_at`).
   - Stores normalized rows (DB, Airtable, or data store).
4. **Dashboard** reads from the normalized store and filters by `source_platform`, `creator_id`, and period (same store as Instagram so data marries in one view).

---

## 2. Input

### Option A: Webhook / API (n8n or app)

- **Method:** POST.
- **Body:** JSON with:
  - `csvData` (string): UTF-8 CSV content (e.g. pasted or base64-decoded).
  - Or `xmlData` (string): XML report content.
  - `creator_id` (string): Your internal creator identifier (required).
  - `period_start` (string, optional): ISO date; override if not inferrable from report.
  - `period_end` (string, optional): ISO date; override if not inferrable from report.
- **Example (CSV):**
  ```json
  {
    "creator_id": "creator-123",
    "csvData": "Date,Earnings,Clicks,Ordered Items\n2025-01-01,10.50,100,5\n2025-01-02,20.00,150,8"
  }
  ```

### Option B: File upload (app only)

- User selects a file (CSV or XML); backend reads content and then runs the same parse + normalize + store steps as above. `creator_id` comes from the logged-in user or a form field.

---

## 3. Parse

### CSV

- First line = header (column names).
- Subsequent lines = data rows. Handle quoted fields and commas inside quotes (standard CSV).
- Encoding: UTF-8.
- Map header names case-insensitively where possible (e.g. "Earnings" vs "earnings").

### XML

- Parse report XML (structure varies by report type; see Amazon’s export).
- Extract repeatable row elements (e.g. per date or per order).
- For each row element, read child/text values into a flat object keyed by tag name (or known paths). Then pass that object through the same normalization step as CSV rows.

---

## 4. Normalize to canonical schema

For each parsed row (from CSV or XML), produce one canonical record:

| Canonical field | Rule |
|-----------------|------|
| `creator_id` | From input (injected; not in report). |
| `source_platform` | Always `amazon`. |
| `period_start` | From input override, or from row “Date” / “Earning Period Start Date” / report date range start; default to report start. |
| `period_end` | From input override, or from row “Earning Period End Date” / report date range end; default to report end. |
| `normalized_earnings` | First non-empty numeric value from row keys: Earnings, Commission, Commission Income, Bounty, Revenue, Order Total, Amount, Total, Payout (strip currency symbols/commas; parse as number). Use 0 or null if none. |
| `currency` | From row “Currency” or report locale; default `USD`. |
| `raw_type` | Infer from column used for earnings: e.g. `commission`, `bounty`, `sale`, `shipped_item`. |
| `raw_payload` | Original row (or selected columns) for debugging. |
| `recorded_at` | Current time (ISO 8601) at ingestion. |

See [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](CREATOR-EARNINGS-CANONICAL-SCHEMA.md) and [AMAZON-ASSOCIATES-REPORTS.md](AMAZON-ASSOCIATES-REPORTS.md) for details.

---

## 5. Store

- Write each normalized record to your chosen store:
  - **Airtable:** One row per record; map canonical fields to Airtable columns (e.g. Creator Id, Source Platform, Period Start, Period End, Normalized Earnings, Currency, Raw Type, Recorded At, Raw Payload as JSON string or linked record).
  - **Database:** Insert into a `creator_earnings` (or similar) table with columns matching the canonical schema.
- Idempotency (optional): Use `creator_id` + `source_platform` + `period_start` + `period_end` + a row key (e.g. date + order id) to deduplicate or upsert.

---

## 6. n8n workflow (reference)

A minimal n8n workflow that implements this flow is in **workflows/amazon-associates-report-ingest.json**.

- **Trigger:** Manual or Webhook POST (e.g. `/webhook/amazon-report-ingest`).
- **Body:** `{ "creator_id": "...", "csvData": "..." }` (or `xmlData` for XML when supported).
- **Nodes:** Normalize input → Parse CSV → Normalize to canonical (Code) → output normalized items. You can connect an Airtable “Create record” (or DB) node after “Normalize to canonical” and map the canonical fields to your base/table.
- **Response (webhook):** JSON with `success`, `recordsProcessed`, and optional `message`.

Import the workflow into n8n, configure the Airtable/DB node if you use it, and point your app (or a simple upload form) at the webhook URL to POST `creator_id` + `csvData` (or file content).

---

## 7. References

- [AMAZON-ASSOCIATES-REPORTS.md](AMAZON-ASSOCIATES-REPORTS.md) – Report types and column names.
- [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](CREATOR-EARNINGS-CANONICAL-SCHEMA.md) – Canonical fields and Amazon/Instagram mapping.
