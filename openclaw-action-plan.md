# OpenClaw Action Plan — ENT Agency
**Updated:** March 30, 2026 (original: February 27, 2026)
**Server:** 45.55.236.188 (DigitalOcean)
**Version:** OpenClaw 2026.2.3, Claude Opus 4.5 (routing to be updated — see Phase 1)
**Channels:** WhatsApp (+14406558502), Telegram (@ClawENTagencybot)
**Source research:** 23 posts from OpenClaw Unboxed newsletter (March 2026)

---

## Mental Model (New — Clarifies Everything)

OpenClaw is a **trigger + workflow system**, not "an agent that does things."

```
heartbeat  = awareness turn on every message (use tiny/cheap model only)
cron       = precise scheduled jobs, isolated runs
lobster    = deterministic workflow runner with approval gates + resume tokens
llm-task   = structured outputs for individual AI steps
memory     = plain markdown files on disk — the files ARE the source of truth
```

**The original plan conflated heartbeat with cron.** Morning briefs and scheduled jobs should use `cron`, not heartbeat. Heartbeat runs on every agent turn and will silently drain tokens if assigned to Opus.

---

## ⚠️ Corrections to Original Plan

| Original Assumption | Correction |
|---|---|
| Morning brief via heartbeat | Use `cron` for all scheduled jobs. Heartbeat ≠ scheduler. |
| Opus 4.5 as default model | Heartbeat must use Haiku or cheaper. Opus only for complex judgment. |
| Skills from ClawHub are reasonably safe | 13.4% have critical issues. Scan every skill before install. |
| sessionKey = authorization | sessionKey is routing only — not an access control mechanism. |
| Memory is a feature you enable | Memory is just files on disk. If it's not written, it doesn't exist. |
| Structured logging via TOOLS.md instructions | Use `agents.defaults.compaction.memoryFlush` config to ensure critical state survives compaction. |

---

## Current State (as of late March 2026)

Claw is live on DigitalOcean with WhatsApp and Telegram working. Doppler manages secrets. Workspace files (SOUL.md, TOOLS.md, SECURITY.md, AGENTS.md, USER.md, IDENTITY.md, MEMORY.md) are in place. The Instagram daily digest n8n workflow exists but is not yet imported. Security posture is decent but missing: structured cost tracking, skill supply chain hygiene, memory flush config, and a proper recovery ladder.

---

## Phase 1: Secure the Foundation (This Week)

### 1.1 Rotate Compromised Keys ✅ (from original — still required)

Several API keys were exposed during setup sessions. Rotate in Doppler immediately:
- Notion API token
- OpenAI API key
- Google service account credentials
- Telegram bot token
- OpenClaw gateway token

```bash
doppler secrets set KEY=value --project ent-agency-automation --config dev
```
Restart OpenClaw service and verify each channel after rotation.

### 1.2 Enable Backups ✅ (from original — still required)

**Fastest option:** Enable DigitalOcean droplet snapshots (~$2/mo). Done in 2 minutes via the DO console.

**Proper backup script:**
```bash
# Add to crontab on droplet — daily 3am backup
0 3 * * * tar czf /tmp/openclaw-backup-$(date +%Y%m%d).tar.gz \
  /home/openclaw/.openclaw/ \
  /etc/nginx/sites-available/ \
  /etc/systemd/system/openclaw* \
  && rclone copy /tmp/openclaw-backup-$(date +%Y%m%d).tar.gz remote:openclaw-backups/ \
  && rm /tmp/openclaw-backup-$(date +%Y%m%d).tar.gz
```

### 1.3 Fix Heartbeat Model (NEW — Critical for Cost)

The original plan runs Opus 4.5 everywhere. Heartbeat fires on every agent turn. This is the "quiet drain" the newsletter specifically warned about.

