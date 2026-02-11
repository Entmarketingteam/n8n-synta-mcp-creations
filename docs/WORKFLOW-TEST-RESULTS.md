# Workflow test results (Feb 2026)

Tests were run via Synta/n8n MCP: validation, manual execution, and webhook checks.

**Last webhook check:** `./scripts/verify-creator-pipelines.sh` — Amazon ingest and ShopMy CSV both returned **HTTP 404**. Workflows were deactivated then re-published via MCP (both show `active: true`); webhooks still 404, which on n8n Cloud often means production routes need an **in-editor** re-register: open each workflow → toggle **off** → Save → toggle **on** → Save, then re-run the script.

---

## Summary

| Workflow | Validation | Manual/trigger test | Blocker / next step |
|----------|------------|----------------------|----------------------|
| **Mavely Creators – Daily** | ✅ Valid | ❌ Error at Map node | Add **Email** + **Password** (or mavelyEmail, mavelyPassword) to **mavely_credentials** table in Airtable (table `tbllD6GuMSSEuN0Nq` or your mavely table). |
| **ShopMy – Browserbase login** | ✅ Valid (fixed Loop “done” branch) | ❌ Error at Call runner | Replace **YOUR_RUNNER_URL** in “Call Browserbase runner” with your deployed runner URL (e.g. Railway). |
| **ShopMy CSV Processor (Creators)** | — | ⚠️ Webhook 404 | Workflow shows active in list; production webhook still 404. In n8n: open workflow → ensure it’s **active** (toggle on) and **saved**. If using “production” URL, confirm webhook is registered (re-save/activate). |
| **Amazon Associates Report Ingest** | — | ⚠️ Webhook 404 | Activate workflow so `POST .../webhook/amazon-report-ingest` is registered. |

---

## What was fixed

- **ShopMy – Browserbase login:** SplitInBatches “Loop over creators” was missing the **done** output connection. Added an “All creators done” NoOp and connected Loop output 0 (done) to it and output 1 (loop) to “Call Browserbase runner.” Workflow now validates.

---

## How to get to green

1. **Mavely**
   - In Airtable base `appQnKyfyRyhHX44h`, open the table used for Mavely (e.g. **tbllD6GuMSSEuN0Nq** or your **mavely_credentials** table).
   - Add at least one row with **Email** and **Password** (Mavely login). Optionally **Creator_ID** (e.g. `nicki-entenmann`).
   - Run the workflow again with **Manual Trigger**.

2. **ShopMy Browserbase**
   - In the workflow “ShopMy – Browserbase login → CSV → Webhook,” open the node **Call Browserbase runner**.
   - Replace `YOUR_RUNNER_URL` with your real runner URL (e.g. `https://shopmy-browserbase-runner-production.up.railway.app`).
   - Save and run with **Manual Trigger** (or use Schedule after Airtable **shopmy_credentials** is filled).

3. **Webhooks (ShopMy CSV + Amazon Ingest)**
   - In n8n, open **ShopMy CSV Processor (Creators)** and **Amazon Associates Report Ingest**.
   - Turn each **on** (toggle top-right) and save.
   - Run: `./scripts/verify-creator-pipelines.sh` from repo root. Both should return HTTP 200.

---

## Workflow IDs (reference)

| Name | ID |
|------|-----|
| Mavely Creators – Daily auth & analytics | `3gYfgPzMu6wZ1OEZ` |
| ShopMy – Browserbase login → CSV → Webhook | `giKDiwQYUCnJKO45` |
| ShopMy CSV Processor (Creators) | `QJZ8d0VYinQdzWpC` |
| Amazon Associates Report Ingest | `WOdJrynlMl1zGxog` |

See [VERIFY-PIPELINES-WORKING.md](VERIFY-PIPELINES-WORKING.md) for full verification steps.
