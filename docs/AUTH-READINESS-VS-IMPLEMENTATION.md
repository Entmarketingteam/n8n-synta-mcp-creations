# Auth Readiness Assessment vs Implemented Pipeline

This doc compares **AUTH_READINESS_ASSESSMENT.md** (external) with what was implemented from **BRIEF-AMAZON-SHOPMY-CREATOR-DATA-PIPELINE.md** and repo docs. It clarifies distinct differences and how to recreate auth and data pipelines using either the assessment’s approach or the current implementation.

---

## Summary: Where They Diverge

| Area | Implemented (brief + repo) | Assessment | Aligned? |
|------|----------------------------|------------|----------|
| **ShopMy auth** | Browser runner: POST /auth/refresh → store cookies → POST /run with cookies | API-first: POST Auth/session → Cookie + **x-csrf-token** → API calls | **Two valid options**; assessment assumes API-first |
| **ShopMy data** | Runner: browser clicks DOWNLOAD → intercept CSV URLs → fetch CSV | Direct API: find_by_email → Payments, Payouts, Pins (GET/POST) | Same data; different path (browser vs HTTP) |
| **Amazon auth** | Creators API OAuth2 token + webhook-only report ingest (no browser) | Creators API **or** Browser automation (2FA, CAPTCHA) | Assessment adds **browser fallback** we didn’t build |
| **Amazon data** | Manual CSV → webhook; optional scraper | Same + “Browserbase if no API” | Same ingest idea; assessment adds automation path |
| **Mavely** | Not in scope of brief | Full auth + data from HAR (NextAuth, buildId) | **Not implemented**; assessment is the spec to build from |
| **Credentials** | Airtable or n8n / env | “n8n Credentials” | Prefer n8n Credentials; Airtable still valid |

There are no **dramatic** conflicts. The assessment is a second, API-centric view; the implementation chose the **browser runner** for ShopMy and **webhook-only** for Amazon. You can run either ShopMy path (or both) and add the assessment’s Amazon/Mavely options if you want.

---

## 1. ShopMy — Two Ways to Recreate Auth + Data

### A. What was implemented (browser runner)

- **Auth:** One-time or periodic **POST /auth/refresh** (email + password) on the ShopMy Browserbase runner → returns **cookies** → store in Airtable `ShopMyCookies` → every run **POST /run** with `cookies` (no login popup).
- **Data:** Runner opens browser, logs in (or injects cookies), goes to Links and Payouts, clicks DOWNLOAD, intercepts `Pins?downloadAllToCsv=1` and `Payouts/download_commissions`, fetches CSV from returned URLs → POST to n8n webhook `shopmy-csv-creators` → normalize to canonical → append to Earnings sheet.
- **Workflows:** `shopmy-browserbase-login.json` (cookie refresh + run), `shopmy-csv-processor-creators.json` (canonical + Earnings). Runner: `shopmy-browserbase-runner/` (Railway).

### B. What the assessment describes (API-first)

- **Auth:**  
  `POST https://apiv3.shopmy.us/api/Auth/session` with `{ username, password }` → response sets **Set-Cookie** (session + **shopmy_csrf_token**) → **extract x-csrf-token from shopmy_csrf_token cookie** → use **Cookie + x-csrf-token** on all later requests.
- **Data:**  
  POST **Users/find_by_email** → then GET **Payments/by_user/{id}**, **Payouts/payout_summary/{id}**, **Pins?User_id={id}** (and CSV endpoints) with Cookie + x-csrf-token.

### Distinct differences

- **Auth mechanism:** Runner = browser session → cookie array stored and replayed in **POST /run**. Assessment = HTTP-only: **Auth/session** → Cookie header + **x-csrf-token** (from `shopmy_csrf_token` cookie). The assessment does **not** mention the runner or `/auth/refresh`; it assumes pure API + CSRF.
- **Data retrieval:** Runner = browser clicks + response interception. Assessment = direct HTTP to the same APIs (find_by_email, Payments, Payouts, Pins, download_commissions). Same data, different path.
- **CSRF:** API-first **requires** sending **x-csrf-token** (from `shopmy_csrf_token` cookie) on every request after login. The repo already documents this in `SHOPMY-API-FIRST.md` and `SHOPMY-API-ENDPOINTS.md`; the assessment matches that.

### How to recreate using the assessment (API-first)

1. Use (or update) **`workflows/shopmy-api-creators.json`** and **`docs/SHOPMY-API-FIRST.md`**.
2. Ensure after **Auth/session** you:
   - Read **Set-Cookie** from the response.
   - Parse the **shopmy_csrf_token** cookie value and send it as **x-csrf-token** on all subsequent requests.
3. Call **find_by_email** → then Payments, Payout summary, Pins (and if needed the CSV endpoints) with **Cookie** + **x-csrf-token**.
4. Send combined/CSV data to the same **shopmy-csv-creators** webhook so the rest of the pipeline (canonical → Earnings) is unchanged.

