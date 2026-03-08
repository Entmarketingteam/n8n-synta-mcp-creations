-- creators.db — Seed ENT Agency creator roster
-- Phase 1 seed data for active creators

INSERT OR IGNORE INTO creators (name, slug, niche, status) VALUES
    ('Nicki Entenmann', 'nicki-entenmann', 'health-wellness', 'active'),
    ('Sara Preston', 'sara-preston', 'fitness', 'active'),
    ('Ellen Ludwig', 'ellen-ludwig', 'health-wellness', 'active'),
    ('Courtney Pappy', 'courtney-pappy', 'motherhood', 'active'),
    ('Ann Schulte', 'ann-schulte', 'health-wellness', 'active');

-- Seed known brand contacts
INSERT OR IGNORE INTO brand_contacts (brand_name, notes) VALUES
    ('Thorne', 'Health supplement brand'),
    ('LMNT', 'Electrolyte supplement brand'),
    ('Hume Health', 'Wellness brand'),
    ('ARMRA', 'Colostrum supplement brand'),
    ('Equip', 'Protein supplement brand');
