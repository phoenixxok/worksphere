const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole, fail } = require('../middleware/auth');
const { extractServiceDetails } = require('../services/nlp');

const router = express.Router();

const REQUEST_SELECT = `
  SELECT sr.id, sr.household_user_id, sr.raw_text, sr.input_mode, sr.detected_language,
         sr.skill_id, s.code AS skill_code, s.name AS skill_name,
         sr.issue_summary, sr.urgency, sr.nlp_source, sr.nlp_confidence,
         sr.status, sr.created_at
  FROM service_requests sr
  LEFT JOIN skills s ON s.id = sr.skill_id
`;

function shape(row) {
  return {
    ...row,
    nlp_confidence: row.nlp_confidence === null ? null : Number(row.nlp_confidence),
  };
}

// POST /api/requests  (household only) — creates the request and parses it.
router.post('/', requireAuth, requireRole('household'), async (req, res, next) => {
  try {
    const { raw_text, input_mode } = req.body || {};
    if (!raw_text || String(raw_text).trim().length === 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'raw_text is required.');
    }
    const mode = input_mode || 'text';
    if (!['text', 'voice'].includes(mode)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'input_mode must be text or voice.');
    }

    const nlp = await extractServiceDetails(raw_text);

    const skillRow = await pool.query('SELECT id FROM skills WHERE code = $1', [nlp.skill_code]);
    const skillId = skillRow.rowCount > 0 ? skillRow.rows[0].id : null;

    const inserted = await pool.query(
      `INSERT INTO service_requests
         (household_user_id, raw_text, input_mode, detected_language, skill_id,
          issue_summary, urgency, nlp_source, nlp_confidence, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'parsed')
       RETURNING id`,
      [req.auth.user_id, String(raw_text).trim(), mode, nlp.detected_language, skillId,
       nlp.issue_summary, nlp.urgency, nlp.source, nlp.confidence]
    );

    const full = await pool.query(`${REQUEST_SELECT} WHERE sr.id = $1`, [inserted.rows[0].id]);
    return res.status(201).json(shape(full.rows[0]));
  } catch (err) { next(err); }
});

// GET /api/requests/mine  (household only)
// NOTE: this must be declared BEFORE '/:id', or Express treats "mine" as an id.
router.get('/mine', requireAuth, requireRole('household'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `${REQUEST_SELECT} WHERE sr.household_user_id = $1 ORDER BY sr.id DESC`,
      [req.auth.user_id]
    );
    res.json({ items: r.rows.map(shape) });
  } catch (err) { next(err); }
});

// GET /api/requests/:id  (owner or admin)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'VALIDATION_ERROR', 'id must be a number.');

    const r = await pool.query(`${REQUEST_SELECT} WHERE sr.id = $1`, [id]);
    if (r.rowCount === 0) return fail(res, 404, 'NOT_FOUND', 'Service request not found.');

    const row = r.rows[0];
    if (req.auth.role !== 'admin' && row.household_user_id !== req.auth.user_id) {
      return fail(res, 403, 'NOT_OWNER', 'This request does not belong to you.');
    }
    res.json(shape(row));
  } catch (err) { next(err); }
});

module.exports = router;
