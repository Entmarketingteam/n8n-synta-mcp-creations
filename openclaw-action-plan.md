# OpenClaw Action Plan — ENT Agency
**Date:** February 27, 2026
**Server:** 45.55.236.188 (DigitalOcean)
**Version:** OpenClaw 2026.2.3, Claude Opus 4.5
**Channels:** WhatsApp (+14406558502), Telegram (@ClawENTagencybot)

---

## Current State

Claw is live on a dedicated DigitalOcean droplet with WhatsApp and Telegram channels working. Doppler manages 41 secrets as single source of truth. Workspace files (SOUL.md, TOOLS.md, SECURITY.md, AGENTS.md, USER.md, IDENTITY.md, MEMORY.md) enforce behavioral rules, trust levels, and Doppler-first architecture. An Instagram daily digest n8n workflow is built but not yet imported to entagency.app.n8n.cloud.

Security posture is decent — gateway binds to localhost, nginx proxies with token auth, dedicated isolation — but there are real gaps in logging, cost monitoring, and backups. No structured logging of tool calls, no token usage tracking on Opus 4.5, and nothing preventing data loss from a bad command or droplet failure.

Research across the OpenClaw community (WhatsApp/Telegram channels, GitHub skills, awesome-usecases repo, claude-flow architecture, security guides) has been synthesized into prioritized recommendations below.

---

## Phase 1: Secure the Foundation (This Week)

These are non-negotiable. A single incident in any of these areas could mean losing the entire setup or leaking client data.

### 1.1 Rotate Compromised Keys
Several API keys were exposed during setup sessions and are visible in conversation history.

**Rotate in Doppler immediately:**
- Notion API token
- OpenAI API key
- Google service account credentials
- Telegram bot token
- OpenClaw gateway token

**Process:** Generate new keys in each service → update in Doppler (`doppler secrets set KEY=value`) → restart OpenClaw service → verify each channel still works.

**Time estimate:** 30-45 minutes

### 1.2 Implement Backup Strategy
Right now one bad `rm` or droplet failure loses everything.

**Minimum viable backup:**
```bash
# Add to crontab on the droplet
# Daily backup of workspace + config to a remote location
0 3 * * * tar czf /tmp/openclaw-backup-$(date +%Y%m%d).tar.gz \
  /home/openclaw/.openclaw/ \
  /etc/nginx/sites-available/ \
  /etc/systemd/system/openclaw* \
  && doppler run -- rclone copy /tmp/openclaw-backup-$(date +%Y%m%d).tar.gz remote:openclaw-backups/ \
  && rm /tmp/openclaw-backup-$(date +%Y%m%d).tar.gz
```

**Better option:** DigitalOcean droplet snapshots (weekly, automated via DO API or their backup add-on — $2/mo for the $6 droplet).

**Time estimate:** 20 minutes for DO backups toggle, 1 hour for custom script

### 1.3 Structured Logging
Currently journalctl captures service logs, but there's no structured record of every tool call, API request, and cost.

**Approach:** Add a logging wrapper or update TOOLS.md to instruct Claw to append structured entries to a log file:
```
/home/openclaw/.openclaw/workspace/logs/YYYY-MM-DD.log
```

Each entry: timestamp, tool name, input summary, output summary, estimated tokens, success/failure.

This also feeds into the self-improving agent skill (Phase 2) — errors logged here get promoted to ERRORS.md.

**Time estimate:** 1 hour to implement and test

### 1.4 Token Usage Monitoring
On Opus 4.5, costs add up fast. No monitoring means no visibility until the bill arrives.

**Options (pick one):**
- **Anthropic API dashboard:** Check if OpenClaw exposes usage metrics or if the Anthropic console tracks per-key usage
- **Smart model routing (from claude-flow concept):** Configure Claw to use a cheaper model for routine tasks (scheduling, simple lookups, message forwarding) and only invoke Opus for complex work (content strategy, brand pitch drafting, performance analysis). This is the single most transferable idea from the claude-flow research.
- **Budget alerts:** Set a monthly token budget in Doppler as `MONTHLY_TOKEN_BUDGET` and have Claw check against it

**Time estimate:** 30 minutes for dashboard check, 2-3 hours for smart routing implementation

---

## Phase 2: Install High-Value Skills (Next 1-2 Weeks)

These three skills were evaluated against 8+ options from the community. They're ranked by direct impact on ENT Agency operations.

### 2.1 Self-Improving Agent (Priority: Highest)
**Source:** clawhub.ai/pskoett/self-improving-agent
**File:** Already downloaded to /mnt/user-data/uploads/self-improving-agent-1_0_11__1_.zip

