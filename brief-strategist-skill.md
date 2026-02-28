# Brief Strategist

## Overview

Brief Strategist is a compliance analysis and content generation tool for influencer marketing. It helps content creators analyze brand partnership briefs, identify FDA/FTC compliance issues, and generate platform-ready content that stays within legal and brand guardrails.

## When to Use This Skill

**Trigger phrases:**
- "Check this brief for compliance"
- "Analyze this brand partnership"
- "What can I say about this product"
- "Generate captions for this campaign"
- "Is this claim FDA compliant"
- "Review this collab document"
- "What are the guardrails for this brief"
- "Help me understand this partnership agreement"

**Use cases:**
- Content creators receiving brand briefs need compliance review before creating content
- Checking if specific health/wellness claims violate FDA regulations
- Generating Instagram captions, TikTok scripts, and Stories that meet FTC disclosure requirements
- Comparing requirements across multiple brand campaigns
- Understanding what talking points are approved vs prohibited

## Core Capabilities

### 1. Brief Analysis & Compliance Review

Parses brand partnership documents (PDFs, text) and extracts:
- Required talking points and key messages
- Prohibited claims and language restrictions
- Hashtag requirements (#ad, #sponsored, brand-specific tags)
- Disclosure timing requirements by platform
- Product category-specific regulations

### 2. FDA Compliance Checking

Flags violations for health and wellness products:
- **Disease claims**: Cannot say supplements "cure," "treat," "prevent," or "diagnose" any condition
- **Clinical claims**: "Clinically proven" requires citation; avoid without substantiation
- **Structure/function claims**: Allowed with proper disclaimers (e.g., "supports immune health")
- **Before/after claims**: Cannot imply guaranteed results or typical outcomes without evidence

### 3. FTC Compliance Checking

Ensures proper disclosure:
- **Material connection disclosure**: #ad or #sponsored required when compensated
- **Placement rules**: Disclosure must be "clear and conspicuous"
  - Instagram: Above the fold, before "more" truncation
  - TikTok: Verbal disclosure in first 3 seconds + text overlay
  - YouTube: Verbal disclosure at video start + description
- **Endorsement authenticity**: Claims must reflect genuine experience

### 4. Platform-Specific Content Generation

Generates compliant content for:
- **Instagram Feed**: Captions with proper hashtag placement and disclosure
- **Instagram Stories**: Swipe-up/link sticker copy with verbal callouts
- **Instagram Reels**: Scripts with timing for disclosure moments
- **TikTok**: Scripts with hook, body, CTA structure and verbal disclosure
- **YouTube**: Video scripts with description copy and pinned comment templates

### 5. RAG-Powered Brief Memory (v2)

When integrated with Pinecone vector database:
- Search past briefs by brand, creator, or topic
- Compare requirements across campaigns
- Reference what worked for similar products
- Identify brand-specific patterns and preferences

## Compliance Rules Reference

### FDA Rules for Supplements

```
PROHIBITED LANGUAGE:
- "Cures [condition]"
- "Treats [condition]"
- "Prevents [condition]"
- "Diagnoses [condition]"
- "Clinically proven" (without citation)
- "Doctor recommended" (without substantiation)
- Specific disease references (diabetes, cancer, heart disease, etc.)

ALLOWED WITH DISCLAIMER:
- "Supports [body function]" (e.g., "supports immune health")
- "Promotes [wellness outcome]" (e.g., "promotes restful sleep")
- "Helps maintain [normal function]"
- Structure/function claims with: "These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease."
```

### FTC Disclosure Requirements

```
INSTAGRAM:
- #ad or #sponsored in first line of caption
- Visible without clicking "more"
- Stories: Text overlay + verbal mention
- Reels: Verbal in first 3 seconds

TIKTOK:
- Verbal disclosure in first 3 seconds
- Use platform's branded content toggle
- Text overlay recommended

YOUTUBE:
- Verbal disclosure at video start
- "Includes paid promotion" checkbox enabled
- Description disclosure in first 3 lines
```

## Output Format

When analyzing a brief, output in this structure:

```
## COMPLIANCE FLAGS
🔴 Critical: [Issues that must be fixed before posting]
🟡 Warning: [Issues that should be reviewed]
🟢 Approved: [Elements that are compliant]

## APPROVED TALKING POINTS
- [Compliant messaging from the brief]
- [Safe claims with proper framing]

## PROHIBITED LANGUAGE
- [Specific phrases to avoid]
- [Why each is problematic]

## SUGGESTED ALTERNATIVES
| Original Claim | Compliant Alternative |
|----------------|----------------------|
| "Cures acne" | "Supports clear skin" |

## PLATFORM CONTENT

### Instagram Caption
[Ready-to-post caption with proper disclosure placement]

### TikTok Script
[Timed script with disclosure in first 3 seconds]

### Stories Script
[Slide-by-slide breakdown]
```

## Integration Points

### Current (v1 - Google AI Studio)
- Public URL: Cloud Run deployment
- Lead capture: Google Sheets webhook integration
- Access: Password-gated with email collection

### Future (v2 - Full Stack)
- Vector database: Pinecone for brief history
- Embeddings: OpenAI text-embedding-3-small
- LLM: Claude (Anthropic API)
- Auth: NextAuth with email allowlist
- Storage: Vercel Postgres + Blob
- Ingest API: PDF parsing and chunking pipeline

## ENT Agency Context

Built for ENT Agency's health and wellness creator roster:
- Nicki Entenmann
- Sara Preston
- Ellen Ludwig
- Courtney Pappy
- Ann Schulte

Primary brand partners: Thorne, LMNT, Hume Health, ARMRA, Equip

Platforms managed: Instagram, TikTok, LTK, Amazon Associates

## Example Interaction

**User uploads brief:**
"Here's the LMNT partnership brief for Q1. Can you tell me what I can and can't say?"

**Brief Strategist response:**

## COMPLIANCE FLAGS

🔴 **Critical Issues:**
- Brief mentions "electrolytes prevent muscle cramps" — this is a disease claim. Cramps can be a symptom of medical conditions.

🟡 **Warnings:**
- "Clinically formulated" appears without citation — either remove or add source

🟢 **Approved Elements:**
- Hydration support messaging
- Taste/flavor callouts
- Personal experience framing
- Zero sugar positioning

## APPROVED TALKING POINTS
- "I use LMNT to stay hydrated during workouts"
- "No sugar, no artificial ingredients"
- "The [flavor] is my favorite"
- "Perfect for [morning routine/post-workout/travel]"

## PROHIBITED LANGUAGE
- "Prevents cramps" → Use "supports muscle function"
- "Cures dehydration" → Use "helps me stay hydrated"
- "Doctor recommended" → Remove unless substantiated

## INSTAGRAM CAPTION

#ad Staying hydrated has been a game-changer for my workouts 💪

I've been using @drinklmnt for the past few months and honestly love how I feel. No sugar, no junk — just electrolytes that actually taste good.

The [flavor] is *chef's kiss* 🤌

Link in bio to try it! #LMNT #hydrationsupport

---

## Technical Notes

- Access tool at: https://brief-strategist-ai-332190666286.us-west1.run.app
- Lead capture webhook: Google Apps Script → Google Sheets
- Password: "entagency" (case insensitive)
- Leads sheet: https://docs.google.com/spreadsheets/d/1vedkH6g91uvxxupoO34HNC1FFr5HqXGp9_ycjznxrKo/
