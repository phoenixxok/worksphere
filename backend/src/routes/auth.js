const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, signToken, fail } = require('../middleware/auth');

const router = express.Router();
const ROLES = ['household', 'worker', 'admin'];
const LANGS = ['en', 'hi', 'gu'];

function publicUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    role: row.role,
    language_pref: row.language_pref,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const {
      full_name, phone, password, role,
      latitude, longitude, address_text, language_pref,
    } = req.body || {};

    if (!full_name || !phone || !password || !role) {
      return fail(res, 400, 'VALIDATION_ERROR', 'full_name, phone, password and role are required.');
    }
    if (!ROLES.includes(role)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'role must be household, worker or admin.');
    }
    if (String(password).length < 6) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Password must be at least 6 characters.');
    }
    const lang = language_pref || 'en';
    if (!LANGS.includes(lang)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'language_pref must be en, hi or gu.');
    }

    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rowCount > 0) {
      return fail(res, 409, 'PHONE_ALREADY_REGISTERED', 'This phone number is already registered.');
    }

    const password_hash = await bcrypt.hash(String(password), 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO users (full_name, phone, password_hash, role, latitude, longitude, address_text, language_pref)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [full_name, phone, password_hash, role, latitude ?? null, longitude ?? null, address_text ?? null, lang]
      );
      const user = inserted.rows[0];

      // A worker always gets a profile row, with the schema defaults.
      if (role === 'worker') {
        await client.query('INSERT INTO worker_profiles (user_id) VALUES ($1)', [user.id]);
      }
      await client.query('COMMIT');
      return res.status(201).json({ token: signToken(user), user: publicUser(user) });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return fail(res, 400, 'VALIDATION_ERROR', 'phone and password are required.');
    }
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rowCount === 0) {
      return fail(res, 401, 'INVALID_CREDENTIALS', 'Phone number or password is incorrect.');
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return fail(res, 401, 'INVALID_CREDENTIALS', 'Phone number or password is incorrect.');
    }
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, phone, role, latitude, longitude, address_text, language_pref
       FROM users WHERE id = $1`,
      [req.auth.user_id]
    );
    if (result.rowCount === 0) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }
    const u = result.rows[0];
    return res.json({
      ...u,
      latitude: u.latitude === null ? null : Number(u.latitude),
      longitude: u.longitude === null ? null : Number(u.longitude),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