**What it does:** Creates a structured learning loop where errors, corrections, and new knowledge persist across sessions and get promoted into workspace files. Logs to `.learnings/` directory (LEARNINGS.md, ERRORS.md, FEATURE_REQUESTS.md). Important learnings get promoted to SOUL.md, AGENTS.md, TOOLS.md.

**Why it matters for ENT Agency:** Claw currently loses context between sessions. This skill means every mistake gets recorded, every correction persists, and operational knowledge compounds over time. The workspace already has the exact file structure it expects.

**Installation:** Extract zip → copy skill files to workspace → update SOUL.md to reference the learning loop → test with a deliberate error/correction cycle.

**Time estimate:** 1-2 hours

### 2.2 Humanizer (Priority: High)
**Source:** github.com/blader/humanizer (3.9k stars)

**What it does:** Removes 24 AI-generated writing patterns across 4 categories (content, language, style, communication). Detects significance inflation, AI vocabulary, em dash overuse, chatbot artifacts, filler phrases. Usage: `/humanizer [text]` or natural language.

**Why it matters for ENT Agency:** Every piece of content Claw helps draft for creators goes through this filter before publishing. Before/after examples are also useful training material for creators learning to spot AI tells in their own writing.

**Installation:** Install as OpenClaw skill via ClawHub or manual workspace integration.

**Time estimate:** 30 minutes

### 2.3 X Research Skill (Priority: Medium)
**Source:** clawhub.ai/rohunvora/x-research-skill

**What it does:** Monitors X/Twitter for mentions, trends, and competitor activity.

**Why it matters for ENT Agency:** Monitor creator mentions, track health/wellness trends, identify potential brand partnership opportunities from trending conversations.

**Time estimate:** 1 hour to evaluate and install

---

## Phase 3: Activate Core Workflows (Weeks 2-3)

### 3.1 Morning Brief — 7am CT Daily Digest
The Instagram daily digest n8n workflow is built (`instagram-daily-digest.json`) but not imported to entagency.app.n8n.cloud.

**Steps:**
1. Import workflow to n8n cloud
2. Configure webhook integration between Claw and n8n
3. Set up 7am CT cron trigger
4. Test end-to-end: cron fires → n8n pulls data → formats digest → sends to Claw → Claw delivers via Telegram

