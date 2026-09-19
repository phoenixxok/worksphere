const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', async (_req, res, next) => {
  try {
    const [totals, byStatus, money, workers, demand] = await Promise.all([
      pool.query(`SELECT
        (SELECT COUNT(*) FROM service_requests) AS total_requests,
        (SELECT COUNT(*) FROM bookings)         AS total_bookings`),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM bookings GROUP BY status`),
      pool.query(`SELECT
        COALESCE(SUM(total_amount_inr),0)::int  AS total_gmv_inr,
        COALESCE(SUM(worker_payout_inr),0)::int AS total_worker_payout_inr,
        COALESCE(SUM(coop_overhead_inr),0)::int AS total_coop_overhead_inr,
        COALESCE(SUM(welfare_fund_inr),0)::int  AS total_welfare_fund_inr
        FROM payments WHERE status = 'settled'`),
      pool.query(`SELECT COUNT(*)::int AS active_workers
        FROM worker_profiles WHERE is_available = TRUE AND verified = TRUE`),
      pool.query(`SELECT s.code AS skill_code, s.name AS skill_name,
                         COUNT(sr.id)::int AS request_count
        FROM skills s
        LEFT JOIN service_requests sr ON sr.skill_id = s.id
        GROUP BY s.id, s.code, s.name
        ORDER BY request_count DESC, s.id`),
    ]);

    const bookings_by_status = {
      pending: 0, accepted: 0, in_progress: 0, completed: 0, cancelled: 0,
    };
    for (const row of byStatus.rows) bookings_by_status[row.status] = row.count;

    res.json({
      total_requests: Number(totals.rows[0].total_requests),
      total_bookings: Number(totals.rows[0].total_bookings),
      bookings_by_status,
      ...money.rows[0],
      active_workers: workers.rows[0].active_workers,
      demand_by_skill: demand.rows,
    });
  } catch (err) { next(err); }
});

// GET /api/admin/rotation-queue
// Next in line for work first: fewest jobs this cycle, then longest since last assigned.
router.get('/rotation-queue', async (_req, res, next) => {
  try {
    const r = await pool.query(`
      SELECT u.id AS worker_user_id, u.full_name,
             COALESCE(ARRAY_AGG(s.code ORDER BY s.code)
                      FILTER (WHERE s.code IS NOT NULL), '{}') AS skills,
             wp.jobs_completed_this_cycle, wp.jobs_completed_total,
             wp.last_assigned_at, wp.is_available, wp.rating_avg
      FROM users u
      JOIN worker_profiles wp ON wp.user_id = u.id
      LEFT JOIN worker_skills ws ON ws.worker_user_id = u.id
      LEFT JOIN skills s ON s.id = ws.skill_id
      WHERE u.role = 'worker' AND wp.verified = TRUE
      GROUP BY u.id, u.full_name, wp.jobs_completed_this_cycle,
               wp.jobs_completed_total, wp.last_assigned_at, wp.is_available, wp.rating_avg
      ORDER BY wp.jobs_completed_this_cycle ASC,
               wp.last_assigned_at ASC NULLS FIRST,
               u.id ASC
    `);
    res.json({
      items: r.rows.map((w) => ({ ...w, rating_avg: Number(w.rating_avg) })),
    });
  } catch (err) { next(err); }
});

// GET /api/admin/bookings — all bookings, OTPs always null for admins.
router.get('/bookings', async (_req, res, next) => {
  try {
    const r = await pool.query(`
      SELECT b.id, b.service_request_id, b.status, b.scheduled_slot, b.quoted_amount_inr,
             b.household_user_id, hu.full_name AS household_name,
             hu.address_text AS household_address_text,
             b.worker_user_id, wu.full_name AS worker_name,
             s.name AS skill_name, sr.issue_summary, sr.urgency,
             NULL::text AS start_otp, NULL::text AS completion_otp,
             b.created_at
      FROM bookings b
      JOIN users hu ON hu.id = b.household_user_id
      JOIN users wu ON wu.id = b.worker_user_id
      JOIN service_requests sr ON sr.id = b.service_request_id
      LEFT JOIN skills s ON s.id = sr.skill_id
      ORDER BY b.id DESC
    `);
    res.json({ items: r.rows });
  } catch (err) { next(err); }
});

module.exports = router;
