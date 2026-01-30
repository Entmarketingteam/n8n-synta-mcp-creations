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

- Summary data for payouts.

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

**API-first (no browser):** See `docs/SHOPMY-API-FIRST.md` and workflow `workflows/shopmy-api-creators.json`. Flow: POST Auth/session → capture cookies → POST Users/find_by_email → GET Payments, Payouts, Pins with Cookie + x-csrf-token → combine and send to CSV processor webhook.

**Browser runner** uses:

1. **Login:** `POST /Auth/session` from page context (with HAR headers) so cookies are set, then navigates to `/links` and `/payouts`.
2. **Links CSV:** Clicks DOWNLOAD, intercepts `GET /Pins?...downloadAllToCsv=1`, reads `downloaded_url`, fetches CSV.
3. **Earnings CSV:** Clicks commission Download buttons, intercepts `POST /Payouts/download_commissions`, reads `url`, fetches CSV; payment report via blob download.