**Expand over time to include:**
- Creator posting schedule compliance (who posted, who didn't)
- Affiliate revenue snapshots from LTK/Amazon
- Brand partnership pipeline status from Airtable/Notion
- Trending content opportunities (from X research skill)

**Time estimate:** 2-3 hours for initial setup, ongoing iteration

### 3.2 Content Factory Pattern
Adapted from the awesome-usecases repo's Content Factory use case, tailored for ENT Agency.

**Architecture:**
```
[Research Phase - 7am daily]
  Claw monitors: trending health/wellness topics, competitor creator content,
  brand campaign announcements, subreddit activity

[Analysis Phase - triggered by research]
  Claw identifies: content opportunities mapped to specific creators,
  potential brand alignment, viral format patterns

[Draft Phase - on demand or scheduled]
  Claw drafts: caption suggestions, content briefs, pitch angles
  → runs through Humanizer skill before delivery

[Distribution Phase - creator approval required]
  Claw stages: cross-platform posting via n8n workflows
  (Instagram, TikTok, LTK — never auto-publishes without approval)
```

**Critical constraint:** Creator approval gate before any content goes live. This is a "least human in the loop" system, not a "no human in the loop" system. AGENTS.md already has approval workflow rules — this reinforces them.

**Time estimate:** Ongoing build, start with research phase only

### 3.3 Multi-Agent Coordination (Future)
From the awesome-usecases research: multiple specialized Claw instances coordinated through shared memory via a single Telegram chat. Pattern validated by community members running 4-15+ agents across multiple machines.

**ENT Agency version:**
- **Strategy Agent:** Content calendar, brand partnership pipeline, competitive analysis
- **Analytics Agent:** Platform data aggregation, performance reporting, trend detection
- **Outreach Agent:** Brand pitch drafting, creator communication, follow-up sequences
- **Operations Agent:** Invoice tracking, contract management, scheduling

**This is Phase 3+ territory.** Don't start here. Get one Claw instance rock-solid first, then consider splitting into specialized agents when the single instance hits context window or capability limits.

---

## Phase 4: Hardening & Optimization (Ongoing)

### 4.1 Security Practices from Community Research
**Already doing well:**
- ✅ Dedicated VPS (not running on personal machine)
- ✅ Gateway bound to localhost with nginx proxy
- ✅ Behavioral boundaries in SOUL.md and SECURITY.md
- ✅ Doppler for secrets (not hardcoded)

**Gaps to close (beyond Phase 1):**
- Add TruffleHog or similar pre-push secret scanning (lesson from Nathan's "Reef" setup — AI will happily hardcode secrets)
- Implement trust level escalation for destructive operations (already in SECURITY.md, needs testing)
- Regular security audit cron job (weekly scan of workspace files for leaked credentials)

### 4.2 Cost Optimization
**Smart model routing** is the biggest lever. From claude-flow's architecture:
- Simple tasks (message forwarding, scheduling, lookups) → cheaper/faster model
- Complex tasks (content strategy, analysis, drafting) → Opus 4.5
- Routine cron jobs → could potentially run on a local model to avoid API costs entirely

### 4.3 Workspace Knowledge Compound Loop
With the self-improving agent installed, the learning loop becomes:
```
Error/Correction occurs
  → Logged to ERRORS.md / LEARNINGS.md
  → Important items promoted to SOUL.md, AGENTS.md, TOOLS.md
  → Claw's behavior improves across all future sessions
  → Periodic review (monthly) to prune outdated learnings
```

This is the flywheel that makes Claw genuinely more useful over time rather than resetting to baseline every session.

---

## Priority Matrix

| Task | Impact | Effort | Phase |
|---|---|---|---|
| Rotate compromised keys | 🔴 Critical | 30 min | 1 |
| Enable DO backup snapshots | 🔴 Critical | 20 min | 1 |
| Structured logging | 🟡 High | 1 hr | 1 |
| Token usage monitoring | 🟡 High | 30 min | 1 |
| Install self-improving agent | 🟡 High | 1-2 hr | 2 |
| Install humanizer skill | 🟢 Medium | 30 min | 2 |
| Import Instagram digest to n8n | 🟡 High | 2-3 hr | 3 |
| Set up 7am morning brief cron | 🟡 High | 1 hr | 3 |
| Test n8n webhook integration | 🟢 Medium | 1 hr | 3 |
| Install X research skill | 🟢 Medium | 1 hr | 2 |
| Content factory research phase | 🟢 Medium | Ongoing | 3 |
| Smart model routing | 🟢 Medium | 2-3 hr | 4 |
| Secret scanning (TruffleHog) | 🟢 Medium | 1 hr | 4 |
| Multi-agent coordination | 🔵 Future | Significant | 4+ |

---

## Research Sources

| Resource | Relevance |
|---|---|
| [awesome-openclaw-usecases](https://github.com/hesamsheikh/awesome-openclaw-usecases) (4.2k ★) | Content Factory, Multi-Agent Team, Second Brain, Self-Healing Server patterns |
| [claude-flow](https://github.com/ruvnet/claude-flow) (14.9k ★) | Smart model routing concept, swarm architecture patterns, agent coordination |
| [self-improving-agent](https://clawhub.ai/pskoett/self-improving-agent) | Structured learning loop for workspace files |
| [humanizer](https://github.com/blader/humanizer) (3.9k ★) | AI writing pattern detection and removal |
| [taskmaster](https://github.com/blader/taskmaster) | Completion checking concept (Claude Code specific, adapted for AGENTS.md rules) |
| OpenClaw Security Best Practices (community doc) | 6 common mistakes framework, defense-in-depth patterns |
| Miles Deutscher OpenClaw Guide | VPS setup validation, daily workflow patterns |
| OpenClaw WhatsApp/Telegram community channels | Real-time community patterns, skill recommendations |

---

## Definition of Done

**Phase 1 complete when:**
- All compromised keys rotated and verified working
- Automated backups running (DO snapshots or custom script)
- Structured logging producing daily log files
- Token usage visible somewhere (dashboard or manual tracking)

**Phase 2 complete when:**
- Self-improving agent installed and tested with deliberate error/correction cycle
- Humanizer skill functional via Telegram command
- X research skill evaluated (install or reject with reasoning)

**Phase 3 complete when:**
- Morning brief delivers to Telegram at 7am CT daily
- At least one n8n workflow running in production
- Content research phase producing actionable creator content ideas

**The north star:** Claw handles the operational overhead of managing 10-14 creators so Emily and Ethan can focus on strategy, relationships, and growing the agency. Every automation should pass the test: "Does this reduce the human-in-the-loop burden while maintaining quality and creator trust?"
