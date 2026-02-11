# Universal Doppler node – copy & paste

One Doppler node that loads **all secrets** from your config. Use it in any workflow and reference any secret by name.

---

## 1. Import the template (once)

- In n8n: **Workflows** → **Import from File** → choose **`doppler-universal-secrets-node.json`** from this repo.
- If import reports an unknown node type, the community node may use a different type name: add a **Doppler** node manually and use the settings in §3 below.
- Open the workflow and set the **Doppler** node’s credential to your Doppler API credential (the one with your service token for **ent-agency-automation** / **prd**).
- Save.

---

## 2. Copy the node into any workflow

- Open **Doppler – Universal secrets (copy this node)**.
- Select the **Doppler Secrets** node → duplicate/copy (Ctrl/Cmd+C).
- Open the workflow where you need secrets → paste (Ctrl/Cmd+V).
- Connect it right after your trigger (or at the point where you need secrets). All downstream nodes can then read from Doppler.

You can also recreate the node manually with the settings below.

---

## 3. Node settings (if you add it by hand)

| Field    | Value                    |
|----------|--------------------------|
| **Node name** | `Doppler Secrets` (keep this so expressions work) |
| **Resource**  | Secret                   |
| **Operation** | List                     |
| **Project**   | `ent-agency-automation`  |
| **Config**    | `prd`                    |
| **Credential**| Your Doppler credential (service token) |

---

## 4. Use in expressions (copy & paste)

Replace `SECRET_NAME` with the exact name from Doppler (e.g. `OPENAI_API_KEY`, `SHOPMY_NICKI_PASSWORD`).

**If the node returns plain values (secret name = value):**
```text
{{ $node["Doppler Secrets"].json.SECRET_NAME }}
```

**If the node returns objects with `raw` / `computed` (run the node once and check the output):**
```text
{{ $node["Doppler Secrets"].json.SECRET_NAME.raw }}
```
or
```text
{{ $node["Doppler Secrets"].json.SECRET_NAME.computed }}
```

**Examples:**
```text
{{ $node["Doppler Secrets"].json.OPENAI_API_KEY.raw }}
{{ $node["Doppler Secrets"].json.SHOPMY_NICKI_PASSWORD.raw }}
{{ $node["Doppler Secrets"].json.N8N_API_KEY.raw }}
```

---

## 5. Different project/config

If you use another Doppler project or config, change only **Project** and **Config** on the same node; the expressions stay the same. Keep the node name **Doppler Secrets** so you don’t have to change expressions.
