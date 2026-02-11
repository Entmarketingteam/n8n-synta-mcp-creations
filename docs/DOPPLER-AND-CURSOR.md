# Doppler + Cursor: Always Use Doppler for Secrets

This repo is set up so **Doppler is the single source of truth** for secrets. Cursor (and you) should always use it.

---

## 1. Cursor / Agent behavior

- **Project rule:** `.cursor/rules/doppler.mdc` tells Cursor to always run scripts that need secrets with `doppler run -- ...` and never to hardcode API keys or paste secrets in chat.
- **Global rule (optional):** If you added `~/.cursor/rules/doppler.mdc` globally, that reinforces the same for all projects.

So from here on, when you or the agent run a script in this repo that uses `N8N_API_KEY`, `OPENAI_API_KEY`, etc., the command should be:

```bash
doppler run -- node scripts/import-workflows-to-n8n.js
doppler run -- node scripts/sync-doppler-to-n8n-variables.js
```

---

## 2. Your shell (optional but recommended): direnv

So that **every** terminal session in this repo has Doppler secrets without typing `doppler run` each time:

1. **Install direnv** (if you don’t have it):
   - macOS: `brew install direnv`
   - Add to `~/.zshrc`: `eval "$(direnv hook zsh)"` (or `bash` if you use bash), then `source ~/.zshrc`.

2. **Allow the project’s `.envrc` once** (from the repo root):
   ```bash
   direnv allow
   ```

3. After that, whenever you `cd` into this repo, Doppler secrets are loaded into your shell automatically. Any command (e.g. `node scripts/...`, `npm run ...`) will see them.

---

## 3. n8n (Cloud) + Doppler

n8n Cloud can use Doppler in two ways:

- **Preferred – Doppler community node:** Install **n8n-nodes-doppler-secrets** in n8n, add one Doppler credential (service token), and in each workflow use a **Doppler** node (Secret → Retrieve) to fetch secrets by name at runtime. No API keys or logins stored in n8n; only the Doppler token. See **[N8N-DOPPLER-SETUP.md](N8N-DOPPLER-SETUP.md)**.

- **Alternative – Sync script:** Run periodically (or after changing secrets):
  ```bash
  doppler run -- node scripts/sync-doppler-to-n8n-variables.js
  ```
  This pushes Doppler vars into n8n Variables (requires n8n Pro/Enterprise for the Variables API). See [N8N-VARIABLES-CHECKLIST.md](N8N-VARIABLES-CHECKLIST.md).

---

## 4. Checklist

- [ ] Doppler CLI installed and logged in (`doppler login`), and `doppler setup` run in this repo (or globally) for project `ent-agency-automation` / config `prd`.
- [ ] Cursor: project rule `.cursor/rules/doppler.mdc` exists (so the agent uses Doppler).
- [ ] Optional: direnv installed, hook in shell, and `direnv allow` run in this repo so `cd` here loads Doppler into the shell.
- [ ] n8n: install **n8n-nodes-doppler-secrets**, create one Doppler credential, use Doppler node in workflows (see [N8N-DOPPLER-SETUP.md](N8N-DOPPLER-SETUP.md)); or run the sync script / update n8n Variables when you change secrets.
