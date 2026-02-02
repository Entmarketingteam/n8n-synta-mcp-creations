# LTK OAuth2 PKCE – Nicki Entenmann Setup & Test

**Workflow:** LTK Data Extraction (OAuth2 PKCE)  
**ID:** `NX2eP2Gig0EK99QH`  
**Link:** https://entagency.app.n8n.cloud/workflow/NX2eP2Gig0EK99QH

This guide gets **Nicki Entenmann’s** LTK creator account connected via OAuth2 PKCE and the workflow tested.  
**Do not put her password in any file.** She signs in once in the browser when connecting the credential.

---

## 1. Create OAuth2 credential in n8n

1. In n8n: **Settings** (gear) → **Credentials** → **Add Credential**.
2. Search for **OAuth2 API** and create one.
3. Name it e.g. **LTK Nicki Entenmann (PKCE)**.
4. Use **one** of the two configs below.

### Option A – Recommended first (creator-api.shopltk.com)

| Field | Value |
|-------|--------|
| **Grant Type** | `PKCE` |
| **Authorization URL** | `https://creator-auth.shopltk.com/authorize` |
| **Access Token URL** | `https://creator-auth.shopltk.com/oauth/token` |
| **Client ID** | `iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT` |
| **Client Secret** | Use a placeholder, e.g. `pkce` or a single space — n8n may require a value; PKCE doesn’t use it, so it won’t be sent to LTK. |
| **Scope** | `openid profile email offline_access` |
| **Auth URI Query Parameters** | `audience=https://creator-api.shopltk.com` |
| **Authentication** | `Body` |

### Option B – Only if you get 403 from the API (after OAuth works)

**Different from callback URL mismatch:** A **403** is when OAuth has already succeeded (you’re logged in, have tokens) but the **API** rejects your request when the workflow runs (e.g. get_user_info or commissions_summary returns 403). The callback URL issue happens *during* login, before you have any tokens.

If you do get **403 from the LTK API** after Option A is connected and the workflow runs, you can try a second credential using the creator-portal client:

| Field | Value |
|-------|--------|
| **Grant Type** | `PKCE` |
| **Authorization URL** | `https://creator-auth.shopltk.com/authorize` |
| **Access Token URL** | `https://creator-auth.shopltk.com/oauth/token` |
| **Client ID** | `KSenkBytnHBh35hIVUm1m54WAGpLrtOz` |
| **Client Secret** | Use a placeholder, e.g. `pkce` or a single space — n8n may require a value; PKCE doesn’t use it. |
| **Scope** | `openid profile email ltk.publisher` |
| **Auth URI Query Parameters** | `audience=https://creator-api-gateway.shopltk.com/legacy` |
| **Authentication** | `Body` |

---

## 2. Connect as Nicki (one-time in browser)

1. After saving the credential, click **Sign in with OAuth2** (or **Connect**).
2. Browser opens → go to **LTK creator login**.
3. Log in with **Nicki’s LTK account** (email: `nicki.entenmann@gmail.com`; she enters her own password).
4. Approve the app when asked.
5. n8n stores and will refresh tokens; she does **not** need to log in again unless LTK revokes access or the refresh token expires.

**Security:** Her password is never stored in n8n or in this repo; it is only entered in the LTK login page in the browser.

---

## Callback URL mismatch

If LTK shows **“callback url mismatch”** when you click **Sign in with OAuth2**, it’s because their OAuth app only allows certain redirect URIs. n8n Cloud uses a fixed callback that LTK has not whitelisted.

**n8n Cloud callback URL (exact):**  
`https://oauth.n8n.cloud/oauth2/callback`

**What to do:** Ask **LTK / RewardStyle** (creator support or your account contact) to add this redirect URI to the allowed list for the OAuth client you’re using (e.g. Option A: client ID `iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT`):

`https://oauth.n8n.cloud/oauth2/callback`

You can’t change n8n Cloud’s callback URL. Until LTK whitelists it, the built-in OAuth2 credential in n8n won’t complete.

