# Are All Logins Stored and Ready for Automation Testing?

**Short answer:** Yes — every platform **can** store and use logins for automations. Whether they **are** ready to test depends on filling in the storage below.

---

## Per-platform: where logins live and how to test

| Platform | Where login is stored | What to fill once | How to test |
|----------|----------------------|-------------------|-------------|
| **LTK** | Airtable (LTK_Credentials table) – refresh token | One-time: get refresh token (OAuth2 or runner), put in Airtable row for creator | Run **LTK Token Rotation** → then **LTK Reports to Google Sheets**. Token is read from Airtable. |
| **ShopMy** | Airtable creators table: **ShopMyCookies** (and optionally **ShopMyEmail** / **ShopMyPassword**) | 1) Deploy runner (Railway), set runner URL in workflow.<br>2) Run **POST /auth/refresh** (or workflow with email/password) → store `cookies` in **ShopMyCookies**. | Run **ShopMy – Browserbase login**. If cookies exist → no login popup. If not → uses email/password and writes cookies back to Airtable. |
| **Amazon Creators API** | Airtable `tblNovDWyu1iHoJf0`: **Credential_ID**, **Credential_Secret** (or n8n env) | From Associates Central → Creators API → Create Credential; put ID + Secret in Airtable row. | Run **Amazon Creators API – Get Token** (Manual). Should return Bearer token. |
| **Amazon Associates (reports)** | No stored “login” for webhook path | Creator exports CSV from Associates Central and POSTs to webhook. For **full** automation: **AMAZON_ASSOC_EMAIL** + **AMAZON_ASSOC_PASSWORD** in `.env` or Airtable (script `set-amazon-assoc-credentials-airtable.js`). | Webhook: POST CSV to `.../webhook/amazon-report-ingest`. Scraper: run scraper with .env, then POST CSV to same webhook. |
| **Mavely** | In workflow node **Set Mavely credentials** (or n8n Variables **MAVELY_EMAIL** / **MAVELY_PASSWORD**) | Open **Mavely Creators – Daily** workflow → set email + password in the credentials node (or in n8n project Variables). | Run workflow with Manual Trigger. Should: CSRF → login → analytics → Airtable. |

---

## One-time checklist: “all logins ready to test”

- [ ] **LTK:** Airtable LTK_Credentials has creator row with refresh token; **LTK Token Rotation** has run at least once (writes access token for **LTK Reports to Google Sheets**).
- [ ] **ShopMy:** Runner deployed; workflow has real **Runner URL** (no `YOUR_RUNNER_URL`). Airtable creators table has **ShopMyCookies** and optionally **ShopMyEmail** / **ShopMyPassword** (for refresh when cookies expire).
- [ ] **Amazon Creators API:** Airtable table `tblNovDWyu1iHoJf0` has row with **Credential_ID** and **Credential_Secret** (or n8n env set).
- [ ] **Amazon Associates:** For webhook-only: nothing to store; for scraper: `.env` or Airtable has email/password; run `scripts/set-amazon-assoc-credentials-airtable.js` if using Airtable.
- [ ] **Mavely:** **Set Mavely credentials** node (or n8n Variables) has **MAVELY_EMAIL** and **MAVELY_PASSWORD**.

---

## References

- [SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md](SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md) – One-time auth and where secrets live.
- [CREDENTIALS-STORAGE.md](CREDENTIALS-STORAGE.md) – Env vs n8n Credentials vs Airtable.
- [VERIFY-PIPELINES-WORKING.md](VERIFY-PIPELINES-WORKING.md) – How to verify each workflow and webhook.
