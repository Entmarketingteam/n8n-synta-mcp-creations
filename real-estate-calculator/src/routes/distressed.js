const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { scoreProperty, getUrgencyLabel, SIGNAL_POINTS } = require('../services/urgency-scorer');
const { ingestRecords, getStackedLeads } = require('../services/list-stacker');
const { COUNTY_CONFIGS, ZONING_RULES, SIGNAL_TYPES } = require('../services/scraper-config');
const {
  createFoiaRequest, getFoiaRequests, getDueRequests,
  markSent, markReceived, TEMPLATES,
} = require('../services/foia-manager');

// ─── Distressed Properties ───

// List distressed properties (with filters)
router.get('/properties', (req, res) => {
  const db = getDb();
  const { county, status, minUrgency, minStack, limit } = req.query;

  let query = `
    SELECT dp.*,
      (SELECT GROUP_CONCAT(DISTINCT ds.signal_type) FROM distress_signals ds WHERE ds.distressed_property_id = dp.id) as signal_types,
      (SELECT COUNT(*) FROM distress_signals ds WHERE ds.distressed_property_id = dp.id) as signal_count
    FROM distressed_properties dp
  `;
  const conditions = [];
  const params = [];

  if (county) { conditions.push('dp.county = ?'); params.push(county.toLowerCase()); }
  if (status) { conditions.push('dp.status = ?'); params.push(status); }
  if (minUrgency) { conditions.push('dp.urgency_score >= ?'); params.push(parseInt(minUrgency)); }
  if (minStack) { conditions.push('dp.list_stack_count >= ?'); params.push(parseInt(minStack)); }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY dp.urgency_score DESC';
  if (limit) query += ` LIMIT ${parseInt(limit)}`;

  const properties = db.prepare(query).all(...params);
  res.json(properties);
});

// Get single distressed property with signals
router.get('/properties/:id', (req, res) => {
  const db = getDb();
  const prop = db.prepare('SELECT * FROM distressed_properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Not found' });

  const signals = db.prepare('SELECT * FROM distress_signals WHERE distressed_property_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...prop, signals });
});

// Create distressed property manually
router.post('/properties', (req, res) => {
  const db = getDb();
  const { address, city, county, zip, ownerName, parcelId, zoningInfo,
    appraisedValue, estimatedEquityPercent, notes } = req.body;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO distressed_properties (id, address, city, county, zip, owner_name, parcel_id, zoning, appraised_value, estimated_equity_percent, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, address, city || '', (county || '').toLowerCase(), zip || '', ownerName || '', parcelId || '', zoningInfo || '', appraisedValue || 0, estimatedEquityPercent || 0, notes || '');

  res.json({ id });
});

// Update distressed property
router.put('/properties/:id', (req, res) => {
  const db = getDb();
  const fields = [];
  const values = [];
  const allowed = ['address', 'city', 'county', 'zip', 'owner_name', 'owner_mailing_address',
    'owner_phone', 'owner_email', 'zoning', 'parcel_id', 'appraised_value',
    'estimated_equity_percent', 'status', 'notes', 'skip_traced', 'first_contact_date'];

  for (const key of allowed) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[camelKey] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(req.body[camelKey]);
    }
  }

  if (fields.length) {
    fields.push("updated_at = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE distressed_properties SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // If skip_traced, update timestamp
  if (req.body.skipTraced) {
    db.prepare("UPDATE distressed_properties SET skip_traced_at = datetime('now') WHERE id = ?").run(req.params.id);
  }

  res.json({ success: true });
});

