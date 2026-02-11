# Synta MCP Best Practices

> Local summary of [official Synta best practices](https://mcp-docs.synta.io/best-practices.md). For full docs: [mcp-docs.synta.io](https://mcp-docs.synta.io/).

## Recommended Flow

**Discovery → Build → Validate → Auto-fix → Test → Debug**

1. **Discovery:** `search_nodes` → `get_node` (with `detail`, `includeConfigExamples`) → `search_templates`
2. **Build:** Create workflow with explicit parameters (never trust defaults)
3. **Validate:** `n8n_validate_workflow`
4. **Auto-fix:** If validation fails → `n8n_autofix_workflow` (preview first, then apply)
5. **Test:** `n8n_manage_pindata` (add mock data) → `n8n_trigger_execution` (self-healing)
6. **Debug:** If execution fails → `n8n_manage_executions` with `action: "list"`, `status: "error"`, then `action: "get"`, `mode: "error"`

## Quick Reference

| Task | Tool | Key Parameters |
|------|------|----------------|
| Find nodes | `search_nodes` | `query` |
| Get node info | `get_node` | `nodeType`, `detail`, `mode` |
| Find templates | `search_templates` | `searchMode`, `query`, `nodeTypes` |
| Create workflow | `n8n_create_workflow` | `name`, `nodes`, `connections` |
| Validate | `n8n_validate_workflow` | `id` |
| Auto-fix | `n8n_autofix_workflow` | `id`, `applyFixes` |
| Test (self-healing) | `n8n_trigger_execution` | `id` |
| Test (external) | `n8n_test_workflow` | `workflowId` |
| Debug | `n8n_manage_executions` | `action`, `id`, `mode` |
| Mock data | `n8n_manage_pindata` | `mode`, `id`, `nodeName` |

## Key Practices

### Template-first
Before building from scratch, check if a template exists. Templates are production-tested.

### Auto-fix before manual fixes
When validation fails:
1. `n8n_autofix_workflow({id, applyFixes: false})` – preview
2. `n8n_autofix_workflow({id, applyFixes: true})` – apply
3. Then manual corrections only for what remains

### Test with self-healing
Use pin data so workflows run without real webhooks or external APIs:
- `n8n_manage_pindata({mode: "analyzePinDataRequirement", id})` – check if trigger needs payload
- `n8n_manage_pindata({mode: "addPinData", id, nodeName, pinData})` – add mock data
- `n8n_trigger_execution({id})` – run with self-healing

### Debug failed executions
- `n8n_manage_executions({action: "list", workflowId, status: "error"})` – find failures
- `n8n_manage_executions({action: "get", id, mode: "error"})` – get path to error + upstream data
- `n8n_manage_executions({action: "correlate", executionId})` – trace across multi-workflow chains

## n8n Instance

- **URL:** https://entagency.app.n8n.cloud
- MCP must be configured with correct n8n URL and API key.

## Links

| Resource | URL |
|----------|-----|
| Docs index | https://mcp-docs.synta.io/llms.txt |
| Best practices | https://mcp-docs.synta.io/best-practices.md |
| Rules & agent instructions | https://mcp-docs.synta.io/rules.md |
| GitHub rules repo | https://github.com/Synta-ai/synta-rules-for-agents |
| Agent tools reference | https://mcp-docs.synta.io/agent-tools |
