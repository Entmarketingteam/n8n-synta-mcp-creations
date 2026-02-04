# Docs index — Creator data & n8n

Start here when the context window resets or when onboarding.

## Single source of truth

- **[PRD-NEXT-STEPS.md](./PRD-NEXT-STEPS.md)** — Where we are, what’s done, next steps (prioritized), purge/tighten checklist. Read this first.

## By area

| Area | Essential docs |
|------|-----------------|
| **Amazon** | [AMAZON-CREATORS-API.md](./AMAZON-CREATORS-API.md), [AMAZON-ASSOCIATES-REPORTS.md](./AMAZON-ASSOCIATES-REPORTS.md), [AMAZON-REPORT-INGESTION-SPEC.md](./AMAZON-REPORT-INGESTION-SPEC.md), [CREATOR-EARNINGS-CANONICAL-SCHEMA.md](./CREATOR-EARNINGS-CANONICAL-SCHEMA.md) |
| **Dashboard (LTK + Amazon)** | [CREATOR-DASHBOARD-DATA-FLOW.md](./CREATOR-DASHBOARD-DATA-FLOW.md) – Call/gather data, normalize, land in Google Sheets, build dashboard. |
| **Credentials** | [CREDENTIALS-STORAGE.md](./CREDENTIALS-STORAGE.md), [AIRTABLE-CREATORS-API.md](./AIRTABLE-CREATORS-API.md) |
| **LTK** | ltk-refresh-token-sync: [SETUP-LTK-NOW.md](../ltk-refresh-token-sync/SETUP-LTK-NOW.md); workflows: [LTK-TOKEN-ROTATION-WORKFLOW-FIX.md](./LTK-TOKEN-ROTATION-WORKFLOW-FIX.md) |
| **ShopMy** | [SHOPMY-CSV-FORMAT-AND-API.md](./SHOPMY-CSV-FORMAT-AND-API.md), [SHOPMY-CSV-PROCESSOR.md](./SHOPMY-CSV-PROCESSOR.md), [SHOPMY-CREATOR-AUTH.md](./SHOPMY-CREATOR-AUTH.md); runner: shopmy-browserbase-runner/; [YOU-ARE-ALL-SET.md](./YOU-ARE-ALL-SET.md) for Railway/run-nicki |
| **n8n** | [SETUP-N8N-WORKFLOWS.md](./SETUP-N8N-WORKFLOWS.md); instance: https://entagency.app.n8n.cloud; RoboNuggets/templates: [workflows/robonuggets/](../workflows/robonuggets/README.md); [WORKFLOW-TWEAKS.md](./WORKFLOW-TWEAKS.md) for plug-and-play customization |
| **Content (blog → CMS)** | [CONTENT-CANONICAL-SCHEMAS.md](./CONTENT-CANONICAL-SCHEMAS.md) – canonical blog shape; WordPress/Webflow adapters; workflow: [README-blog-to-cms.md](../workflows/README-blog-to-cms.md) |

## For new platforms

- **[HAR_ANALYSIS_GUIDE.md](./HAR_ANALYSIS_GUIDE.md)** — Capture HAR → use prompts → get auth spec and workflow sketch.
- **[AUTH_PATTERNS.md](./AUTH_PATTERNS.md)** — OAuth2 PKCE, OAuth2, session-cookie, API key; links to `auth-patterns/` folders.
- **[PLATFORM_REGISTRY.md](./PLATFORM_REGISTRY.md)** — Index of LTK, ShopMy, Amazon, Mavely and how to add more.

## Key links (no code)

- **n8n:** https://entagency.app.n8n.cloud  
- **Airtable Creators API:** base `appQnKyfyRyhHX44h`, table `tblNovDWyu1iHoJf0`  
- **Associates Central:** https://affiliate-program.amazon.com → Tools → Creators API  
