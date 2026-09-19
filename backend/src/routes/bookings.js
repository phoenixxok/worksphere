const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole, fail } = require('../middleware/auth');
const { generateOtp } = require('../services/otp');

const router = express.Router();

const BOOKING_SELECT = `
  SELECT b.id, b.service_request_id, b.status, b.scheduled_slot, b.quoted_amount_inr,
         b.household_user_id, hu.full_name AS household_name, hu.address_text AS household_address_text,
         b.worker_user_id, wu.full_name AS worker_name,
         s.name AS skill_name, sr.issue_summary, sr.urgency,
         b.start_otp, b.completion_otp,
         b.accepted_at, b.started_at, b.completed_at, b.cancelled_at, b.created_at
  FROM bookings b
  JOIN users hu ON hu.id = b.household_user_id
  JOIN users wu ON wu.id = b.worker_user_id
  JOIN service_requests sr ON sr.id = b.service_request_id
  LEFT JOIN skills s ON s.id = sr.skill_id
`;

/**
 * OTP visibility rule, brief 7.4: the household sees the OTPs, the worker never
 * does. That is the entire point — the household reads the code out loud.
 */
function shapeBooking(row, viewerRole) {
  const out = { ...row };
  if (viewerRole !== 'household') {
    out.start_otp = null;
    out.completion_otp = null;
  }
  return out;
}

// POST /api/bookings  (household, owner of the request)
router.post('/', requireAuth, requireRole('household'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { service_request_id, worker_user_id, scheduled_slot, quoted_amount_inr } = req.body || {};

    if (!service_request_id || !worker_user_id || !scheduled_slot || !quoted_amount_inr) {
      return fail(res, 400, 'VALIDATION_ERROR',
        'service_request_id, worker_user_id, scheduled_slot and quoted_amount_inr are required.');
    }
    const amount = Number(quoted_amount_inr);
    if (!Number.isInteger(amount) || amount <= 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'quoted_amount_inr must be a positive whole number.');
    }

    const sr = await client.query(
      'SELECT id, household_user_id, status FROM service_requests WHERE id = $1',
      [service_request_id]
    );
    if (sr.rowCount === 0) return fail(res, 404, 'NOT_FOUND', 'Service request not found.');
    if (sr.rows[0].household_user_id !== req.auth.user_id) {
      return fail(res, 403, 'NOT_OWNER', 'This request does not belong to you.');
    }
    if (sr.rows[0].status === 'booked') {
      return fail(res, 409, 'INVALID_STATE', 'This request is already booked.');
    }

    const worker = await client.query(
      `SELECT u.id FROM users u JOIN worker_profiles wp ON wp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'worker'`,
      [worker_user_id]
    );
    if (worker.rowCount === 0) return fail(res, 404, 'NOT_FOUND', 'Worker not found.');

    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO bookings
         (service_request_id, household_user_id, worker_user_id, status,
          scheduled_slot, quoted_amount_inr, start_otp)
       VALUES ($1,$2,$3,'pending',$4,$5,$6) RETURNING id`,
      [service_request_id, req.auth.user_id, worker_user_id, scheduled_slot, amount, generateOtp()]
    );
    const bookingId = inserted.rows[0].id;

    await client.query(
      `INSERT INTO payments
         (booking_id, total_amount_inr, worker_payout_inr, coop_overhead_inr, welfare_fund_inr, status)
       VALUES ($1,$2,0,0,0,'pending')`,
      [bookingId, amount]
    );

    await client.query(
      `UPDATE service_requests SET status = 'booked' WHERE id = $1`,
      [service_request_id]
    );

    await client.query('COMMIT');

    const full = await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [bookingId]);
    return res.status(201).json(shapeBooking(full.rows[0], 'household'));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/bookings/mine  (household or worker)
// Declared before '/:id' so "mine" is not read as an id.
router.get('/mine', requireAuth, requireRole('household', 'worker'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `${BOOKING_SELECT} WHERE b.household_user_id = $1 OR b.worker_user_id = $1
       ORDER BY b.id DESC`,
      [req.auth.user_id]
    );
    res.json({ items: r.rows.map((row) => shapeBooking(row, req.auth.role)) });
  } catch (err) { next(err); }
});

// GET /api/bookings/:id  (household owner, assigned worker, or admin)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'VALIDATION_ERROR', 'id must be a number.');

    const r = await pool.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
    if (r.rowCount === 0) return fail(res, 404, 'NOT_FOUND', 'Booking not found.');

    const row = r.rows[0];
    const isHousehold = row.household_user_id === req.auth.user_id;
    const isWorker = row.worker_user_id === req.auth.user_id;
    if (req.auth.role !== 'admin' && !isHousehold && !isWorker) {
      return fail(res, 403, 'NOT_OWNER', 'This booking does not belong to you.');
    }
    res.json(shapeBooking(row, isHousehold ? 'household' : req.auth.role));
  } catch (err) { next(err); }
});

module.exports = router;
