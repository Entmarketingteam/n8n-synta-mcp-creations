# Mavely HAR findings (creators.mave.ly.har)

Findings from `creators.mave.ly.har` (logout → login capture).

## What’s in the HAR

### 1. **analytics.json** (`/_next/data/{buildId}/analytics.json`)

- **Request:** GET, referer `https://creators.mave.ly/home`, no Cookie in the captured request (prefetch).
- **Response (304 / cached):** Same minimal payload we see in n8n:
  ```json
  {"pageProps":{"currentDateProp":"2026-02-10"},"__N_SSG":true}
  ```
- So the HAR does **not** show a richer analytics response. The Next.js data route only ever returns the date in this capture (and in our workflow). Earnings are **not** in this endpoint.

### 2. **Auth (NextAuth)**

- `GET /api/auth/csrf`
- `POST /api/auth/callback/credentials` (login)
- `GET /api/auth/session`
- Matches what the Mavely workflow already does.

### 3. **mavely.live GraphQL** (`POST https://mavely.live/`)

- **Headers:** `client-name: @mavely/creator-app`, `client-version: 1.4.2`, `content-type: application/json`, `origin: https://creators.mave.ly`.
- **Examples seen:**
  - `query isAmazonAssociatesProgramEnabled { isAmazonAssociatesProgramEnabled }`
  - `query me { me { id, firstName, lastName, email, ... } }`
- So **real app data** (user, feature flags, and likely analytics/earnings) comes from **mavely.live** GraphQL, not from `analytics.json`.

## What’s missing for earnings

- The HAR only has **logout** and **auth/login** pages. There is **no** request in the HAR that:
  - Fetches creator commission/earnings, or
  - Contains a GraphQL query for analytics/summary/earnings.
- So the “original HAR” does **not** contain the call that returns earnings. That call likely happens only when you’re **logged in and on the Analytics page**.

## Implemented: earnings from mavely.live (analytics HAR)

An **analytics HAR** was captured (e.g. `analytics creators.mave.ly.har`) with the Analytics page loaded after login. It contains the earnings call:

- **POST https://mavely.live/** (GraphQL).
- Query: `creatorAnalyticsMetricsTotals` with variables `cstDateStr_gte`, `cstDateStr_lte`, and optionally `brand: { slug_not: "amazon-deep-linking" }`.
- Response: `data.creatorAnalyticsMetricsTotals.metrics` with `commission`, `sales`, `salesCount`, `clicksCount`, `conversion`.

The **Mavely Creators – Daily** workflow now uses this:

1. After **Forward cookies for data fetch**, **Prepare Mavely GraphQL** builds the request body (date range = first of current month to today).
2. **POST Mavely analytics (GraphQL)** sends the same headers as the HAR (Content-Type, Origin, Referer, client-name, client-version, Cookie from session).
3. **Parse GraphQL metrics** reads `commission` and maps to Normalized Earnings. **Raw Payload** is always the full GraphQL response (so when the API returns an error you see it in Airtable: e.g. `{"errors":[{"message":"No Token!","extensions":{"code":"UNAUTHENTICATED"}}],"data":{"creatorAnalyticsMetricsTotals":null}}`).

**If you see "No Token!" in Raw Payload:** mavely.live is rejecting the request (UNAUTHENTICATED). The workflow sends the same cookies as the browser (from NextAuth login). If the session cookie (e.g. `__Secure-next-auth.session-token`) is not in the login response or not sent to mavely.live, the API returns no data. Check that the login response includes all Set-Cookie headers and that GET Session returns a non-empty session; if the session is empty, the token/cookie needed for mavely.live may be missing.

## Summary

| Source                    | In HAR? | Has earnings? |
|---------------------------|--------|----------------|
| analytics.json            | Yes    | No (only currentDateProp) |
| mavely.live GraphQL       | Yes    | **Yes** in **analytics HAR**: `creatorAnalyticsMetricsTotals` returns commission, sales, clicks |
| Earnings/analytics call   | Yes (analytics creators.mave.ly.har) | Implemented in workflow via POST mavely.live + Parse GraphQL metrics |
