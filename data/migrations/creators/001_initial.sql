-- creators.db — Initial schema
-- Creator profiles, brand contacts, and partnership history
-- All monetary values in cents (INTEGER) for precision

PRAGMA journal_mode=WAL;

-- Core creator profiles
CREATE TABLE IF NOT EXISTS creators (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    instagram_handle TEXT,
    tiktok_handle TEXT,
    ltk_handle TEXT,
    amazon_storefront_url TEXT,
    niche TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'offboarding')),
    monthly_base_rate INTEGER,
    commission_split REAL,
    contract_start DATE,
    contract_end DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creators_slug ON creators(slug);
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);

-- Brand contacts (the people we work with at each brand)
CREATE TABLE IF NOT EXISTS brand_contacts (
    id INTEGER PRIMARY KEY,
    brand_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    role TEXT,
    relationship_score INTEGER DEFAULT 5 CHECK(relationship_score BETWEEN 1 AND 10),
    last_contact DATE,
    preferred_channel TEXT CHECK(preferred_channel IN ('email', 'slack', 'dm')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brand_contacts_brand ON brand_contacts(brand_name);

-- Partnership history (every deal, past and present)
CREATE TABLE IF NOT EXISTS partnerships (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER REFERENCES creators(id),
    brand_name TEXT NOT NULL,
    brand_contact_id INTEGER REFERENCES brand_contacts(id),
    status TEXT DEFAULT 'prospecting' CHECK(status IN ('prospecting', 'negotiating', 'contracted', 'active', 'completed', 'declined')),
    deal_type TEXT CHECK(deal_type IN ('flat_fee', 'affiliate', 'hybrid', 'gifted', 'ambassador')),
    total_value_cents INTEGER,
    agency_commission_cents INTEGER,
    start_date DATE,
    end_date DATE,
    deliverables_json TEXT,
    performance_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partnerships_creator ON partnerships(creator_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_brand ON partnerships(brand_name);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);
