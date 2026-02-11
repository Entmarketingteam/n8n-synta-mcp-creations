# Synta MCP: Gaps and Fixes for Developer Handoff

**Date:** February 2026  
**Issue:** n8n and Synta MCP are not creating nodes/workflows correctly and are not self-correcting as expected.  
**Purpose:** Hand this document to a developer to align the repo with Synta MCP best practices and improve workflow creation quality.

**Status (Feb 2026):** Tasks 1–5 and 7 completed. See **docs/SYNTA-MCP-BEST-PRACTICES.md** for the local best-practices summary. Task 6 (verify MCP tool names in config) is environment-specific.

**Test results:** See **docs/SYNTA-MCP-TEST-RESULTS.md**. Most tools work. For autofix apply, trigger execution, and publish: add n8n login credentials per **docs/SYNTA-MCP-ENABLE-SELF-HEALING.md**.

---

## 1. The Problem

- **Workflow creation:** AI agent creates workflows that have configuration errors, missing parameters, or incorrect node wiring.
- **Self-correction:** When errors occur, the agent does not reliably use available tools to auto-fix, test, or debug.
- **Root cause:** The project's Synta MCP rules (`.cursor/rules/synta-mcp.agent.mdc`) are missing several tools and workflows recommended by the [official Synta best practices](https://mcp-docs.synta.io/best-practices.md).

---

## 2. Official Documentation Sources

| Resource | URL | Use |
|----------|-----|-----|
| Docs index | https://mcp-docs.synta.io/llms.txt | Discover all docs |
| Best practices | https://mcp-docs.synta.io/best-practices.md | Workflow building, validation, autofix, self-healing, debugging |
| Rules & agent instructions | https://mcp-docs.synta.io/rules.md | IDE setup (Cursor, Claude, etc.) |
| GitHub rules repo | https://github.com/Synta-ai/synta-rules-for-agents | Copy rule content for `.cursor/rules/` |
| Agent tools reference | https://mcp-docs.synta.io/agent-tools | Full list of MCP tools |

---

## 3. What the Repo Already Has

**File:** `.cursor/rules/synta-mcp.agent.mdc` (always applied)

Covers:
- Plan-first approach (Research → Plan → Build → Validate)
- Silent execution, parallel execution
- Templates-first
- Never trust defaults
- `search_nodes`, `search_templates`, `get_node_essentials`, `get_full_node_details`
- `n8n_validate_workflow` (including selective options)
- `n8n_create_workflow`, `n8n_update_partial_workflow`
- Batch operations, parameter configuration, template attribution

---

## 4. What’s Missing (Critical Gaps)

These tools and practices are in the official Synta docs but **not** in the current rules.

### 4.1 Auto-fix common issues

**Tool:** `n8n_autofix_workflow`

**Purpose:** Automatically fix common problems (expression format, typeVersion, error output config, webhook paths, parameter locations).

**Usage:**
```
n8n_autofix_workflow({id: "workflow-id", applyFixes: false})  # preview
n8n_autofix_workflow({id: "workflow-id", applyFixes: true})   # apply
```

**Gap:** The rules never mention autofix. After validation failures, the agent should run autofix instead of only manual corrections.

---

### 4.2 Test with self-healing

**Tools:** `n8n_trigger_execution`, `n8n_manage_pindata`

**Purpose:** Run workflows with mock data so the AI can detect errors and adjust config without real webhooks or external APIs.

**Usage:**
```
# Add pin data for a webhook trigger (so it doesn't need a real POST)
n8n_manage_pindata({mode: "addPinData", id: "workflow-id", nodeName: "Webhook", pinData: [...]})

# Trigger execution (self-healing: AI detects errors and fixes config)
n8n_trigger_execution({id: "workflow-id"})
```

**Gap:** Rules mention `n8n_trigger_webhook_workflow` but not `n8n_trigger_execution` or `n8n_manage_pindata`. The agent does not use pin data for testing.

---

### 4.3 Debug failed executions

**Tool:** `n8n_manage_executions`

**Purpose:** List failed runs, inspect errors, and correlate multi-workflow executions.

**Usage:**
```
# List recent errors
n8n_manage_executions({action: "list", workflowId: "id", status: "error"})

# Get detailed error info (path to error, upstream data)
n8n_manage_executions({action: "get", id: "execution-id", mode: "error"})

# Trace across workflows
n8n_manage_executions({action: "correlate", executionId: "starting-execution-id"})
```

