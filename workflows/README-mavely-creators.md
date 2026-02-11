# Mavely Creators – Daily auth & analytics

n8n workflow that logs into **Mavely** (NextAuth), fetches **commission/earnings** from mavely.live GraphQL, and stores one row per run in your Airtable **Earnings** table. Aligns with [CREATOR-EARNINGS-CANONICAL-SCHEMA](../../docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md).

**Live workflow:** https://entagency.app.n8n.cloud (ID `3gYfgPzMu6wZ1OEZ`) — active, runs on **Daily 6am** and on **Manual Trigger**.

## Flow

1. **Trigger**: Manual or **Daily 6am** (cron `0 6 * * *`).
2. **Get Mavely credentials from Airtable** (table with Email, Password, Creator_ID) → **Map Airtable to Mavely credentials**.
3. **GET CSRF** → **Merge CSRF with credentials** → **POST Login** (NextAuth `callback/credentials`).
4. **Extract session cookies** from login response.
5. **GET Session** (verify), then **Forward cookies for data fetch**.
6. **Prepare Mavely GraphQL** (builds date range: first of current month → today, and GraphQL body).
7. **POST Mavely analytics (GraphQL)** → `POST https://mavely.live/` with query `creatorAnalyticsMetricsTotals` (commission, sales, clicks, etc.). Uses same session cookies and headers as the Analytics page (Origin/Referer from creators.mave.ly).
8. **Parse GraphQL metrics** → reads `data.creatorAnalyticsMetricsTotals.metrics.commission` and maps to canonical fields (creator_id, source_platform, period_start, period_end, normalized_earnings, raw_payload, etc.).
9. **Map to Airtable fields** → **Store to Airtable** (earnings table).

## Credentials

- **Mavely (email + password)**  
  The live workflow on n8n Cloud reads credentials from the **mavely_credentials** table in Airtable (base `appQnKyfyRyhHX44h`). Add one row with columns **Email**, **Password**, and optionally **Creator_ID**. See [AIRTABLE-CREDENTIALS-TABLES.md](../docs/AIRTABLE-CREDENTIALS-TABLES.md).
  If you import the JSON from the repo (which still has a “Set Mavely credentials” node), you can either point the workflow to the same Airtable table or set email/password in that node for testing.
- **Working setup:** Base `appQnKyfyRyhHX44h`; credentials table `tbllD6GuMSSEuN0Nq`; earnings table `tblZkX1SuNlo2DNOb`. Use credential **Airtable - ShopMy Creators** on all Airtable nodes (Get credentials, Update credentials, Store to Airtable). See [AIRTABLE-CREDENTIALS-TABLES.md](../docs/AIRTABLE-CREDENTIALS-TABLES.md).
- **Cookie rotation:** Add a **Mavely_Cookies** (Long text) column to the mavely_credentials table. After each login the workflow writes the session cookie to that column so the table holds the latest auth; you can use it later to skip login when the cookie is still valid.

## Airtable table

The workflow maps canonical fields to Airtable columns via **Map to Airtable fields**. Your destination table (e.g. `tblZkX1SuNlo2DNOb`) must have these **exact** column names:

- **Creator ID** (Single line text)
- **Source Platform** (Single line text)
- **Period Start**, **Period End** (Date or Single line text)
- **Normalized Earnings** (Number)
- **Recorded At** (Single line text or Date)
- **Raw Payload** (Long text – JSON string)
- **Currency** (Single line text, optional)
- **Raw Type** (Single line text, optional)

If your table uses different names, edit the **Map to Airtable fields** Code node to output your column names. Same schema idea as [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](../docs/CREATOR-EARNINGS-CANONICAL-SCHEMA.md).

## Earnings source (mavely.live GraphQL)

**Normalized Earnings** come from **mavely.live** GraphQL, not from `analytics.json`. The workflow calls `POST https://mavely.live/` with the query `creatorAnalyticsMetricsTotals` and variables for the date range (e.g. first of current month to today) and optional `brand: { slug_not: "amazon-deep-linking" }`. The response shape is `data.creatorAnalyticsMetricsTotals.metrics` with `commission`, `sales`, `salesCount`, `clicksCount`, `conversion`. See `docs/MAVELY-HAR-FINDINGS.md` and the **analytics creators.mave.ly** HAR for the exact request/response.

## Security

- **Do not** commit Mavely passwords. Use env vars or n8n Credentials.
- If the Mavely password was ever in a HAR or doc, **change it immediately** in the Mavely dashboard and update the workflow/env.

## Import

1. In n8n: **Workflows** → **Import from File** → select `mavely-creators-daily.json`.
2. Set **Set Mavely credentials** (or env) and the **Store to Airtable** base/table/credential.
3. Run once with **Manual Trigger** to verify login and analytics fetch.
4. Activate the workflow to run on the **Daily 6am** schedule.

## Reference

- Auth flow: GET `/api/auth/csrf` → POST `/api/auth/callback/credentials` (form: email, password, callbackUrl, csrfToken, json=true) → use `Set-Cookie` on subsequent requests.
- Data: `/_next/data/{buildId}/analytics.json` (and optionally `shop.json?page=walmart|target`).
