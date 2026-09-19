const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole, fail } = require('../middleware/auth');
const { generateOtp, otpMatches, MAX_ATTEMPTS } = require('../services/otp');
const { computeSplit, SPLIT_PERCENTAGES } = require('../services/payments');

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

/** Loads a booking and checks the caller is the assigned worker. */
async function loadForWorker(client, id, authUserId) {
  const r = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (r.rowCount === 0) return { error: ['NOT_FOUND', 404, 'Booking not found.'] };
  const b = r.rows[0];
  if (b.worker_user_id !== authUserId) {
    return { error: ['NOT_OWNER', 403, 'This booking is not assigned to you.'] };
  }
  return { booking: b };
}

// POST /api/bookings/:id/accept  (assigned worker)
router.post('/:id/accept', requireAuth, requireRole('worker'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { booking, error } = await loadForWorker(pool, id, req.auth.user_id);
    if (error) return fail(res, error[1], error[0], error[2]);
    if (booking.status !== 'pending') {
      return fail(res, 409, 'INVALID_STATE', `Cannot accept a booking that is ${booking.status}.`);
    }
    const r = await pool.query(
      `UPDATE bookings SET status = 'accepted', accepted_at = NOW()
       WHERE id = $1 RETURNING id, status, accepted_at`,
      [id]
    );
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/bookings/:id/verify-start-otp  (assigned worker)
router.post('/:id/verify-start-otp', requireAuth, requireRole('worker'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { otp } = req.body || {};
    if (!otp) return fail(res, 400, 'VALIDATION_ERROR', 'otp is required.');

    const { booking, error } = await loadForWorker(pool, id, req.auth.user_id);
    if (error) return fail(res, error[1], error[0], error[2]);
    if (booking.status !== 'accepted') {
      return fail(res, 409, 'INVALID_STATE',
        `Start OTP can only be verified on an accepted booking (this one is ${booking.status}).`);
    }
    if (booking.start_otp_attempts >= MAX_ATTEMPTS) {
      return fail(res, 429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Contact the co-op.');
    }

    if (!otpMatches(booking.start_otp, otp)) {
      const upd = await pool.query(
        `UPDATE bookings SET start_otp_attempts = start_otp_attempts + 1
         WHERE id = $1 RETURNING start_otp_attempts`,
        [id]
      );
      const left = MAX_ATTEMPTS - upd.rows[0].start_otp_attempts;
      if (left <= 0) {
        return fail(res, 429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Contact the co-op.');
      }
      return fail(res, 400, 'INVALID_OTP', `Incorrect OTP. ${left} attempts remaining.`);
    }

    // Correct: start the job and issue the completion OTP.
    const r = await pool.query(
      `UPDATE bookings
       SET status = 'in_progress', started_at = NOW(), completion_otp = $2
       WHERE id = $1 RETURNING id, status, started_at`,
      [id, generateOtp()]
    );
    res.json({ ...r.rows[0], completion_otp_generated: true });
  } catch (err) { next(err); }
});

// POST /api/bookings/:id/verify-completion-otp  (assigned worker)
// Performs the section 4.4 transaction: complete, settle, increment counters.
router.post('/:id/verify-completion-otp', requireAuth, requireRole('worker'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const { otp } = req.body || {};
    if (!otp) return fail(res, 400, 'VALIDATION_ERROR', 'otp is required.');

    const { booking, error } = await loadForWorker(client, id, req.auth.user_id);
    if (error) return fail(res, error[1], error[0], error[2]);
    if (booking.status !== 'in_progress') {
      return fail(res, 409, 'INVALID_STATE',
        `Completion OTP can only be verified on a job in progress (this one is ${booking.status}).`);
    }
    if (booking.completion_otp_attempts >= MAX_ATTEMPTS) {
      return fail(res, 429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Contact the co-op.');
    }

    if (!otpMatches(booking.completion_otp, otp)) {
      const upd = await client.query(
        `UPDATE bookings SET completion_otp_attempts = completion_otp_attempts + 1
         WHERE id = $1 RETURNING completion_otp_attempts`,
        [id]
      );
      const left = MAX_ATTEMPTS - upd.rows[0].completion_otp_attempts;
      if (left <= 0) {
        return fail(res, 429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Contact the co-op.');
      }
      return fail(res, 400, 'INVALID_OTP', `Incorrect OTP. ${left} attempts remaining.`);
    }

    const split = computeSplit(booking.quoted_amount_inr);

    await client.query('BEGIN');

    const done = await client.query(
      `UPDATE bookings SET status = 'completed', completed_at = NOW()
       WHERE id = $1 RETURNING id, status, completed_at`,
      [id]
    );

    await client.query(
      `UPDATE payments
       SET total_amount_inr = $2, worker_payout_inr = $3,
           coop_overhead_inr = $4, welfare_fund_inr = $5, status = 'settled'
       WHERE booking_id = $1`,
      [id, split.total_amount_inr, split.worker_payout_inr,
       split.coop_overhead_inr, split.welfare_fund_inr]
    );

    // Rotation counters. jobs_completed_this_cycle is what pushes this worker
    // down the fair-matching ranking for the rest of the cycle.
    await client.query(
      `UPDATE worker_profiles
       SET jobs_completed_total = jobs_completed_total + 1,
           jobs_completed_this_cycle = jobs_completed_this_cycle + 1,
           last_assigned_at = NOW()
       WHERE user_id = $1`,
      [booking.worker_user_id]
    );

    await client.query('COMMIT');

    res.json({
      ...done.rows[0],
      payment: {
        total_amount_inr: split.total_amount_inr,
        worker_payout_inr: split.worker_payout_inr,
        coop_overhead_inr: split.coop_overhead_inr,
        welfare_fund_inr: split.welfare_fund_inr,
        status: 'settled',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/bookings/:id/cancel  (household owner or assigned worker)
router.post('/:id/cancel', requireAuth, requireRole('household', 'worker'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const r = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (r.rowCount === 0) return fail(res, 404, 'NOT_FOUND', 'Booking not found.');
    const b = r.rows[0];

    const isParty = b.household_user_id === req.auth.user_id || b.worker_user_id === req.auth.user_id;
    if (!isParty) return fail(res, 403, 'NOT_OWNER', 'This booking does not belong to you.');
    if (!['pending', 'accepted'].includes(b.status)) {
      return fail(res, 409, 'INVALID_STATE', `Cannot cancel a booking that is ${b.status}.`);
    }

    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1 RETURNING id, status, cancelled_at`,
      [id]
    );
    // Free the request so the household can pick another worker.
    await client.query(
      `UPDATE service_requests SET status = 'matched' WHERE id = $1`,
      [b.service_request_id]
    );
    await client.query('COMMIT');

    res.json(upd.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/bookings/:id/payment  (household owner, assigned worker, or admin)
router.get('/:id/payment', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query(
      `SELECT p.*, b.household_user_id, b.worker_user_id
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       WHERE p.booking_id = $1`,
      [id]
    );
    if (r.rowCount === 0) return fail(res, 404, 'NOT_FOUND', 'Payment not found.');
    const p = r.rows[0];
    const isParty = p.household_user_id === req.auth.user_id || p.worker_user_id === req.auth.user_id;
    if (req.auth.role !== 'admin' && !isParty) {
      return fail(res, 403, 'NOT_OWNER', 'This payment does not belong to you.');
    }
    res.json({
      booking_id: p.booking_id,
      total_amount_inr: p.total_amount_inr,
      worker_payout_inr: p.worker_payout_inr,
      coop_overhead_inr: p.coop_overhead_inr,
      welfare_fund_inr: p.welfare_fund_inr,
      status: p.status,
      split_percentages: SPLIT_PERCENTAGES,
    });
  } catch (err) { next(err); }
});

module.exports = router;