**Update `config → raw json` in the OpenClaw dashboard:**
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "groq/llama-3.1-8b-instant",
        "fallbacks": [
          "openrouter/z-ai/glm-4.5-air:free",
          "openrouter/moonshotai/kimi-k2:free",
          "anthropic/claude-opus-4-5"
        ]
      },
      "heartbeat": {
        "model": "ollama/qwen2.5:0.5b"
      }
    }
  }
}
```

This routes:
- **Heartbeat (every turn awareness):** Local Qwen — zero API cost
- **Standard tasks:** Groq free inference (fast, free tier)
- **Fallbacks:** OpenRouter free models
- **Break-glass only:** Opus 4.5 for complex judgment tasks

Verify after applying:
```bash
openclaw models status --probe
# Then in chat:
/model status
```

### 1.4 Install Local Fallback Model (NEW)

Prevents complete outages when cloud providers rate limit or go down:
```bash
ollama pull qwen2.5:0.5b
ollama run qwen2.5:0.5b  # test it
```

### 1.5 Memory Flush Config (NEW — Critical for Data Persistence)

Without this, important context gets silently dropped during compaction. The "agent forgot" problem is almost always this.

Add to OpenClaw config:
```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": true
      }
    }
  }
}
```

This triggers a silent `NO_REPLY` housekeeping turn before compaction that writes durable notes to disk. Also ensure the agent workspace is NOT read-only — memory can't persist if write access is blocked.

**Memory structure on disk (enforce this layout):**
```
~/.openclaw/workspace/
  MEMORY.md          ← curated long-term facts (auto-injected every turn)
  memory/
    YYYY-MM-DD.md    ← daily append-only log (accessed via memory_search/memory_get)
