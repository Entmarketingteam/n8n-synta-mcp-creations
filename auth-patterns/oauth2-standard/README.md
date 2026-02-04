# OAuth2 (standard)

Use when the platform uses **OAuth2** with client_id and client_secret (and optionally refresh tokens): authorization code or client credentials grant.

## Flow

1. **Authorization code:** Redirect user to authorization URL; receive `code` at redirect_uri; POST `code`, `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri` to token URL → get `access_token` and often `refresh_token`.
2. **Refresh:** POST `grant_type=refresh_token`, `refresh_token`, `client_id`, `client_secret` to token (or refresh) URL → get new `access_token` (and optionally new `refresh_token`).

## n8n

- Use the **OAuth2** credential type: set authorization URL, token URL, client ID, client secret, scopes. For refresh, use the same token URL with `grant_type=refresh_token` or the platform’s refresh endpoint.
- **LTK** uses this pattern: see [docs/LTK-TOKEN-ROTATION-WORKFLOW-FIX.md](../../docs/LTK-TOKEN-ROTATION-WORKFLOW-FIX.md) and workflow [ltk-token-rotation-fixed.json](../../workflows/ltk-token-rotation-fixed.json). Tokens stored in Airtable; n8n reads and refreshes, then writes back.

## This folder

- Add minimal workflow JSON or node list for a generic OAuth2 + refresh flow when useful. Reference from [docs/PLATFORM_REGISTRY.md](../../docs/PLATFORM_REGISTRY.md).
