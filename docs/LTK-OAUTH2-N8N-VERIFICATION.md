# LTK OAuth2 PKCE – n8n Verification Report

**Verified with Synta MCP:** 2026-01-30  
**Workflow:** LTK Data Extraction (OAuth2 PKCE)  
**Workflow ID:** `NX2eP2Gig0EK99QH`  
**Link:** https://entagency.app.n8n.cloud/workflow/NX2eP2Gig0EK99QH

---

## Verification summary

| Check | Status |
|-------|--------|
| Workflow exists in n8n | ✅ |
| All 6 nodes present | ✅ |
| Connections valid (5 edges) | ✅ |
| Expressions validated | ✅ (6) |
| Validation errors | 0 |
| Validation warnings | 8 (non-blocking; see below) |

---

## Workflow structure (verified)

```
Schedule Trigger (every 6h)
    → Get User Info (HTTP + OAuth2)
    → Get Commissions (HTTP + OAuth2, ?currency=USD)
    → Get Performance (HTTP + OAuth2, start_date/end_date)
    → Combine All Data (Set)
    → Store to Sheets (Google Sheets)
```

- **Schedule Trigger:** interval 6 hours ✅  
- **Get User Info:** `GET https://api-gateway.rewardstyle.com/api/co-api/v1/get_user_info`, auth: `oAuth2Api` ✅  
- **Get Commissions:** `GET .../creator-analytics/v1/commissions_summary?currency=USD`, auth: `oAuth2Api` ✅  
- **Get Performance:** `GET .../creator-analytics/v1/performance_summary` with `start_date` / `end_date` (last 30 days), auth: `oAuth2Api` ✅  
- **Combine All Data:** `extracted_at`, `user_info`, `commissions`, `performance` from previous nodes ✅  
- **Store to Sheets:** append, document/sheet to be chosen in n8n ✅  

---

## OAuth2 credential – n8n schema alignment

n8n’s **OAuth2 API** credential type supports **PKCE**. Use these values so the credential matches both LTK and n8n’s schema:

| n8n field | Value |
|-----------|--------|
| **Grant Type** | `pkce` |
| **Authorization URL** | `https://creator-auth.shopltk.com/authorize` |
| **Access Token URL** | `https://creator-auth.shopltk.com/oauth/token` |
| **Client ID** | `iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT` |
| **Client Secret** | Use a placeholder (e.g. `pkce` or a space) if n8n requires a value — PKCE does not use it. |
| **Scope** | `openid profile email offline_access` |
| **Auth URI Query Parameters** | `audience=https://creator-api.shopltk.com` |
| **Authentication** | `Body` |

- **Server URL:** If n8n asks for it, you can leave blank or use `https://creator-auth.shopltk.com`; auth and token URLs are full URLs.  
- After saving, use **“Sign in with OAuth2”** → log in to LTK once → n8n stores and refreshes tokens.

---

## What you still need to do

1. **Create the OAuth2 credential** in n8n (Settings → Credentials → Add → OAuth2 API) with the table above.  
2. **Assign that credential** to the three HTTP Request nodes: “Get User Info”, “Get Commissions”, “Get Performance”.  
3. **Configure “Store to Sheets”:** pick Google account, spreadsheet, and sheet.  
4. **Test run:** Execute the workflow once and confirm data in the sheet.  
5. **Activate** the workflow if you want the 6‑hour schedule to run.

---

## Validation warnings (optional improvements)

These do not block execution; fix if you want stricter behavior:

| Node | Warning | Suggestion |
|------|---------|------------|
| Get User Info / Get Commissions / Get Performance | No error handling | Add `onError: 'continueRegularOutput'` or `retryOnFail: true` in node options. |
| Store to Sheets | No error handling | Add `onError` in node options. |
| Store to Sheets | TypeVersion 4.5 (latest 4.7) | Update node version in n8n if you see a prompt. |
| Store to Sheets | valueInputMode | Set if you need specific number/date formatting. |
| Workflow | No error handling | Optionally add an Error Trigger or error branches. |

---

## If you get 403 from LTK API

LTK may expect an **`x-id-token`** header. If you see 403 after OAuth is connected:

1. On each of the three HTTP Request nodes, add a header:  
   - **Name:** `x-id-token`  
   - **Value:** `{{ $credentials.oAuth2Api.oauthTokenData.id_token }}`  
2. Ensure the OAuth2 credential includes `openid` in scope (already in the table above) so an `id_token` is issued.

---

## Quick reference – API endpoints (workflow + HAR)

**Workflow (verified in HAR):**

- User: `GET https://api-gateway.rewardstyle.com/api/co-api/v1/get_user_info`
- Commissions: `GET https://api-gateway.rewardstyle.com/api/creator-analytics/v1/commissions_summary?currency=USD`
- Performance: `GET https://api-gateway.rewardstyle.com/api/creator-analytics/v1/performance_summary?start_date=...&end_date=...&timezone=UTC`

**Also seen in HAR (earnings/analytics):**

- Items sold: `GET .../creator-analytics/v1/items_sold/?limit=100&start=...&end=...&currency=USD`
- Account: `GET .../creator-account-service/v1/users/{user_id}`, `.../v1/accounts/{account_id}`
- Legacy analytics: `GET .../analytics/hero_chart?start_date=...&end_date=...`, `.../analytics/top_performers/links?...`

**Auth (from HAR):** Token URL `https://creator-auth.shopltk.com/oauth/token` confirmed.

---

## Nicki Entenmann setup

For step-by-step OAuth2 and test instructions for Nicki’s credentials (no password in repo), see **docs/LTK-NICKI-OAUTH2-SETUP.md**.

---

**Bottom line:** The workflow is correctly set up in n8n. Complete the OAuth2 credential, attach it to the three HTTP nodes, configure Google Sheets, then test and activate.
