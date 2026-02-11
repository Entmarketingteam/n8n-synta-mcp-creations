# Verify creator pipelines are working

Use this to confirm Mavely, ShopMy, and Amazon auth + data pipelines run end-to-end.

---

## 0. Prereq: Secrets (Doppler preferred)

Workflows need API keys, passwords, and runner URLs. **Preferred:** Use the [Doppler universal node](N8N-DOPPLER-SETUP.md#5-universal-scenario-copy-paste-one-node-everywhere) in each workflow (or the [sync script](N8N-VARIABLES-CHECKLIST.md) to push Doppler → n8n Variables). Then Mavely/ShopMy/Amazon credentials come from Doppler; you don’t store them in n8n. See [N8N-DOPPLER-SETUP.md](N8N-DOPPLER-SETUP.md) and [SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md](SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md).

---

## 1. Webhook checks (no UI)

From the repo root:

```bash
chmod +x scripts/verify-creator-pipelines.sh
./scripts/verify-creator-pipelines.sh
```

- **Amazon Report Ingest:** POSTs a minimal CSV to `.../webhook/amazon-report-ingest`. Expect HTTP 200 and a JSON response.
- **ShopMy CSV Processor:** POSTs a minimal CSV to `.../webhook/shopmy-csv-creators`. Expect HTTP 200 and a JSON response.

If you see **404 "The requested webhook ... is not registered"**:

1. **In n8n:** Open the workflow (e.g. [Amazon Ingest](https://entagency.app.n8n.cloud/workflow/WOdJrynlMl1zGxog), [ShopMy CSV](https://entagency.app.n8n.cloud/workflow/QJZ8d0VYinQdzWpC)).
2. **Force re-register:** Turn the workflow **off** (toggle top-right) → **Save** → turn it **on** → **Save**. On n8n Cloud, production webhooks sometimes only register after this in-editor toggle + save.
3. Wait a few seconds, then run the script again.

Override base URL if needed:

```bash
N8N_WEBHOOK_BASE=https://your-n8n.app.n8n.cloud/webhook ./scripts/verify-creator-pipelines.sh
```

---

## 2. Per-workflow verification

| Workflow | How to verify | Prereqs |
|----------|----------------|---------|
| **Mavely Creators – Daily auth & analytics** | In n8n: open workflow → **Execute Workflow** (Manual Trigger). Should: GET CSRF → POST Login → GET Session → GET analytics → Parse → Store to Airtable. | Set `MAVELY_EMAIL` and `MAVELY_PASSWORD` in n8n (env or “Set Mavely credentials” node). Airtable base/table and credential set. |
| **ShopMy – Browserbase login → CSV → Webhook** | In n8n: **Execute Workflow** (Manual Trigger). Uses “Set creators (fallback / test)” so no Airtable needed for a quick test; will call runner. | Replace `YOUR_RUNNER_URL` in the two HTTP nodes with your runner URL (e.g. Railway). Fallback Set node has test email/password or use Airtable row with ShopMyCookies. |
| **ShopMy CSV Processor (Creators)** | Run `./scripts/verify-creator-pipelines.sh` (ShopMy section) or POST to webhook with real CSV. In n8n: **Executions** → last run should show success. | Webhook path `shopmy-csv-creators`; “Append to Creator Earnings Sheet” has Document ID and sheet “Earnings” if you want rows in Sheets. |
| **Amazon Creators API – Get Token** | In n8n: **Execute Workflow** (Manual). Should: Read from Airtable → POST to Cognito → Output Token. | Airtable base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0` with a row (Creator, Credential_ID, Credential_Secret, Version). |
| **Amazon Associates Report Ingest** | Run `./scripts/verify-creator-pipelines.sh` (Amazon section) or POST real CSV to webhook. Check **Executions** in n8n. | Webhook path `amazon-report-ingest`; “Append to Creator Earnings Sheet” has Document ID and “Earnings” if used. |

---

## 3. Quick checklist

- [ ] **Webhooks:** `./scripts/verify-creator-pipelines.sh` returns OK for both Amazon and ShopMy.
- [ ] **Mavely:** Manual run succeeds; no “SET_MAVELY_EMAIL” in logs; Airtable gets a new row.
- [ ] **ShopMy Browserbase:** Runner URL is set; manual run reaches runner (and either gets CSV or fails after login/cookies step).
- [ ] **ShopMy CSV Processor:** Active; webhook test returns 200; optional: Earnings sheet has new row.
- [ ] **Amazon Get Token:** Manual run returns access_token (and optional Airtable has credentials).
- [ ] **Amazon Report Ingest:** Active; webhook test returns 200; optional: Earnings sheet has new row.

---

## 4. Workflow IDs (n8n cloud)

| Name | ID |
|------|-----|
| Mavely Creators – Daily auth & analytics | `3gYfgPzMu6wZ1OEZ` |
| ShopMy – Browserbase login → CSV → Webhook | `giKDiwQYUCnJKO45` |
| ShopMy CSV Processor (Creators) | `QJZ8d0VYinQdzWpC` |
| Amazon Creators API – Get Token | `Ww2Bimxa541qhvK0` |
| Amazon Associates Report Ingest | `WOdJrynlMl1zGxog` |

Use these with Synta MCP (e.g. `n8n_trigger_execution`, `n8n_validate_workflow`) or in the n8n URL: `https://entagency.app.n8n.cloud/workflow/<ID>`.

---

## 5. If something fails

- **Webhook 404:** Workflow not active or wrong path. Activate workflow; confirm path in Webhook node matches URL (e.g. `amazon-report-ingest`, `shopmy-csv-creators`).
- **Mavely “No csrfToken” / 401:** Login or CSRF failed. Check email/password and that creators.mave.ly is up.
- **ShopMy runner timeout / connection error:** Runner URL wrong or runner down. Fix `YOUR_RUNNER_URL`; ensure Railway (or host) is running and reachable.
- **Amazon Get Token 400/401:** Airtable row missing or wrong Credential_ID / Credential_Secret; or env vars not set.
- **“Append to Creator Earnings Sheet” error:** Google Sheet node: check Document ID, sheet name “Earnings”, and that the credential has access to the sheet.

See [SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md](SETUP-AMAZON-SHOPMY-AUTH-AND-RUNS.md) for secrets and one-time auth.

---

## 6. Next stage (after Doppler + activation)

1. **Secrets:** Use [Doppler universal node](N8N-DOPPLER-SETUP.md#5-universal-scenario-copy-paste-one-node-everywhere) (or sync script) so workflows get credentials from Doppler.
2. **Webhooks:** Activate **Amazon Associates Report Ingest** and **ShopMy CSV Processor (Creators)** in n8n; run `./scripts/verify-creator-pipelines.sh` until both return 200.
3. **Per-workflow:** Run Mavely (Manual) after Airtable has Email/Password; set runner URL for ShopMy Browserbase; run Amazon Get Token (Manual) after Airtable has credentials.
4. **Checklist:** Tick all items in §3 above; then pipelines are verified.