// Delete distressed property
router.delete('/properties/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM distressed_properties WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Distress Signals ───

// Add signal to a property
router.post('/properties/:id/signals', (req, res) => {
  const db = getDb();
  const prop = db.prepare('SELECT * FROM distressed_properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const { signalType, source, caseNumber, filingDate, plaintiff, defendant, description, severity } = req.body;
  const sigId = uuidv4();
  const points = SIGNAL_POINTS[signalType] || 10;

  db.prepare(`
    INSERT INTO distress_signals (id, distressed_property_id, signal_type, source, county, case_number, filing_date, plaintiff, defendant, description, severity, urgency_points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sigId, req.params.id, signalType, source || 'manual', prop.county,
    caseNumber || null, filingDate || null, plaintiff || null, defendant || null,
    description || null, severity || 3, points);

  // Recalculate urgency
  const signals = db.prepare('SELECT * FROM distress_signals WHERE distressed_property_id = ?').all(req.params.id);
  const score = scoreProperty(prop, signals);
  db.prepare('UPDATE distressed_properties SET urgency_score = ?, list_stack_count = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(score, signals.length, req.params.id);

  res.json({ id: sigId, urgencyScore: score, stackCount: signals.length });
});

// ─── Batch Ingest (from scrapers / FOIA responses) ───

router.post('/ingest', (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records array required' });
  }
  const stats = ingestRecords(records);
  res.json(stats);
});

// ─── Stacked Leads (properties on 2+ lists) ───

router.get('/stacked', (req, res) => {
  const { county, minStack } = req.query;
  const leads = getStackedLeads(county, parseInt(minStack) || 2);
  res.json(leads);
});

// ─── Analytics / Dashboard Data ───

router.get('/analytics', (req, res) => {
  const db = getDb();

  const byCounty = db.prepare(`
    SELECT county, COUNT(*) as total,
      SUM(CASE WHEN urgency_score >= 80 THEN 1 ELSE 0 END) as high_urgency,
      SUM(CASE WHEN list_stack_count >= 2 THEN 1 ELSE 0 END) as stacked,
      AVG(urgency_score) as avg_urgency
    FROM distressed_properties
    GROUP BY county
  `).all();

  const bySignalType = db.prepare(`
    SELECT signal_type, county, COUNT(*) as count
    FROM distress_signals
    GROUP BY signal_type, county
    ORDER BY count DESC
  `).all();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM distressed_properties
    GROUP BY status
  `).all();

  const recentSignals = db.prepare(`
    SELECT ds.*, dp.address, dp.city
    FROM distress_signals ds
    JOIN distressed_properties dp ON dp.id = ds.distressed_property_id
    ORDER BY ds.created_at DESC
    LIMIT 20
  `).all();

  const topLeads = db.prepare(`
    SELECT dp.*,
      (SELECT GROUP_CONCAT(DISTINCT ds.signal_type) FROM distress_signals ds WHERE ds.distressed_property_id = dp.id) as signal_types
    FROM distressed_properties dp
    WHERE dp.urgency_score >= 50
    ORDER BY dp.urgency_score DESC
    LIMIT 10
  `).all();

  res.json({ byCounty, bySignalType, byStatus, recentSignals, topLeads });
});

// ─── FOIA Requests ───

router.get('/foia', (req, res) => {
  const requests = getFoiaRequests(req.query);
  res.json(requests);
});

router.post('/foia', (req, res) => {
  const { county, requestType, recipientEmail, recipientName, agency, recurrenceDays, autoSend } = req.body;
  const result = createFoiaRequest(county, requestType, { recipientEmail, recipientName, agency, recurrenceDays, autoSend });
  res.json(result);
});

router.put('/foia/:id/sent', (req, res) => {
  markSent(req.params.id);
  res.json({ success: true });
});

router.put('/foia/:id/received', (req, res) => {
  const { notes, recordsCount } = req.body;
  markReceived(req.params.id, notes, recordsCount);
  res.json({ success: true });
});

router.get('/foia/due', (req, res) => {
  const due = getDueRequests();
  res.json(due);
});

router.get('/foia/templates', (req, res) => {
  res.json(Object.keys(TEMPLATES).map(key => ({
    id: key,
    subject: TEMPLATES[key].subject,
    preview: TEMPLATES[key].body('Example', '01/01/2026', '01/31/2026').substring(0, 200) + '...',
  })));
});

router.delete('/foia/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM foia_requests WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Zoning Intelligence ───

router.get('/zoning', (req, res) => {
  const db = getDb();
  const { county } = req.query;

  let query = 'SELECT * FROM zoning_intel';
  const params = [];
  if (county) {
    query += ' WHERE county = ?';
    params.push(county.toLowerCase());
  }
  query += ' ORDER BY created_at DESC';

  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.post('/zoning', (req, res) => {
  const db = getDb();
  const { county, address, parcelId, currentZoning, targetUse, filingType,
    filingEntity, filingDate, hearingDate, board, notes, estimatedInvestment } = req.body;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO zoning_intel (id, county, address, parcel_id, current_zoning, target_use, filing_type, filing_entity, filing_date, hearing_date, board, notes, estimated_investment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, (county || '').toLowerCase(), address || '', parcelId || '',
    currentZoning || '', targetUse || '', filingType || '', filingEntity || '',
    filingDate || null, hearingDate || null, board || '', notes || '',
    estimatedInvestment || 0);

  res.json({ id });
});

router.put('/zoning/:id', (req, res) => {
  const db = getDb();
  const fields = [];
  const values = [];
  const allowed = ['status', 'notes', 'hearing_date', 'estimated_investment'];

  for (const key of allowed) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[camelKey] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(req.body[camelKey]);
    }
  }

  if (fields.length) {
    fields.push("updated_at = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE zoning_intel SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  res.json({ success: true });
});

router.delete('/zoning/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM zoning_intel WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Configuration / Reference Data ───

router.get('/config/counties', (req, res) => {
  res.json(COUNTY_CONFIGS);
});

router.get('/config/zoning-rules', (req, res) => {
  res.json(ZONING_RULES);
});

router.get('/config/signal-types', (req, res) => {
  res.json(SIGNAL_TYPES);
});

// ─── Scraper Runs (logging) ───

router.get('/scraper-runs', (req, res) => {
  const db = getDb();
  const runs = db.prepare('SELECT * FROM scraper_runs ORDER BY started_at DESC LIMIT 50').all();
  res.json(runs);
});

router.post('/scraper-runs', (req, res) => {
  const db = getDb();
  const { scraperType, county } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO scraper_runs (id, scraper_type, county) VALUES (?, ?, ?)').run(id, scraperType, county);
  res.json({ id });
});

router.put('/scraper-runs/:id', (req, res) => {
  const db = getDb();
  const { status, recordsFound, newLeads, errorMessage } = req.body;
  db.prepare(`
    UPDATE scraper_runs SET status = ?, records_found = ?, new_leads = ?, error_message = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(status || 'completed', recordsFound || 0, newLeads || 0, errorMessage || null, req.params.id);
  res.json({ success: true });
});

module.exports = router;
