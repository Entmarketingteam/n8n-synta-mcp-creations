# Platform registry

Central index of platforms used for creator data, auth, and automation. Link to detailed docs and workflows from here.

| Platform | Status | Auth pattern | Docs | Workflows / runners |
|----------|--------|--------------|------|---------------------|
| **LTK** (LikeToKnow.it / RewardStyle) | Documented, working | OAuth2 (refresh token) | [LTK-TOKEN-ROTATION-WORKFLOW-FIX.md](./LTK-TOKEN-ROTATION-WORKFLOW-FIX.md), [LTK-NICKI-OAUTH2-SETUP.md](./LTK-NICKI-OAUTH2-SETUP.md), [SETUP-LTK-NOW.md](../ltk-refresh-token-sync/SETUP-LTK-NOW.md) | [ltk-token-rotation-fixed.json](../workflows/ltk-token-rotation-fixed.json), [ltk-reports-to-google-sheets.json](../workflows/ltk-reports-to-google-sheets.json); ltk-refresh-token-sync/ |
| **ShopMy** | Documented, runner in use | Session cookie (Browserbase) | [SHOPMY-CREATOR-AUTH.md](./SHOPMY-CREATOR-AUTH.md), [SHOPMY-API-ENDPOINTS.md](./SHOPMY-API-ENDPOINTS.md), [SHOPMY-CSV-FORMAT-AND-API.md](./SHOPMY-CSV-FORMAT-AND-API.md) | [shopmy-browserbase-login.json](../workflows/shopmy-browserbase-login.json), [shopmy-csv-processor-creators.json](../workflows/shopmy-csv-processor-creators.json); shopmy-browserbase-runner/ |
| **Amazon** (Associates / Creators) | Documented; no report API | OAuth2 (Creators API); session/CSV (reports) | [AMAZON-CREATORS-API.md](./AMAZON-CREATORS-API.md), [AMAZON-ASSOCIATES-REPORTS.md](./AMAZON-ASSOCIATES-REPORTS.md), [AMAZON-REPORT-INGESTION-SPEC.md](./AMAZON-REPORT-INGESTION-SPEC.md) | [amazon-creators-api-get-token.json](../workflows/amazon-creators-api-get-token.json), [amazon-associates-report-ingest.json](../workflows/amazon-associates-report-ingest.json); amazon-associates-scraper/ |
| **Mavely** | Template ready | TBD (HAR analysis) | — | Ready for HAR capture and [HAR_ANALYSIS_GUIDE.md](./HAR_ANALYSIS_GUIDE.md) |

### Research / utility tools

| Tool | Status | Auth / keys | Docs | Location |
|------|--------|-------------|------|----------|
| **last30days-skill** | Working | `OPENAI_API_KEY`, `XAI_API_KEY` (optional – falls back to WebSearch) | [last30days-skill/README.md](../ent-tools/last30days-skill/README.md), [SKILL.md](../ent-tools/last30days-skill/SKILL.md), [SPEC.md](../ent-tools/last30days-skill/SPEC.md) | ent-tools/last30days-skill/ |

## Adding a new platform

1. Capture login/API flow: see [HAR_ANALYSIS_GUIDE.md](./HAR_ANALYSIS_GUIDE.md).
2. Identify auth pattern: see [AUTH_PATTERNS.md](./AUTH_PATTERNS.md).
3. Add a row above and link to the new doc and workflow(s).
