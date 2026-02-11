# ShopMy Payout Summary Pipeline (API-first, no browser)

This pipeline uses **only HTTP API calls** to ShopMy. No Browserbase, no cookie storage. It is the recommended way to sync creator payout and earnings data on a schedule.

---

## Workflow

**File:** `workflows/shopmy-payout-summary-creators.json`

**Flow:**

1. **Schedule Trigger** or **Manual Trigger** → **Get ShopMy creators from Airtable** (base `appQnKyfyRyhHX44h`, table = your shopmy_credentials table) → **Map Airtable to creator config** (one item per creator: `creator_name`, `email`, `password`, `user_id`).
2. **Loop Creators** (SplitInBatches, 1 at a time) → **ShopMy Login** (POST `api/Auth/session` with `username`/`password`).
3. **Extract Session:** From login response and loop item: `creator_name`, `user_id` (from config), `session_id` (timestamp), `csrf_token` (from response headers or fallback), `auth_success` (statusCode === 200).
4. **Auth OK?** (IF) → **true:** continue; **false:** Auth Failed → Continue Loop.
5. **Get Payout Summary** → **Get Payment History** → **Get Brand Rates** (sequential, same session).
6. **Transform & Combine:** Single JSON per creator with `summary`, `months`, `normal_commissions`, `opportunity_commissions`, `referral_bonuses`, `payments`, `brand_rates`, `pending_count`, `paid_count`.
7. **Store to GSheet** and/or **Store to Airtable**; in parallel **Normalize Payout to canonical** → **Append to Creator Earnings Sheet** (same Earnings sheet as Amazon ingest and ShopMy CSV processor) → **Continue Loop** → next creator (or **All creators done** when the loop finishes).

---

## Auth model (session headers)

- **Login:** POST `https://apiv3.shopmy.us/api/Auth/session` with `Content-Type: application/json`, `Origin`/`Referer`/`User-Agent`, body `{ "username": "<email>", "password": "<password>" }`.
- **Session for data calls:** Use response headers (e.g. `x-csrf-token` from response) and a client-generated `x-session-id` (e.g. `Date.now()`) on every subsequent request. No Cookie header required for the data endpoints used here.
- **user_id:** Must be known per creator (from a previous run or from `Users/find_by_email`). Configured in Creator Config; no find_by_email step in this workflow.

---

## Credentials from Airtable (source of truth)

All creator logins for ShopMy, LTK, Amazon, and Mavely live in **Airtable**. This workflow reads ShopMy credentials from your Airtable base:

1. **Get ShopMy creators from Airtable** – Airtable node (operation **Search**), base `appQnKyfyRyhHX44h`, table = your **shopmy_credentials** table ID (from the table URL in Airtable: `.../tblXXXXXXXX/...`). Use the same credential as other Airtable nodes (e.g. **Airtable - ShopMy Creators**).
2. **Map Airtable to creator config** – Code node maps each Airtable row to `creator_name`, `email`, `password`, `user_id`. It looks for columns: **ShopMy_Email**, **ShopMy_Password**, **Creator_ID** or **Creator**, **User_ID** or **ShopMy_User_ID** (see [AIRTABLE-CREDENTIALS-TABLES.md](AIRTABLE-CREDENTIALS-TABLES.md)).
3. **Store to Airtable** – Writes payout data to the **Earnings** table in the same base (base `appQnKyfyRyhHX44h`, table `tblZkX1SuNlo2DNOb`). No env or Doppler needed.
4. **Store to GSheet** – Set the Google Sheet document ID or URL in the node (or disable the node if you only use Airtable).

**user_id:** Get once via the [ShopMy API (Creators)](../workflows/shopmy-api-creators.json) flow (Login → Find user by email → Extract User_id), or from the browser when logged in. Store it in your shopmy_credentials table (e.g. **User_ID** or **ShopMy_User_ID** column).

---

## Data shape (Transform & Combine output)

Each item has:

- `creator_name`, `user_id`, `extracted_at`
- `summary`: `today_amount`, `total_normal_commissions`, `total_opportunity_commissions`, `total_referral_bonuses`, `total_all`
- `months`: monthly breakdown from API
- `normal_commissions`, `opportunity_commissions`, `referral_bonuses`: arrays (recent 50 for normal)
- `payments`: recent payment history
- `brand_rates`: brand-specific commission rates
- `pending_count`, `paid_count`, `referral_totals`

You can map these to the [Creator Earnings canonical schema](CREATOR-EARNINGS-CANONICAL-SCHEMA.md) (e.g. one row per commission with `period_start`/`period_end`, `normalized_earnings`, `raw_type` = `commission` / `opportunity_commission` / `referral_bonus`) and append to the same Earnings sheet/table as Amazon and LTK.

---

## Relation to other ShopMy workflows

| Workflow | Auth | Data source | Use case |
|----------|------|--------------|----------|
| **ShopMy Payout Summary (this)** | API session (headers), pre-known `user_id` | `payout_summary` + Payments + CustomRates | Scheduled creator payout sync; GSheet/Airtable |
| **ShopMy API (Creators)** | API session (Cookie + csrf), find_by_email for `user_id` | Payments, Payout summary, Pins | On-demand or webhook; CSV-style output to CSV processor |
| **ShopMy Browserbase login** | Runner cookies (POST /auth/refresh, POST /run) | CSV from browser export | When API is insufficient or you prefer browser export |

Use the **Payout Summary** workflow when you want scheduled, API-only sync with rich payout/commission data and no browser.
