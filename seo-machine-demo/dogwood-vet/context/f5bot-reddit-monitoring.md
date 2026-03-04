# F5Bot Reddit Monitoring — Dogwood Vet Clinic

## What is F5Bot?

[F5Bot](https://f5bot.com) is a free Reddit/Hacker News/Lobsters monitoring tool that emails you whenever your keywords are mentioned. It's the simplest way to catch every time someone in Louisville asks about vets, pet health issues, or mentions your competitors on Reddit.

**Why this matters for Dogwood:** Reddit threads rank in Google. When someone asks "best vet in Louisville?" on r/Louisville, that thread gets indexed and influences searchers. Being the first to respond (or knowing about it) is a competitive advantage.

---

## Setup Guide (5 minutes)

### Step 1: Create F5Bot Account
1. Go to [f5bot.com](https://f5bot.com)
2. Sign up with an email you check (or a dedicated marketing inbox)
3. Verify your email

### Step 2: Add Keywords

Add these keywords in the F5Bot dashboard. Each keyword = one alert rule.

#### Tier 1: Brand Monitoring (Must-Have)
```
dogwood vet
dogwood veterinary
dogwoodvetclinic
```

#### Tier 2: Competitor Monitoring
```
louvet animal clinic
lou vet louisville
doerrhoff animal hospital
lyndon animal clinic
```

#### Tier 3: Local Vet Conversations (High Value)
```
vet louisville ky
veterinarian louisville
vet in louisville
louisville vet recommendation
louisville veterinarian
```

#### Tier 4: Pet Health + Louisville (Content Opportunities)
```
dog dentist louisville
emergency vet louisville
pet surgeon louisville
vet prospect ky
norton commons vet
```

#### Tier 5: General Vet Questions (Blog Content Ideas)
```
when to take dog to vet
dog limping not in pain
puppy first vet visit
senior dog vet checkup
```

### Step 3: Power User Setup (Optional — Recommended)

If you upgrade to Power User ($5/mo donation), you get:
- **1,000 alerts/day** (vs 50 free)
- **Group alerts** — separate emails per category
- **Mass CSV upload** — manage all keywords at once
- **in-title / in-url flags** — precision matching

#### Power User Keyword Groups
```
# Brand alerts get their own email
dogwood vet               group=brand
dogwood veterinary         group=brand
dogwoodvetclinic           group=brand

# Competitor alerts bundled together
louvet animal clinic       group=competitors
lou vet louisville         group=competitors
doerrhoff animal hospital  group=competitors
lyndon animal clinic       group=competitors

# Local vet conversations
vet louisville ky          group=local-vet  in-title
veterinarian louisville    group=local-vet  in-title
vet in louisville          group=local-vet
louisville vet             group=local-vet  in-title

# Content ideas from questions
when to take dog to vet    group=content-ideas
dog limping not in pain    group=content-ideas
puppy first vet visit      group=content-ideas
```

---

## Alert Response Playbook

When F5Bot sends you an email, here's what to do:

### Someone asks "best vet in Louisville?"
**Action:** Reply authentically (NOT as the business). Mention Dogwood naturally if relevant.
**Example:** "We've had great experiences at Dogwood in Norton Commons — they were really gentle with our anxious rescue."

> **Important:** Reddit hates obvious marketing. Never post as the business account. Be genuine.

### Someone mentions a competitor
**Action:** Read the context. If they're unhappy, note the complaint for your own improvement. If they're comparing vets, monitor but don't brigade.

### Someone asks a pet health question (Louisville context)
**Action:** This is a blog content signal. Add the question to your content calendar. Write a blog post answering it with Louisville-specific context.

### Someone mentions Dogwood Vet
**Action:** Monitor sentiment. If positive, screenshot for social proof. If negative, address the concern privately/professionally.

---

## Subreddits to Watch

F5Bot monitors ALL of Reddit, but these are the subreddits where Louisville vet conversations happen most:

| Subreddit | Why It Matters |
|-----------|---------------|
| r/Louisville | Local recommendations, "best vet?" threads |
| r/Kentucky | State-level pet discussions |
| r/AskVet | Pet health questions → blog content ideas |
| r/dogs | Breed-specific health issues |
| r/cats | Cat owner concerns |
| r/Pets | General pet care |
| r/VetTech | Industry discussions |

---

## Integration with SEO Machine Pipeline

F5Bot alerts feed directly into your SEO content strategy:

```
F5Bot Alert
    ↓
Reddit thread about "dog dental care cost louisville"
    ↓
Check target-keywords.md → Is this keyword tracked?
    ↓
If YES → Write/update the matching blog post
If NO  → Add to target-keywords.md, run keyword research
    ↓
Use run-full-demo.py to get volume/CPC data
    ↓
Write blog post using brand-voice.md guidelines
    ↓
Publish + share in relevant Reddit thread (authentically)
```

---

## CSV Upload Template (Power Users)

Save this as `f5bot-keywords.csv` and upload via F5Bot's mass upload:

```csv
keyword,group,flags
dogwood vet,brand,
dogwood veterinary,brand,
dogwoodvetclinic,brand,
louvet animal clinic,competitors,
lou vet louisville,competitors,
doerrhoff animal hospital,competitors,
lyndon animal clinic,competitors,
vet louisville ky,local-vet,in-title
veterinarian louisville,local-vet,in-title
vet in louisville,local-vet,
louisville vet recommendation,local-vet,in-title
dog dentist louisville,local-services,in-title
emergency vet louisville,local-services,in-title
pet surgeon louisville,local-services,in-title
vet prospect ky,local-services,
norton commons vet,local-services,
when to take dog to vet,content-ideas,
dog limping not in pain,content-ideas,
puppy first vet visit,content-ideas,
senior dog vet checkup,content-ideas,
```
