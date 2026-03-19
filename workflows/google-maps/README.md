# Google Maps Lead Generation

A multi-workflow system for extracting business data from Google Maps and crawling their websites. Uses an AI chat agent as the main interface with two subworkflows for data extraction.

## Workflows

### Main Agent (`google-maps-main.json`)
**Google Maps — AI Chat Agent**

Chat-triggered AI agent that uses SerpAPI to search Google Maps and delegates extraction/crawling to subworkflows. Maintains conversation memory for iterative queries.

- **Trigger:** Chat (n8n Chat UI)
- **Credentials needed:** OpenAI API, SerpAPI
- **Nodes:** 8

### Extractor Subworkflow (`google-maps-extractor-subworkflow.json`)
**Google Maps Extractor Subworkflow**

Called by the main agent to extract structured business data from Google Maps results and write to Google Sheets.

- **Trigger:** Execute Workflow (called by parent)
- **Credentials needed:** Google Sheets OAuth2
- **Nodes:** 5

### Website Crawler Subworkflow (`website-content-crawler-subworkflow.json`)
**Website Content Crawler Subworkflow**

Called by the main agent to crawl business websites found via Google Maps and extract content to Google Sheets.

- **Trigger:** Execute Workflow (called by parent)
- **Credentials needed:** Google Sheets OAuth2
- **Nodes:** 5

## Setup Instructions

1. **Import all three workflows** into your n8n instance
2. **Get a SerpAPI key** from [serpapi.com](https://serpapi.com) and add it as a credential
3. **Add OpenAI API** credentials
4. **Configure Google Sheets OAuth2** and create a destination spreadsheet
5. **Link subworkflows:** In the main agent workflow, update the "Execute Workflow" tool nodes to reference the correct workflow IDs of the two subworkflows (you'll need to update these after import)
6. **Test via n8n Chat UI** — open the main workflow and use the built-in chat to query businesses
