# LTK Painless Flow – Go Live

**Workflow:** LTK Data Extraction (Painless Runner)  
**ID:** `8sWnYXvPF7cpOWpl`  
**Link:** https://entagency.app.n8n.cloud/workflow/8sWnYXvPF7cpOWpl

One-time login → runner captures tokens from browser storage → every run after uses refresh. No DevTools.

---

## 1. Deploy the LTK runner (Railway + Browserbase)

**Option A – Railway CLI (from repo root)**

```bash
cd ltk-browserbase-runner
railway link    # select or create a project
railway up --detach
```

Then in Railway dashboard: set **Variables** `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`, and copy the service URL.

**Option B – Railway dashboard**

1. Go to [railway.app](https://railway.app), sign in.
2. **New Project** → **Deploy from GitHub repo** (or upload `ltk-browserbase-runner`).
3. Set **Root directory** to `ltk-browserbase-runner` (or the folder that has `package.json` and `index.js`).

**Then (for either option):**

- **Env in Railway:** Project → **Variables** → add `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`. (Optional: `PORT` if needed.)
- **Deploy:** Push to the connected branch or trigger deploy. Copy the **public URL** (e.g. `https://ltk-browserbase-runner-production.up.railway.app`), no trailing slash.
- **Browserbase:** Same project as ShopMy is fine; ensure enough sessions for LTK runs.

---

## 2. Set config in the **Config** node (in n8n)

1. Open the workflow: https://entagency.app.n8n.cloud/workflow/8sWnYXvPF7cpOWpl  
2. Click the **Config** node (after **Schedule branch** / **Manual branch**, before **Prepare request**).  
3. Set these three values (exact names):

   | Name         | Value |
   |--------------|--------|
   | `runnerUrl`  | Your runner URL, e.g. `https://ltk-browserbase-runner-production.up.railway.app` (no trailing slash) |
   | `ltkEmail`   | Nicki’s LTK login email, e.g. `nicki.entenmann@gmail.com` |
   | `ltkPassword`| Nicki’s LTK password |

   Save the workflow.  
   *(n8n has no UI for “Static Data”; the workflow stores only the refresh token in static data at runtime. Runner URL, email, and password live in this Config node.)*

**Trigger layout (best practice):** The workflow uses one first node per trigger (Schedule Trigger → **Schedule branch** → Config; Manual Trigger → **Manual branch** → Config). Both branches then feed **Config**. This avoids “multiple triggers to one node” issues and matches n8n’s recommended pattern.

---

## 3. First run (login + token capture)

1. In the workflow editor, use **Manual Trigger** (or **Test workflow**).  
2. Click **Execute Workflow**.  
3. The runner will:
   - Open LTK in a headless browser
   - Log in with `ltkEmail` / `ltkPassword`
   - Go to earnings and read `access_token` and `refresh_token` from browser storage
   - Call the LTK API and return user_info, commissions, performance_summary
   - Return `refresh_token` in the response
4. The workflow **saves `refresh_token`** into workflow Static Data.  
5. Check the last node output: you should see `user_info`, `commissions`, `performance_summary`.  
6. If you use **Store to Sheets**, pick document and sheet and run again if needed.

---

## 4. Every run after (no login)

- **Schedule:** The workflow runs every 6 hours using the saved `refresh_token` (no browser, no login).  
- **Manual:** You can still run with **Manual Trigger** anytime.  
- The workflow uses `ltkRefreshToken` from Static Data and calls the runner with `POST /run-ltk` and `{ "refresh_token": "..." }`. The runner refreshes the token and returns the same data.

---

## 5. Activate

- Turn the workflow **Active** (toggle in the editor) so the 6-hour schedule runs.

---

## Optional: Store to Sheets

- Open the **Store to Sheets** node.
- Choose your Google account and spreadsheet.
- Choose or create a sheet for LTK data.
- Save. Each run will append a row (extracted_at, user_info, commissions, performance_summary).

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| “In Config node set runnerUrl” | Open the **Config** node and set `runnerUrl`. |
| “In Config node set ltkEmail and ltkPassword” | Open the **Config** node and set `ltkEmail` and `ltkPassword`. |
| Runner returns 502 / timeout | Check Railway logs and Browserbase; first run can take ~60–90 s. |
| “Could not capture tokens” | Check Browserbase session replay; LTK login or selectors may have changed. |
| 401 / invalid token later | Run once manually with Manual Trigger so the workflow saves a fresh `refresh_token`. |

---

## Summary

1. Deploy **ltk-browserbase-runner** to Railway (env: Browserbase key + project ID).  
2. In n8n, open the **Config** node and set **runnerUrl**, **ltkEmail**, **ltkPassword**.  
3. Run once with **Manual Trigger** → runner logs in and saves **refresh_token** (in workflow static data at runtime).  
4. **Activate** workflow for 6-hour runs. No DevTools, no manual token copy.
