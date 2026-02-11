# Enable Synta MCP Self-Healing (Autofix, Trigger, Pindata)

The errors `Cannot read properties of undefined (reading 'execute')` for `n8n_autofix_workflow` (apply), `n8n_trigger_execution`, and `publishWorkflow` occur because **n8n login credentials are missing** from your MCP config.

## Fix: Add n8n Login Credentials

Synta MCP needs **two** auth levels:

| Credential | Enables | Tools |
|------------|---------|-------|
| **API key only** | Read/write workflows | list, get, validate, update_partial, autofix **preview**, test_workflow |
| **+ Login email + password** | Execution & self-healing | autofix **apply**, trigger_execution, pindata CRUD, publishWorkflow |

## Setup Steps

### 1. Get your n8n login credentials

- Email: your n8n account email
- Password: your n8n account password

### 2. Edit Cursor MCP config

**File:** `~/.cursor/mcp.json` (macOS) or `%APPDATA%\Cursor\mcp.json` (Windows)

### 3. Add login headers to synta-mcp

**If using API Key (npx command):**

```json
{
  "mcpServers": {
    "synta-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.synta.io/mcp",
        "--header",
        "Authorization: Bearer YOUR_SYNTA_API_KEY",
        "--header",
        "X-N8n-Url: https://entagency.app.n8n.cloud",
        "--header",
        "X-N8n-Key: YOUR_N8N_API_KEY",
        "--header",
        "X-N8n-Login-Email: YOUR_N8N_EMAIL",
        "--header",
        "X-N8n-Login-Password: YOUR_N8N_PASSWORD"
      ]
    }
  }
}
```

**If using OAuth:**

Log in at [synta.io/mcp](https://synta.io/mcp) and add your n8n login credentials during onboarding. OAuth syncs them automatically.

### 4. Restart Cursor

Fully quit Cursor and reopen. Start a **new chat** so the MCP reconnects with the new config.

### 5. Verify

Ask: "Use synta-mcp to run autofix apply on workflow 34SXr17ABbAv0Dzj"

If it succeeds, self-healing is enabled.

## Security Note

- Never commit `mcp.json` with real credentials
- Use a dedicated n8n user for MCP if possible
- Rotate credentials if exposed

## Reference

- [Synta Installation – Enable Self-Healing](https://mcp-docs.synta.io/installation)
- [Troubleshooting – Execution failures](https://mcp-docs.synta.io/troubleshooting)
- n8n instance: https://entagency.app.n8n.cloud
