# LTK Data Extraction – Alternatives While OAuth Callback Is Blocked

Until LTK whitelists n8n’s callback URL (`https://oauth.n8n.cloud/oauth2/callback`), the built-in OAuth2 credential won’t work. Here are options Synta can implement so you still get authorization and data extraction.

---

## Do other platforms have this problem?

**Yes.** Redirect URI whitelisting is standard OAuth security (Google, GitHub, Auth0, etc.). Each app registers its callback URL; the auth server only redirects to those URLs. The “problem” here is that **n8n Cloud has one fixed callback** and **LTK hasn’t added it** to their app’s allowed list. So it’s a common constraint, not unique to LTK.

---

## How is it done automatically (no DevTools, quick and painless)?

**When the platform whitelists your URL:** One click “Sign in with OAuth2” in n8n → user logs in in the browser → done. Tokens and refresh are handled by n8n. No manual steps.

**When they won’t whitelist (like LTK right now):** The usual approach is **browser automation + token capture**:

1. **One-time:** User (or a secure env) provides **login email + password**. A small service (e.g. your Browserbase runner) opens the **real** login page (creator.shopltk.com), submits the form (or you type once in a real browser session the runner controls). The script **intercepts** the auth response or the next API requests and **captures** `access_token` and `refresh_token` (from the token endpoint response, or from cookies/localStorage, or from the `Authorization` header on the first API call). No DevTools — the script does this in code.
2. **Store** the `refresh_token` somewhere safe (runner memory, DB, or n8n workflow static data).
3. **Every run after that:** Call the provider’s **token endpoint** with `grant_type=refresh_token` and `refresh_token=...` to get a new `access_token`. Use that for API calls. No browser, no login, no copy-paste. Runs until the refresh token expires (often 30–90 days); then repeat step 1 once.

So: **login info is typed once** (or passed once from env), **tokens are extracted automatically** by the runner, **refresh is automatic** via the token endpoint. Quick and painless after the first setup.

**Option 3 (Painless runner)** below implements exactly this for LTK.

---

## Option 1: Manual token (Header Auth) — **implemented**

