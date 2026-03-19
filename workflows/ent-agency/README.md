# ENT Agency Workflows

Core operational workflows for ENT Agency's influencer marketing business.

## Workflows

### 1. Contract Review — Automation (`contract-review-automation.json`)
**AI Contract Review & Risk Analysis**

Automatically reviews creator contracts uploaded to Google Drive. Extracts PDF text, analyzes terms with AI, flags risks, and logs results to Google Sheets with Slack notifications.

- **Trigger:** Google Drive file upload
- **Credentials needed:** Google Drive OAuth2, Google Sheets OAuth2, PDF Vector API, Slack OAuth2
- **Nodes:** 10

### 2. Contract Review — ENT Agency (`contract-review-ent-agency.json`)
**ENT Agency — Creator Contract Review**

ENT Agency-specific version of the contract review workflow with customized risk analysis prompts for influencer/creator agreements.

- **Trigger:** Google Drive file upload
- **Credentials needed:** Google Drive OAuth2, Google Sheets OAuth2, PDF Vector API, Slack OAuth2
- **Nodes:** 10

### 3. Gmail to Notion (`gmail-emails-to-notion.json`)
**Gmail Emails to Notion Database**

Syncs Gmail emails into a Notion database on a schedule. Parses email metadata (sender, subject, date) and creates corresponding Notion entries.

- **Trigger:** Schedule (cron)
- **Credentials needed:** Gmail OAuth2, Notion API
- **Nodes:** 15

### 4. SEO Blog Writer (`seo-blog-writer.json`)
**ENT Agency — Programmatic SEO Blog Writer**

Form-triggered workflow that generates SEO-optimized blog posts using Claude (Anthropic). Publishes via HTTP and notifies the team on Slack.

- **Trigger:** n8n Form submission
- **Credentials needed:** Anthropic API, HTTP Header Auth, Slack API
- **Nodes:** 23

## Setup Instructions

1. **Import** each JSON file into your n8n instance (Settings → Import Workflow)
2. **Configure credentials** for each service listed above
3. **Update Google Drive folder IDs** in the contract review workflows to point to your contract upload folders
4. **Update Notion database ID** in the Gmail-to-Notion workflow
5. **Update Slack channel** in notification nodes
6. All secrets should be managed via **Doppler** — never hardcode API keys