**Gap:** Rules mention `n8n_list_executions` and `n8n_get_execution` but not the full `n8n_manage_executions` API (list, get, delete, retry, correlate) or the `mode: "error"` debugging workflow.

---

### 4.4 External workflow testing

**Tool:** `n8n_test_workflow`

**Purpose:** Trigger webhook/form/chat workflows for end-to-end testing.

**Usage:**
```
n8n_test_workflow({workflowId: "id", webhookData: {...}})
```

**Gap:** Not referenced in the rules.

---

### 4.5 Tool name alignment

**Official docs use:** `search_nodes`, `get_node`, `search_templates`  
**Current rules use:** `search_nodes`, `get_node_essentials`, `get_full_node_details`, `search_templates`

The MCP server may expose tools under different names (e.g. `mcp_synta-mcp_search_nodes`). The developer should confirm the actual tool names in the MCP config and ensure rules reference the correct ones.

---

## 5. Recommended Fix Flow

From the official Best Practices, the intended flow is:

1. **Discovery:** `search_nodes` → `get_node` (with `detail`, `includeConfigExamples`) → `search_templates`
2. **Build:** Create workflow with explicit parameters (never trust defaults)
3. **Validate:** `n8n_validate_workflow`
4. **Auto-fix:** If validation fails → `n8n_autofix_workflow` (preview first, then apply)
5. **Test:** `n8n_manage_pindata` (add mock data) → `n8n_trigger_execution` (self-healing)
6. **Debug:** If execution fails → `n8n_manage_executions` with `action: "list"`, `status: "error"`, then `action: "get"`, `mode: "error"`

---

## 6. Actionable Tasks for Developer

| # | Task | Where | Details | Status |
|---|------|-------|---------|--------|
| 1 | Update or replace `synta-mcp.agent.mdc` | `.cursor/rules/` | Merged official best practices with project-specific content (ShopMy runner, Doppler). | Done |
| 2 | Add autofix step | Rules | After `n8n_validate_workflow` fails, instruct agent to run `n8n_autofix_workflow` (preview, then apply) before manual fixes. | Done |
| 3 | Add self-healing test step | Rules | Added "Test with Self-Healing" (Phase 5): `n8n_manage_pindata` + `n8n_trigger_execution`. | Done |
| 4 | Add debugging section | Rules | Added "Debug Failed Executions" (Phase 6): `n8n_manage_executions` full API. | Done |
| 5 | Add quick reference table | Rules | Added Best Practices quick reference table. | Done |
| 6 | Verify MCP tool names | MCP config | Confirm actual tool names in Cursor/MCP config. MCP exposes `mcp_synta-mcp_*` prefix; rules use logical names. | Pending (env-specific) |
| 7 | Create `SYNTA-MCP-BEST-PRACTICES.md` | `docs/` | Local summary of official best practices. | Done |

---

## 7. Quick Reference (from Official Docs)

| Task | Tool | Key Parameters |
|------|------|----------------|
| Find nodes | `search_nodes` | `query` |
| Get node info | `get_node` | `nodeType`, `detail`, `mode` |
| Find templates | `search_templates` | `searchMode`, `query`, `nodeTypes` |
| Create workflow | `n8n_create_workflow` | `name`, `nodes`, `connections` |
| Validate | `n8n_validate_workflow` | `id` |
| **Auto-fix** | `n8n_autofix_workflow` | `id`, `applyFixes` |
| **Test (self-healing)** | `n8n_trigger_execution` | `id` |
| Test (external) | `n8n_test_workflow` | `workflowId` |
| **Debug** | `n8n_manage_executions` | `action`, `id`, `mode` |
| **Mock data** | `n8n_manage_pindata` | `mode`, `id`, `nodeName` |

---

## 8. n8n Instance

- **URL:** https://entagency.app.n8n.cloud  
- MCP must be configured with correct n8n URL and API key for validate, autofix, trigger, and execution management to work.

---

## 9. Summary

The project has solid plan-first and validation rules but is missing the **auto-fix**, **self-healing test**, and **execution debugging** workflows from the official Synta docs. Updating `.cursor/rules/synta-mcp.agent.mdc` with these flows should improve workflow creation and self-correction.
