# Amazon Associates Reports – Types, Formats, and Field Mapping

This doc describes the report types and download formats available in **Associates Central** (Amazon creator backend) for creator revenues, bounties, and sales. Use it to build ingestion that parses XML/CSV/Excel and maps to a canonical schema (e.g. `normalized_earnings`) for your dashboard.

**Reality:** There is no public API for programmatic report download. Creators download reports manually from Associates Central; your system ingests the uploaded files.

---

## 1. Where to download reports

1. Creator signs in to [Amazon Associates Central](https://affiliate-program.amazon.com).
2. Open **Reports** (left nav).
3. Use **"Download Reports"** in the upper right.
4. Choose **report type**, **date range**, and **format** (Excel, CSV, or XML).

---

## 2. Report types

| Report type | Description | Use for |
|-------------|-------------|---------|
| **Tracking ID Summary** | Performance by Tracking ID (store/tag). | Earnings and clicks per tag. |
| **Link Type Performance** | Performance by link type (product links, search, home page, etc.). | How each link type drives revenue. |
| **Daily Trends** | Day-by-day metrics (earnings, clicks, ordered items, shipped items). | Time-series and period rollups. |

From Amazon’s “How to use reports”:

- **Earnings:** Commission income and bounties; earnings report is current as of the **previous day** (e.g. Tuesday shows through Monday).
- **Ordered items / Bounties:** Updated hourly; most orders appear within about three hours.
- **Today’s Orders:** Near real-time order data (within ~3 hours); can be filtered by Tracking ID.

---

## 3. Download formats

Reports can be downloaded in:

| Format | Extension | Notes |
|--------|-----------|--------|
| **Excel** | `.xlsx` | Same data as CSV/XML; parse with a library or convert to CSV/JSON for ingestion. |
| **CSV** | `.txt` | Comma-separated; UTF-8. Easiest for programmatic parse. |
| **XML** | `.xml` | Structured; good for custom reports and consistent parsing. |

XML is explicitly supported for custom reports and reusable templates (e.g. in Excel). Use XML or CSV in your pipeline for consistent mapping to `normalized_earnings`.

---

## 4. Field mapping to canonical schema

Your ingestion should map Associates report rows into a **canonical creator earnings / activity** schema so Amazon data can be combined with Instagram (or other sources) in one dashboard.

### Suggested canonical fields (target)

| Canonical field | Type | Description |
|-----------------|------|-------------|
| `creator_id` | string | Your internal creator identifier. |
| `source_platform` | string | `amazon` for Associates data. |
| `period_start` | date/ISO | Start of the reporting period. |
| `period_end` | date/ISO | End of the reporting period. |
| `normalized_earnings` | number | Single earnings value for the row (revenue/commission/bounty). |
| `currency` | string | e.g. `USD`. |
| `raw_type` | string | e.g. `commission`, `bounty`, `sale`, `shipped_item`. |
| `raw_payload` | object (optional) | Original row or key fields for debugging. |

### Source fields to coalesce into `normalized_earnings`

Associates report column names vary by report type and format. Map **one** of the following (first non-empty) into `normalized_earnings`:

| Possible source name (examples) | Report context |
|---------------------------------|-----------------|
| Earnings, Commission, Commission Income | Summary / earnings reports |
| Bounty, Bounties | Bounty-specific columns |
| Revenue, Item Price, Order Total | Order/sales detail |
| Shipped Revenue, Advertising Fee | When reported |
| Amount, Total, Payout | Generic totals |

**Logic (pseudo):**

```text
normalized_earnings = row["Earnings"] ?? row["Commission"] ?? row["Commission Income"]
  ?? row["Bounty"] ?? row["Revenue"] ?? row["Order Total"] ?? row["Amount"]
  ?? row["Total"] ?? row["Payout"] ?? 0
```

Parse numbers (strip currency symbols, commas); use 0 or null if none present. Set `raw_type` from the column name you used (e.g. `commission`, `bounty`).

### Other useful mappings

- **period_start / period_end:** From report date range or row-level “Date”, “Transaction Date”, “Earning Period Start/End” if present.
- **currency:** From report locale or a “Currency” column; default e.g. `USD` if missing.
- **creator_id:** Injected by your app when the creator uploads the file (not in the report).

---

## 5. Ingestion flow (recommended)

1. **Creator** downloads report from Associates Central (Reports → Download Reports) in **XML** or **CSV**.
2. **Creator** uploads the file to your app (or forwards by email; you extract the attachment).
3. **Backend** identifies file type (XML vs CSV vs Excel), parses rows.
4. **Backend** maps each row to canonical schema (including `normalized_earnings`, `source_platform: amazon`, `period_start`, `period_end`, `raw_type`, `currency`).
5. **Backend** stores normalized rows in your DB or data store for the dashboard.
6. **Dashboard** queries normalized data and filters by `source_platform`, `creator_id`, and period (same schema as Instagram so they “marry” in one view).

---

## 6. Optional: HAR analysis for “Download Reports”

If you capture a HAR (e.g. `www.amazon.com.har`) while using “Download Reports” in Associates Central, you can:

- Find the HTTP request that triggers the report download (URL, method, query/body, cookies).
- Document the response (e.g. file download, redirect to S3, or JSON with a file URL).
- Use that later if you explore **Option C** (automated login + download) or if Amazon changes the UI.

Add a short “HAR findings” subsection here once you have the exact request/response for Download Reports.

---

## 7. References

- [How to Download Reports](https://affiliate-program.amazon.com/help/node/topic/GQ5FS7J76MT59WLW) – Formats (Excel, CSV, XML) and where to find Download Reports.
- [How to use reports](https://affiliate-program.amazon.com/help/node/topic/GMWAK55DQX8JEK7C) – Report types, Today’s Orders, Daily Trends, earnings timing.
- Canonical schema: see `docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md` for the full schema and Amazon/Instagram mapping.
