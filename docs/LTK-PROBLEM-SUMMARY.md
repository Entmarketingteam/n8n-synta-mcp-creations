# LTK Data Automation – Problem Summary (Fresh Start)

**Goal:** Get Nicki’s LTK (LikeToKnow.it / RewardStyle) creator data (user info, commissions, performance) into automation (n8n, Sheets, etc.) without manual copy-paste every time.

---

## The One Main Problem

**We need LTK data in an automated way, but LTK’s OAuth app does not whitelist n8n Cloud’s callback URL.**

- **Ideal:** n8n OAuth2 credential → “Sign in with OAuth2” → Nicki logs in once in browser → n8n stores and refreshes tokens → workflow calls LTK API on a schedule. **This is blocked** because LTK only allows certain redirect URIs; n8n Cloud’s fixed callback (`https://oauth.n8n.cloud/oauth2/callback`) is not on that list.
- **Result:** You get “callback URL mismatch” when trying to connect the OAuth credential in n8n. No way to complete the flow inside n8n until LTK adds that URL.

So the **core blocker** is: **LTK must whitelist n8n’s callback URL**, or we use a path that doesn’t rely on that callback.

---

## Options (No Band-Aids – Just the Paths)

### 1. Fix the callback (best – one-time ask)

- **What:** Ask LTK / RewardStyle (creator support or account contact) to add this redirect URI to their OAuth client:
  - `https://oauth.n8n.cloud/oauth2/callback`
- **Then:** Use the existing **LTK Data Extraction (OAuth2 PKCE)** workflow in n8n. Nicki signs in once in the browser; n8n handles tokens and refresh. No runner, no password in workflow, no extra nodes.
- **Docs:** `docs/LTK-NICKI-OAUTH2-SETUP.md`

---

### 2. API + refresh token only (no browser after first time)

- **What:** A small service (or GitHub repo) that:
  1. **One-time:** Gets a `refresh_token` (see below how).
  2. **Every run:** Calls LTK token endpoint with `grant_type=refresh_token` and `refresh_token`, gets `access_token`, then calls LTK API (`get_user_info`, `commissions_summary`, `performance_summary`) and returns JSON.
- **Ways to get the first refresh_token:**
  - **A)** LTK whitelists a callback URL you control (e.g. a tiny app on Railway/Vercel that receives the OAuth redirect, saves `refresh_token`, displays “Done”). You run the OAuth flow once; the app stores the token; your automation calls your service with that token.
  - **B)** Manual one-time: Nicki logs in on creator.shopltk.com; you capture `refresh_token` from DevTools (e.g. from the token response or from storage). You paste it once into your service or n8n credential. After that, everything is refresh + API, no browser.
- **n8n:** One workflow: Schedule (or Manual) → HTTP Request to your service (or directly to LTK API with a stored token) → process response → Sheets. No branch nodes, no “Config” Set node for password once you’re on refresh-only.

---

### 3. Browser-based runner (what we built – works but got messy)

- **What:** `ltk-browserbase-runner` (Railway + Browserbase): headless browser logs into LTK, captures `access_token` and `refresh_token` from the page, then exposes:
  - `POST /run-ltk` with `{ email, password }` (first time) or `{ refresh_token }` (after that) → returns LTK data + new `refresh_token`.
  - `POST /refresh-ltk` with `{ refresh_token }` → returns new tokens (no browser).
- **Why it got hard:** n8n has no “Static Data” UI to pre-fill runner URL / email / password; we used a Config Set node. Then we hit trigger layout issues and added branch nodes. The **runner itself** is fine; the pain was n8n workflow design and trigger behavior.
- **If you start over:** Keep the runner thin (one endpoint: e.g. `POST /run-ltk` with either `refresh_token` or `email`+`password`). In n8n, use the **simplest** path: one trigger (Schedule or Manual), one HTTP Request to the runner, one “save refresh_token” step (e.g. to workflow static data or a credential), then format and store. No extra “branch” or “Config” nodes unless you really need two distinct entry points.

---

### 4. Manual token (simple but not fully automated)

- **What:** Nicki logs in at creator.shopltk.com; you grab `access_token` (and optionally `refresh_token`) from DevTools and put it in an n8n Header Auth credential. Workflow calls LTK API directly.
- **Pros:** Works immediately; no LTK change; no runner.
- **Cons:** Token expires (often 24h–days); when it does, you get 401 and must capture and update the token again. Optional: add a small “refresh” step in n8n if you have `refresh_token`.
- **Workflow:** **LTK Data Extraction (Manual Token)** – ID `NkJqU9ShKcqWe5Za`.

---

### 5. Worst case: login + CSV download

- **What:** Full browser automation (e.g. Browserbase): log in to LTK, go to earnings/export, trigger CSV download, read file and process in n8n.
- **When:** Only if API access is impossible and you need the data in bulk. More brittle (UI changes, selectors) and slower than API.

---

## What a GitHub Repo Could Do (Fresh Start)

A clean repo could:

1. **Document the one blocker:** “LTK must whitelist `https://oauth.n8n.cloud/oauth2/callback` for the OAuth2 workflow to work.”
2. **Provide a minimal “LTK proxy” service** (e.g. Node/Express or serverless):
   - **Input:** `refresh_token` (stored once: from OAuth callback app or manual capture).
   - **Behavior:** On request, call LTK token endpoint → get `access_token` → call LTK API → return `user_info`, `commissions_summary`, `performance_summary` (and optionally new `refresh_token`).
   - **No browser**, no email/password in the service; just refresh + API.
3. **n8n:** One workflow: Trigger → HTTP Request to proxy (with refresh_token in header or body) → Format → Sheets. No branches, no Config node for credentials if the proxy holds the token (or n8n stores it in one credential).
4. **Optional:** A tiny “OAuth callback receiver” app (e.g. one route that receives redirect from LTK, saves `refresh_token` to env/DB, shows “Success”). Run once per creator; then all automation uses refresh_token.

That gives you a single, clear path: **callback fix** (best) or **refresh_token + minimal proxy** (no browser, minimal nodes).

---

## Summary Table

| Path                         | LTK change? | Browser? | Complexity | Best for                    |
|-----------------------------|------------|----------|------------|-----------------------------|
| 1. Callback whitelist       | Yes (one ask) | No    | Low        | Long-term, clean            |
| 2. Refresh token + API proxy | No         | No*     | Low        | Fresh start, no band-aids   |
| 3. Browserbase runner       | No         | Yes (first run) | Medium | Already built, can simplify |
| 4. Manual token             | No         | No      | Low        | Quick, manual refresh        |
| 5. Login + CSV download     | No         | Yes     | High       | Last resort                  |

\*After first token capture (OAuth callback app or one-time DevTools).

---

## Recommended Next Step

1. **Ask LTK** to whitelist `https://oauth.n8n.cloud/oauth2/callback` for the creator OAuth client. If they do it, use the OAuth2 workflow and you’re done.
2. **If they won’t:** Build (or use) a **minimal refresh-token proxy** (GitHub repo: one service, one endpoint, no browser). Get one `refresh_token` (callback app or manual), then n8n → proxy → LTK API. No extra triggers, no branch nodes, no password in the workflow.

The “extra triggers and useless nodes” came from working around n8n’s lack of Static Data UI and trigger behavior; the underlying issue is and has always been **getting a valid way to call LTK’s API** (OAuth callback or refresh_token). A fresh start focused on that keeps everything simple.
