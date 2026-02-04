# Normalized contracts (ent-tools)

All tools and n8n workflows in this repo speak the same **internal** shape at boundaries. When one API (Slack, MarkItDown, LLM, etc.) changes, you only swap or fix that adapter—the rest of the system keeps working.

## Document pipeline (Slack → MarkItDown → LLM → Slack)

### Normalized payload (internal shape)

Every node in the middle of the workflow reads/writes only these fields. Adapters map external API responses into this shape.

**Success (flowing through the pipeline):**

| Field           | Type   | Description                                      |
| --------------- | ------ | ------------------------------------------------- |
| `source`        | string | e.g. `"slack"`                                   |
| `channel_id`    | string | Slack channel ID (for reply)                     |
| `thread_ts`      | string | Slack thread_ts (optional, for threading reply)   |
| `file_id`       | string | Slack file ID (for fetching file)               |
| `filename`      | string | Original filename                                |
| `markdown`      | string | Converted markdown (from MarkItDown API)         |
| `llm_response`  | string | LLM output (summary, answer, etc.)               |
| `ok`            | boolean| `true` when this step succeeded                  |

**Error (when any step fails):**

| Field   | Type   | Description                          |
| ------- | ------ | ------------------------------------ |
| `ok`    | boolean| `false`                             |
| `error` | string | Human-readable error message         |
| `stage` | string | `"slack"` \| `"markitdown"` \| `"llm"` |

### Adapter boundaries

- **Inbound:** Slack (or webhook) → Set/Code node maps Slack event to normalized payload. Only this node knows Slack’s field names.
- **MarkItDown:** HTTP Request → MarkItDown API returns `{ "ok": true, "markdown": "...", "filename": "..." }` or `{ "ok": false, "error": "...", "stage": "markitdown" }`. Map to normalized; workflow branches on `ok`.
- **LLM:** LLM node output → Set/Code maps to `llm_response`, `ok: true`; on exception set `ok: false`, `stage: "llm"`.
- **Outbound:** Normalized payload → Slack “post message” uses `channel_id`, `thread_ts`, `llm_response` or `error`. Only this node knows Slack’s post API.

### Config (no hardcoded URLs in workflow)

- `MARKITDOWN_API_URL` (or n8n variable `tools.markitdown.url`): base URL of the MarkItDown API (e.g. `https://markitdown-api.railway.app`).
- Slack and LLM credentials live in n8n; no URLs or tokens in workflow JSON.

---

## Future flows (LTK, ShopMy, etc.)

New tools that plug into orchestration:

- Expose HTTP (or webhook) API that accepts/returns the same normalized shape where they integrate.
- Return `{ "ok": true, "data": { ... } }` on success and `{ "ok": false, "error": "...", "stage": "toolname" }` on failure.
- Read config from env; no hardcoded external URLs in code.

Then n8n workflows that orchestrate them don’t need to change when you add or swap a tool—only the node that talks to that tool changes.
