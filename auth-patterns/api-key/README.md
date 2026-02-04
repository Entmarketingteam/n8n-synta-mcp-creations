# API key

Use when the platform uses a **static API key** (header or query parameter). No OAuth or session; each request includes the key.

## Flow

1. Obtain API key from the platform’s dashboard or settings.
2. Send it on every request: e.g. `Authorization: Bearer <key>`, `X-API-Key: <key>`, or `?api_key=<key>`.

## n8n

- Create an **API Key** or **Header Auth** credential in n8n with the key (or use `$env.API_KEY` in the HTTP Request node).
- In each HTTP Request node, set the header or query param to the credential or expression. No token refresh or cookie handling.

## This folder

- Add minimal workflow JSON or node list when you have a concrete example. Reference from [docs/PLATFORM_REGISTRY.md](../../docs/PLATFORM_REGISTRY.md).