```

### 1.6 Skill Supply Chain Audit (NEW — Security)

13.4% of ClawHub skills have critical security issues. 36.82% have at least one flaw. Run this before trusting any installed skill:

**Step 1 — Automated scan:**
```bash
uvx mcp-scan@latest --skills
```

**Step 2 — Manual grep for execution chains:**
```bash
grep -RInE "curl|wget|base64|chmod \+x|sudo|sh -c|powershell|Invoke-WebRequest|python -c" \
~/.openclaw/workspace/skills 2>/dev/null | head -n 200
```

**Step 3 — Memory inspection (check for injected instructions):**
```bash
cat ~/.openclaw/memory/*
# Look for: injected instructions, unexpected URLs, secrecy language, unusual task directives
```

**Step 4 — Outbound monitoring:**
```bash
lsof -i
netstat -an | grep ESTABLISHED
```

**Red flags — do not install skills with:**
- `curl | bash` patterns
- Remote script fetching in setup steps
- Password-protected zip downloads
- Hidden instructions between legitimate content
- Brand-new publisher with lots of uploads

### 1.7 Token Usage Monitoring (from original — updated approach)

**Native OpenClaw diagnostic:**
```bash
openclaw logs --follow
openclaw doctor
```

Check the diagnostics export for: queue depth, run duration, context size, token usage, cost, message-processing spans.

**Set routing guardrail in chat once:**
```
you are running on a multi-provider ai ladder.
rules:
- use primary model first
- if provider returns 429 or timeout, move to next fallback immediately
- never retry same provider more than once
- use paid model only for deep reasoning or complex analysis
- prefer free models for all short/routine tasks
```

---

## Phase 2: Install High-Value Skills (Next 1-2 Weeks)

**Before installing any skill:** Run the audit commands from 1.6 above.

### 2.1 Self-Improving Agent (Priority: Highest) ✅

**Source:** clawhub.ai/pskoett/self-improving-agent
**File:** Already downloaded to /mnt/user-data/uploads/self-improving-agent-1_0_11__1_.zip

Creates the learning loop: errors/corrections persist to `.learnings/` (LEARNINGS.md, ERRORS.md, FEATURE_REQUESTS.md) and get promoted to workspace files. Run skill scan before installing.

**Time estimate:** 1-2 hours

### 2.2 Humanizer (Priority: High) ✅

**Source:** github.com/blader/humanizer (3.9k stars)

Removes 24 AI writing patterns. Every piece of client-facing content goes through this. Run skill scan if installing via ClawHub.

**Time estimate:** 30 minutes

### 2.3 Tool Reduction Audit (NEW — Priority: High)

Before adding any more skills or tools, run this optimizer prompt on current tool configuration:

```
act as a systems optimizer for agent workflows.
goal: reduce tool-induced failure without reducing the outcome.

input:
- workflow goal
- current tools
- tool descriptions

tasks:
1. find overlapping tools
2. find tools that create ambiguity
3. find tools that are rarely needed
4. identify tools that should be conditional
5. identify tools that should be replaced with deterministic functions
6. reduce to the minimum viable toolset
7. rank remaining tools by: necessity, risk, likelihood of incorrect selection

output:
- failure risks
- tools to remove
- tools to merge
- simplified architecture
- why this improves performance
```

Research found: removing 80% of tools improved success rate from 80% → 100%, cut execution time from ~275s to ~77s, tokens from ~102k to ~61k. More tools = more wrong decisions.

**Rule before adding any tool:** Does this really change the outcome? Is there already overlap? Will this create confusion? What happens if it's used incorrectly?

**Three bucket framework:** Force every tool into: retrieval / transformation / action. If it doesn't fit cleanly, you probably don't need it yet.

### 2.4 X Research Skill (Priority: Low)

**Source:** clawhub.ai/rohunvora/x-research-skill

Monitor creator mentions, track health/wellness trends, identify brand opportunities. Evaluate only after Phase 1 is complete and after running skill scan.

**Time estimate:** 1 hour to evaluate + install

---

## Phase 3: Activate Core Workflows (Weeks 2-3)

### Workflow Validation Filter (NEW — Apply Before Building)

Before building any new workflow, score it 1-5 on each dimension:

| Dimension | What to measure |
|---|---|
| Frequency | How often does this task happen? |
| Pain | How much does manual execution hurt? |
| Dollar impact | Revenue saved/generated if automated? |
| Error cost | What's the cost of an automation mistake? |
| Approval friendliness | Can humans review before action? |
| Integration simplicity | How many systems need to connect? |
| Source-of-truth clarity | Is there one clear data owner? |
| Measurability | Can you measure if it's working? |

**Score guide:** 8-16 = content idea. 17-24 = interesting but weak. 25-32 = worth prototyping. **33-40 = build this.**

**Good workflow format (concrete, not vague):**
```
scan inbox → classify messages → surface only stale leads → 
draft reply → wait for approval → update CRM
```

Not: "check inbox and handle stuff intelligently"

### 3.1 Morning Brief — 7am CT Daily Digest (Updated)

**Correction from original plan:** Use `cron`, not heartbeat. Heartbeat runs on every turn and would fire the brief on every message, not at 7am.

```json
{
  "cron": [
    {
      "name": "morning-brief",
      "schedule": "0 7 * * 1-5",
      "timezone": "America/Chicago",
      "agent": "main",
      "task": "Generate and deliver morning brief to Telegram"
    }
  ]
}
```

**Steps:**
1. Import instagram-daily-digest.json workflow to entagency.app.n8n.cloud
2. Configure webhook between Claw and n8n
3. Set up cron trigger (above config)
4. Test end-to-end: cron fires → n8n pulls data → formats digest → Claw delivers via Telegram

**Expand over time to include:**
- Creator posting compliance (who posted, who didn't)
- Affiliate revenue snapshots (LTK/Amazon)
- Brand pipeline status from Airtable
- Trending opportunities from X research skill

**Time estimate:** 2-3 hours initial, ongoing iteration

### 3.2 Content Factory Pattern (from original)

Architecture for ENT Agency:
```
[Research Phase — 7am daily via cron]
  Claw monitors: trending health/wellness topics, competitor creator content,
  brand campaign announcements, subreddit activity

[Analysis Phase — triggered by research via lobster workflow]
  Claw identifies: content opportunities mapped to specific creators,
  potential brand alignment, viral format patterns

[Draft Phase — on demand or scheduled]
  Claw drafts: caption suggestions, content briefs, pitch angles
  → runs through Humanizer skill before delivery

[Distribution Phase — APPROVAL GATE required]
  Lobster workflow with resume token holds for creator approval
  before any content goes live
```

**Critical constraint:** Creator approval gate is non-negotiable. Use lobster's approval gate pattern (not just a prompt instruction). AGENTS.md rules reinforce this.

**Time estimate:** Ongoing, start with research phase only

### 3.3 Multi-Agent Coordination (Future Phase 4+)

Do not start here. Get one Claw instance rock-solid first.

**When ready, ENT Agency split:**
- **Strategy Agent:** Content calendar, brand pipeline, competitive analysis
- **Analytics Agent:** Platform data, performance reporting, trend detection
- **Outreach Agent:** Brand pitches, creator communication, follow-ups
- **Operations Agent:** Invoices, contracts, scheduling

Sessions between agents communicate via `sessions_send`. Each agent has its own workspace and auth profile — credentials are NOT shared automatically.

---

## Phase 4: Hardening & Optimization (Ongoing)

### 4.1 Security Audit Workflow (Updated + Expanded)

**Built-in OpenClaw audit — run weekly:**
```bash
openclaw security audit --deep
openclaw security audit --fix   # applies safe deterministic remediations
openclaw security audit --json  # for logging
```

The `--fix` flag handles: flipping `groupPolicy="open"` to allowlist, tightening redaction defaults, locking down permissions on sensitive state/config files.

**Additional hardening — run once:**
```bash
# Already doing:
✅ Gateway bound to localhost with nginx proxy
✅ Doppler for secrets
✅ Dedicated VPS

# Add:
□ TruffleHog pre-commit hook (AI will hardcode secrets if not prevented)
□ Weekly skill scan via uvx mcp-scan
□ DM scope: per-channel-peer for shared inboxes (NOT "main" which merges all DMs)
□ Session visibility audit: check tools.sessions.visibility setting
```

**DM scope fix (important for multi-user setups):**
If more than one person can DM the agent, update config:
```json
{
  "agents": {
    "defaults": {
      "session": {
        "dmScope": "per-channel-peer"
      }
    }
  }
}
```
The default `"main"` merges all DM context into one session — a privacy/contamination issue.

### 4.2 Hardening Config for Risky Workflows (NEW)

For workflows touching client data, external APIs, or production systems:
```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "scope": "session",
        "workspaceAccess": "none",
        "workspaceRoot": "~/.openclaw/sandboxes",
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "workdir": "/workspace",
          "readOnlyRoot": true,
          "tmpfs": ["/tmp", "/var/tmp", "/run"]
        }
      }
    }
  },
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

**Note:** `deny` always wins over `allow`. Denied tools are never sent to the model provider at all.

### 4.3 Round-Robin Provider Routing for Cost Efficiency (NEW)

LiteLLM as a routing layer cycles across multiple free providers instead of hammering one until rate limited:

```
Architecture:
OpenClaw → LiteLLM router → [gemini-2.5-flash-lite | groq llama-3.3-70b | openrouter free rotation | ollama local]
```

**Free compute ladder in order:**
1. `gemini-2.5-flash-lite` (Google free tier, fast)
2. `groq/llama-3.3-70b-versatile` (very fast, generous free tier)
3. OpenRouter free model rotation (backup)
4. `ollama/qwen2.5:0.5b` (local safety net — never completely down)
5. `anthropic/claude-opus-4-5` (break-glass only, complex judgment)

Each provider has a "bucket" of daily API calls. Round-robin keeps all buckets partially full instead of draining one before moving on.

**Keys to get:**
- Groq: console.groq.com
- OpenRouter: openrouter.ai (20 req/min free, daily caps)
- Google: aistudio.google.com

### 4.4 Workspace Knowledge Compound Loop (from original — updated)

With the self-improving agent + memory flush config:
```
Error/Correction occurs
  → Logged to ERRORS.md / LEARNINGS.md
  → Pre-compaction flush ensures it's written to disk before context clears
  → Important items promoted to SOUL.md, AGENTS.md, TOOLS.md by self-improving agent
  → Claw's behavior improves across all future sessions
  → Monthly review: prune outdated learnings, promote best to SOUL.md
```

### 4.5 Governance Framework (NEW — Luffa-Inspired, No Tool Required)

Even without adopting Luffa (an identity/governance layer for agents — still early/alpha), define these boundaries now for each workflow:

For each automated workflow, document:
1. **What actions must be logged?** (all tool calls touching client data)
2. **Where is approval required?** (content publishing, CRM writes, any financial action)
3. **What should never be autonomous?** (anything irreversible without human review)
4. **How would you explain this behavior to a client?** (if you can't explain it, the system isn't complete)

Simple test: _If behavior can't be explained clearly, the system isn't ready for production._

Agents without defined identity and accountability are tools. Agents with them are systems. The governance layer is what lets you eventually scale to clients and team usage.

### 4.6 Recovery Ladder — Bookmark This (NEW)

When OpenClaw breaks, run this sequence before doing anything else:

```bash
# Step 1 — 60-second triage
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow

# Step 2 — If auth/model smells wrong
openclaw models status
openclaw models status --probe  # live probe, sharper but slower

# Step 3 — If memory feels stale/wrong
openclaw memory status --deep
# Check: is the right workspace active? Is memory writing to disk?

# Step 4 — If bot is online but no replies reaching users
# Check: pairing status, allowlists, mention gating, channel policy
# NOT the model — it's almost never the model

# Step 5 — Inspect installed skills
openclaw skills
openclaw skills check
openclaw skills info <skill-name>
```

**Rule:** Never trust narration. Trust the smallest piece of evidence that proves where the break lives. Auth drift ≠ memory weirdness ≠ channel delivery failure. Each is a different fix.

**Common root causes (not the model):**
- Each agent has its own auth profile — credentials don't share automatically
- Memory failure = workspace path issue, not a memory "feature" bug
- Gateway is one trusted operator boundary — mixing trust levels causes weird behavior
- "Bot online, no replies" = pairing/allowlist issue 90% of the time

---

## Priority Matrix (Updated)

| Task | Impact | Effort | Phase | Status |
|---|---|---|---|---|
| Rotate compromised keys | 🔴 Critical | 30 min | 1 | |
| Enable DO backup snapshots | 🔴 Critical | 20 min | 1 | |
| Fix heartbeat model to Haiku/local | 🔴 Critical | 15 min | 1 | NEW |
| Memory flush config | 🔴 Critical | 15 min | 1 | NEW |
| Install local Ollama fallback | 🟡 High | 20 min | 1 | NEW |
| Skill supply chain audit (scan all installed) | 🟡 High | 30 min | 1 | NEW |
| Tool reduction audit | 🟡 High | 1 hr | 2 | NEW |
| Install self-improving agent | 🟡 High | 1-2 hr | 2 | |
| Install humanizer skill | 🟢 Medium | 30 min | 2 | |
| Import Instagram digest to n8n | 🟡 High | 2-3 hr | 3 | |
| Set up 7am morning brief **via cron** | 🟡 High | 1 hr | 3 | Updated |
| Configure free compute ladder (Groq/OpenRouter) | 🟡 High | 1 hr | 3 | NEW |
| DM scope: per-channel-peer | 🟡 High | 10 min | 1 | NEW |
| Workflow validation filter (score new workflows) | 🟢 Medium | Ongoing | 3 | NEW |
| Content factory research phase | 🟢 Medium | Ongoing | 3 | |
| TruffleHog pre-commit secret scanning | 🟢 Medium | 1 hr | 4 | |
| Round-robin LiteLLM routing | 🟢 Medium | 2 hr | 4 | NEW |
| Governance framework documentation | 🟢 Medium | 1 hr | 4 | NEW |
| Weekly skill scan cron job | 🟢 Medium | 20 min | 4 | NEW |
| Install X research skill | 🟢 Low | 1 hr | 2 | |
| Luffa identity layer | 🔵 Watch | Significant | Future | NEW |
| NemoClaw sandbox | 🔵 Watch | Significant | Future | NEW |
| Multi-agent coordination | 🔵 Future | Significant | 4+ | |

---

## What NOT to Build (Lessons from Newsletter)

- **Multi-agent swarms / self-improving loops / "autonomous business"** — builds cool, breaks immediately. Start with one boring workflow that runs every day without failing.
- **Everything with heartbeat as scheduler** — heartbeat ≠ cron. Every heartbeat turn = token cost.
- **Tools for everything** — adding tools hurts performance. Remove more than you add. Success rate and speed both improve with fewer tools.
- **NemoClaw now** — alpha software, requires fresh OpenClaw install, not production-ready yet. Watch it but don't build on it.
- **Luffa now** — no proven production footprint yet. The governance thinking is valuable; the tool is not ready.

---

## Definition of Done (Updated)

**Phase 1 complete when:**
- All compromised keys rotated and verified working
- Automated backups running
- Heartbeat running on cheap/local model, NOT Opus
- Memory flush config applied and verified
- All installed skills scanned with `uvx mcp-scan@latest --skills`
- DM scope set to per-channel-peer

**Phase 2 complete when:**
- Tool reduction audit completed — removed anything redundant
- Self-improving agent installed and tested with deliberate error/correction cycle
- Humanizer skill functional via Telegram command
- Free compute ladder configured (Groq primary + OpenRouter fallbacks)

**Phase 3 complete when:**
- Morning brief delivers to Telegram at 7am CT via cron (not heartbeat)
- At least one n8n workflow running in production
- Content research phase producing actionable creator content ideas
- Each workflow has passed the buying-threshold filter (score 25+)

**The north star:** Claw handles the operational overhead of managing 10-14 creators so Emily and Ethan can focus on strategy, relationships, and growing the agency. Every automation must pass: "Does this reduce human-in-the-loop burden while maintaining quality and creator trust?" And now also: "Can I explain exactly what the agent did and why?"

---

## Research Sources

| Resource | What It Added |
|---|---|
| OpenClaw Unboxed newsletter (23 posts, Mar 2026) | Architecture series, free compute ladder, skill supply chain security, memory flush config, recovery ladder, tool reduction research, governance framework, ClawReflex pattern |
| awesome-openclaw-usecases (4.2k ★) | Content Factory, Multi-Agent Team, Self-Healing Server patterns |
| claude-flow (14.9k ★) | Smart model routing, swarm architecture |
| self-improving-agent (clawhub) | Structured learning loop |
| humanizer (3.9k ★) | AI writing pattern detection |
| OpenClaw Arch Series (Parts 1-6) | Systems-level understanding: sessions, memory, concurrency, security, tools, observability |
| NemoClaw/OCTW analysis | Runtime containment vs tenant isolation distinction |
| Snyk ToxicSkills audit (3,984 skills) | 13.4% critical issues; `uvx mcp-scan@latest` recommendation |
| Koi Security audit (2,857 skills) | 341 malicious skills anatomy, attack patterns |
