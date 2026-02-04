# Generate n8n workflow (auth spec + endpoints → JSON)

Use this prompt with Claude/Cursor. Provide (1) the auth specification from `analyze-auth-flow.md` and (2) the endpoint list from `extract-endpoints.md` (or a short description of the desired flow).

---

**Task:** Generate an n8n workflow JSON (or a clear node-by-node sketch) that:

1. **Trigger:** Manual trigger or webhook (specify which).
2. **Auth:** Implements the auth pattern from the spec (OAuth2 node, HTTP Request with session cookies, or HTTP Request with API key header). Do not hardcode secrets; use n8n credential references or `$env.VAR` placeholders.
3. **API calls:** One or more HTTP Request (or equivalent) nodes that call the extracted endpoints in a sensible order (e.g. get token → get user → get reports).
4. **Output:** Last node(s) should output the data needed for the use case (e.g. normalized rows for a sheet or webhook response).

Follow n8n workflow structure: `nodes` array (each with `id`, `name`, `type`, `typeVersion`, `position`, `parameters`) and `connections` object. If producing full JSON, restrict top-level keys to `name`, `nodes`, `connections`, `settings` so it is valid for n8n import. Document any required credentials or env vars in a short “After import” note.