**How it works:** Nicki (or you) logs into [creator.shopltk.com](https://creator.shopltk.com) in the browser. You capture the **access token** from the browser (DevTools → Network or Application). You paste it into an n8n **Header Auth** credential. The workflow uses that credential to call the LTK API (get_user_info, commissions_summary, performance_summary). No OAuth redirect needed.

**Pros:**  
- Works immediately; no LTK whitelist.  
- Same API endpoints and data as the OAuth workflow.  
- Synta has created the n8n workflow for you.

**Cons:**  
- Tokens expire (often 24h–a few days). When it expires, you get 401 and must capture a new token and update the credential (or use the refresh step below).  
- Optional: if the API returns 403, add an **x-id-token** header (see “How to get the token” below).

**n8n workflow:** **LTK Data Extraction (Manual Token)**  
- **ID:** `NkJqU9ShKcqWe5Za`  
- **Link:** https://entagency.app.n8n.cloud/workflow/NkJqU9ShKcqWe5Za  
- Schedule Trigger → Get User Info → Get Commissions → Get Performance → Combine All Data → Store to Sheets.  
- All three HTTP nodes use **Header Auth** with **Name** = `Authorization`, **Value** = `Bearer <paste_access_token_here>`.

**How to get the token (once or after expiry):**

1. Open Chrome (or Edge) and go to [https://creator.shopltk.com](https://creator.shopltk.com).  
2. Log in as Nicki (nicki.entenmann@gmail.com).  
3. After login, open **DevTools** (F12) → **Network** tab.  
4. Refresh the page or click **Earnings** / **Analytics** so the app calls the API.  
5. In Network, find a request to `api-gateway.rewardstyle.com` (e.g. `get_user_info` or `commissions_summary`).  
6. Click that request → **Headers** → find **Request Headers** → copy the value of **Authorization** (e.g. `Bearer eyJ...`).  
7. In n8n: **Settings → Credentials →** your **LTK Manual Token** credential → set **Value** to that full string (including `Bearer `). Save.  
8. (If you get 403) In the same request, look for **x-id-token** in Request Headers. If present, add that as a second header in each HTTP node (see setup doc).

**Refresh (optional):** If you have a **refresh_token** (e.g. from the same session or from the token endpoint response), you can add a small flow (Code node or HTTP Request) that calls `https://creator-auth.shopltk.com/oauth/token` with `grant_type=refresh_token` and `refresh_token=...` to get a new access_token and update the credential or env. Synta can add this if you want.

---

## Option 2: Browserbase runner (browser login + data extraction)

**How it works:** A small service (like your existing ShopMy Browserbase runner) runs a headless browser, opens [creator.shopltk.com](https://creator.shopltk.com), logs in with Nicki’s email/password (or reuses cookies), then either:  
- **A)** Intercepts API responses (get_user_info, commissions_summary, performance_summary) from the page’s network and returns that JSON, or  
- **B)** Scrapes the earnings/analytics dashboard and returns structured data.

n8n calls this runner (e.g. `POST https://your-runner.up.railway.app/run-ltk` with `{ email, password }` or `{ cookies }`). The runner returns `{ user_info, commissions, performance_summary, ... }`. Your n8n workflow then processes that and stores to Sheets. No OAuth callback at all.

**Pros:**  
- No OAuth redirect; login happens on creator.shopltk.com (allowed).  
- Reuses the same Browserbase + Railway pattern you use for ShopMy.  
- Can return the same data as the API (if we intercept network) or dashboard data (if we scrape).

**Cons:**  
- Requires running and deploying the runner (Railway + Browserbase).  
- Email/password (or cookies) must be provided to the runner; keep them in env or a secure credential, never in repo.  
- Slightly more moving parts than manual token.

**What Synta can do:**  
- Design the n8n workflow: Schedule (or Webhook) → HTTP Request to runner → process JSON → Store to Sheets.  
- Provide or adapt runner code: login to creator.shopltk.com, navigate to a page that triggers API calls, capture responses (e.g. via Playwright `page.on('response')` or `page.evaluate` + network log), return JSON.  
- Document env (BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, LTK_EMAIL, LTK_PASSWORD or cookie injection) and deployment steps.

---

## Option 3: Painless runner (one-time login, auto token capture + refresh) — **implemented**

**How it works:**  
- **One-time:** You (or Nicki) call the runner with **email + password** (or the runner reads them from env). The runner opens [creator.shopltk.com](https://creator.shopltk.com) in a headless browser, submits login, then **automatically reads** `access_token` and `refresh_token` from the same place the LTK app stores them (Auth0 SPA cache in browser storage: `@@auth0spajs@@::...`). **No DevTools** — the script does it. The runner returns the data (user_info, commissions, performance_summary) **and** `refresh_token`. You store `refresh_token` in n8n (e.g. workflow static data or a credential).  
- **Every run after that:** n8n calls the runner with **only** `refresh_token`. The runner calls LTK’s token endpoint to get a new `access_token`, then calls the API and returns the same data. No browser, no login, no copy-paste.

**Endpoints (see `ltk-browserbase-runner/`):**

| Endpoint | Body | Purpose |
|----------|------|---------|
| `POST /auth/ltk` | `{ email, password }` | One-time: browser login, capture and return `{ access_token, refresh_token }`. |
| `POST /refresh-ltk` | `{ refresh_token }` | Get new `access_token` from LTK (no browser). |
| `POST /run-ltk` | `{ refresh_token }` or `{ email, password }` | Get LTK data (user_info, commissions, performance_summary). If `refresh_token`: refresh then API. If email/password: login, capture tokens, then API; returns data + `refresh_token` to store. |

**n8n flow:**  
1. First time: HTTP Request to runner `POST /run-ltk` with `{ "email": "...", "password": "..." }` (from n8n credential or env). Response includes `refresh_token`. Store `refresh_token` in workflow static data (or a credential).  
2. Next runs: HTTP Request to runner `POST /run-ltk` with `{ "refresh_token": "{{ $getWorkflowStaticData().ltkRefreshToken }}" }`. Runner refreshes and returns data. No login, no DevTools.

**Pros:**  
- Login typed once (or passed once); tokens extracted automatically; refresh automatic.  
- No OAuth callback; no manual token copy; no DevTools.  
- Same pattern used elsewhere: browser automation + token capture + refresh endpoint.

**Cons:**  
- Runner must be deployed (e.g. Railway + Browserbase).  
- Email/password or refresh_token must be stored securely (n8n credential or env).

---

## Summary

| Approach            | OAuth callback needed? | Who does it | Token refresh              |
|--------------------|-------------------------|-------------|----------------------------|
| **OAuth2 PKCE**    | Yes (LTK must whitelist)| LTK         | Automatic in n8n           |
| **Manual token**   | No                      | You/Nicki   | Re-capture in DevTools when 401 |
| **Browserbase**    | No                      | Runner      | New login each run or cookies |
| **Painless runner**| No                      | Runner      | Automatic via refresh_token |

**Right now:** Use **Option 3 (Painless runner)** — workflow and runner are ready. See **docs/LTK-PAINLESS-GO-LIVE.md** for deploy steps, static data, and first run. Option 1 (Manual Token) remains available if you prefer not to run the runner. When LTK adds the callback URL, you can switch to the OAuth2 workflow for full built-in refresh in n8n.
