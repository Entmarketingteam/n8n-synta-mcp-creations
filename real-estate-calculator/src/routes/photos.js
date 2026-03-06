const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext || mime);
  },
});

// Upload photo for a deal
router.post('/:dealId', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }

  const db = getDb();
  const id = uuidv4();
  const { roomId, notes, checklistItems } = req.body;

  db.prepare(`
    INSERT INTO photos (id, deal_id, room_id, filename, original_name, mime_type, file_size, notes, checklist_items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.dealId, roomId, req.file.filename, req.file.originalname,
    req.file.mimetype, req.file.size, notes, checklistItems);

  res.json({ id, filename: req.file.filename });
});

// Get all photos for a deal
router.get('/:dealId', (req, res) => {
  const db = getDb();
  const photos = db.prepare(
    'SELECT * FROM photos WHERE deal_id = ? ORDER BY room_id, created_at'
  ).all(req.params.dealId);

  photos.forEach(p => {
    p.ai_analysis = p.ai_analysis ? JSON.parse(p.ai_analysis) : null;
    p.checklist_items = p.checklist_items ? JSON.parse(p.checklist_items) : null;
  });

  res.json(photos);
});

// Request AI analysis for a photo
router.post('/:dealId/photos/:photoId/analyze', async (req, res) => {
  const db = getDb();
  const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND deal_id = ?')
    .get(req.params.photoId, req.params.dealId);

  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  // AI analysis would be triggered via n8n webhook or direct API call
  // For now, store the request and return a pending status
  const analysisRequest = {
    photoId: photo.id,
    filename: photo.filename,
    roomId: photo.room_id,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  // If ANTHROPIC_API_KEY is set, attempt direct analysis
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const analysis = await analyzePhoto(photo);
      db.prepare('UPDATE photos SET ai_analysis = ?, ai_analyzed_at = datetime(?) WHERE id = ?')
        .run(JSON.stringify(analysis), new Date().toISOString(), photo.id);
      return res.json({ analysis });
    } catch (err) {
      console.error('AI analysis failed:', err.message);
    }
  }

  // Fallback: trigger n8n webhook for async analysis
  if (process.env.N8N_PHOTO_ANALYSIS_WEBHOOK) {
    try {
      const response = await fetch(process.env.N8N_PHOTO_ANALYSIS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisRequest),
      });
      if (response.ok) {
        return res.json({ status: 'analysis_queued', ...analysisRequest });
      }
    } catch (err) {
      console.error('n8n webhook failed:', err.message);
    }
  }

  res.json({ status: 'no_ai_configured', message: 'Set ANTHROPIC_API_KEY or N8N_PHOTO_ANALYSIS_WEBHOOK to enable AI photo analysis.' });
});

// Delete a photo
router.delete('/:dealId/photos/:photoId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM photos WHERE id = ? AND deal_id = ?')
    .run(req.params.photoId, req.params.dealId);
  res.json({ success: true });
});

async function analyzePhoto(photo) {
  // Placeholder for Claude Vision API integration
  // In production, this reads the image file and sends to Claude
  return {
    status: 'placeholder',
    message: 'Claude Vision analysis would be performed here',
    suggestedChecks: [
      'Check for water damage indicators',
      'Look for structural concerns',
      'Note condition of visible systems',
    ],
  };
}

module.exports = router;
