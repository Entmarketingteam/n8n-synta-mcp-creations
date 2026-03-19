# AI Agent Workflows

Standalone AI agent workflows for voice, phone, chat, and app backends.

## Workflows

### Voice & Phone Agents

| Workflow | File | Trigger | Key Integrations |
|----------|------|---------|-----------------|
| AI Voice Agent (ElevenLabs) | `ai-voice-agent-elevenlabs.json` | Webhook | OpenAI, ElevenLabs, Gmail, Google Calendar/Sheets |
| Phone Agent (RetellAI) | `phone-agent-retellai.json` | Google Sheets / Webhook | RetellAI, Twilio, OpenAI, Gmail, Google Sheets |
| Voice Chat Bot | `voice-chat-bot.json` | Webhook | OpenAI, Anthropic, Google Suite, Airtable, SerpAPI |

### Chat & App Backends

| Workflow | File | Trigger | Key Integrations |
|----------|------|---------|-----------------|
| Build First AI Agent | `build-first-ai-agent.json` | Chat trigger | OpenAI, Gmail, Google Calendar/Sheets |
| AI Analysis App Backend | `ai-analysis-app-backend.json` | Webhook | OpenAI (structured output) |
| AI Analysis App History | `ai-analysis-app-history.json` | Webhook | HTTP (history endpoint) |
| Calorie App Backend | `calorie-app-backend.json` | Webhook | OpenAI (structured output) |

## Credentials Required

- **OpenAI API** — Core LLM for all agents
- **Anthropic API** — Used by Voice Chat Bot as alternative LLM
- **Gmail OAuth2** — Email tool for agents
- **Google Calendar OAuth2** — Calendar tool for agents
- **Google Sheets OAuth2** — Data storage and triggers
- **Twilio API** — Phone calls (RetellAI workflow)
- **Airtable Token** — Data storage (Voice Chat Bot)
- **SerpAPI** — Web search tool (Voice Chat Bot)

## Setup Instructions

1. **Import** workflow JSONs into your n8n instance
2. **Configure webhook URLs** — Each webhook-triggered workflow needs its production URL set in your calling application (ElevenLabs, RetellAI, Lovable frontend, etc.)
3. **Set up Google OAuth2** credentials with Calendar, Gmail, and Sheets scopes
4. **Add OpenAI API key** in n8n credentials
5. For phone agent: configure **Twilio** account and **RetellAI** agent
6. For voice agent: configure **ElevenLabs** conversational AI with webhook pointing to n8n
7. The Analysis App and Calorie App workflows are **backends for frontend apps** (Lovable/similar) — configure CORS and webhook URLs accordingly
