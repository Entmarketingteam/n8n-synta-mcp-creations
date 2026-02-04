# CreatorMetrics Project - Master Summary
## Complete State as of December 19, 2025

---

# EXECUTIVE SUMMARY

Building a comprehensive analytics and automation platform for ENT Agency (Emily's influencer marketing company) to track, analyze, and optimize creator content performance across Instagram, LTK, and Amazon Associates. The system aims to provide Motion-app style visual analytics with AI tagging, but faces a critical data connection gap that prevents per-post revenue attribution.

**Primary Creator**: Nicki Entenmann (450K+ followers, wellness/lifestyle influencer)
**Q4 2025 Revenue**: $63,178 total ($59,836 Amazon + $8,610 LTK with some overlap)
**Core Challenge**: Meta exports don't include link sticker destination URLs, making per-post revenue attribution impossible without manual tracking

---

# PART 1: DATA INVENTORY

## Q4 2025 Data Sources (Oct 1 - Dec 19, 2025)

### Instagram Data (Meta Business Suite Export)
```
Stories:     1,369 posts | 24.7M views | 209,932 link clicks
Reels:       76 posts    | 7.7M views  | High engagement
```

**Available Fields:**
- Post ID, Permalink, Description (caption)
- Publish time, Duration
- Views, Reach, Likes, Shares
- Link clicks (COUNT ONLY - not the URL!)
- Profile visits, Replies, Follows
- Post type (story, reel, carousel)

**Files:**
- `/mnt/user-data/uploads/IG_Stories_Oct-01-2025_Dec-19-2025_1619829966119465.csv`
- `/mnt/user-data/uploads/IG_Reel_and_Caroseuls_Oct-01-2025_Dec-19-2025_1801064617405336.csv`

### LTK Data
```
Posts:       231 collages
Products:    3,000 total (943 Amazon)
Transactions: 2,658 orders
Commission:  $8,609.54
```

**Files:**
- `/mnt/user-data/uploads/LTK-export-posts.csv` (collage performance)
- `/mnt/user-data/uploads/LTK-export-activelinks.csv` (product links)
- `/mnt/user-data/uploads/LTK-earnings-export-09-30-2025-12-19-2025.csv` (transactions)

**LTK Fields:**
- hero_image (CDN URL), share_url (liketk.it/XXXXX)
- clicks, commissions, orders, items_sold
- Product name, advertiser, rstyle.me tracking URL

### Amazon Associates Data
```
Orders:      35,987
Clicks:      241,067
Commission:  $54,568.87 + $317.50 bounties + $4,949.52 Creator Connections
Total:       $59,835.89
Shipped Rev: $730,267.65
Conversion:  14.93%
```

**Tracking Tags (4 channels):**
| Tag | Channel | Commission | Clicks | Conversion |
|-----|---------|------------|--------|------------|
| nickientenman-20 | Bio/Storefront | $47,617 (87%) | 184,754 | 16.95% |
| nicki-metads-20 | Meta/IG Ads | $5,294 (10%) | 51,433 | 7.18% |
| nicki-igreel-20 | IG Reels Organic | $1,187 (2%) | 3,135 | **22.55%** ⭐ |
| nicki-fb-20 | Facebook | $444 (1%) | 1,745 | 15.59% |

**Key Insight**: IG Reels organic has highest conversion rate (22.55%) despite lowest volume

**Files (extracted to /tmp/amazon_q4/):**
- Fee-Tracking XML, Fee-LinkType XML, Fee-Earnings XML, Fee-Orders XML, Bounty XML

---

# PART 2: THE DATA CONNECTION PROBLEM

## The Critical Gap

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE MISSING LINK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IG Story: "Best leggings ever!"                                │
│       ↓                                                         │
│  Link Clicks: 4,111                                             │
│       ↓                                                         │
│  WHERE DID THEY GO? ← ❌ NOT IN META EXPORT                     │
│       ↓                                                         │
│  Could be: Amazon? LTK? Urlgeni.us? Direct brand?               │
│       ↓                                                         │
│  Revenue: $??? ← CANNOT ATTRIBUTE TO THIS POST                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## What We CAN Connect

**Direct Caption Mentions (RARE):**
- Only 1 Reel mentions LTK link in caption: `liketk.it/5xj8v`
- Only 1 Story mentions LTK link in caption
- This represents <0.2% of content

**Aggregate Channel Attribution:**
- Amazon tracking tags tell us CHANNEL revenue (Bio vs Ads vs Reels)
- But NOT which specific post drove which sale

## What We CANNOT Connect

- Individual IG Story → Specific Amazon ASIN
- Individual IG Story → Specific LTK Collage
- Per-post revenue attribution
- Conversion rate per content piece

## Solutions to Bridge the Gap

### Option 1: Manual Link Logging
Quick form when posting: `(Post ID, Link URL, Platform, Timestamp)`

### Option 2: LTK App Posting
If Nicki posts stories through LTK app, connection is captured

### Option 3: n8n Automation
Auto-log when creating urlgeni.us/Amazon links with timestamp for later matching

### Option 4: Timestamp Inference
Match same-day posts to same-day sales (fuzzy, not accurate)

### Option 5: AI Content Matching
Analyze caption + image → match to product catalog (complex, probabilistic)

---

# PART 3: SCHEMA DESIGN

## Database Tables (SQLite/PostgreSQL)

### Core Content Tables
```sql
-- Instagram Stories
CREATE TABLE ig_stories (
    post_id TEXT PRIMARY KEY,
    account_id TEXT,
    permalink TEXT,
    description TEXT,
    publish_time TIMESTAMP,
    duration_sec INTEGER,
    views INTEGER,
    reach INTEGER,
    likes INTEGER,
    shares INTEGER,
    link_clicks INTEGER,
    profile_visits INTEGER,
    replies INTEGER,
    follows INTEGER,
    -- AI-generated fields
    content_category TEXT,
    hook_type TEXT,
    messaging_angle TEXT,
    brands_mentioned TEXT[],
    products_mentioned TEXT[],
    -- Manual tracking (if implemented)
    link_url TEXT,
    link_platform TEXT,
    ltk_code TEXT,
    amazon_tag TEXT
);

-- Instagram Reels/Carousels
CREATE TABLE ig_reels (
    post_id TEXT PRIMARY KEY,
    permalink TEXT,
    description TEXT,
    publish_time TIMESTAMP,
    views INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    saves INTEGER,
    -- Extracted from caption
    ltk_link TEXT,
    ltk_code TEXT
);

-- LTK Collages
CREATE TABLE ltk_posts (
    share_url TEXT PRIMARY KEY,
    ltk_code TEXT, -- extracted from share_url
    hero_image TEXT,
    date_published TIMESTAMP,
    clicks INTEGER,
    commissions DECIMAL(10,2),
    orders INTEGER,
    items_sold INTEGER,
    order_conversion_rate DECIMAL(5,4),
    -- Connection field
    ig_post_id TEXT REFERENCES ig_stories(post_id)
);

-- LTK Products
CREATE TABLE ltk_products (
    id SERIAL PRIMARY KEY,
    product_name TEXT,
    advertiser_name TEXT,
    image TEXT,
    sku TEXT,
    price DECIMAL(10,2),
    url TEXT,
    clicks INTEGER,
    commissions DECIMAL(10,2),
    orders INTEGER,
    is_amazon BOOLEAN
);

-- LTK Earnings (Transactions)
CREATE TABLE ltk_earnings (
    id SERIAL PRIMARY KEY,
    date DATE,
    brand TEXT,
    type TEXT,
    product TEXT,
    retailer_link TEXT, -- rstyle.me URL
    status TEXT,
    commission DECIMAL(10,2),
    payment TEXT
);

-- Amazon Performance (Aggregate by Tag)
CREATE TABLE amazon_channel_performance (
    tracking_tag TEXT PRIMARY KEY,
    channel_name TEXT,
    clicks INTEGER,
    orders INTEGER,
    shipped_items INTEGER,
    shipped_revenue DECIMAL(12,2),
    commission DECIMAL(10,2),
    conversion_rate DECIMAL(5,4)
);

-- Amazon Products (from earnings)
CREATE TABLE amazon_products (
    asin TEXT PRIMARY KEY,
    product_name TEXT,
    category TEXT,
    clicks INTEGER,
    orders INTEGER,
    revenue DECIMAL(10,2),
    commission DECIMAL(10,2)
);

-- Manual Link Tracking (SOLUTION)
CREATE TABLE story_links (
    id SERIAL PRIMARY KEY,
    ig_post_id TEXT REFERENCES ig_stories(post_id),
    link_url TEXT,
    platform TEXT, -- 'amazon', 'ltk', 'direct', etc
    product_id TEXT,
    amazon_asin TEXT,
    ltk_code TEXT,
    tracking_tag TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Helper Functions
```sql
-- Extract LTK code from URL
CREATE FUNCTION extract_ltk_code(url TEXT) RETURNS TEXT AS $$
    SELECT REGEXP_REPLACE(url, '.*liketk\.it/([A-Za-z0-9]+).*', '\1')
$$ LANGUAGE SQL;

-- Extract Amazon tracking tag from URL
CREATE FUNCTION extract_amazon_tag(url TEXT) RETURNS TEXT AS $$
    SELECT REGEXP_REPLACE(url, '.*[?&]tag=([^&]+).*', '\1')
$$ LANGUAGE SQL;
```

---

# PART 4: WHAT WE CAN BUILD NOW

## Motion-Style Content Cards

### Available Per-Post Metrics:
- Thumbnail (via Graph API or archive)
- Caption/Description
- Views, Reach, Likes, Shares
- Link clicks (count)
- Click-through rate (clicks/views)
- Engagement rate
- Profile visit rate

### AI-Taggable Categories:
1. **Content Type**: Fashion, Beauty, Home, Fitness, Wellness, Kids
2. **Hook Type**: Personal Endorsement, Question, Myth Buster, Promo Code, Bold Claim
3. **Messaging Angle**: Recommendation, Problem/Solution, Tutorial, Discovery
4. **Visual Format**: Product Demo, Lifestyle, Before/After, UGC
5. **Brands Mentioned**: Extracted from caption
6. **Products Mentioned**: Extracted from caption

### Calculable Scores:
- **CTR Score**: Link clicks / Views (benchmark against average)
- **Engagement Score**: (Likes + Shares + Replies) / Reach
- **Reach Rate**: Reach / Followers
- **Virality Score**: Shares / Views

### NOT Available Without Manual Tracking:
- Attributed revenue per post
- Conversion score
- Which platform (Amazon/LTK) received the clicks
- ROI per content piece

---

# PART 5: TOP PERFORMING CONTENT (Q4 2025)

## Top 10 Stories by Link Clicks

| Rank | Clicks | CTR | Views | Caption Preview |
|------|--------|-----|-------|-----------------|
| 1 | 4,111 | 7.3% | 56K | "One thing I'll never steer you wrong on is leggings!!!" |
| 2 | 2,444 | 5.3% | 46K | "These are still the absolute best ever IMO" |
| 3 | 2,327 | 12.8% | 18K | "My top pick is an investment pair but..." |
| 4 | 2,130 | 6.1% | 35K | "Code: NICKI10 Hands down the best clean..." |
| 5 | 1,923 | 5.3% | 36K | "I know a handful of you were having problems joining..." |
| 6 | 1,827 | 11.0% | 17K | "Guys- I can not stop talking about these leggings. 100/10" |
| 7 | 1,658 | 6.2% | 27K | "I've had these for 7 years and they still look..." |
| 8 | 1,540 | 4.8% | 32K | "The best 1\" curling is on sale!" |
| 9 | 1,522 | 5.5% | 28K | "Send this link to your husband 😏 Black Friday Sale..." |
| 10 | 1,390 | 8.4% | 17K | "I am V acne prone and had to go down a war path..." |

**Pattern**: Leggings content consistently drives highest clicks

## Top Viral Reel

- **Permalink**: `https://www.instagram.com/reel/DQ9uAeYCcQI/`
- **Views**: 1,138,286
- **Caption**: "QVC isn't just for your grandma anymore 👀 Comment SHOP..."
- **LTK Link in Caption**: `liketk.it/5xj8v` (RARE - only reel with trackable LTK link)
- **Matched LTK Commission**: $5.60

## LTK Top Brands (Q4 2025)

| Brand | Commission |
|-------|------------|
| Abercrombie & Fitch | $3,300.19 |
| Amazon (via LTK) | $1,534.73 |
| Nike | $692.45 |
| Nordstrom | $556.64 |
| Vuori | $338.47 |

---

# PART 6: N8N WORKFLOW ARCHITECTURE

## Existing Workflows (from project files)

### Content Creation Agent
- `/mnt/project/Content_creation_agent.json`
- Handles content generation with AI

### Ultimate Extract (RoboNuggets)
- `/mnt/project/Ultimate_Extract_by_RoboNuggets__R46_.json`
- Data extraction automation

### Telegram Trend Listener
- `/mnt/project/Listen_to_trend_just_from_telegram.json`
- Social listening automation

## Planned Workflows

### 1. Q4 Data Loader
**Purpose**: Load all Q4 2025 CSV/XML exports into database
**Steps**:
1. Parse IG Stories CSV → ig_stories table
2. Parse IG Reels CSV → ig_reels table
3. Parse LTK exports → ltk_posts, ltk_products, ltk_earnings
4. Parse Amazon XML → amazon_channel_performance, amazon_products
5. Extract LTK codes from captions where present
6. Run AI tagging on all captions

### 2. AI Content Tagger
**Purpose**: Analyze captions and generate tags
**Steps**:
1. Fetch untagged content from database
2. Send caption to GPT-4 for analysis
3. Extract: content_category, hook_type, messaging_angle, brands, products
4. Update database with tags
5. Generate embeddings for semantic search

### 3. Link Tracker (Manual Entry)
**Purpose**: Capture link URLs when posting
**Trigger**: Airtable form submission or Slack command
**Input**: Post ID, Link URL, Platform
**Output**: Stored in story_links table

### 4. Performance Dashboard Generator
**Purpose**: Create Motion-style visual reports
**Steps**:
1. Query top performing content by CTR
2. Group by AI tags for pattern analysis
3. Generate HTML/React cards
4. Push to Notion or web dashboard

---

# PART 7: FILES CREATED

## Schema & Documentation
- `/mnt/user-data/outputs/creatormetrics_amazon_tables.sql` - Database schema
- `/mnt/user-data/outputs/CreatorMetrics_Schema_Map.md` - Visual schema documentation
- `/mnt/user-data/outputs/Q4_2025_Data_Connections.md` - Q4 analysis results

## UI Samples
- `/mnt/user-data/outputs/CreatorMetrics_Card_Sample.html` - Motion-style card (idealized)
- `/mnt/user-data/outputs/CreatorMetrics_Realistic_Cards.html` - Cards showing actual data limitations

## Session Transcripts
- `/mnt/transcripts/2025-12-18-00-40-04-n8n-mcp-interactions-api-integration.txt`
- `/mnt/transcripts/2025-12-18-01-30-26-n8n-google-ai-workflows-implementation.txt`
- `/mnt/transcripts/2025-12-18-13-50-41-n8n-video-analysis-ai-agent-expansion.txt`
- `/mnt/transcripts/2025-12-19-14-41-00-meta-csv-vector-db-content-intelligence.txt`
- `/mnt/transcripts/2025-12-19-21-05-30-ltk-ig-data-connection-schema-enhancement.txt`
- `/mnt/transcripts/2025-12-19-22-38-27-schema-visual-map-creation.txt`
- `/mnt/transcripts/2025-12-19-22-53-49-ltk-ig-amazon-connection-schema-fix.txt`
- `/mnt/transcripts/2025-12-19-23-05-12-q4-2025-data-analysis-connections.txt`

---

# PART 8: IMMEDIATE NEXT STEPS

## Priority 1: Solve the Data Gap
**Question for Nicki**: How does she create/post story links?
- LTK app?
- urlgeni.us?
- Direct Amazon links?
- Other?

This determines which solution to implement for link tracking.

## Priority 2: Build Basic Dashboard
With available data, we CAN build:
- Content performance by AI-tagged category
- Hook type effectiveness analysis
- CTR trends over time
- Top performing content identification
- Aggregate channel revenue (Amazon tags)

## Priority 3: Implement Link Tracking
Choose one:
- Airtable form (quickest)
- Slack bot command
- n8n webhook + mobile shortcut
- LTK app workflow integration

## Priority 4: AI Tagging Pipeline
- Set up GPT-4 analysis of all captions
- Store tags in database
- Generate embeddings for semantic search
- Build "find similar high-performers" feature

## Priority 5: Full Attribution System
Once link tracking is in place:
- Connect IG posts to revenue
- Calculate true ROI per content piece
- Identify highest-converting content patterns
- Build predictive model for content success

---

# PART 9: KEY INSIGHTS & PATTERNS

## Content That Works

1. **Leggings Content**: Consistently highest CTR (7-13%)
2. **Personal Endorsements**: "I'll never steer you wrong" language converts
3. **Specific Claims**: "100/10", "best ever", "7 years and still..."
4. **Promo Codes**: NICKI10 drives action
5. **Urgency**: "almost sold out", "Black Friday"

## Channel Performance

- **IG Reels Organic** (nicki-igreel-20): 22.55% conversion - BEST but smallest volume
- **Bio/Storefront** (nickientenman-20): 16.95% conversion - 87% of revenue
- **Meta Ads** (nicki-metads-20): 7.18% conversion - paid underperforms organic

## Revenue Reality

- Amazon is 6.3X larger than LTK ($59.8K vs $8.6K)
- Bio link drives 87% of Amazon revenue
- Per-post attribution not possible with current data

---

# PART 10: TECHNICAL STACK

## Current Tools
- **n8n**: Workflow automation
- **Airtable**: Central data hub
- **Asana**: Task management
- **Notion**: Documentation & dashboards
- **GPT-4**: Content analysis & tagging
- **Perplexity**: Research
- **Apify**: Social scraping

## Planned Additions
- **Vector Database**: Pinecone/Supabase for semantic search
- **React Dashboard**: Motion-style visual analytics
- **Graph API**: Direct Meta data access
- **LTK API**: If available, for direct connection

## Integration Points
- Meta Business Suite → CSV exports (current)
- LTK Dashboard → CSV exports (current)
- Amazon Associates → XML exports (current)
- n8n MCP → Workflow control via AI
- Google AI Interactions API → Enhanced automation

---

# QUICK START FOR NEW CONVERSATION

```
I'm building CreatorMetrics for ENT Agency (Emily's influencer marketing company).

KEY CONTEXT:
- Creator: Nicki Entenmann (450K followers, wellness/lifestyle)
- Q4 2025 Revenue: $63K ($60K Amazon + $9K LTK)
- Data: 1,369 stories, 76 reels, 231 LTK collages, 36K Amazon orders

CRITICAL PROBLEM:
Meta exports include "Link clicks: 4,111" but NOT the destination URL.
We cannot connect individual IG posts to revenue without manual link tracking.

WHAT'S BUILT:
- Database schema for all platforms
- Motion-style card UI mockups
- AI tagging categories defined
- Q4 data analysis complete

NEXT STEPS:
1. Determine how Nicki posts links (LTK app? urlgeni.us?)
2. Implement link tracking solution
3. Build AI tagging pipeline
4. Create performance dashboard

FILES:
- Schema: /mnt/user-data/outputs/creatormetrics_amazon_tables.sql
- Cards: /mnt/user-data/outputs/CreatorMetrics_Realistic_Cards.html
- Analysis: /mnt/user-data/outputs/Q4_2025_Data_Connections.md
```

---

# END OF SUMMARY

*Generated: December 19, 2025*
*Project: CreatorMetrics for ENT Agency*
*Status: Schema complete, data analyzed, awaiting link tracking solution*
