# Auth patterns

Overview of authentication patterns used for platform integrations. Use these when building or analyzing a new integration (e.g. after HAR analysis).

| Pattern | When to use | Folder | Notes |
|---------|-------------|--------|--------|
| **OAuth2 PKCE** | Public / SPAs; no client secret; auth code + code_verifier | [auth-patterns/oauth2-pkce/](../auth-patterns/oauth2-pkce/) | Best for browser or mobile-style flows. |
| **OAuth2 (standard)** | Server-style; client_id + client_secret; refresh tokens | [auth-patterns/oauth2-standard/](../auth-patterns/oauth2-standard/) | Used by LTK; token and refresh endpoints. |
| **Session cookie** | Login form → cookies; then API calls with same cookies | [auth-patterns/session-cookie/](../auth-patterns/session-cookie/) | Used by ShopMy via Browserbase runner. |
| **API key** | Header or query param; no OAuth | [auth-patterns/api-key/](../auth-patterns/api-key/) | Simple; key in n8n credential or env. |

## Flow

1. **HAR analysis:** Use [HAR_ANALYSIS_GUIDE.md](./HAR_ANALYSIS_GUIDE.md) and `har-analysis/prompts/analyze-auth-flow.md` to get an auth spec.
2. **Pick pattern:** Match the spec to one of the rows above.
3. **Reuse:** Open the pattern folder; use the README and any n8n JSON or node list to build the workflow (manually or via Synta MCP).
4. **Register:** Add the platform to [PLATFORM_REGISTRY.md](./PLATFORM_REGISTRY.md).

Each pattern folder contains a README and, where useful, minimal n8n node descriptions or JSON snippets.
