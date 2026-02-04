# Content Repurposing Workflows (by RoboNuggets)

Two n8n workflows for content repurposing: **The Downloader Agent** (fetch TikTok → log to Google Sheets) and **The Uploader Agent** (read Sheets → Blotato → publish).

## Workflow files

| File | Purpose |
|------|--------|
| `content-repurposing-downloader-agent.json` | Schedule → Apify TikTok run → Get dataset items → Log to Google Sheets |
| `content-repurposing-uploader-agent.json` | Schedule → Read Google Sheets → Create video in Blotato → Publish/Webhook |

## Prerequisites

- **n8n** (e.g. [entagency.app.n8n.cloud](https://entagency.app.n8n.cloud))
- **Google account** (for Sheets; create a Google Sheets credential in n8n)
- **Apify** account and token (for TikTok scraping)
- **Blotato** account and API key (for video creation/publishing)

## API keys and credentials

### Apify (Downloader Agent)

1. [Apify](https://apify.com) → Settings → Integrations → API token.
2. In n8n:
   - **Option A:** Add env var `APIFY_TOKEN` and `APIFY_TIKTOK_ACTOR_ID` in your n8n environment.
   - **Option B:** Replace in the “Get Latest Tiktoks” node URL: `YOUR_APIFY_TOKEN` and `YOUR_APIFY_TIKTOK_ACTOR_ID`.
3. Use a TikTok Actor ID from the Apify store (e.g. `apify/tiktok-scraper` or the actor ID from the actor’s URL).

### Blotato (Uploader Agent)

1. [Blotato](https://my.blotato.com) → Settings → API keys.
2. In n8n:
   - **Option A:** Add env var `BLOTATO_API_KEY` (and use `={{ $env.BLOTATO_API_KEY }}` in the Blotato nodes).
   - **Option B:** Replace `YOUR_BLOTATO_API_KEY` in the “Set Blotato IDsReady Video in Blotato” and “Publish or Webhook” nodes with your key (or use n8n’s HTTP Header Auth credential and reference it in the node).
3. Blotato API base: `https://backend.blotato.com`. Endpoints used in the workflow:
   - `POST /v2/videos/creations` – create video
   - `POST /v2/posts` – publish (adjust to your “IDs ready” or custom endpoint if different)

### Google Sheets

1. In n8n: Add a **Google Sheets** credential (OAuth2).
2. In both workflows, set **Document ID** and **Sheet name** for the same sheet (e.g. “TikTok Log”) so the Downloader appends and the Uploader reads from it.

## Import into n8n

1. In n8n: **Workflows** → **Import from File** (or paste JSON).
2. Select `content-repurposing-downloader-agent.json` or `content-repurposing-uploader-agent.json`.
3. After import:
   - **Downloader:** Set Apify token/actor ID, Google Sheet doc + sheet name, and column mapping in “Log to Sheets.”
   - **Uploader:** Set Blotato API key, same Google Sheet doc + sheet name, and adjust Blotato request bodies/URLs if you use a different “IDs ready” or publish flow.

## Downloader Agent – optional: wait for Apify run

Apify’s “run actor” returns immediately; dataset items are ready only after the run finishes. Options:

1. **Add a Wait node** between “Get Latest Tiktoks” and “Get dataset items” (e.g. 60–120 seconds), then run “Get dataset items” so the run has time to complete.
2. **Use Apify’s synchronous run API** (if available for your actor) so one request returns when the run is done, then point “Get dataset items” at that response or the sync response payload.

Adjust the “Get Latest Tiktoks” body (hashtags, `resultsPerPage`, etc.) to match your Apify TikTok actor’s input schema.

## Uploader Agent – “Set Blotato IDsReady Video”

The “Set Blotato IDsReady Video in Blotato” node is configured to call Blotato’s **Create Video** endpoint (`POST /v2/videos/creations`) with script/style from the sheet. If your pipeline uses a different Blotato endpoint (e.g. a custom “IDs ready” or webhook):

- Change the **URL** of that node to your endpoint.
- Change the **JSON body** to the payload your endpoint expects (e.g. video IDs, status, source).

The last node (“Publish or Webhook”) can stay as-is for Blotato `/v2/posts` or be changed to any other URL/body for your repurposing pipeline.

## Schedule

- **Downloader:** default cron `0 9 * * *` (daily at 09:00).
- **Uploader:** default cron `0 10 * * *` (daily at 10:00).

Edit the Schedule Trigger in each workflow to change the cron expression.

## Reference

- [Apify – Run Actor](https://docs.apify.com/api/v2/act-runs-post)
- [Apify – Get dataset items](https://docs.apify.com/api/v2/datasets)
- [Blotato API – Video](https://help.blotato.com/api/api-reference/openapi-reference/video)
- [Blotato – Create Video](https://help.blotato.com/api-reference/create-video)
