# Synta MCP Test Results

**Date:** February 11, 2026  
**n8n instance:** https://entagency.app.n8n.cloud

## Tools Tested

| Tool | Result | Notes |
|------|--------|------|
| `n8n_list_workflows` | ✅ Pass | Listed 20 workflows |
| `n8n_manage_executions` (list) | ✅ Pass | Listed recent executions |
| `n8n_manage_executions` (get, mode: error) | ✅ Pass | Full error details, path, upstream data |
| `n8n_get_workflow` | ✅ Pass | Structure and minimal modes |
| `n8n_validate_workflow` | ✅ Pass | Detected expression + typeVersion issues |
| `n8n_autofix_workflow` (preview) | ✅ Pass | Found 7 fixes (1 expression, 6 typeVersion) |
| `n8n_autofix_workflow` (apply) | ❌ Fail | `Cannot read properties of undefined (reading 'execute')` |
| `n8n_update_partial_workflow` | ✅ Pass | Applied expression fix manually |
| `n8n_manage_pindata` (analyze) | ✅ Pass | Schedule trigger needs no pin data |
| `n8n_trigger_execution` | ❌ Fail | `Cannot read properties of undefined (reading 'execute')` |
| `n8n_test_workflow` | ✅ Pass | Triggered webhook workflow, got 200 |
| `n8n_update_partial_workflow` (publishWorkflow) | ❌ Fail | Publish failed, same execute error |
| `search_nodes` | ✅ Pass | Found Manual Trigger, etc. |
| `n8n_search_workflow` | ✅ Pass | Found webhook/trigger nodes |

## Fix Applied

**Workflow:** Daily Instagram Digest → WhatsApp (7am CT) (`34SXr17ABbAv0Dzj`)

- **Before:** Expression error in Send via WhatsApp: `Bearer {{$env.OPENCLAW_API_KEY}}` (missing `=` prefix)
- **Action:** Applied fix via `n8n_update_partial_workflow`
- **After:** Validation passed (valid: true, 0 errors)

**Note:** Workflow was deactivated by the update. Reactivation via `publishWorkflow` failed with the same server error.

## Execution Debugging (mode: error)

Execution 349 (Daily Instagram Digest) error details:
- **Node:** Send via WhatsApp (HTTP Request)
- **Error:** Connection timeout to `45.55.236.188:18789`
- **Upstream:** Format Digest produced valid message JSON
- **Suggestions:** Network/connection error, increase timeout or add retry

## Known Limitations (and Fix)

1. **Autofix apply, trigger execution, publish** fail with `Cannot read properties of undefined (reading 'execute')` when **n8n login credentials are not configured**.
2. **Fix:** Add `X-N8n-Login-Email` and `X-N8n-Login-Password` to your MCP config. See **docs/SYNTA-MCP-ENABLE-SELF-HEALING.md**.
3. **Workaround (before fix):** Use `n8n_update_partial_workflow` to apply fixes manually when autofix apply fails.
4. **n8n_test_workflow** works with API key only; use `webhookData` or `formData` for realistic payloads.

## Recommendations

- For expression fixes: copy autofix preview output → apply via `n8n_update_partial_workflow`
- For testing webhooks: use `n8n_test_workflow` with appropriate payload
- For execution debugging: use `n8n_manage_executions` with `mode: "error"`
- Report autofix/trigger/publish failures to Synta or n8n Cloud support
