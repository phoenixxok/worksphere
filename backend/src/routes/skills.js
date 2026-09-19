const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/skills
router.get('/', async (_req, res, next) => {
  try {
    const r = await pool.query('SELECT id, code, name FROM skills ORDER BY id');
    res.json({ items: r.rows });
  } catch (err) { next(err); }
});

module.exports = router;
