# Creator Data Consolidation – Where We Are & What’s Next

**Last updated:** February 2026  
**Purpose:** One place that ties together LTK auth, LTK→Sheets, CreatorMetrics/Supabase schema, Amazon, and data ingestion so the agency can move forward without losing context.

---

## 1. Current State (What’s Done)

### LTK auth and token storage ✅

- **LTK Token Rotation (Airtable)**  
  - Workflow: [LTK Token Rotation (Airtable)](https://entagency.app.n8n.cloud/workflow/a9gH2UthD2w239iv)  
  - Reads refresh token from Airtable (Nicki’s row) → calls LTK auth → writes new access + refresh back.  
  - Runs every 8 hours.  
  - Fix doc: `docs/LTK-TOKEN-ROTATION-WORKFLOW-FIX.md`

### LTK API → Google Sheets ✅

- **LTK Reports to Google Sheets (Airtable Token)**  
  - Workflow: [LTK Reports to Google Sheets](https://entagency.app.n8n.cloud/workflow/2Rr3f3YCgy3OIZWX)  
  - Reads **Access_Token** from same Airtable row → calls LTK API (user info, commissions, performance, items sold) → appends one row per run to a Google Sheet.  
  - Setup: `docs/LTK-REPORTS-TO-GOOGLE-SHEETS.md`

### Airtable as token source

- Base: `appQnKyfyRyhHX44h`, table: `tbl5TEfzBwGPeT1rX` (e.g. “LTK_Credentials”).  
- One row per creator (e.g. Nicki); columns: Creator, Refresh_Token, Access_Token, ID_Token, Last_Refreshed, Status.  
- Both LTK workflows use this as the single source of truth for the token.

---

## 2. The Big Picture: Two Schema “Worlds”

You have two related but different schema views. Both are valid; the second is what you’re actually implementing in Supabase.

### A) Creator Data Consolidation (relational design)

- **Source:** Pasted in chat + older planning (e.g. “Creator Data Consolidation Database Schema”, Nov 2025).  
- **Stack:** Generic PostgreSQL (could be Supabase, RDS, etc.).  
- **Scope:** Full relational model: `creators` → `instagram_accounts`, `ltk_accounts`, `amazon_accounts`, `meta_ad_accounts` → platform-specific tables (e.g. `ig_posts`, `ltk_posts`, `ltk_earnings`, `amazon_earnings`), plus `content_hub`, `brand_collaborations`, etc.  
- **Use:** Long-term reference for “what we want to track” (multi-creator, IG + LTK + Amazon + Meta, vectors, attribution).  
- **Not yet:** No single SQL file in this repo that implements this full schema; the Supabase project uses the CreatorMetrics schema below instead.

### B) CreatorMetrics (Supabase – what you’re building on)

- **Source:** ENT Content Intelligence, CreatorMetrics Master Summary, Schema Map, Amazon tables SQL (Dec 2025).  
- **Stack:** Supabase (PostgreSQL + Auth).  
- **Core tables:**  
  - **Content:** `social_posts` (IG + optional themes, hook, embedding).  
  - **Revenue:** `sales` (platform = ltk | amazon | …), `products`, `attributions` (post ↔ sale).  
  - **LTK:** `ltk_collages` (share_url, ltk_code, clicks, commission, orders).  
  - **Amazon:** `amazon_tracking_tags`, `amazon_daily_metrics`, `amazon_link_performance`, `amazon_category_daily`, `amazon_orders`, `amazon_bounties`.  
  - **Analytics/UX:** `brand_summaries`, `content_themes`, `insights`, `search_history`, `saved_views`, `export_jobs`, `change_log`, `status_history`.  
- **Files you have:**  
  - `creatormetrics_amazon_tables.sql` (Amazon tables + RLS + views + LTK/IG helpers).  
  - Enhancement migrations (e.g. `social_posts` + `products` + vectors, `ltk_collages`, `brand_summaries`) described in ENT_Content_Intelligence_Summary.  
- **Identity:** Uses Supabase `profiles` / `auth.users`; “creator” = user in your app, not a separate `creators` table.

So: **“Supabase scenario” = CreatorMetrics schema.** The “Creator Data Consolidation” doc is the conceptual/relational North Star; CreatorMetrics is the current implementation target.

---

## 3. Data Sources & How They Map

| Source | How you get it today | Where it should land (CreatorMetrics) |
|--------|----------------------|----------------------------------------|
| **LTK** | Token from Airtable → LTK API → n8n (already: Google Sheet; next: Supabase) | `ltk_collages`, `products`, `sales` (platform=ltk), `attributions` |
| **LTK historical** | CSV exports (ltkposts, analytics, earnings, brands) | Same tables via n8n “loader” or manual import |
| **Amazon** | No direct API; CSV/XML from Associates Central (Fee-Earnings, Fee-Orders, Fee-Tracking, etc.) | `amazon_tracking_tags`, `amazon_daily_metrics`, `amazon_link_performance`, `amazon_orders`, `sales` (platform=amazon), etc. |
| **IG / Meta** | Business Suite CSV exports (Stories, Reels, etc.) | `social_posts`, optional `ig_post_metrics`; link_clicks, ltk_link, amazon_tag for attribution |
| **Meta Ads** | Ads Manager / API | In full “Creator Data Consolidation” design: `meta_ad_accounts`, campaigns, ads, metrics; in CreatorMetrics you can add later. |

LTK API (user info, commissions, performance, items sold) is **live**; the rest is file-based or future API.

---

## 4. What’s Next (Prioritized)

### 4.1 Amazon (next big piece)

- **Reality:** Amazon doesn’t give a clean API for influencer earnings; you have CSV/XML (Fee-Earnings, Fee-Orders, Fee-Tracking, Fee-LinkType, Fee-DailyTrends, Bounty, etc.).  
- **Schema:** Already in CreatorMetrics – `creatormetrics_amazon_tables.sql` (and any enhancement migrations) define `amazon_*` tables and `sales` (asin, tracking_id, link_type, etc.).  
- **Next steps:**  
  1. **Option A – Manual/semi-automated:** Upload CSV/XML to a shared place (Drive, S3, or n8n “watch” folder); n8n workflow parses and upserts into Supabase (`amazon_tracking_tags`, `amazon_daily_metrics`, `amazon_orders`, `sales`, etc.).  
  2. **Option B – Browser/automation:** Use something like your ShopMy/LTK pattern (e.g. logged-in browser or runner) to trigger report download and then same n8n parsing → Supabase.  
- **Attribution:** Tracking tags (e.g. nickientenman-20, nicki-igreel-20) already map to channels; link types (Shoppable Post, Text/Image, etc.) are in schema. No per-post Amazon attribution without manual link logging or heuristics (same limitation as in CREATORMETRICS_MASTER_SUMMARY).

### 4.2 LTK API → Supabase (not just Sheets)

- You already have LTK → Google Sheets. To feed CreatorMetrics:  
  1. Add an n8n branch (or a second workflow) that takes the same “Read Token from Airtable” + LTK API responses.  
  2. Map API response to CreatorMetrics: e.g. user info → `profiles` or a `creator_settings` table; commissions/performance/items_sold → `sales`, `ltk_collages`, or summary tables, depending on how granular you want to be.  
  3. Use Supabase node (or HTTP Request to Supabase REST) to insert/upsert.  
- This gives you “live” LTK data in Supabase alongside (or instead of) Sheets.

### 4.3 Run / confirm Supabase migrations

- If not already done:  
  1. Run core CreatorMetrics migrations (social_posts, sales, products, attributions, ltk_collages, brand_summaries, etc.).  
  2. Run `creatormetrics_amazon_tables.sql` (and any `creatormetrics_enhancement_*.sql` from ENT_Content_Intelligence_Summary).  
  3. Enable `vector` extension if you use embeddings; add columns/indexes for `social_posts`, `products`, `ltk_collages` as in the enhancement doc.

### 4.4 Historical CSVs into CreatorMetrics

- **IG:** CSV → parse → `social_posts` (and optional metrics tables).  
- **LTK:** ltkposts → `ltk_collages`; analytics → `products`; earnings → `sales`.  
- **Amazon:** Fee-* files → `amazon_*` and `sales`.  
- Use the “File to Table Mapping” in CreatorMetrics_Schema_Map.md; implement as one or more n8n “loader” workflows (trigger: file upload or schedule + path).

### 4.5 Attribution and “content → revenue”

- **LTK:** Match on `ltk_code` / `liketk.it/XXXXX` from IG caption to `ltk_collages.share_url`; store in `attributions` or link `social_posts.ltk_link` → `ltk_collages`.  
- **Amazon:** Only channel-level (tracking tag) unless you add manual link logging (e.g. “post ID + Amazon link + tag” at publish time).  
- Logic and functions (e.g. `extract_ltk_code`, `match_posts_to_ltk`) are already in `creatormetrics_amazon_tables.sql` and the schema map.

---

## 5. Reference: Key Documents (In Repo vs Downloads)

### In this repo (n8n-synta-mcp-creations)

| Doc | What it is |
|-----|------------|
| `docs/LTK-TOKEN-ROTATION-WORKFLOW-FIX.md` | LTK token 422 fix + Airtable flow + “what’s next” |
| `docs/LTK-REPORTS-TO-GOOGLE-SHEETS.md` | LTK API → Google Sheet workflow and setup |
| `docs/LTK-NICKI-OAUTH2-SETUP.md` | LTK OAuth2 PKCE (alternative to Airtable token) |
| `docs/LTK-PAINLESS-GO-LIVE.md` | LTK Browserbase runner (painless login) |
| `workflows/ltk-token-rotation-fixed.json` | Token rotation workflow (reference) |
| `workflows/ltk-reports-to-google-sheets.json` | LTK reports → Sheet workflow (reference) |

### In your Downloads (you had these open)

| File | What it is |
|------|------------|
| PRD and TDD for Creator Pulse.docx | Product/technical spec for Creator Pulse (couldn’t read .docx here) |
| ENT_Content_Intelligence_Summary.md | Supabase CreatorMetrics, enhancements, Amazon tables, migration order, n8n loaders |
| Q4_2025_Data_Connections.md | Q4 revenue, IG↔LTK↔Amazon connection map, schema connections |
| CREATORMETRICS_MASTER_SUMMARY_Dec2025.md | Full state: data inventory, connection problem, schema, next steps, file list |
| creatormetrics_amazon_tables.sql | Amazon tables + RLS + views + LTK/IG helpers (run on Supabase) |
| CreatorMetrics_Schema_Map.md | Visual schema (social_posts, attributions, sales, ltk_collages, amazon_*, etc.) |
| CreatorMetrics_Middleware_Architecture.md | Token extraction, circuit breaker, CSV fallback, security |
| FINAL LTK ENDPOINTS FROM HAR FILES.docx | LTK API endpoints from HAR (couldn’t read .docx here) |

Recommendation: **Copy the key .md and .sql from Downloads into this repo** (e.g. `docs/` and `docs/supabase/` or `schema/`) so schema and data-ingestion plans live in one place and are versioned with the n8n workflows.

---

## 6. One-Paragraph “Where We Are”

**LTK:** Auth and token storage are solved (Airtable + token rotation workflow). LTK API data (performance, analytics, commissions, user info, items sold) is already pulled into a Google Sheet via a second workflow. **Next:** Optionally mirror that LTK API output into Supabase (CreatorMetrics) so all creator data lives in one DB. **Amazon:** No live API; schema and SQL for Amazon (tracking tags, daily metrics, link performance, orders, bounties, sales) already exist in CreatorMetrics. **Next:** Add an ingestion path (n8n: parse Fee-* CSV/XML → Supabase). **Supabase:** You’re “further along” in the **CreatorMetrics** schema and data-ingestion plan (ENT_Content_Intelligence_Summary, CreatorMetrics_Schema_Map, creatormetrics_amazon_tables.sql). The “Creator Data Consolidation” relational design is the long-term picture; CreatorMetrics is the current Supabase implementation. Next concrete steps: (1) Run/confirm all CreatorMetrics + Amazon migrations in Supabase, (2) Add n8n workflow(s) to load Amazon reports and (optionally) LTK API into Supabase, (3) Load historical CSVs into the same tables.

---

## 7. Suggested Next Session

1. **Copy into repo:** Done. ENT_Content_Intelligence_Summary.md, Q4_2025_Data_Connections.md, CREATORMETRICS_MASTER_SUMMARY_Dec2025.md, CreatorMetrics_Schema_Map.md, CreatorMetrics_Middleware_Architecture.md, and creatormetrics_amazon_tables.sql are now in `docs/` and `docs/supabase/`.  
2. **Confirm Supabase:** List migrations already run; run any missing CreatorMetrics + Amazon migrations.  
3. **Design one n8n flow:** “Amazon report file (or URL) → parse → Supabase upsert” for one report type (e.g. Fee-Tracking or Fee-Earnings), then extend to others.  
4. **Optional:** Add “LTK API → Supabase” branch to the existing LTK Reports workflow → See docs/LTK-N8N-TO-SUPABASE-MESH.md (parallel branch, no change to Airtable or Sheets).

If you tell me “start with Amazon ingestion” or “start with LTK → Supabase,” I can outline the exact n8n nodes and Supabase tables/columns for that step next.
