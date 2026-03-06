const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const renovationTemplates = require('../../data/renovation-templates.json');
const costMultipliers = require('../../data/cost-multipliers.json');

// Get renovation budget for a deal
router.get('/:dealId', (req, res) => {
  const db = getDb();
  const items = db.prepare(
    'SELECT * FROM renovation_items WHERE deal_id = ? ORDER BY category, sort_order'
  ).all(req.params.dealId);

  // Group by category
  const byCategory = {};
  let total = 0;
  for (const item of items) {
    if (!byCategory[item.category]) {
      byCategory[item.category] = { items: [], estimatedTotal: 0, actualTotal: 0 };
    }
    byCategory[item.category].items.push(item);
    byCategory[item.category].estimatedTotal += item.estimated_cost || 0;
    byCategory[item.category].actualTotal += item.actual_cost || 0;
    total += item.estimated_cost || 0;
  }

  res.json({ items, byCategory, estimatedTotal: total });
});

// Add renovation item
router.post('/:dealId/items', (req, res) => {
  const db = getDb();
  const { category, description, estimatedCost, actualCost, costPerSqft,
    diyOrContractor, supplier, supplierNotes, costSavingTip } = req.body;

  const id = uuidv4();
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as max FROM renovation_items WHERE deal_id = ? AND category = ?'
  ).get(req.params.dealId, category);

  db.prepare(`
    INSERT INTO renovation_items (id, deal_id, category, description, estimated_cost, actual_cost,
      cost_per_sqft, diy_or_contractor, supplier, supplier_notes, cost_saving_tip, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.dealId, category, description, estimatedCost || 0, actualCost,
    costPerSqft, diyOrContractor || 'contractor', supplier, supplierNotes, costSavingTip,
    (maxOrder?.max || 0) + 1);

  res.json({ id, success: true });
});

// Update renovation item
router.put('/:dealId/items/:itemId', (req, res) => {
  const db = getDb();
  const { description, estimatedCost, actualCost, costPerSqft,
    diyOrContractor, supplier, supplierNotes, costSavingTip } = req.body;

  db.prepare(`
    UPDATE renovation_items SET
      description = COALESCE(?, description),
      estimated_cost = COALESCE(?, estimated_cost),
      actual_cost = COALESCE(?, actual_cost),
      cost_per_sqft = COALESCE(?, cost_per_sqft),
      diy_or_contractor = COALESCE(?, diy_or_contractor),
      supplier = COALESCE(?, supplier),
      supplier_notes = COALESCE(?, supplier_notes),
      cost_saving_tip = COALESCE(?, cost_saving_tip)
    WHERE id = ? AND deal_id = ?
  `).run(description, estimatedCost, actualCost, costPerSqft,
    diyOrContractor, supplier, supplierNotes, costSavingTip,
    req.params.itemId, req.params.dealId);

  res.json({ success: true });
});

// Delete renovation item
router.delete('/:dealId/items/:itemId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM renovation_items WHERE id = ? AND deal_id = ?')
    .run(req.params.itemId, req.params.dealId);
  res.json({ success: true });
});

// Apply a renovation template to a deal
router.post('/:dealId/apply-template', (req, res) => {
  const db = getDb();
  const { templateKey, squareFootage, metro } = req.body;

  const template = renovationTemplates[templateKey];
  if (!template) {
    return res.status(400).json({ error: 'Invalid template key' });
  }

  // Get cost multiplier for metro
  const multiplier = metro && costMultipliers.metros[metro]
    ? costMultipliers.metros[metro].multiplier
    : 1.0;

  const insert = db.prepare(`
    INSERT INTO renovation_items (id, deal_id, category, description, estimated_cost, cost_per_sqft, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let cost = 0;
      if (item.costPerSqft && squareFootage) {
        cost = item.costPerSqft * squareFootage * multiplier;
      } else if (item.estimatedCost) {
        cost = item.estimatedCost * multiplier;
      }
      insert.run(uuidv4(), req.params.dealId, item.category, item.description,
        Math.round(cost * 100) / 100, item.costPerSqft || null, i + 1);
    }
  });

  // Clear existing items first
  db.prepare('DELETE FROM renovation_items WHERE deal_id = ?').run(req.params.dealId);
  insertMany(template.items);

  res.json({ success: true, itemCount: template.items.length });
});

module.exports = router;
