-- campaigns.db — Initial schema
-- Campaign lifecycle, deliverables, and notes
-- All monetary values in cents (INTEGER) for precision

PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id INTEGER NOT NULL REFERENCES creators(id),
    brand_name TEXT NOT NULL,
    brand_contact_id INTEGER REFERENCES brand_contacts(id),
    status TEXT DEFAULT 'prospecting' CHECK(status IN (
        'prospecting', 'pitched', 'negotiating', 'contracted',
        'briefed', 'in_progress', 'delivered', 'completed', 'reporting'
    )),
    deal_type TEXT CHECK(deal_type IN ('flat_fee', 'affiliate', 'hybrid', 'gifted', 'ambassador')),
    total_value_cents INTEGER,
    agency_commission_cents INTEGER,
    pitch_date DATE,
    contract_signed_date DATE,
    content_due_date DATE,
    go_live_date DATE,
    completion_date DATE,
    reporting_due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON campaigns(brand_name);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

CREATE TABLE IF NOT EXISTS deliverables (
    id INTEGER PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    type TEXT NOT NULL CHECK(type IN (
        'ig_feed', 'ig_reel', 'ig_story', 'ig_carousel',
        'tiktok', 'blog', 'ltk_post', 'youtube'
    )),
    platform TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    published_date DATE,
    post_url TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'drafted', 'approved', 'published', 'reported')),
    performance_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deliverables_campaign ON deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_due ON deliverables(due_date);

CREATE TABLE IF NOT EXISTS campaign_notes (
    id INTEGER PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    note TEXT NOT NULL,
    author TEXT DEFAULT 'claw' CHECK(author IN ('claw', 'emily', 'ethan')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign ON campaign_notes(campaign_id);
