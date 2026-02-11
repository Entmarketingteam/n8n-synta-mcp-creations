# ShopMy API-First (no browser)

These workflows use **only HTTP API calls** to ShopMy—no Browserbase or browser automation.

## Two API-first patterns

| Pattern | Workflow | Auth | user_id | Best for |
|--------|----------|------|--------|----------|
| **Cookie + find_by_email** | [ShopMy API (Creators)](../workflows/shopmy-api-creators.json) | Login → Cookie + x-csrf-token | From POST Users/find_by_email | On-demand or webhook; Payments + Payout summary + Pins → CSV processor |
| **Session headers + pre-known user_id** | [ShopMy Payout Summary (Creators)](../workflows/shopmy-payout-summary-creators.json) | Login → x-csrf-token + x-session-id (from response/fallback) | Pre-configured per creator | Scheduled payout sync; payout_summary + Payments + CustomRates → GSheet/Airtable |

See [SHOPMY-PAYOUT-SUMMARY-PIPELINE.md](SHOPMY-PAYOUT-SUMMARY-PIPELINE.md) for the payout-summary pipeline (recommended for scheduled creator data).

## Endpoints used (both patterns)

| Step | Method | URL | Purpose |
|------|--------|-----|---------|
| 1 | POST | `https://apiv3.shopmy.us/api/Auth/session` | Login; get session (cookies and/or headers) |
| 2 | POST | `https://apiv3.shopmy.us/api/Users/find_by_email` | Get `User_id` from email (Cookie pattern only) |
| 3 | GET | `https://apiv3.shopmy.us/api/Payments/by_user/{user_id}` | Payments data |
| 4 | GET | `https://apiv3.shopmy.us/api/Payouts/payout_summary/{user_id}` | Payout summary |
| 5 | GET | `https://apiv3.shopmy.us/api/Pins?User_id={user_id}&limit=500` | Pins/links data (Cookie pattern) |
| 6 | GET | `https://apiv3.shopmy.us/api/CustomRates/all_rates/{user_id}` | Brand rates (Payout Summary pattern) |

Headers (from HAR):

- **Auth/session:** `Content-Type: application/json`, `Origin: https://shopmy.us`, `Referer: https://shopmy.us/`, `x-apicache-bypass: true`, `x-session-id: <timestamp>` (optional).
- **After login (Cookie pattern):** Use `Cookie` from response `Set-Cookie`, and `x-csrf-token` (from `shopmy_csrf_token` cookie) on all subsequent requests.
- **After login (Payout Summary pattern):** Use `x-csrf-token` (from response headers) and `x-session-id` (client-generated, e.g. timestamp) on all data requests; Cookie not required for payout_summary/Payments/CustomRates.

## Workflow: ShopMy API (Creators)

- **File:** `workflows/shopmy-api-creators.json`
- **Import:** n8n → Workflows → Import from File, or use `N8N_API_KEY` + `node scripts/import-workflows-to-n8n.js shopmy-api-creators.json`

### Flow

1. **Trigger:** Manual or Webhook `POST /webhook/shopmy-api-creators`
2. **Set creator & credentials** (manual) or **Normalize webhook body** (webhook): `creatorId`, `creatorEmail`, `shopmyEmail`, `shopmyPassword`
3. **ShopMy Login:** POST Auth/session, full response (to read `Set-Cookie`)
4. **Extract cookies:** Build `Cookie` header and `x-csrf-token` from response headers
5. **Find user by email:** POST Users/find_by_email with Cookie + x-csrf-token
6. **Extract User_id:** Parse response for `User_id`
7. **GET Payments, GET Payout summary, GET Pins** (parallel) with Cookie + x-csrf-token
8. **Merge API results** → **Build CSV & send to processor:** Turn API JSON into CSV with `Source` column, then POST to `https://entagency.app.n8n.cloud/webhook/shopmy-csv-creators`
9. **Respond to webhook** (when triggered by webhook)

### Credentials

- **Manual run:** Edit the **Set creator & credentials** node and set `shopmyEmail` and `shopmyPassword` (or use n8n Credentials and reference them).
- **Webhook run:** POST body:
  ```json
  {
    "creatorId": "nicki-entenmann",
    "creatorEmail": "Nicki Entenmann",
    "shopmyEmail": "marketingteam@nickient.com",
    "shopmyPassword": "YOUR_PASSWORD"
  }
  ```
  Or store credentials in n8n and pass only `creatorId` / `creatorEmail` from the webhook.

### Session storage (optional)

For reliability you can:

1. Call Auth/session once (or on 401), capture `Set-Cookie`.
2. Store the cookie string in n8n Credentials or a secret store.
3. In a separate “data only” workflow, skip Login and use the stored Cookie + x-csrf-token for find_by_email and data APIs. Refresh the session when the API returns 401.

## Synta MCP

When **Synta MCP** is connected (see `~/.cursor/mcp.json`), you can use it to create or edit n8n workflows against your instance (`X-N8n-Url`, `X-N8n-Key`). This workflow was built locally; you can open it in n8n and have Synta suggest changes or add nodes.

## Mavely (creators.mave.ly) – auth reference

For a future Mavely integration, the auth flow is NextAuth:

| Step | Method | URL | Purpose |
|------|--------|-----|---------|
| 1 | GET | `https://creators.mave.ly/api/auth/csrf` | Get CSRF token |
| 2 | POST | `https://creators.mave.ly/api/auth/callback/credentials` | Login with credentials + CSRF |
| 3 | GET | `https://creators.mave.ly/api/auth/session` | Get JWT/session (use in `Authorization` or cookie for data APIs) |

Build a similar API-first n8n workflow: get CSRF → credentials login → session → call Mavely data APIs with the session token.