**Use the painless flow instead:** See **docs/LTK-PAINLESS-GO-LIVE.md**. The **LTK Data Extraction (Painless Runner)** workflow (ID: `8sWnYXvPF7cpOWpl`) and **ltk-browserbase-runner** do one-time login, auto token capture from browser storage, and refresh without browser. No DevTools, no manual token copy. Deploy the runner (Railway + Browserbase), set workflow Static Data (runnerUrl, ltkEmail, ltkPassword), run once with Manual Trigger, then activate.

---

## 3. Attach credential to the workflow

1. Open the workflow: https://entagency.app.n8n.cloud/workflow/NX2eP2Gig0EK99QH  
2. For each of these nodes, set **Credential for OAuth2 API** to **LTK Nicki Entenmann (PKCE)** (or the Option B credential if you use that):
   - **Get User Info**
   - **Get Commissions**
   - **Get Performance**
3. Save the workflow.

---

## 4. (Optional) Add x-id-token if you get 403

If the API returns **403** even after a successful OAuth connect, LTK may require an `x-id-token` header:

1. Open each HTTP Request node: **Get User Info**, **Get Commissions**, **Get Performance**.
2. In **Options** (or **Headers**), add a header:
   - **Name:** `x-id-token`
   - **Value:** `{{ $credentials.oAuth2Api.oauthTokenData.id_token }}`  
   (Adjust credential name if yours is different, e.g. the expression may reference the credential by the name you gave it.)
3. Save and run again.

---

## 5. Configure Google Sheets (optional for first test)

- Open the **Store to Sheets** node.
- Choose the Google account and spreadsheet.
- Choose or create a sheet for LTK data.  
You can leave this for later and **Test Workflow** first to confirm API responses; the Combine node will still output the payload.

---

## 6. Test the workflow

1. In the workflow editor, click **Test Workflow** (or run once from the Executions list).
2. Check:
   - **Get User Info** → LTK user object (e.g. creator id, email).
   - **Get Commissions** → commissions summary.
   - **Get Performance** → performance summary (last 30 days, timezone UTC).
3. If all three return 200 and data, the OAuth2 PKCE setup is working for Nicki’s credentials.
4. If you configured Sheets, confirm a new row appears.

---

## 7. Activate (optional)

- Turn **Active** on for the workflow so it runs on the **Schedule Trigger** (every 6 hours).

---

## Endpoints used (from your HAR files)

These match what the workflow calls and what was seen in creator/earnings/analytics HARs:

| Purpose | URL |
|--------|-----|
| User | `GET https://api-gateway.rewardstyle.com/api/co-api/v1/get_user_info` |
| Commissions | `GET https://api-gateway.rewardstyle.com/api/creator-analytics/v1/commissions_summary?currency=USD` |
| Performance | `GET https://api-gateway.rewardstyle.com/api/creator-analytics/v1/performance_summary?start_date=...&end_date=...&timezone=UTC` |
| Items sold (HAR) | `GET .../creator-analytics/v1/items_sold/?limit=100&start=...&end=...&currency=USD` |
| Account (HAR) | `GET .../creator-account-service/v1/users/{user_id}`, `.../v1/accounts/{account_id}` |

The workflow already uses the first three; items_sold and account endpoints can be added as extra nodes later if needed.

---

## Login URL reference

- Creator home: https://creator.shopltk.com/  
- Auth (redirects here from home): https://creator-auth.shopltk.com/login?state=...&client=...&protocol=oauth2&audience=...&scope=...

n8n’s OAuth2 flow will open the correct LTK login page when you click **Sign in with OAuth2**; no need to paste the long URL manually.

---

## Summary

- **OAuth2 PKCE** is configured in n8n; Nicki logs in **once** in the browser.  
- **No password** is stored in n8n or in this repo.  
- **Workflow** is updated (timezone=UTC on performance, retry on HTTP nodes) and validated via Synta MCP.  
- **Test run** will succeed after the credential is connected and (if needed) `x-id-token` and Sheets are set.
