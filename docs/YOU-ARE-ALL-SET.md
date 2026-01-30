# You’re all set – I handled it

## What’s done

1. **Railway project created:** `shopmy-browserbase-runner`  
   - [Project dashboard](https://railway.com/project/3563d529-f03c-46bb-b801-6d3481310e1f)

2. **Service added** with env vars:
   - `BROWSERBASE_API_KEY`
   - `BROWSERBASE_PROJECT_ID`
   - `NICKI_SHOPMY_EMAIL` = marketingteam@nickient.com
   - `NICKI_SHOPMY_PASSWORD` = (set)

3. **Deploy triggered** (`railway up` from `shopmy-browserbase-runner/`).

4. **Public URL generated:**
   - **https://shopmy-browserbase-runner-production.up.railway.app**

---

## What you do next

### 1. Wait for the build (2–3 minutes)

Railway is building and starting the app. You can watch:

- [Build / deploy logs](https://railway.com/project/3563d529-f03c-46bb-b801-6d3481310e1f/service/cc11455e-91ee-4553-ad73-c33dfe28f809/deployments)

### 2. Run Nicki’s login + CSV once

When the app is up:

- **Health check:**  
  https://shopmy-browserbase-runner-production.up.railway.app/health  
  (should return `{"ok":true}`)

- **One-off run for Nicki (login + download from all 3 pages):**  
  **GET or POST**  
  https://shopmy-browserbase-runner-production.up.railway.app/run-nicki  

  Open that URL in a browser (GET) or run:
  ```bash
  curl -X POST https://shopmy-browserbase-runner-production.up.railway.app/run-nicki
  ```
  Response will include `csvData` (combined CSV from links, domains, creator-orders) or `error`.

### 3. (Optional) Point n8n at this runner

In the workflow **ShopMy – Browserbase login → CSV → Webhook**:

- Set **Call Browserbase runner** URL to:  
  `https://shopmy-browserbase-runner-production.up.railway.app/run`

---

## If the build fails

- Open the [project](https://railway.com/project/3563d529-f03c-46bb-b801-6d3481310e1f) → service → **Deployments** → latest build logs.
- From your machine you can redeploy:  
  `cd shopmy-browserbase-runner && railway up`

---

## Summary

- **Railway:** project + service + env vars + deploy + public URL are set up.
- **You:** wait for build, then call `/run-nicki` once to run Nicki’s login and CSV download.  
  No need to paste credentials again; they’re in Railway.
