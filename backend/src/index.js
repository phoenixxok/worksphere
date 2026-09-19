require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./db');

const app = express();

// CORS: allow the frontend origin(s) listed in the env var.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json());

// Log every request. Helps enormously when debugging during the demo build.
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/health', async (_req, res) => {
  let db = 'disconnected';
  try {
    await pool.query('SELECT 1');
    db = 'connected';
  } catch (err) {
    console.error('Health check DB error:', err.message);
  }
  res.json({
    status: 'ok',
    db,
    llm_enabled: process.env.LLM_ENABLED === 'true',
  });
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const skillsRoutes = require('./routes/skills');
const requestRoutes = require('./routes/requests');
app.use('/api/skills', skillsRoutes);
app.use('/api/requests', requestRoutes);

// 404 for any unknown /api route, in the standard error shape from 01 section 6.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } });
});

// Catch-all error handler. Must have 4 arguments for Express to recognise it.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`WorkSphere backend listening on http://localhost:${PORT}`);
});
