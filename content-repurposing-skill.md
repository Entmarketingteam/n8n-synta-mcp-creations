# Content Repurposing Workflow

Transform high-performing X/Twitter posts into LinkedIn posts using platform-specific optimization patterns.

---

## Required Inputs

Ask the user for:
- X Profile URL (e.g., https://x.com/username)
- LinkedIn Profile URL (e.g., https://linkedin.com/in/username)

Extract usernames from URLs before proceeding.

---

## PHASE 1: RESEARCH

### Step 1.1: Scrape X Posts

Use **Apify: X (Twitter) Profile Posts Scraper**

| Parameter | Value |
|-----------|-------|
| `profileUrls` | Full URL (e.g., https://x.com/username) |
| `resultsLimit` | 50 (default) — max 200 |

**After scraping:**
- Extract: Post text, likes, reposts, replies
- Calculate engagement: `likes + (reposts × 2) + (replies × 1.5)`
- Rank posts by engagement score

### Step 1.2: Scrape LinkedIn Profile Posts

Use **Apify: LinkedIn Profile Posts Scraper**

| Parameter | Value |
|-----------|-------|
| `username` | Username only (e.g., satyanadella) |
| `total_posts` | 50 (default) — max 500 |

**After scraping:**
- Extract: Post text, likes, comments
- Note: What formats and topics get engagement for this user

### Step 1.3: Theme Analysis

Group X posts into themes:
- Frameworks/Systems (numbered lists, how-to)
- Hot Takes (contrarian opinions)
- Personal Stories (lessons learned)
- Tool/Stack Reveals
- Future Predictions
- Results/Proof (numbers, outcomes)

Calculate per theme: average engagement, top post, unique angle.

---

## 🛑 CHECKPOINT 1: Topic Selection

Present topics like this:

```
## 🎯 Topics Ready for LinkedIn Repurposing

### 🥇 STRONGLY RECOMMEND

**Topic 1: [Theme Name]**
- X Performance: [X] likes, [Y] reposts
- Top Post: "[excerpt]..."
- Why LinkedIn will love it: [reason]

**Topic 2: [Theme Name]**
- X Performance: [X] likes, [Y] reposts
- Top Post: "[excerpt]..."
- Why LinkedIn will love it: [reason]

### 👍 MORE OPTIONS

**Topic 3-6:** [List additional themes with engagement]

---

**Reply with the topic number to continue.**
```

**STOP. Wait for user to select a topic before continuing.**

---

## PHASE 2: LINKEDIN CONTENT ANALYSIS (After user selects topic)

### Step 2.1: Search LinkedIn for Theme Patterns

Use **Apify: LinkedIn Post Search Scraper**

| Parameter | Value |
|-----------|-------|
| `searchQueries` | 2-3 keywords related to selected topic |
| `maxPosts` | 15 per keyword |
| `postedLimit` | "month" |
| `sortBy` | "relevance" |

### Step 2.2: Analyze Hooks, Format & Structure

From scraped LinkedIn posts, analyze:

**HOOKS** - What first lines get engagement?
**FORMAT** - Line breaks, paragraph length, white space, lists, emojis
**STRUCTURE** - How posts are organized (intro → points → CTA)
**WRITING STYLE** - Tone, proof type, perspective
**CTAs** - What questions drive comments?

### Step 2.3: Present Content Structure Analysis

```
## 📊 LinkedIn Content Structure Analysis: [Topic]

### 🎣 HOOK PATTERNS
| Style | Example | Engagement |
|-------|---------|------------|
| [Type] | "[first line]" | [X] likes |
| [Type] | "[first line]" | [X] likes |
| [Type] | "[first line]" | [X] likes |

### 📝 FORMAT ANALYSIS
| Element | What Works |
|---------|------------|
| Line breaks | [heavy / moderate / minimal] |
| Paragraph length | [1-2 lines / 3-4 lines] |
| List style | [numbered / bullets / none] |
| Post length | [short / medium / long] |
| Emoji use | [none / minimal / moderate] |

### ✍️ STRUCTURE & STYLE
| Element | Pattern |
|---------|---------|
| Post structure | [intro → points → takeaway → CTA] |
| Tone | [professional / conversational / provocative] |
| Proof type | [personal story / data / results] |
| Best CTA style | "[example question]" |

### 🕳️ YOUR OPPORTUNITY
- **Your X angle:** [what made the X post work]
- **What's working on your LinkedIn:** [formats getting engagement]
- **What's missing:** [gaps to fill]
- **Recommended approach:** [specific suggestion]

---

**Before I draft, any feedback?**

Reply with feedback, or say **"draft it"** to continue.
```

**STOP. Wait for user feedback or "draft it" before continuing.**

---

## PHASE 3: GAP CHECK + DRAFT

### Step 3.1: Identify Missing Elements

Before drafting, check what's MISSING from the X post:

| Element | Present? | If Missing, Add |
|---------|----------|-----------------|
| Clear CTA | Yes/No | [recommendation] |
| Actionable element | Yes/No | [recommendation] |
| Story/context | Yes/No | [what to add] |
| Specific numbers | Yes/No | [what to include] |

### Step 3.2: Write Optimized LinkedIn Post

**LINKEDIN FORMAT:**

```
[HOOK - First line stops the scroll]

[CONTEXT - 2-3 lines why this matters]

[TRANSITION - "Here's what I learned:" or similar]

1. [Point headline]
   [1-2 sentence explanation]

2. [Point headline]
   [1-2 sentence explanation]

3. [Point headline]
   [1-2 sentence explanation]

[TAKEAWAY - Bold insight]

[ACTIONABLE - Something reader can do in 5 minutes]

[CTA - Question that invites comments]
```

**FORMAT RULES:**
- Blank line between every section
- Paragraphs: 1-3 lines max
- Numbers (1. 2. 3.) not bullets
- No hashtags in body
- 1,200-1,500 characters
- End with question

**HOOK FORMULAS:**

| Type | Formula |
|------|---------|
| Contrarian | "Stop [thing]. It's killing your [result]." |
| Story | "Last week, I [did something]. What happened next changed everything." |
| Results | "[Specific result] in [timeframe]. Here's how:" |
| Contrast | "The difference between [A] and [B] is usually [C]." |

---

**⚠️ ACTIONABLE REQUIREMENT:**

Every post MUST include something the reader can do in the next 5 minutes.

| ❌ Vague | ✅ Actionable |
|----------|---------------|
| "Be more specific" | "Add 3 constraints: audience, tone, length" |
| "Build systems" | "Create a doc with 5 examples of your best work" |
| "Timing matters" | "Post within 30 min of 8am or 12pm" |
| "Add context" | "Start every prompt with: 'You are a [role] writing for [audience]'" |

**Test:** Can the reader implement this without Googling? If no, rewrite.

---

## 🛑 CHECKPOINT 2: Draft Approval

```
## 📝 LinkedIn Post Draft

---

[FULL POST WITH PROPER FORMATTING]

---

### ✅ Checklist
- Hook: [type used]
- Format: [line breaks, length]
- Actionable: [what it is]
- CTA: [the question]
- Gaps filled: [what was added]

### Source
- **X Post:** "[excerpt]"
- **Engagement:** [X] likes, [Y] reposts

---

Reply with:
- **"post"** → Publish to LinkedIn
- **"cancel"** → Don't post
- Or provide feedback to revise
```

**STOP. Wait for user approval before posting.**

---

## PHASE 4: PUBLISH

### Step 4.1: Post to LinkedIn

Use **LinkedIn: Create Share Update**
- comment: {post_text}
- visibility__code: anyone

### Step 4.2: Confirm

```
✅ Posted to LinkedIn!

**Post URL:** {url}

Want to repurpose another topic?
```

---

## Key Rules

1. **Stop at all checkpoints** - Wait for user input
2. **Present analysis in tables** - Not narrative summaries
3. **Run gap check before drafting** - Identify missing CTA/actionable
4. **Include actionable element** - 5-minute implementation test
5. **Use proper formatting** - Line breaks, short paragraphs
6. **Transform, don't copy** - Adapt for LinkedIn's professional tone

---

## Quick Reference: Apify Parameters

| Scraper | Key Parameters |
|---------|----------------|
| **X Profile Posts** | `profileUrls` (full URL), `resultsLimit` (default 50, max 200) |
| **LinkedIn Profile Posts** | `username` (username only), `total_posts` (default 50, max 500) |
| **LinkedIn Post Search** | `searchQueries`, `maxPosts` (15 per keyword), `postedLimit` ("month"), `sortBy` ("relevance") |
