# Automation Workflows

General-purpose automation workflows for data collection and CRM operations.

## Workflows

### 1. Airtable Automation Demo (`airtable-automation-demo.json`)
**Automate Airtable with n8n (demo)**

Demonstrates Airtable automation patterns including record processing, AI enrichment via OpenRouter, and Google Cloud Storage integration.

- **Trigger:** Webhook
- **Credentials needed:** Airtable Token, Google Cloud Storage OAuth2
- **Nodes:** 32

### 2. Product Data & WhatsApp Support (`product-data-whatsapp-gpt4.json`)
**Automate Product Data Collection & Customer Support via WhatsApp + GPT-4 + Google Sheets**

Receives WhatsApp messages, processes product inquiries with GPT-4, logs data to Google Sheets, and responds via WhatsApp.

- **Trigger:** WhatsApp message (webhook)
- **Credentials needed:** WhatsApp API, WhatsApp Trigger API, Google Sheets OAuth2, OpenAI API
- **Nodes:** 20

## Setup Instructions

1. **Import** workflow JSONs into your n8n instance
2. **For Airtable workflow:** Create an Airtable base matching the expected schema and configure the Airtable token
3. **For WhatsApp workflow:**
   - Set up a WhatsApp Business API account (via Meta Business Suite)
   - Configure the webhook URL in Meta's WhatsApp settings to point to your n8n webhook
   - Add the WhatsApp API credentials in n8n
   - Create a Google Sheet for logging conversations
4. Add **OpenAI API** credentials for GPT-4 processing
