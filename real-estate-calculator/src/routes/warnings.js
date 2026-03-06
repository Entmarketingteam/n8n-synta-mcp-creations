const express = require('express');
const router = express.Router();
const { getWarnings, getWarningsForField } = require('../warnings');

// Get all warnings for given inputs
router.post('/', (req, res) => {
  const warnings = getWarnings(req.body);
  res.json(warnings);
});

// Get warnings for a specific field
router.post('/field/:field', (req, res) => {
  const warnings = getWarningsForField(req.params.field, req.body);
  res.json(warnings);
});

module.exports = router;
