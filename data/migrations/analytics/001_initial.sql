-- analytics.db — Initial schema
-- Instagram, TikTok, LTK, and Amazon performance data
-- All monetary values in cents (INTEGER) for precision

PRAGMA journal_mode=WAL;

-- Instagram post-level data
CREATE TABLE IF NOT EXISTS ig_posts (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER NOT NULL,
    post_id TEXT UNIQUE NOT NULL,
    post_type TEXT CHECK(post_type IN ('feed', 'reel', 'story', 'carousel')),
    caption TEXT,
    permalink TEXT,
    published_at DATETIME,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement_rate REAL,
    is_branded BOOLEAN DEFAULT 0,
    brand_partner TEXT,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ig_posts_creator ON ig_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_ig_posts_published ON ig_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_ig_posts_brand ON ig_posts(brand_partner);

-- Instagram profile snapshots (for growth tracking)
CREATE TABLE IF NOT EXISTS ig_profiles (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER NOT NULL,
    snapshot_date DATE NOT NULL,
    followers INTEGER,
    following INTEGER,
    posts_count INTEGER,
    avg_engagement_rate REAL,
    follower_growth_7d INTEGER,
    follower_growth_30d INTEGER,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creator_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_ig_profiles_creator ON ig_profiles(creator_id);
CREATE INDEX IF NOT EXISTS idx_ig_profiles_date ON ig_profiles(snapshot_date);

-- LTK performance
CREATE TABLE IF NOT EXISTS ltk_performance (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER NOT NULL,
    date DATE NOT NULL,
    post_url TEXT,
    clicks INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    earnings_cents INTEGER DEFAULT 0,
    conversion_rate REAL,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ltk_creator ON ltk_performance(creator_id);
CREATE INDEX IF NOT EXISTS idx_ltk_date ON ltk_performance(date);

-- Amazon Associates performance
CREATE TABLE IF NOT EXISTS amazon_performance (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER NOT NULL,
    date DATE NOT NULL,
    product_asin TEXT,
    product_name TEXT,
    clicks INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    earnings_cents INTEGER DEFAULT 0,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_amazon_creator ON amazon_performance(creator_id);
CREATE INDEX IF NOT EXISTS idx_amazon_date ON amazon_performance(date);

-- TikTok video-level data
CREATE TABLE IF NOT EXISTS tiktok_posts (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER NOT NULL,
    video_id TEXT UNIQUE NOT NULL,
    description TEXT,
    published_at DATETIME,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    is_branded BOOLEAN DEFAULT 0,
    brand_partner TEXT,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tiktok_creator ON tiktok_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_published ON tiktok_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_tiktok_brand ON tiktok_posts(brand_partner);