So: **no dramatic difference** for “recreating” — you choose **browser runner** (what we enhanced) or **API-first** (what the assessment and `shopmy-api-creators.json` use). Both can feed the same canonical pipeline.

---

## 2. Amazon — Webhook-only vs assessment’s browser option

### What was implemented

- **Creators API:** OAuth2 client credentials → Bearer token (workflow `amazon-creators-api-get-token.json`). Used for **catalog**; no report API in our flow.
- **Associates reports:** **No** browser. Creator downloads CSV from Associates Central → **POST to webhook** `amazon-report-ingest` → parse → canonical → append to Earnings. Optional: run `amazon-associates-scraper/` and POST the CSV to the same webhook.

### What the assessment adds

- **Option A:** Use Creators API if available (high volume); same idea as our token workflow.
- **Option B:** If there’s no report API, use **browser automation** (e.g. Browserbase): sign-in (including **2FA**), then navigate to reports and download CSV. Assessment notes: 2FA, bot detection, CAPTCHA, short-lived cookies — so HAR is hard and a browser is the fallback.

### Distinct differences

- We did **not** implement the **browser automation** path for Amazon. The assessment does not contradict our webhook ingest; it adds an **optional** path when you can’t use Creators API reports and don’t want manual CSV upload.
- To “recreate” exactly as the assessment: keep our **webhook + canonical** flow; if you want full automation, add a **separate** Browserbase (or similar) workflow that does login + 2FA + report download and then POSTs the CSV to the same `amazon-report-ingest` webhook. Our pipeline after the webhook stays the same.

---

## 3. Mavely — Not in implemented scope; assessment is the spec

- The brief was **Amazon + ShopMy** only; **Mavely** was not implemented.
- The assessment treats Mavely as **ready to build**: NextAuth (GET csrf → POST callback/credentials → session cookies), then **/_next/data/{buildId}/analytics.json** and **shop.json** (buildId can change per deployment).
- **Critical (assessment):** Password was in HAR — **change Mavely password immediately** and don’t store passwords in HAR or shared docs.
- To recreate Mavely auth + data: follow the assessment (and `workflows/README-mavely-creators.md` if present); implement CSRF → login → session → data endpoints; handle **buildId** (e.g. from `__NEXT_DATA__` or HTML).

---

## 4. Credentials and security

- **Assessment:** Store credentials in **n8n Credentials**; enable encryption; don’t put secrets in workflows.
- **Implemented setup (SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md):** Airtable or n8n / env for Creators API and ShopMy.
- **Reconciliation:** Prefer **n8n Credentials** for passwords and API secrets; Airtable (or env) is still valid for per-creator config (e.g. ShopMy cookies, Creators API credentials) if you already use it. No dramatic difference — tighten to “n8n Credentials where possible” to match the assessment.

---

## 5. What to do in practice

| Goal | Action |
|------|--------|
| **Match assessment for ShopMy** | Use **API-first**: `shopmy-api-creators.json` + ensure **x-csrf-token** is extracted from **shopmy_csrf_token** and sent on every API request. Same downstream (shopmy-csv-creators → canonical → Earnings). |
| **Keep current ShopMy flow** | Keep **shopmy-browserbase-login.json** + runner; cookie refresh and POST /run with cookies already implemented. |
| **Add Amazon browser path** | Add a new workflow: Browserbase (or similar) for Associates login + 2FA + report download → POST CSV to existing **amazon-report-ingest** webhook. Leave current webhook + canonical logic as-is. |
| **Add Mavely** | Build from assessment + Mavely HAR: CSRF → credentials login → session → **/_next/data/{buildId}/analytics.json** (and shop.json); implement buildId handling. |
| **Security** | Change Mavely password (if ever used in HAR); store secrets in n8n Credentials; avoid credentials in workflow JSON or HAR in shared locations. |

---

## 6. References

- **Assessment:** `AUTH_READINESS_ASSESSMENT.md` (in Downloads or wherever you keep it).
- **Implemented:** [BRIEF-AMAZON-SHOPMY-CREATOR-DATA-PIPELINE.md](BRIEF-AMAZON-SHOPMY-CREATOR-DATA-PIPELINE.md), [SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md](SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md).
- **ShopMy API-first:** [SHOPMY-API-FIRST.md](SHOPMY-API-FIRST.md), [SHOPMY-API-ENDPOINTS.md](SHOPMY-API-ENDPOINTS.md), `workflows/shopmy-api-creators.json`.
- **ShopMy browser:** [SHOPMY-CREATOR-AUTH.md](SHOPMY-CREATOR-AUTH.md), `workflows/shopmy-browserbase-login.json`, `shopmy-browserbase-runner/`.
