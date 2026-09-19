// Seeds the WorkSphere prototype database.
// Safe to re-run: it deletes all rows first, then re-inserts.
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PASSWORD = 'test1234';

const SKILLS = [
  ['plumbing', 'Plumbing'],
  ['electrical', 'Electrical'],
  ['cleaning', 'Cleaning'],
  ['carpentry', 'Carpentry'],
  ['appliance_repair', 'Appliance Repair'],
  ['painting', 'Painting'],
];

const ADMIN = {
  full_name: 'Coop Admin', phone: '9876500000', role: 'admin',
  lat: 23.0225, lon: 72.5714, address: 'Co-op Office, Ashram Road, Ahmedabad', lang: 'en',
};

const HOUSEHOLDS = [
  { full_name: 'Ramesh Patel', phone: '9876500001', lat: 23.0367, lon: 72.5620, address: 'Navrangpura, Ahmedabad', lang: 'en' },
  { full_name: 'Meera Shah',   phone: '9876500002', lat: 22.9950, lon: 72.5180, address: 'Satellite, Ahmedabad',   lang: 'gu' },
  { full_name: 'Anil Desai',   phone: '9876500003', lat: 22.9960, lon: 72.6020, address: 'Maninagar, Ahmedabad',   lang: 'hi' },
];

// cycle = jobs_completed_this_cycle. Drives anti-monopoly rotation.
const WORKERS = [
  { full_name: 'Suresh Thakor',    phone: '9876500011', lat: 23.0330, lon: 72.5660, skills: ['plumbing'],                      rating: 4.80, cycle: 4, total: 21, verified: true,  available: true },
  { full_name: 'Jignesh Parmar',   phone: '9876500012', lat: 23.0450, lon: 72.5480, skills: ['plumbing'],                      rating: 4.50, cycle: 0, total: 6,  verified: true,  available: true },
  { full_name: 'Bhavna Chauhan',   phone: '9876500013', lat: 23.0600, lon: 72.5900, skills: ['plumbing', 'cleaning'],          rating: 4.20, cycle: 1, total: 9,  verified: true,  available: true },
  { full_name: 'Ilyas Shaikh',     phone: '9876500014', lat: 23.0100, lon: 72.6100, skills: ['plumbing', 'appliance_repair'],  rating: 4.90, cycle: 2, total: 15, verified: true,  available: true },
  { full_name: 'Kiran Solanki',    phone: '9876500015', lat: 23.0400, lon: 72.5700, skills: ['electrical'],                    rating: 4.30, cycle: 0, total: 3,  verified: true,  available: true },
  { full_name: 'Dinesh Vaghela',   phone: '9876500016', lat: 22.9900, lon: 72.5500, skills: ['electrical'],                    rating: 4.60, cycle: 3, total: 18, verified: true,  available: true },
  { full_name: 'Ushaben Rathod',   phone: '9876500017', lat: 23.0300, lon: 72.5500, skills: ['cleaning'],                      rating: 4.10, cycle: 1, total: 11, verified: true,  available: true },
  { full_name: 'Lata Makwana',     phone: '9876500018', lat: 23.0500, lon: 72.6000, skills: ['cleaning'],                      rating: 4.70, cycle: 0, total: 8,  verified: true,  available: true },
  { full_name: 'Mahesh Barot',     phone: '9876500019', lat: 23.0200, lon: 72.5800, skills: ['carpentry'],                     rating: 4.40, cycle: 2, total: 13, verified: true,  available: true },
  { full_name: 'Farid Mansuri',    phone: '9876500020', lat: 23.0350, lon: 72.5900, skills: ['appliance_repair'],              rating: 4.50, cycle: 1, total: 10, verified: true,  available: true },
  { full_name: 'Rakesh Prajapati', phone: '9876500021', lat: 23.0250, lon: 72.5400, skills: ['painting'],                      rating: 4.00, cycle: 0, total: 4,  verified: true,  available: true },
  { full_name: 'Nitin Dabhi',      phone: '9876500022', lat: 23.0450, lon: 72.5750, skills: ['cleaning', 'painting'],          rating: 4.20, cycle: 5, total: 27, verified: true,  available: true },
  // Unverified on purpose: proves the eligibility filter excludes him from plumbing matches.
  { full_name: 'Prakash Joshi',    phone: '9876500023', lat: 23.0340, lon: 72.5630, skills: ['plumbing'],                      rating: 4.90, cycle: 0, total: 0,  verified: false, available: true },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Wipe in child-first order.
    await client.query('DELETE FROM payments');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM match_candidates');
    await client.query('DELETE FROM service_requests');
    await client.query('DELETE FROM worker_skills');
    await client.query('DELETE FROM worker_profiles');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM skills');

    // Restart IDs at 1 so seeded IDs are predictable for the demo.
    for (const t of ['payments', 'bookings', 'match_candidates', 'service_requests', 'users', 'skills']) {
      await client.query(`ALTER SEQUENCE ${t}_id_seq RESTART WITH 1`);
    }

    // Skills
    const skillIdByCode = {};
    for (const [code, name] of SKILLS) {
      const r = await client.query(
        'INSERT INTO skills (code, name) VALUES ($1, $2) RETURNING id', [code, name]
      );
      skillIdByCode[code] = r.rows[0].id;
    }

    const hash = await bcrypt.hash(PASSWORD, 10);

    // Admin
    await client.query(
      `INSERT INTO users (full_name, phone, password_hash, role, latitude, longitude, address_text, language_pref)
       VALUES ($1,$2,$3,'admin',$4,$5,$6,$7)`,
      [ADMIN.full_name, ADMIN.phone, hash, ADMIN.lat, ADMIN.lon, ADMIN.address, ADMIN.lang]
    );

    // Households
    for (const h of HOUSEHOLDS) {
      await client.query(
        `INSERT INTO users (full_name, phone, password_hash, role, latitude, longitude, address_text, language_pref)
         VALUES ($1,$2,$3,'household',$4,$5,$6,$7)`,
        [h.full_name, h.phone, hash, h.lat, h.lon, h.address, h.lang]
      );
    }

    // Workers
    for (const w of WORKERS) {
      const u = await client.query(
        `INSERT INTO users (full_name, phone, password_hash, role, latitude, longitude, address_text, language_pref)
         VALUES ($1,$2,$3,'worker',$4,$5,$6,'gu') RETURNING id`,
        [w.full_name, w.phone, hash, w.lat, w.lon, 'Ahmedabad']
      );
      const workerId = u.rows[0].id;

      await client.query(
        `INSERT INTO worker_profiles
           (user_id, is_available, verified, rating_avg, jobs_completed_total, jobs_completed_this_cycle, last_assigned_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [workerId, w.available, w.verified, w.rating, w.total, w.cycle,
         w.cycle > 0 ? new Date(Date.now() - w.cycle * 86400000) : null]
      );

      for (const code of w.skills) {
        await client.query(
          'INSERT INTO worker_skills (worker_user_id, skill_id) VALUES ($1,$2)',
          [workerId, skillIdByCode[code]]
        );
      }
    }

    await client.query('COMMIT');

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM skills)          AS skills,
        (SELECT COUNT(*) FROM users)           AS users,
        (SELECT COUNT(*) FROM worker_profiles) AS workers,
        (SELECT COUNT(*) FROM worker_skills)   AS worker_skills
    `);
    console.log('Seed complete:', counts.rows[0]);
    console.log('All passwords are:', PASSWORD);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
