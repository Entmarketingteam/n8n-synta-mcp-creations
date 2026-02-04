# Creator Earnings / Activity – Canonical Schema

This doc defines the **canonical data model** for creator earnings and activity so that **Amazon** (Associates reports) and **Instagram** (API) can be stored in one place and married in a single dashboard.

---

## 1. Purpose

- **Single schema:** All sources map into the same fields so the dashboard can filter by `source_platform`, `creator_id`, and period without source-specific logic.
- **Amazon:** Associates Central report rows (revenues, bounties, sales) are parsed (XML/CSV) and mapped into this schema.
- **Instagram:** Instagram API metrics (e.g. insights, business discovery) are mapped into this schema where applicable (earnings-like or activity).
- **Dashboard:** Queries one normalized store; filters by `source_platform`, creator, and period.
- **LTK:** Commissions and performance from LTK API (or runner) map into the same schema so LTK + Amazon (and later ShopMy) appear in one Earnings view.

---

## 2. Canonical fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `creator_id` | string | Yes | Your internal creator identifier (e.g. slug or UUID). |
| `source_platform` | string | Yes | `amazon` \| `instagram` \| `ltk` \| (future: `shopmy`, etc.). |
| `period_start` | date (ISO 8601) | Yes | Start of the reporting period (e.g. `2025-01-01`). |
| `period_end` | date (ISO 8601) | Yes | End of the reporting period (e.g. `2025-01-31`). |
| `normalized_earnings` | number | No* | Single earnings value for the row (revenue, commission, bounty). *Required when the row represents earnings. |
| `currency` | string | No | ISO 4217 (e.g. `USD`, `EUR`). Default from locale or report. |
| `raw_type` | string | No | Granular type: e.g. `commission`, `bounty`, `sale`, `shipped_item`, `ad_revenue`, `insight_metric`. |
| `raw_payload` | object | No | Original row or key fields for debugging and audit. |
| `recorded_at` | string (ISO 8601) | No | When your system ingested the row (e.g. upload time). |

Additional optional fields (extend as needed):

- `item_id`, `order_id`, `link_type` – for Amazon order/link detail.
- `metric_name`, `metric_value` – for Instagram (e.g. reach, impressions) when stored in the same table.
- `tracking_id` – Amazon Tracking ID / store tag.

---

## 3. Amazon (Associates) mapping

**Source:** Parsed rows from Associates Central report files (Tracking ID Summary, Link Type Performance, Daily Trends) in XML or CSV.

| Canonical field | Source (Associates) |
|-----------------|---------------------|
| `creator_id` | Injected by your app when the creator uploads the file (not in the report). |
| `source_platform` | Always `amazon`. |
| `period_start` | Report date range start, or row “Date” / “Earning Period Start Date”. |
| `period_end` | Report date range end, or row “Earning Period End Date”. |
| `normalized_earnings` | First non-empty of: Earnings, Commission, Commission Income, Bounty, Revenue, Order Total, Amount, Total, Payout (parsed as number). |
| `currency` | Report locale or “Currency” column; default `USD`. |
| `raw_type` | `commission` \| `bounty` \| `sale` \| `shipped_item` (infer from column name or report type). |
| `raw_payload` | Original row (or selected columns) for debugging. |
| `recorded_at` | Time of upload/ingestion. |

See [AMAZON-ASSOCIATES-REPORTS.md](AMAZON-ASSOCIATES-REPORTS.md) for report types and column-name details.

---

## 4. Instagram mapping

**Source:** Instagram Graph API (e.g. insights, business discovery, media). Map only what you need for the dashboard (e.g. earnings-like or key metrics).

| Canonical field | Source (Instagram) |
|-----------------|--------------------|
| `creator_id` | Your internal creator id (linked to Instagram account/business id). |
| `source_platform` | Always `instagram`. |
| `period_start` | Insight period start (e.g. day or range). |
| `period_end` | Insight period end. |
| `normalized_earnings` | Use only if Instagram exposes revenue (e.g. badges, subscriptions); otherwise null or omit. |
| `currency` | If revenue is present. |
| `raw_type` | e.g. `insight_metric`, `reach`, `impressions`, `ad_revenue`. |
| `raw_payload` | Original API response slice for debugging. |
| `recorded_at` | Time of API pull or sync. |

For non-earnings metrics (reach, impressions), you can still use the same table with `normalized_earnings` null and `raw_type` / `raw_payload` carrying the metric name and value so the dashboard can show both earnings and engagement in one place.

---

## 5. LTK mapping

**Source:** LTK API (or LTK Browserbase runner): `get_user_info`, `commissions_summary`, `performance_summary`. Normalize so LTK rows land in the same Earnings table as Amazon/Instagram.

| Canonical field | Source (LTK) |
|-----------------|--------------|
| `creator_id` | Injected from your config (e.g. Airtable Creator or workflow static data). |
| `source_platform` | Always `ltk`. |
| `period_start` | From `commissions_summary` or `performance_summary` date range (e.g. `start_date`), or snapshot date minus 30 days. |
| `period_end` | From `commissions_summary` or `performance_summary` (e.g. `end_date`), or snapshot date. |
| `normalized_earnings` | From `commissions_summary` (e.g. total commission / paid amount for the period); parse number from the API response. |
| `currency` | From API (e.g. `currency: "USD"`) or default `USD`. |
| `raw_type` | e.g. `commission`, `ltk_performance`. |
| `raw_payload` | Slice of `commissions_summary` and/or `performance_summary` for debugging. |
| `recorded_at` | Time of API pull (e.g. `extracted_at`). |

**Implementation:** In the LTK sync workflow, after “Store to Sheets” (LTK Snapshots), add a Code node that reads the current item (user_info, commissions, performance_summary), extracts total commission and date range, and outputs one or more items in canonical shape. Then append those items to the same **Earnings** sheet (Google Sheets or Airtable) that Amazon ingest uses.

---

## 7. Dashboard usage

- **Filter by platform:** `WHERE source_platform = 'amazon'` or `'instagram'`.
- **Filter by creator:** `WHERE creator_id = ?`.
- **Filter by period:** `WHERE period_start >= ? AND period_end <= ?`.
- **Aggregate earnings:** `SUM(normalized_earnings)` grouped by creator, platform, or period.
- **Marry Amazon + Instagram:** Same table; no join by source—only by `creator_id` and period.

---

## 8. References

- [AMAZON-ASSOCIATES-REPORTS.md](AMAZON-ASSOCIATES-REPORTS.md) – Amazon report types and field mapping.
- Ingestion: see ingestion spec or n8n workflow that accepts uploaded Amazon XML/CSV and writes normalized rows (e.g. to Airtable or a DB).
