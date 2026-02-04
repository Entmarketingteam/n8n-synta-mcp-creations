# HAR analysis guide

Use this pipeline to analyze a new platform (e.g. ShopMy, Mavely) and turn browser traffic into an auth spec and n8n workflow.

## 1. Capture a HAR file

1. Open the platform’s login/dashboard in Chrome (or another browser).
2. Open **DevTools** → **Network** tab.
3. Clear the list, then perform the flow you care about (e.g. login, then open “Reports” or “Links”).
4. Right‑click in the Network list → **Save all as HAR with content**.
5. Save as `har-analysis/samples/<platform>-login.har` (e.g. `shopmy-login.har`, `mavely-login.har`).

**Important:** `har-analysis/samples/` is gitignored for `*.har`. Do not commit HAR files (they may contain tokens or cookies). Use them locally or in a secure place only.

## 2. Use the prompts (Claude / Cursor)

Prompts live in **`har-analysis/prompts/`**:

| Prompt | Use for |
|--------|--------|
| [analyze-auth-flow.md](../har-analysis/prompts/analyze-auth-flow.md) | Extract auth type (OAuth2, session, API key) and endpoints from the HAR. |
| [extract-endpoints.md](../har-analysis/prompts/extract-endpoints.md) | Discover API endpoints (URLs, methods, headers) from the HAR. |
| [generate-workflow.md](../har-analysis/prompts/generate-workflow.md) | Produce n8n workflow JSON (or a node-by-node sketch) from an auth spec and endpoints. |

Workflow: **HAR → analyze-auth-flow** → auth spec → **extract-endpoints** (optional) → **generate-workflow** → n8n JSON. Then import into n8n (or use Synta MCP) and wire credentials.

## 3. Match to an auth pattern

See [AUTH_PATTERNS.md](./AUTH_PATTERNS.md) and the `auth-patterns/` folders. Use the auth spec from step 2 to choose the right pattern (OAuth2 PKCE, OAuth2, session-cookie, API key) and reuse or adapt the pattern’s README and any n8n snippets.

## 4. Document and register the platform

- Add a doc under `docs/` (e.g. `MAVELY-API-ENDPOINTS.md`) with endpoints and auth notes.
- Add the platform to [PLATFORM_REGISTRY.md](./PLATFORM_REGISTRY.md) with status, auth pattern, and links to docs and workflows.

## Quick reference

- **Samples folder:** `har-analysis/samples/` (save HARs here; do not commit `*.har`).
- **Prompts folder:** `har-analysis/prompts/`.
- **Auth patterns:** `auth-patterns/` (one folder per pattern).
