const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const PIPELINE_STAGES = [
  'new',
  'analyzing',
  'making_offer',
  'under_contract',
  'due_diligence',
  'rehab',
  'listed',
  'rented',
  'sold',
  'stabilized',
  'dead',
];

// Create lead
router.post('/', (req, res) => {
  const db = getDb();
  const { sourceType, sourceName, contactName, contactPhone, contactEmail,
    askingPrice, notes, propertyId, dealId } = req.body;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO leads (id, property_id, deal_id, source_type, source_name, contact_name,
      contact_phone, contact_email, asking_price, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `).run(id, propertyId, dealId, sourceType, sourceName, contactName,
    contactPhone, contactEmail, askingPrice, notes);

  res.json({ id });
});

// List leads (optionally filtered by status)
router.get('/', (req, res) => {
  const db = getDb();
  const { status, sourceType } = req.query;

  let query = `
    SELECT l.*, p.address, p.city, p.state
    FROM leads l
    LEFT JOIN properties p ON l.property_id = p.id
  `;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('l.status = ?');
    params.push(status);
  }
  if (sourceType) {
    conditions.push('l.source_type = ?');
    params.push(sourceType);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY l.created_at DESC';

  const leads = db.prepare(query).all(...params);
  res.json(leads);
});

// Get pipeline view (grouped by status)
router.get('/pipeline', (req, res) => {
  const db = getDb();
  const leads = db.prepare(`
    SELECT l.*, p.address, p.city, p.state
    FROM leads l
    LEFT JOIN properties p ON l.property_id = p.id
    WHERE l.status != 'dead'
    ORDER BY l.updated_at DESC
  `).all();

  const pipeline = {};
  for (const stage of PIPELINE_STAGES) {
    pipeline[stage] = leads.filter(l => l.status === stage);
  }

  res.json({ pipeline, stages: PIPELINE_STAGES });
});

// Update lead status
router.put('/:id', (req, res) => {
  const db = getDb();
  const { status, notes, followUpDate, contactName, contactPhone, contactEmail } = req.body;

  const fields = [];
  const values = [];

  if (status) { fields.push('status = ?'); values.push(status); }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
  if (followUpDate !== undefined) { fields.push('follow_up_date = ?'); values.push(followUpDate); }
  if (contactName !== undefined) { fields.push('contact_name = ?'); values.push(contactName); }
  if (contactPhone !== undefined) { fields.push('contact_phone = ?'); values.push(contactPhone); }
  if (contactEmail !== undefined) { fields.push('contact_email = ?'); values.push(contactEmail); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  res.json({ success: true });
});

// Delete lead
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get lead source analytics
router.get('/analytics', (req, res) => {
  const db = getDb();
  const bySource = db.prepare(`
    SELECT source_type, COUNT(*) as count,
           SUM(CASE WHEN status IN ('under_contract','rehab','listed','rented','sold','stabilized') THEN 1 ELSE 0 END) as converted
    FROM leads
    GROUP BY source_type
  `).all();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM leads
    GROUP BY status
  `).all();

  res.json({ bySource, byStatus });
});

module.exports = router;
