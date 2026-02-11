# ShopMy API Endpoints (from HAR)

Reference extracted from `with login api shopmy.us.har` for the Browserbase runner and n8n.

Base: `https://apiv3.shopmy.us/api`

---

## Auth

### POST `/Auth/session` (login)

- **Body:** `{ "username": "<email>", "password": "<password>" }`
- **Headers (from HAR):** `Content-Type: application/json`, `x-apicache-bypass: true`, `x-session-id: <timestamp>`
- **Origin/Referer:** `https://shopmy.us` (required for CORS)
- **Response:** 200, small JSON (e.g. success). Session is established via cookies in the browser; subsequent API calls may send `x-csrf-token`.

---

## Users

### POST `/Users/find_by_email`

- **Body:** `{ "email": "<email>" }`
- **Headers:** Sent after login; HAR shows `x-csrf-token` and `x-session-id`.
- **Response:** 200, large JSON (user/shop data).

---

## Links / Pins (CSV export)

### GET `/Pins?...&downloadAllToCsv=1&...`

- Triggered by the “DOWNLOAD” button on Links, By Website, Creator Orders.
- **Response:** JSON with `downloaded_url` (S3 CSV URL). Runner fetches that URL for the CSV.

---

## Payouts / Earnings

### GET `/Payouts/payout_summary/<User_id>`

- Summary data for payouts. Response includes `normal_commissions`, `opportunity_commissions`, `shopper_referral_bonuses`, `payouts`, `months`, `todayAmount`, `referralTotals`. Can be called with session headers (`x-csrf-token`, `x-session-id`) only (no Cookie). Used by [ShopMy Payout Summary Pipeline](SHOPMY-PAYOUT-SUMMARY-PIPELINE.md).

### POST `/Payouts/download_commissions`

- Triggered by “Download” on Normal Commissions / Opportunity Commissions.
- **Response:** JSON with `url` (CSV). Runner fetches that URL for the CSV.

### Payment report

- In-app link: `a[download="shopmy_payment_report.csv"]` (blob download). Runner uses browser download event.

---

## Other (from HAR)

- `GET /Shop/recent_find_counts/<id>`
- `GET /Users/username/<username>?detailed=1`
- `GET /Payouts/payout_summary/<User_id>`
- `GET /Payments/by_user/<User_id>`
- `GET /UserTiers/<id>`
- `GET /Shop/Collections?...&Curator_username=...`
- `GET /Pins?User_id=...&groupByMode=mentions|domains|creator-orders&...`
- `GET /CustomRates/all_rates/<User_id>`
- `GET /Chats/paginated?...`
- `GET /Newsletters/latest?User_id=...`

---

**API-first (no browser):** See [SHOPMY-API-FIRST.md](SHOPMY-API-FIRST.md) and [SHOPMY-PAYOUT-SUMMARY-PIPELINE.md](SHOPMY-PAYOUT-SUMMARY-PIPELINE.md). Two options: (1) `workflows/shopmy-api-creators.json`: POST Auth/session → Cookie + x-csrf-token → POST Users/find_by_email → GET Payments, Payout summary, Pins → CSV processor webhook. (2) `workflows/shopmy-payout-summary-creators.json`: POST Auth/session → x-csrf-token + x-session-id → GET payout_summary, Payments, CustomRates (pre-known user_id) → GSheet/Airtable.

**Browser runner** uses:

1. **Login:** `POST /Auth/session` from page context (with HAR headers) so cookies are set, then navigates to `/links` and `/payouts`.
2. **Links CSV:** Clicks DOWNLOAD, intercepts `GET /Pins?...downloadAllToCsv=1`, reads `downloaded_url`, fetches CSV.
3. **Earnings CSV:** Clicks commission Download buttons, intercepts `POST /Payouts/download_commissions`, reads `url`, fetches CSV; payment report via blob download.
