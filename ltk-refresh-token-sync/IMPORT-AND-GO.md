# LTK Token Refresh — Import and Go

Two n8n workflows, ready to import. Total setup time: ~5 minutes.

## Prerequisites

You need these two n8n credentials already configured:

1. **"Airtable PAT"** — Header Auth credential
   - Header Name: `Authorization`
   - Header Value: `Bearer pat_YOUR_AIRTABLE_PERSONAL_ACCESS_TOKEN`

2. **"Gmail"** — Gmail OAuth2 credential (already set up if you have any Gmail nodes)

## Step 1: Import the Token Refresh Workflow

1. In n8n, click **Add workflow** (or use the menu)
2. Click the **...** menu (top right) → **Import from File**
3. Select `ltk-token-refresh-workflow.json`
4. **Wire up credentials** (n8n strips credential IDs on import):
   - Click **"Get All Creators"** node → set credential to your **Airtable PAT**
   - Click **"Save Tokens to Airtable"** node → set credential to your **Airtable PAT**
   - Click **"Save Error to Airtable"** node → set credential to your **Airtable PAT**
   - Click **"Mark Alert Sent"** node → set credential to your **Airtable PAT**
   - Click **"Send Alert Email"** node → set credential to your **Gmail**
5. **Update the alert email address** in the "Send Alert Email" node if needed (defaults to nicki.entenmann@gmail.com)
6. Click **Save**, then **Test workflow** (click the play button on "Every 4 Hours" to trigger manually)
7. Check Airtable — Nicki's `Access_Token`, `Token_Expires_At`, and `Last_Refreshed` should update
8. Once verified, toggle the workflow **Active**

## Step 2: Import the Health Check Workflow

1. Click **Add workflow** → **Import from File**
2. Select `ltk-health-check-workflow.json`
3. **Wire up credentials**:
   - Click **"Get All Creators"** node → set credential to your **Airtable PAT**
   - Click **"Send Health Digest"** node → set credential to your **Gmail**
4. **Update the email address** in "Send Health Digest" if needed
5. Click **Save**, then **Test workflow** manually
6. You should receive a health digest email
7. Toggle the workflow **Active**

## That's It

**What runs automatically:**
- Token refresh: every 4 hours, all active creators
- Health digest: daily at 9 AM (only sends email if issues exist)
- Gmail alert: immediately when any creator fails 3x in a row

**What you do manually (rare):**
- Add a new creator: capture refresh token from browser, add Airtable row (see TOKEN-CAPTURE-GUIDE.md)
- Re-capture expired token: when you get an alert email, follow the steps in the email

## Troubleshooting

**Import fails or nodes show errors:**
- Make sure you're on n8n v1.20+ (the JSON uses typeVersion 4.2 HTTP nodes)
- If node versions don't match, create the HTTP Request nodes manually and copy the settings

**422 from Airtable update:**
- This is the known bug — the workflow already uses HTTP Request nodes (not native Airtable nodes) to avoid this

**"invalid_grant" from LTK:**
- Refresh token has expired or been revoked
- Re-capture from browser: `creator.shopltk.com` → DevTools → Application → Local Storage → `@@auth0spajs@@` → `refresh_token`
- Update the Airtable record, set `Refresh_Token_Captured_At` to now

**Credential not found after import:**
- n8n doesn't export credential bindings — you must manually select your Airtable PAT and Gmail credentials on each node after import

## Files

| File | Purpose |
|---|---|
| `ltk-token-refresh-workflow.json` | Main workflow — import into n8n |
| `ltk-health-check-workflow.json` | Health digest — import into n8n |
| `IMPORT-AND-GO.md` | This file |
| `docs/TOKEN-CAPTURE-GUIDE.md` | How to onboard new creators |
| `docs/N8N-WORKFLOW-SPEC.md` | Technical reference for the workflow |
| `docs/TOKEN-HEALTH-MONITORING.md` | Health check thresholds and logic |
