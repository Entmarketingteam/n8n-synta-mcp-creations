const express = require('express');
const cors = require('cors');
const path = require('path');
const { closeDb } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3334;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
app.use('/api/deals', require('./src/routes/deals'));
app.use('/api/renovation', require('./src/routes/renovation'));
app.use('/api/photos', require('./src/routes/photos'));
app.use('/api/compare', require('./src/routes/compare'));
app.use('/api/enrichment', require('./src/routes/enrichment'));
app.use('/api/leads', require('./src/routes/leads'));
app.use('/api/warnings', require('./src/routes/warnings'));
app.use('/api/templates', require('./src/routes/templates'));
app.use('/api/distressed', require('./src/routes/distressed'));

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'real-estate-calculator' });
});

// Serve React build in production
const clientBuild = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(clientBuild, 'index.html'));
  }
});

const server = app.listen(PORT, () => {
  console.log(`Real Estate Calculator API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  closeDb();
  server.close();
});

module.exports = app;
