# Content Creation & Video Workflows

AI-powered content generation, video creation, and multi-platform social media publishing workflows. Most use **Blotato** for cross-platform publishing and **Telegram** as the input interface.

## Workflows

### Blotato Publishing Suite

| Workflow | File | Trigger | Key Integrations |
|----------|------|---------|-----------------|
| Blotato AI Agent | `blotato-agent.json` | Telegram | OpenAI, Blotato, Telegram |
| Multi-Platform Automation | `blotato-multi-platform.json` | Telegram | Blotato, Telegram (54 nodes) |
| Auto Content Publishing | `automate-content-publishing-blotato.json` | Schedule | Blotato, Google Sheets |
| GPT-5 Social Videos | `auto-generate-social-videos-gpt5.json` | Telegram | OpenAI, Blotato, Google Drive/Sheets |

### Video Generation

| Workflow | File | Trigger | Key Integrations |
|----------|------|---------|-----------------|
| AI Social Video Generator | `ai-social-video-generator.json` | Telegram | OpenAI, Kling, Google Sheets |
| Telegram GPT-4 Blotato Videos | `telegram-gpt4-blotato-videos.json` | Telegram | OpenAI, Blotato, Google Sheets |
| HeyGen Idea-to-Post | `heygen-idea-to-post.json` | Telegram | HeyGen, OpenAI, Blotato, Google Drive |
| HeyGen II Clone Me | `heygen-ii-clone-me.json` | Telegram | HeyGen, OpenAI, Blotato, Google Drive |
| Clone Video Ads Factory | `clone-video-ads-factory.json` | Manual/Schedule | NanoBanana, Kling, Blotato, Airtable |
| Clone Viral TikTok | `clone-viral-tiktok.json` | Telegram | Perplexity, Blotato, Google Sheets |
| Split Shots 6-Panel | `split-shots-6-panel.json` | Schedule | Airtable, HTTP (8 nodes) |

### Image & Thumbnail Generation

| Workflow | File | Trigger | Key Integrations |
|----------|------|---------|-----------------|
| Abyssale Image Generator | `abyssale-image-generator.json` | Telegram/Form | Abyssale, OpenAI, Blotato |
| E-commerce Product Images | `ecommerce-product-images.json` | Form | NanoBanana, OpenAI, Google Drive/Sheets |
| YouTube Thumbnail Creator | `youtube-thumbnail-creator.json` | Telegram | Blotato, OpenAI, Gmail, Google Drive |

### Written Content

| Workflow | File | Trigger | Key Integrations |
|----------|------|---------|-----------------|
| SEO Listicle Article Writer | `seo-listicle-article-writer.json` | Form | Anthropic, OpenAI, Google Gemini, Slack |

## Common Credentials Required

- **OpenAI API** — Used by nearly all workflows for content generation
- **Telegram API** — Primary input interface (bot token + webhook)
- **Blotato API** — Cross-platform social media publishing
- **Google Sheets/Drive OAuth2** — Content tracking and asset storage
- **HTTP Header Auth** — Various API integrations (Kling, HeyGen, etc.)

## Setup Instructions

1. **Import** workflow JSONs into your n8n instance
2. **Create a Telegram bot** via @BotFather and configure the Telegram credentials
3. **Set up Blotato** account and connect social media platforms
4. **Configure Google OAuth2** credentials for Sheets and Drive access
5. **Add OpenAI API key** in n8n credentials
6. **Update Google Sheet IDs** in each workflow to match your tracking sheets
7. For HeyGen workflows: add your HeyGen API key as HTTP Header Auth
8. For video workflows: configure Kling/NanoBanana API access via HTTP credentials
