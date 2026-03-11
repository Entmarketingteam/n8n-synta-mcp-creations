-- Distressed Property Finder Schema
-- Kentucky Trio: Fayette, Scott, Oldham

-- Distressed properties discovered via scraping/FOIA
CREATE TABLE IF NOT EXISTS distressed_properties (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'KY',
  zip TEXT,
  county TEXT NOT NULL, -- fayette, scott, oldham
  parcel_id TEXT,
  owner_name TEXT,
  owner_mailing_address TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  zoning TEXT,
  property_type TEXT,
  year_built INTEGER,
  square_footage INTEGER,
  lot_size REAL,
  bedrooms INTEGER,
  bathrooms REAL,
  appraised_value REAL,
  estimated_equity_percent REAL,
  last_sale_date TEXT,
  last_sale_price REAL,
  urgency_score INTEGER DEFAULT 0,
  list_stack_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new', -- new, contacted, negotiating, under_contract, dead
  notes TEXT,
  skip_traced INTEGER DEFAULT 0,
  skip_traced_at TEXT,
  first_contact_date TEXT,
  property_id TEXT REFERENCES properties(id),
  lead_id TEXT REFERENCES leads(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Individual distress signals (each indicator for a property)
CREATE TABLE IF NOT EXISTS distress_signals (
  id TEXT PRIMARY KEY,
  distressed_property_id TEXT NOT NULL REFERENCES distressed_properties(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- lis_pendens, probate, code_violation, water_shutoff, tax_lien, nuisance_lien, expired_permit, sale_cancellation, absentee_owner, burnout
  source TEXT, -- ecclix, fayette_pva, foia_response, manual, court_records, code_enforcement
  county TEXT NOT NULL,
  case_number TEXT,
  filing_date TEXT,
  plaintiff TEXT,
  defendant TEXT,
  description TEXT,
  severity INTEGER DEFAULT 1, -- 1-5 scale
  urgency_points INTEGER DEFAULT 10,
  raw_data TEXT, -- JSON blob of scraped data
  verified INTEGER DEFAULT 0,
  verified_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FOIA request tracking
CREATE TABLE IF NOT EXISTS foia_requests (
  id TEXT PRIMARY KEY,
  county TEXT NOT NULL,
  agency TEXT NOT NULL, -- utility_department, building_inspection, sheriff, county_clerk
  request_type TEXT NOT NULL, -- water_shutoff, expired_permits, nuisance_liens, delinquent_taxes
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent, acknowledged, received, denied, appealing
  sent_at TEXT,
  response_received_at TEXT,
  response_notes TEXT,
  records_count INTEGER DEFAULT 0,
  next_send_date TEXT,
  recurrence_days INTEGER DEFAULT 30,
  auto_send INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Zoning intelligence for recovery/care facility opportunities
CREATE TABLE IF NOT EXISTS zoning_intel (
  id TEXT PRIMARY KEY,
  county TEXT NOT NULL,
  address TEXT,
  parcel_id TEXT,
  current_zoning TEXT,
  target_use TEXT, -- recovery_residence, residential_care, treatment_center, group_home
  filing_type TEXT, -- cup, variance, reasonable_accommodation, building_permit, recovery_license
  filing_entity TEXT, -- LLC or person filing
  filing_date TEXT,
  hearing_date TEXT,
  board TEXT, -- boa, planning_commission, fiscal_court
  status TEXT DEFAULT 'pending', -- pending, approved, denied, withdrawn
  notes TEXT,
  estimated_investment REAL,
  distressed_property_id TEXT REFERENCES distressed_properties(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Scraper run logs
CREATE TABLE IF NOT EXISTS scraper_runs (
  id TEXT PRIMARY KEY,
  scraper_type TEXT NOT NULL, -- ecclix_scott, ecclix_oldham, fayette_court, fayette_pva, code_enforcement
  county TEXT NOT NULL,
  status TEXT DEFAULT 'running', -- running, completed, failed
  records_found INTEGER DEFAULT 0,
  new_leads INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distressed_county ON distressed_properties(county);
CREATE INDEX IF NOT EXISTS idx_distressed_urgency ON distressed_properties(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_distressed_status ON distressed_properties(status);
CREATE INDEX IF NOT EXISTS idx_distressed_stack ON distressed_properties(list_stack_count DESC);
CREATE INDEX IF NOT EXISTS idx_signals_property ON distress_signals(distressed_property_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON distress_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_county ON distress_signals(county);
CREATE INDEX IF NOT EXISTS idx_foia_status ON foia_requests(status);
CREATE INDEX IF NOT EXISTS idx_foia_next_send ON foia_requests(next_send_date);
CREATE INDEX IF NOT EXISTS idx_zoning_county ON zoning_intel(county);
CREATE INDEX IF NOT EXISTS idx_zoning_filing ON zoning_intel(filing_type);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_type ON scraper_runs(scraper_type);
