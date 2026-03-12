# Creator Contract Analyzer — Brand Deal Red Flag Scanner

An n8n workflow that automatically analyzes influencer/creator brand partnership contracts, flags predatory terms, and generates negotiation talking points.

Based on the [lease-agreement-analyzer](https://github.com/khanhduyvt0101/workflows/tree/main/n8n-workflows) pattern, completely rewritten for the creator economy.

## What It Does

1. **Watches** a Google Drive folder for new contract PDFs
2. **Pass 1 — Term Extraction:** Pulls out every deal detail (rate, deliverables, usage rights, exclusivity, payment terms, morality clauses, etc.)
3. **Pass 2 — Creator Advice:** AI acts as a talent manager reviewing the deal — gives a verdict, rates fairness, and writes copy-paste negotiation scripts
4. **Logs** everything to a Google Sheet for side-by-side deal comparison
5. **Alerts** via Slack when a high-risk contract is detected

## Creator-Specific Red Flags It Catches

| Category | What It Flags |
|----------|--------------|
| **Rights grab** | Perpetual usage rights, full ownership transfer, unlimited whitelisting (no time/spend cap), likeness rights beyond campaign |
| **Money traps** | Net-60+ payment terms, no kill fee, performance clawbacks on metrics you don't control, hidden costs not reimbursed |
| **Scope creep** | Unlimited revisions, vague deliverable descriptions, platform additions without rate bumps |
| **Lock-in** | Exclusivity >30 days post-campaign, category-wide non-compete, brand approval on all future content, subjective morality clause |
| **Missing protections** | No FTC language, no creator approval process, no creator termination rights, no late payment penalty |

### Risk Levels
- **High:** 2+ high-severity flags — do not sign without negotiating
- **Medium:** 1 high or 3+ total flags — review carefully
- **Low:** Minor or no issues

## Setup (5 minutes)

### Prerequisites
- n8n instance (cloud or self-hosted)
- Google Drive, Google Sheets, Slack credentials in n8n
- [PDF Vector](https://pdfvector.com/api-keys) API key

### Steps

1. **Import the workflow** — Upload `creator-contract-analyzer.json` to your n8n instance

2. **Create a Google Drive folder** called "Brand Contracts" (or whatever you want)

3. **Create a Google Sheet** with these columns in Row 1:
   ```
   Brand Name | Campaign Name | Creator Rate | Rate Type | Payment Terms | Kill Fee | Deliverables | Platforms | Content Ownership | Usage Rights Duration | Whitelisting Terms | Exclusivity Window | Exclusivity Scope | Revision Limit | Approval Process | FTC Compliance | Morality Clause | Non-Compete | Red Flags | Red Flag Count | Risk Level | Negotiation Points | Contract File | Analyzed Date
   ```

4. **Update placeholder IDs** in the workflow:
   - `YOUR_FOLDER_ID` — Google Drive folder ID
   - `YOUR_DRIVE_CREDENTIAL_ID` — n8n Google Drive credential
   - `YOUR_PDFVECTOR_CREDENTIAL_ID` — n8n PDF Vector credential
   - `YOUR_SPREADSHEET_ID` — Google Sheet ID
   - `YOUR_SHEETS_CREDENTIAL_ID` — n8n Google Sheets credential
   - `YOUR_SLACK_CHANNEL_ID` — Slack channel for alerts
   - `YOUR_SLACK_CREDENTIAL_ID` — n8n Slack credential

5. **Activate the workflow** — It polls Drive every minute for new PDFs

## How to Use

1. Drop a brand contract PDF into your "Brand Contracts" Google Drive folder
2. Wait ~1 minute for the trigger to pick it up
3. Check Slack for the analysis notification
4. Open your Google Sheet to see the full breakdown and compare across deals

## What Makes This Shareable/Sellable

If you want to distribute this as a product:

- **The workflow JSON is the product.** People import it into their own n8n instance. You don't host anything.
- **Sell on:** Gumroad, Payhip, Lemon Squeezy, or bundle into a Notion/Skool community
- **Pricing reference:** Similar n8n workflow templates sell for $19-49. A niche creator-focused version with this level of prompt engineering is worth more.
- **What to include in a paid package:**
  - The workflow JSON
  - A Loom walkthrough video (setup + demo)
  - The pre-built Google Sheet template
  - A "what to look for" cheat sheet (the red flags list above, formatted nicely)

## Customization Ideas

- Swap Slack for WhatsApp/Telegram notifications
- Add an Airtable node instead of Google Sheets for richer filtering
- Add a webhook trigger so creators can upload via a simple web form
- Connect to a Notion database for creators who track deals there
- Add email notifications with the full advice as a PDF attachment
- Swap PDF Vector for a different PDF extraction service if preferred
