/**
 * List Stacker — finds properties appearing on multiple distress lists.
 * The core "Anti-Wholesaler" logic:  if a property shows up on 2+ lists
 * simultaneously, it's a high-probability deal.
 */

const { getDb } = require('../db');
const { scoreProperty } = require('./urgency-scorer');
const { v4: uuidv4 } = require('uuid');

/**
 * Normalize an address string for matching
 */
function normalizeAddress(addr) {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bcircle\b/g, 'cir')
    .replace(/\bplace\b/g, 'pl')
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ingest a batch of records from a scraper or FOIA response.
 * Each record: { address, city, county, signalType, source, caseNumber, filingDate, plaintiff, defendant, description, severity }
 *
 * Returns { newProperties, updatedProperties, totalSignals }
 */
function ingestRecords(records) {
  const db = getDb();
  const stats = { newProperties: 0, updatedProperties: 0, totalSignals: 0 };

  const findByAddress = db.prepare(`
    SELECT * FROM distressed_properties
    WHERE LOWER(address) = LOWER(?) AND LOWER(county) = LOWER(?)
  `);

  const insertProperty = db.prepare(`
    INSERT INTO distressed_properties (id, address, city, state, county, owner_name, urgency_score, list_stack_count)
    VALUES (?, ?, ?, 'KY', ?, ?, 0, 0)
  `);

  const insertSignal = db.prepare(`
    INSERT INTO distress_signals (id, distressed_property_id, signal_type, source, county, case_number, filing_date, plaintiff, defendant, description, severity, urgency_points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const getSignals = db.prepare(`
    SELECT * FROM distress_signals WHERE distressed_property_id = ?
  `);

  const updateProperty = db.prepare(`
    UPDATE distressed_properties
    SET urgency_score = ?, list_stack_count = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const checkDuplicateSignal = db.prepare(`
    SELECT id FROM distress_signals
    WHERE distressed_property_id = ? AND signal_type = ? AND (case_number = ? OR (case_number IS NULL AND ? IS NULL))
  `);

  const transaction = db.transaction(() => {
    for (const rec of records) {
      const normalized = normalizeAddress(rec.address);
      if (!normalized) continue;

      // Find or create property
      let prop = findByAddress.get(rec.address, rec.county);
      if (!prop) {
        const propId = uuidv4();
        insertProperty.run(propId, rec.address, rec.city || '', rec.county, rec.defendant || rec.ownerName || '');
        prop = { id: propId };
        stats.newProperties++;
      } else {
        stats.updatedProperties++;
      }

      // Check for duplicate signal
      const existing = checkDuplicateSignal.get(prop.id, rec.signalType, rec.caseNumber || null, rec.caseNumber || null);
      if (existing) continue;

      // Insert signal
      const sigId = uuidv4();
      const severity = rec.severity || 3;
      const points = rec.urgencyPoints || 10;
      insertSignal.run(sigId, prop.id, rec.signalType, rec.source || 'manual', rec.county,
        rec.caseNumber || null, rec.filingDate || null, rec.plaintiff || null,
        rec.defendant || null, rec.description || null, severity, points);
      stats.totalSignals++;

      // Recalculate urgency
      const signals = getSignals.all(prop.id);
      const score = scoreProperty(prop, signals);
      updateProperty.run(score, signals.length, prop.id);
    }
  });

  transaction();
  return stats;
}

/**
 * Get "stacked" properties — those appearing on 2+ distress lists
 */
function getStackedLeads(county, minStack = 2) {
  const db = getDb();
  let query = `
    SELECT dp.*, GROUP_CONCAT(DISTINCT ds.signal_type) as signal_types
    FROM distressed_properties dp
    JOIN distress_signals ds ON ds.distressed_property_id = dp.id
  `;
  const params = [];

  if (county) {
    query += ' WHERE dp.county = ?';
    params.push(county);
  }

  query += `
    GROUP BY dp.id
    HAVING COUNT(DISTINCT ds.signal_type) >= ?
    ORDER BY dp.urgency_score DESC
  `;
  params.push(minStack);

  return db.prepare(query).all(...params);
}

module.exports = { ingestRecords, getStackedLeads, normalizeAddress };
