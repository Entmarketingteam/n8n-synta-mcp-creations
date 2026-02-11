# n8n ↔ Doppler: Use Doppler as the Only Secrets Source

You want n8n to **pull secrets from Doppler** so you don’t store logins or API keys in n8n Variables or credentials. Here’s how.

---

## 1. n8n built-in External Secrets: no Doppler

n8n’s **Settings → External Secrets** supports only:

- AWS Secrets Manager  
- Azure Key Vault  
- GCP Secrets Manager  
- HashiCorp Vault  
- Infisical (deprecated)

**Doppler is not supported** there. So we use the **Doppler community node** instead.

---

## 2. Recommended: Doppler community node (n8n Cloud or self‑hosted)

Install the community node so workflows can **fetch secrets from Doppler at runtime**. You then store **only one secret in n8n**: your Doppler service token.

### Step 1 – Install the node

1. In n8n: **Settings** (gear) → **Community nodes** (or **Nodes**).
2. **Install a community node** → enter: **`n8n-nodes-doppler-secrets`**.
3. Install and restart if n8n asks.

Docs: [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/installation).  
Node: [qhse-professionals/n8n-nodes-doppler-secrets](https://github.com/qhse-professionals/n8n-nodes-doppler-secrets).

### Step 2 – Create one Doppler credential in n8n

1. In **Doppler**: [Dashboard](https://dashboard.doppler.com) → project **ent-agency-automation** → config **prd** → **Access** → create a **Service Token** (read access to this config is enough). Copy the token (starts with `dp.st.`).
2. In **n8n**: **Credentials** → **Create** → search for **Doppler** (or the name the community node registered). Paste the **Doppler Service Token**. Save.  
   You will **not** store individual API keys or logins in n8n; only this token.

### Step 3 – Use Doppler in workflows

- Add a **Doppler** node (from the community node) at the start of a workflow (or where you need a secret).
- **Resource:** **Secrets** → **Operation:** **Retrieve** (or **Get**).
- **Secret name:** exact name from Doppler (e.g. `OPENAI_API_KEY`, `SHOPMY_NICKI_PASSWORD`).
- Connect the Doppler node to the node that needs the value. In the next node, reference the Doppler output. The Doppler API returns the secret under a `value` object (often `value.computed` or `value.raw`). After adding the node, run it once and inspect the output to see the exact path; then use e.g.:
  - `{{ $node["Doppler"].json.value.raw }}` or
  - `{{ $node["Doppler"].json.value.computed }}`
  (If the node flattens it to a single field like `value`, use `{{ $node["Doppler"].json.value }}`.)

**Pattern:**  
`[Trigger] → [Doppler: Secret → Retrieve, name = OPENAI_API_KEY] → [HTTP Request / OpenAI node: use expression above for API key]`

**Doppler node parameters for Secret → Retrieve:** Set **Project** (e.g. `ent-agency-automation`), **Config** (e.g. `prd`), and **Secret Name** (e.g. `OPENAI_API_KEY`). The credential holds only the Doppler service token.

So from now on:

- **Doppler** = source of truth for all API keys and logins.  
- **n8n** = only stores the Doppler token; everything else is fetched from Doppler when the workflow runs.

---

## 3. Optional: sync script (one-way copy into n8n Variables)

If you prefer **n8n Variables** to hold a copy (e.g. for `$vars.X` or legacy workflows) and don’t want to add a Doppler node to every workflow:

- Run periodically:  
  `doppler run -- node scripts/sync-doppler-to-n8n-variables.js`  
- This **copies** Doppler → n8n Variables. You still maintain secrets only in Doppler; n8n is just a cache. See [N8N-VARIABLES-CHECKLIST.md](N8N-VARIABLES-CHECKLIST.md).

---

## 4. If you self‑host n8n later

You can run the n8n process with Doppler so its **environment** is filled from Doppler (no Variables or sync script needed for `$env`):

```bash
doppler run -- n8n start
```

Then `$env.OPENAI_API_KEY` etc. in n8n will use whatever Doppler injects. This does **not** apply to n8n Cloud (you don’t control the process).

---

## Summary

| Goal | Approach |
|------|----------|
| n8n never holds API keys / logins; only Doppler | Install **n8n-nodes-doppler-secrets**, create **one Doppler credential** (service token), use **Doppler node (Secrets → Retrieve)** in workflows and reference its output. |
| Keep using n8n Variables as a cache | Run **sync-doppler-to-n8n-variables.js** with Doppler; add `GCP_LTK_SCRAPER_SERVICE_ACCOUNT` etc. to the script’s list if needed. |
| Self‑hosted n8n, use $env from Doppler | Run n8n with `doppler run -- n8n start`. |

Moving forward, **install the Doppler community node and use it in workflows** so n8n connects to Doppler for every secret and you don’t have to put logins or API keys into n8n Variables or credential fields.

---

## 5. Universal scenario (copy-paste one node everywhere)

Use **one** Doppler node that loads **all** secrets, then reference any secret by name in any downstream node.

- **Workflow template:** [workflows/doppler-universal-secrets-node.json](../workflows/doppler-universal-secrets-node.json)  
- **Instructions and expressions:** [workflows/README-doppler-universal.md](../workflows/README-doppler-universal.md)

**Quick setup:** Import that workflow, assign your Doppler credential to the **Doppler Secrets** node, then copy that node into any other workflow. In expressions use:

`{{ $node["Doppler Secrets"].json.SECRET_NAME.raw }}`  
(or `.json.SECRET_NAME` if the node returns plain values — run once and check the output.)

Node settings: **Resource** Secret, **Operation** List, **Project** `ent-agency-automation`, **Config** `prd`. Keep the node name **Doppler Secrets** so the expression works everywhere.
