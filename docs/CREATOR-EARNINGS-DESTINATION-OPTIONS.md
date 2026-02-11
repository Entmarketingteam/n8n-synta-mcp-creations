# Creator earnings: one sheet vs separate tables (and aggregating later)

**Purpose:** Clarify where each platform’s earnings data lands today, and the best approach for SQL/MySQL (or Supabase) when you want one unified earnings report but also want to keep pipelines and data per platform under control.

---

## Where things are today

All pipelines (Mavely, ShopMy, Amazon, LTK) in the current workflows write to **one** destination: a single **Earnings** tab in a Google Sheet, with canonical columns (`creator_id`, `source_platform`, `period_start`, `period_end`, `normalized_earnings`, etc.). That gives one place to query “all earnings” but mixes every platform in one table/sheet.

---

## What you need first: data pulled per platform

**Priority:** Ensure **all platform data is pulled**. That means keeping **separate pipelines per platform** (Mavely, ShopMy, Amazon, LTK). Each pipeline normalizes to the same canonical fields; where that data *lands* can be one table or many. If separate pipelines need to be kept for all platforms, that’s the right approach — and it’s already how the workflows are built.

---

## Option A: One table (current pattern)

- **One Earnings sheet (or one DB table)** with a `source_platform` column (mavely, shopmy, amazon, ltk). Every pipeline appends there.
- **Pros:** Single place to query; simple “total earnings” and filters.
- **Cons:** One big table; backfilling or fixing one platform touches the same table; platform-specific columns get messy.

---

## Option B: Separate tables per platform, aggregate later (recommended for SQL)

- **Separate tables** with the **same canonical columns**: e.g. `mavely_earnings`, `shopmy_earnings`, `amazon_earnings`, `ltk_earnings` (each: creator_id, period_start, period_end, normalized_earnings, currency, raw_type, recorded_at, raw_payload, etc.).
- **Aggregation later** in MySQL / Postgres / Supabase:
  - **VIEW:**  
    `CREATE VIEW unified_earnings AS  
     SELECT *, 'mavely' AS source_platform FROM mavely_earnings  
     UNION ALL SELECT *, 'shopmy' FROM shopmy_earnings  
     UNION ALL SELECT *, 'amazon' FROM amazon_earnings  
     UNION ALL SELECT *, 'ltk' FROM ltk_earnings;`  
    Dashboards and reports query the view.
  - **Or** a scheduled job or n8n workflow that INSERTs into a single `creator_earnings` reporting table from the platform tables.
- **Pros:** Backfill or fix one platform without touching others; add platform-specific columns per table if needed; clear ownership per source; same schema everywhere so UNION/aggregation is straightforward.
- **Cons:** Slightly more objects (tables + view or job); reporting always goes through the view or aggregation step.

**In a MySQL or Postgres/Supabase scenario, Option B is the better long-term setup:** separate pipelines → separate tables (same schema) → one view (or one reporting table) for “one earnings report.” Your existing [CREATOR-DATA-CONSOLIDATION-STATE.md](CREATOR-DATA-CONSOLIDATION-STATE.md) and CreatorMetrics schema already lean this way (e.g. `amazon_*` tables, `sales` with platform, `ltk_collages`).

---

## Vector DB note

A “SQL vector database” or vector extension in Postgres is for **embeddings / semantic search** (e.g. content, posts), not for earnings aggregation. Earnings stay in relational tables; you aggregate with SQL (VIEW or ETL). Vector is for a different use case (e.g. “find similar content”).

---

## What to do in practice

- **Pipelines:** Keep **separate** per platform; no change. Each pipeline continues to output canonical rows; we only choose where they land.
- **Short term (current):** Keep using **one Earnings sheet** if you want the simplest “one report” now; all pipelines can keep appending there.
- **When you move to a DB (MySQL, Supabase, etc.):** Prefer **separate tables per platform** (same canonical columns) and add a **unified_earnings** VIEW (or equivalent) so you still get one earnings report from the database. Pipelines then write to `mavely_earnings`, `shopmy_earnings`, etc., instead of (or in addition to) the Sheet; aggregation is the VIEW or a small ETL step.

---

## References

- [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](CREATOR-EARNINGS-CANONICAL-SCHEMA.md) — canonical fields and per-platform mapping.
- [CREATOR-DASHBOARD-DATA-FLOW.md](CREATOR-DASHBOARD-DATA-FLOW.md) — current “one Earnings sheet” flow.
- [CREATOR-DATA-CONSOLIDATION-STATE.md](CREATOR-DATA-CONSOLIDATION-STATE.md) — CreatorMetrics/Supabase and platform-specific tables.
