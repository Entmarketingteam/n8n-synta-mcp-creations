# Railway + one test for Nicki Entenmann

You can give your login info **only in Railway** (never paste passwords in chat). This doc gets Browserbase + the runner on Railway and does **one download/login for Nicki Entenmann**.

---

## 1. Browserbase (already have)

You have:

- **Browserbase API Key:** `bb_live_IyXZCHd-_qeeHbJ77cTnzU6r4sI`
- **Browserbase Project ID:** `e20c6484-8076-4db4-bde0-8ae7a5298eb6`

No change needed unless you want a new project.

---

## 2. Deploy the runner on Railway

1. Go to [railway.app](https://railway.app) and log in.
2. **New Project** → **Deploy from GitHub repo** (or **Empty** and then connect the folder).
   - If you push this repo to GitHub: connect that repo and set **Root Directory** to `shopmy-browserbase-runner`.
   - If you deploy without GitHub: install [Railway CLI](https://docs.railway.app/develop/cli), run `railway login`, then in the `shopmy-browserbase-runner` folder run `railway init` and `railway up`.
3. In the Railway service, open **Variables** and add:

   | Variable | Value |
   |----------|--------|
   | `BROWSERBASE_API_KEY` | `bb_live_IyXZCHd-_qeeHbJ77cTnzU6r4sI` |
   | `BROWSERBASE_PROJECT_ID` | `e20c6484-8076-4db4-bde0-8ae7a5298eb6` |
   | `NICKI_SHOPMY_EMAIL` | `marketingteam@nickient.com` (Nicki’s ShopMy login) |
   | `NICKI_SHOPMY_PASSWORD` | *(set in Railway only – never paste in chat or commit)* |

   **Use only Railway (or .env locally)** for Nicki’s credentials — don’t put them in chat or in code. If you already shared a password in chat, change it in ShopMy and set the new one only in Railway.

4. Deploy (or redeploy) so the new variables are applied.
5. In Railway, open **Settings** → **Networking** → **Generate Domain** so the app gets a public URL, e.g. `https://shopmy-browserbase-runner-production-xxxx.up.railway.app`.

---

## 3. One download/login for Nicki

After the app is deployed and the domain is set:

**Option A – Browser or curl**

- **POST**  
  `https://YOUR_RAILWAY_URL/run-nicki`  
  (no body needed; it uses `NICKI_SHOPMY_EMAIL` and `NICKI_SHOPMY_PASSWORD` from env.)

Example (replace with your Railway URL):

```bash
curl -X POST "https://YOUR_RAILWAY_APP.up.railway.app/run-nicki"
```

Response: `{ "creatorId": "nicki-entenmann", "creatorEmail": "Nicki Entenmann", "csvData": "..." }` or `{ "error": "..." }`.

**Option B – n8n**

- In the workflow **ShopMy – Browserbase login → CSV → Webhook**, use **Manual Trigger** and **Set creators (fallback / test)** with one item:
  - `creatorId`: `nicki-entenmann`
  - `creatorEmail`: `Nicki Entenmann`
  - `shopmyEmail`: *(same as NICKI_SHOPMY_EMAIL)*
  - `shopmyPassword`: *(same as NICKI_SHOPMY_PASSWORD)*  
  Then set **Call Browserbase runner** URL to `https://YOUR_RAILWAY_URL/run` and run once.

Or call the runner’s **/run-nicki** from an n8n **HTTP Request** node (GET or POST to `https://YOUR_RAILWAY_URL/run-nicki`) to trigger the one-off Nicki run from n8n.

---

## 4. Send Nicki’s CSV to your processor (optional)

If you want that one run to also feed the ShopMy CSV Processor (Creators) webhook:

- After a successful `/run-nicki` call you get `csvData` in the response.
- Either:
  - Use the existing **ShopMy – Browserbase login → CSV → Webhook** workflow (with Set creators filled for Nicki and runner URL = your Railway app), so it calls the runner and then POSTs to the webhook, or
  - From n8n (or a small script), POST to  
    `https://entagency.app.n8n.cloud/webhook/shopmy-csv-creators`  
    with body:  
    `{ "creatorId": "nicki-entenmann", "creatorEmail": "Nicki Entenmann", "csvData": "<paste csvData from /run-nicki>", "reportType": "shopmy_export" }`.

Make sure **ShopMy CSV Processor (Creators)** is **active** so the webhook is registered.

---

## 5. Airtable later

When you’re ready, we’ll add the Airtable step (e.g. “Get creators to process”) so the same workflow can loop over multiple creators from a table. For now, the one-off Nicki run is handled by Railway + `/run-nicki` (and optionally the n8n webhook as above).

---

**Summary:** Add Nicki’s ShopMy email and password only in Railway (or .env). Deploy the runner, then call **POST /run-nicki** (or use the n8n workflow with her credentials in the Set node) to do one login and download for Nicki Entenmann.
