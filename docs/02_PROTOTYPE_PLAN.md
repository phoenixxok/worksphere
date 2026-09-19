# 02_PROTOTYPE_PLAN.md — PART A (Tasks T01–T12)
# WorkSphere prototype · build blocks 0 and 1
# Part B contains T13–T24, the cut line, the freeze, and the wall-clock schedule.

---

## BRIEF AMENDMENT (read once, then follow 01 as written)

One change to `01_SHARED_BRIEF.md` §10 repo layout:

- `backend/db/seed.sql` is **replaced by** `backend/db/seed.js`.
- Reason: passwords must be bcrypt-hashed, and a hash cannot be written into a plain `.sql` file safely. `seed.js` hashes at run time.
- Everything else in 01 is unchanged.

---

## OWNERS

- **A** — backend + database (Yash)
- **B** — frontend
- **C** — seed data, LLM, deployment, docs, demo

## DEPENDENCY MAP FOR PART A
T01 ─┬─ T02 ── T03 ─┐
└─ T04 ────────┼─ T06 ── T08 ── T10 ── T12
T01 ─── T05 ────────┘ │ │ │
T07 ── T09 ── T11
No loops. T05 may start the moment T01 is pushed; B does not wait for the database.

---
---

# T01 · Repo skeleton and Git setup
**Owner A · Prereqs: none · ~20 min**

### Goal
Create the `worksphere` repository with the folder structure from `01_SHARED_BRIEF.md` §10 and push it to GitHub so all three teammates can clone it.

### Commands
Run in your projects folder (Windows 11, PowerShell or Git Bash):

```bash
mkdir worksphere
cd worksphere
git init
mkdir -p backend/db backend/src/middleware backend/src/routes backend/src/services
mkdir -p frontend/src/lib frontend/src/components frontend/src/pages
mkdir -p docs
```

### Files to create

**`worksphere/.gitignore`**
```gitignore
node_modules/
.env
.env.local
dist/
build/
.DS_Store
*.log
.vite/
```

**`worksphere/README.md`**
```markdown
# WorkSphere

Cooperative Gig Services Platform. SIH 2026, problem statement SIH26089.

## Prototype stack
- Backend: Node 20 + Express 4, PostgreSQL 16 (Neon)
- Frontend: React 18 + Vite 5 + Tailwind 3 (mobile-width responsive web)
- Auth: JWT (HS256)
- NLP: Google Gemini `gemini-2.0-flash`, with a keyword fallback

## Folder ownership
- `backend/` — A
- `frontend/` — B
- `docs/` — C

Never edit a folder you do not own.

## Run locally
See `docs/04_PROJECT_LOG.md`.
```

**`worksphere/backend/.gitkeep`**, **`worksphere/frontend/.gitkeep`**, **`worksphere/docs/.gitkeep`** — each an empty file, so Git tracks the empty folders.

### Then
Create an empty **public** repo named `worksphere` on GitHub (no README, no .gitignore — you already have them). Then:

```bash
git add .
git commit -m "chore: initial repo skeleton and folder structure"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/worksphere.git
git push -u origin main
```

Send the repo URL to B and C. They run `git clone <url>`.

### Expected output
GitHub shows the repo with `backend/`, `frontend/`, `docs/`, `README.md`, `.gitignore`.

### Verification checklist
1. `git status` → `nothing to commit, working tree clean`
2. `git log --oneline` → one commit
3. The GitHub page shows all three folders.
4. `cat .gitignore` includes a line `.env`

### Done when
B and C have each successfully cloned the repo.

### Common errors
- **`git: command not found`** → install Git for Windows from git-scm.com, reopen the terminal.
- **`remote origin already exists`** → `git remote remove origin`, then add again.
- **Push rejected, auth failed** → GitHub no longer accepts passwords. Use a Personal Access Token as the password, or install GitHub Desktop.
- **Empty folders missing on GitHub** → Git cannot track empty folders; that is what the `.gitkeep` files are for.

### What you should be able to explain
The project is one repository with three top-level folders, and each teammate owns exactly one. `.gitignore` tells Git to never upload `node_modules` or `.env`, which is how we keep secrets out of the code. Separating backend, frontend and docs is what stops the three of us overwriting each other's work.

### Git commit
`chore: initial repo skeleton and folder structure`

### Log entry
[T01][A] Repo created and pushed. Folders: backend/, frontend/, docs/. .gitignore excludes node_modules and .env. Repo URL shared with B and C.

---
---

# T02 · Neon Postgres database and schema
**Owner A · Prereqs: T01 · ~20 min**

### Goal
Create a free cloud PostgreSQL database on Neon and apply the schema from `01_SHARED_BRIEF.md` §3 to it.

### Steps
1. Go to neon.tech, sign up with GitHub (free tier).
2. Create a project named `worksphere`. Region: choose the nearest, e.g. Singapore or Mumbai if offered.
3. On the project dashboard, copy the **connection string** (it starts `postgresql://` and ends `?sslmode=require`). Keep it private.

### Files to create

**`worksphere/backend/db/schema.sql`**
Copy the complete SQL block from `01_SHARED_BRIEF.md` §3 verbatim, including the `DROP TABLE`, `CREATE TABLE`, and `CREATE INDEX` statements. Do not alter a single column name.

**`worksphere/backend/.env`** (never committed)

DATABASE_URL=<paste your Neon connection string here>
JWT_SECRET=worksphere_dev_secret_change_me_9f3a2b71c4
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
LLM_ENABLED=false


**`worksphere/backend/.env.example`** (committed)

DATABASE_URL=
JWT_SECRET=
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
LLM_ENABLED=false


`LLM_ENABLED` starts `false` on purpose. The fallback extractor is built first so the demo never depends on the LLM. T19 turns it on.

### Applying the schema
Easiest route for a beginner, no local Postgres install needed: open the Neon dashboard → **SQL Editor** → paste the entire contents of `schema.sql` → **Run**.

### Expected output
Neon's SQL Editor reports success. The **Tables** panel lists exactly 8 tables: `users`, `skills`, `worker_profiles`, `worker_skills`, `service_requests`, `match_candidates`, `bookings`, `payments`.

### Verification checklist
Run each in the Neon SQL Editor:

1. ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema='public' ORDER BY table_name;

→ 8 rows, exactly the names above.

sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='bookings' ORDER BY ordinal_position;
   → includes `start_otp`, `completion_otp`, `start_otp_attempts`, `completion_otp_attempts`, `quoted_amount_inr`.

3. ```sql
   INSERT INTO users (full_name, phone, password_hash, role) VALUES ('x','000','x','banana');

→ must FAIL with a check-constraint error. That proves the role constraint works. (If it succeeds, the schema is wrong.)

sql
DELETE FROM users WHERE phone='000';

### Done when
All 8 tables exist and check 3 correctly fails.

### Common errors
- **`relation already exists`** → you ran it twice without the `DROP` lines. Re-run the whole file including the DROPs.
- **`syntax error at or near "NUMERIC"`** → you pasted a partial block. Paste the whole thing.
- **Connection string has `[password]` in it** → Neon sometimes masks it. Click "Show password" / reveal, and copy the real one.
- **`.env` shows up in `git status`** → your `.gitignore` is wrong or missing. Fix it before committing.

### What you should be able to explain
Our database is PostgreSQL hosted on Neon's free tier, so it lives in the cloud and all three of us hit the same data — that is what fixes the "it only ran on my laptop" problem. The schema has 8 tables, and CHECK constraints on columns like `status` mean the database itself rejects any value we did not design for. `match_candidates` stores every ranking we produce, so a fairness decision can be audited later.

### Git commit
`feat(db): add prototype schema and env example`

### Log entry

[T02][A] Neon Postgres project 'worksphere' created. schema.sql applied, 8 tables live. backend/.env created locally (not committed), .env.example committed. LLM_ENABLED=false for now.


---
---

# T03 · Seed data
**Owner C · Prereqs: T02 · ~20 min**

### Goal
Populate the database with the 6 skills, 1 admin, 3 households and 13 workers that every later task and the demo depend on.

### Commands
```bash
cd backend
npm init -y
npm install pg@8.12.0 bcryptjs@2.4.3 dotenv@16.4.5
node db/seed.js
```

Ask A for the `DATABASE_URL` and put it in your own `backend/.env` (copy `.env.example` and fill it in). Never commit it.

### File to create

**`worksphere/backend/db/seed.js`**
```js
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
```

### Expected output

Seed complete: { skills: '6', users: '17', workers: '13', worker_skills: '16' }
All passwords are: test1234


### Verification checklist
1. `node db/seed.js` prints exactly the counts above.
2. Run it a **second** time — same counts, no duplicate-key error. (Re-runnable seeding is what lets you reset between demo rehearsals.)
3. In Neon SQL Editor:
```sql
   SELECT u.id, u.full_name, wp.rating_avg, wp.jobs_completed_this_cycle, wp.verified
   FROM users u JOIN worker_profiles wp ON wp.user_id = u.id
   JOIN worker_skills ws ON ws.worker_user_id = u.id
   JOIN skills s ON s.id = ws.skill_id
   WHERE s.code = 'plumbing' ORDER BY u.id;
```
   → 5 rows: Suresh (4.80, cycle 4), Jignesh (4.50, cycle 0), Bhavna (4.20, cycle 1), Ilyas (4.90, cycle 2), Prakash (verified = false).
4. `SELECT COUNT(*) FROM users WHERE role='household';` → 3

### Done when
Counts match and the seed is re-runnable.

### Common errors
- **`self signed certificate in certificate chain`** → the `ssl: { rejectUnauthorized: false }` line is missing from the Pool config.
- **`password authentication failed`** → wrong `DATABASE_URL`; re-copy from Neon.
- **`relation "skills" does not exist`** → T02 was not applied to this database. Confirm you are pointing at the same Neon project.
- **`Cannot find module 'pg'`** → you ran `node db/seed.js` from the wrong folder. You must be inside `backend/`.
- **`ALTER SEQUENCE ... does not exist`** → your schema used a different table name. Re-check against 01 §3.

### What you should be able to explain
The seed script wipes and rebuilds our demo data in one transaction, so if any insert fails nothing is half-written. We deliberately gave plumbers different `jobs_completed_this_cycle` values — Suresh has 4, Jignesh has 0 — because that is the input our fairness algorithm uses. One worker is marked unverified so we can show that the matching engine filters him out.

### Git commit
`feat(db): add re-runnable seed script with 13 workers and 6 skills`

### Log entry

[T03][C] backend/db/seed.js created and run. 6 skills, 17 users (1 admin, 3 households, 13 workers), 16 worker_skills. All passwords 'test1234'. Seed is idempotent (safe to re-run) — use it to reset before demo rehearsals.


---
---

# T04 · Express server, DB connection, health endpoint
**Owner A · Prereqs: T02 · ~20 min**

### Goal
Get a running Express backend on port 4000 with a working database connection and `GET /api/health`.

### Commands
```bash
cd backend
npm install express@4.19.2 pg@8.12.0 cors@2.8.5 dotenv@16.4.5 bcryptjs@2.4.3 jsonwebtoken@9.0.2
```
(If T03 already ran `npm init -y`, skip it. If not, run `npm init -y` first.)

### Files to create

**`worksphere/backend/package.json`** — replace the `"scripts"` block with:
```json
  "scripts": {
    "start": "node src/index.js",
    "seed": "node db/seed.js"
  },
```
Also add at the top level: `"type": "commonjs",`

**`worksphere/backend/src/db.js`**
```js
// One shared connection pool for the whole app.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

module.exports = { pool };
```

**`worksphere/backend/src/index.js`**
```js
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

// 404 for any unknown /api route, in the standard error shape from 01 §6.
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
```

### Expected output

npm start

WorkSphere backend listening on http://localhost:4000


### Verification checklist
1. `npm start` → the listening line appears with no error.
2. In a second terminal:
```bash
   curl http://localhost:4000/api/health
```
   → `{"status":"ok","db":"connected","llm_enabled":false}`
   (Windows PowerShell: use `curl.exe` not `curl`, or open the URL in a browser.)
3. ```bash
   curl http://localhost:4000/api/nonsense

→ {"error":{"code":"NOT_FOUND","message":"Endpoint not found."}} with HTTP 404.
4. The server terminal prints GET /api/health for each call.

Done when

db reads connected, not disconnected.

Common errors
db: "disconnected" → the server started but Postgres rejected it. Look at the terminal for the printed DB error. Usually a wrong DATABASE_URL or missing ssl option.
EADDRINUSE :::4000 → something already uses port 4000. Find it: netstat -ano | findstr :4000, then taskkill /PID <pid> /F.
Cannot find module 'express' → run npm install inside backend/, not the repo root.
require is not defined → your package.json has "type": "module". Change it to "commonjs".
PowerShell curl prints HTML/errors → PowerShell aliases curl to Invoke-WebRequest. Use curl.exe instead.
What you should be able to explain

Express is the web server that listens for HTTP requests and routes them to our code. pg.Pool keeps a small set of reusable database connections open instead of opening a new one per request, which is much faster. CORS is a browser security rule — the backend must explicitly name which website origin is allowed to call it, which is why CORS_ORIGIN points at our frontend.

Git commit

feat(api): express server, db pool, health endpoint

Log entry
[T04][A] Backend runs on :4000. src/index.js, src/db.js created. GET /api/health returns {"status":"ok","db":"connected"}. CORS driven by CORS_ORIGIN env var. Global 404 and 500 handlers use the standard error shape.
T05 · Frontend skeleton — Vite, Tailwind, router, API client

Owner B · Prereqs: T01 · ~20 min

Goal

A running React app at localhost:5173 that calls the backend's health endpoint and displays the result. This is the thin end-to-end slice: browser → backend → database.

Commands
bash
cd frontend
npm init -y
npm install react@18.3.1 react-dom@18.3.1 react-router-dom@6.26.2
npm install -D vite@5.4.8 @vitejs/plugin-react@4.3.1 tailwindcss@3.4.13 postcss@8.4.47 autoprefixer@10.4.20
Files to create

worksphere/frontend/package.json — set "type": "module" and these scripts:

json
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },

worksphere/frontend/.env

VITE_API_BASE_URL=http://localhost:4000/api

worksphere/frontend/.env.example

VITE_API_BASE_URL=http://localhost:4000/api

worksphere/frontend/vite.config.js

js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});

worksphere/frontend/tailwind.config.js

js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};

worksphere/frontend/postcss.config.js

js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};

worksphere/frontend/index.html

html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WorkSphere</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

worksphere/frontend/src/index.css

css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { background-color: #f1f5f9; }

worksphere/frontend/src/lib/api.js

NO JSX and no React in this file, ever. Files in src/lib/ must be plain JavaScript so they copy unchanged into the React Native app later.

js
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = 'worksphere_token';
const USER_KEY = 'worksphere_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Calls the backend. Throws an Error with .code and .message from the
 * standard error shape in 01_SHARED_BRIEF.md section 6.
 */
export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error('Cannot reach the server. Is the backend running?');
    e.code = 'NETWORK_ERROR';
    throw e;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const e = new Error(data?.error?.message || `Request failed (${res.status}).`);
    e.code = data?.error?.code || 'SERVER_ERROR';
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  health: () => apiRequest('/health'),
};

worksphere/frontend/src/pages/HealthPage.jsx

jsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function HealthPage() {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    api.health()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: err.message }));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-3">System check</h1>
      {state.loading && <p className="text-slate-500">Checking…</p>}
      {state.error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{state.error}</p>
      )}
      {state.data && (
        <div className="bg-white rounded-lg shadow p-4 space-y-1">
          <p>API: <span className="font-semibold text-green-700">{state.data.status}</span></p>
          <p>Database: <span className="font-semibold text-green-700">{state.data.db}</span></p>
          <p>LLM enabled: <span className="font-semibold">{String(state.data.llm_enabled)}</span></p>
        </div>
      )}
    </div>
  );
}

worksphere/frontend/src/App.jsx

jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HealthPage from './pages/HealthPage';

export default function App() {
  return (
    <BrowserRouter>
      {/* Mobile-width shell: the prototype is a responsive web app that
          mimics the phone layout of the production React Native client. */}
      <div className="min-h-screen flex justify-center">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-xl">
          <header className="bg-slate-900 text-white px-4 py-3">
            <h1 className="font-bold tracking-wide">WorkSphere</h1>
            <p className="text-xs text-slate-300">Cooperative Gig Services</p>
          </header>
          <Routes>
            <Route path="/health" element={<HealthPage />} />
            <Route path="*" element={<Navigate to="/health" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

worksphere/frontend/src/main.jsx

jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
Expected output

npm run dev → open http://localhost:5173. A dark header reading WorkSphere, and a white card showing API: ok · Database: connected · LLM enabled: false.

Verification checklist
npm run dev starts with no errors, prints the local URL.
The page shows green ok and connected. If it shows a red error, the backend is not running — start it (T04) and refresh.
Stop the backend, refresh the page → red box saying it cannot reach the server. This proves error handling works. Restart the backend.
Narrow the browser window → the layout stays a phone-width column, centred.
Confirm src/lib/api.js contains no import React, no JSX, no < tags.
Done when

Verification 2 and 3 both behave correctly.

Common errors
Blank white page → open the browser console (F12). Almost always a typo in an import path. Paths are case-sensitive.
Tailwind classes do nothing → index.css is not imported in main.jsx, or content in tailwind.config.js does not match your file paths.
Failed to fetch / CORS error in console → backend CORS_ORIGIN must be exactly http://localhost:5173, no trailing slash. Restart the backend after changing .env.
import.meta.env.VITE_API_BASE_URL is undefined → the variable must start with VITE_, and you must restart npm run dev after editing .env.
Unknown at rule @tailwind → that is just your editor warning; ignore it if the page renders.
What you should be able to explain

Vite is the build tool that serves our React code to the browser and reloads it instantly when we save. The frontend and backend are two separate programs on two ports, and they only talk over HTTP — that separation is what lets B and A work at the same time without breaking each other. Everything in src/lib/ is deliberately plain JavaScript with no screen code, so those files move straight into the React Native app in the next phase.

Git commit

feat(web): vite react tailwind skeleton with api client and health screen

Log entry
[T05][B] Frontend runs on :5173. Vite 5.4.8 + React 18.3.1 + Tailwind 3.4.13 + react-router-dom 6.26.2. src/lib/api.js holds fetch wrapper, token storage and the standard error unwrapping. /health screen proves browser -> backend -> Neon end to end. THIN SLICE COMPLETE.
T06 · Auth — register, login, me, JWT middleware

Owner A · Prereqs: T04 (T03 recommended) · ~20 min

Goal

Implement the three auth endpoints and the reusable JWT middleware exactly as specified in 01_SHARED_BRIEF.md §7.1 and §5.

Files to create

worksphere/backend/src/middleware/auth.js

js
const jwt = require('jsonwebtoken');

function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

/**
 * Verifies the Bearer token and puts { user_id, role } on req.auth.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return fail(res, 401, 'UNAUTHENTICATED', 'Missing authorization token.');
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { user_id: payload.user_id, role: payload.role };
    return next();
  } catch {
    return fail(res, 401, 'UNAUTHENTICATED', 'Invalid or expired token.');
  }
}

/**
 * Use AFTER requireAuth. requireRole('household') or requireRole('worker','admin').
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return fail(res, 401, 'UNAUTHENTICATED', 'Missing authorization token.');
    }
    if (!roles.includes(req.auth.role)) {
      return fail(res, 403, 'FORBIDDEN_ROLE', 'Your role cannot perform this action.');
    }
    return next();
  };
}

function signToken(user) {
  return jwt.sign(
    { user_id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { requireAuth, requireRole, signToken, fail };

worksphere/backend/src/routes/auth.js

js
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
File to modify

worksphere/backend/src/index.js — add the route registration. Insert these two lines directly above the app.use('/api', ...) 404 handler:

js
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
Expected output

The three auth endpoints respond. Nothing visual yet.

Verification checklist

Restart the backend, then run each (use curl.exe on PowerShell):

Login as a seeded household:
bash
   curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"phone\":\"9876500001\",\"password\":\"test1234\"}"

→ 200, {"token":"eyJ...","user":{"id":2,"full_name":"Ramesh Patel","phone":"9876500001","role":"household","language_pref":"en"}}
Copy the token.

Wrong password:
bash
   curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"phone\":\"9876500001\",\"password\":\"wrong\"}"

→ 401, {"error":{"code":"INVALID_CREDENTIALS",...}}

Me, with the token:
bash
   curl http://localhost:4000/api/auth/me -H "Authorization: Bearer <TOKEN>"

→ 200, includes "role":"household" and "address_text":"Navrangpura, Ahmedabad"

Me, no token:
bash
   curl http://localhost:4000/api/auth/me

→ 401, UNAUTHENTICATED

Duplicate register:
bash
   curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d "{\"full_name\":\"Dup\",\"phone\":\"9876500001\",\"password\":\"test1234\",\"role\":\"household\"}"

→ 409, PHONE_ALREADY_REGISTERED

Register a new worker, then check the DB has a worker_profiles row for that user id.
Done when

All six checks return the expected code and shape.

Common errors
secretOrPrivateKey must have a value → JWT_SECRET is missing from .env, or you did not restart the backend after adding it.
Login always fails for seeded users → the seed used a different password, or you seeded a different database. Re-run npm run seed.
Cannot read properties of undefined (reading 'authorization') → express.json() is registered after your routes. It must come first in index.js.
invalid input syntax for type numeric → you sent latitude as a string like "abc". Send numbers or omit the field.
curl on PowerShell mangles the JSON → use curl.exe, and escape inner quotes with \" as shown.
What you should be able to explain

Passwords are never stored — we store a bcrypt hash, which is one-way, so even if the database leaked nobody gets the passwords. On login we issue a JWT, a signed token the browser sends back on every later request in the Authorization header, which is how the server knows who you are without keeping a session in memory. requireAuth checks the signature and requireRole checks you are the right kind of user, and every protected endpoint uses both.

Git commit

feat(api): jwt auth with register, login, me and role middleware

Log entry
[T06][A] Auth live. POST /api/auth/register, POST /api/auth/login, GET /api/auth/me. JWT HS256, 24h expiry, payload {user_id, role}. bcrypt 10 rounds. Middleware requireAuth + requireRole in src/middleware/auth.js. Registering a worker auto-creates worker_profiles.
T07 · Login screen, session storage, role-based routing

Owner B · Prereqs: T05, T06 · ~20 min

Goal

A login screen with one-tap demo logins, that stores the session and sends each role to its own home route.

Files to modify

worksphere/frontend/src/lib/api.js — add to the exported api object (keep health):

js
export const api = {
  health: () => apiRequest('/health'),
  login: (phone, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { phone, password } }),
  me: () => apiRequest('/auth/me'),
};
Files to create

worksphere/frontend/src/lib/demoAccounts.js

js
// Seeded demo logins. All passwords are 'test1234' (see backend/db/seed.js).
export const DEMO_ACCOUNTS = [
  { label: 'Household — Ramesh Patel', phone: '9876500001', password: 'test1234', role: 'household' },
  { label: 'Worker — Jignesh Parmar',  phone: '9876500012', password: 'test1234', role: 'worker' },
  { label: 'Worker — Suresh Thakor',   phone: '9876500011', password: 'test1234', role: 'worker' },
  { label: 'Co-op Admin',              phone: '9876500000', password: 'test1234', role: 'admin' },
];

export const HOME_ROUTE_BY_ROLE = {
  household: '/household',
  worker: '/worker',
  admin: '/admin',
};

worksphere/frontend/src/components/Button.jsx

jsx
export default function Button({ children, onClick, disabled, variant = 'primary', type = 'button', className = '' }) {
  const base = 'w-full rounded-lg px-4 py-3 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-100',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

worksphere/frontend/src/components/ErrorBox.jsx

jsx
export default function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{message}</p>
  );
}

worksphere/frontend/src/pages/LoginPage.jsx

jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setSession } from '../lib/api';
import { DEMO_ACCOUNTS, HOME_ROUTE_BY_ROLE } from '../lib/demoAccounts';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function doLogin(p, pw) {
    setError(null);
    setBusy(true);
    try {
      const data = await api.login(p, pw);
      setSession(data.token, data.user);
      navigate(HOME_ROUTE_BY_ROLE[data.user.role] || '/health', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-lg font-bold">Sign in</h2>
        <p className="text-sm text-slate-500">Use a demo account or enter a phone number.</p>
      </div>

      <div className="space-y-2">
        {DEMO_ACCOUNTS.map((a) => (
          <Button key={a.phone} variant="secondary" disabled={busy}
                  onClick={() => doLogin(a.phone, a.password)}>
            {a.label}
          </Button>
        ))}
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-3"
          placeholder="Phone number" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-3"
          placeholder="Password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} />
        <ErrorBox message={error} />
        <Button disabled={busy || !phone || !password} onClick={() => doLogin(phone, password)}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
    </div>
  );
}

worksphere/frontend/src/components/RequireRole.jsx

jsx
import { Navigate } from 'react-router-dom';
import { getUser, getToken } from '../lib/api';

/** Wraps a route. Sends you to /login if not signed in, or to your own home if the role is wrong. */
export default function RequireRole({ role, children }) {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

worksphere/frontend/src/components/AppHeader.jsx

jsx
import { useNavigate } from 'react-router-dom';
import { getUser, clearSession } from '../lib/api';

export default function AppHeader() {
  const navigate = useNavigate();
  const user = getUser();
  return (
    <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="font-bold tracking-wide">WorkSphere</h1>
        <p className="text-xs text-slate-300">
          {user ? `${user.full_name} · ${user.role}` : 'Cooperative Gig Services'}
        </p>
      </div>
      {user && (
        <button
          className="text-xs underline text-slate-300"
          onClick={() => { clearSession(); navigate('/login', { replace: true }); }}>
          Sign out
        </button>
      )}
    </header>
  );
}

worksphere/frontend/src/App.jsx — replace entirely:

jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import HealthPage from './pages/HealthPage';
import LoginPage from './pages/LoginPage';

function Placeholder({ name }) {
  return <div className="p-4 text-slate-500">{name} — coming in a later task.</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex justify-center">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-xl">
          <AppHeader />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/household" element={<Placeholder name="Household home" />} />
            <Route path="/worker" element={<Placeholder name="Worker home" />} />
            <Route path="/admin" element={<Placeholder name="Admin dashboard" />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

RequireRole is created now but wired into the routes in T09, once the real pages exist.

Expected output

/login shows four grey demo buttons and a manual phone/password form. Tapping a demo button lands you on the matching placeholder page, with your name and role in the header.

Verification checklist
Open http://localhost:5173 → redirected to /login.
Tap Household — Ramesh Patel → URL becomes /household, header reads Ramesh Patel · household.
Tap Sign out → back at /login, header loses the name.
Tap Co-op Admin → /admin, header reads Coop Admin · admin.
Type phone 9876500001 and password wrong → red box: "Phone number or password is incorrect."
In DevTools → Application → Local Storage, confirm keys worksphere_token and worksphere_user exist after login and disappear after sign out.
Refresh the page while logged in → you stay logged in (the token survives in localStorage).
Done when

All three roles route to their own placeholder and sign-out clears the session.

Common errors
useNavigate() may be used only in the context of a <Router> → the component using it is rendered outside <BrowserRouter>. AppHeader must be inside it.
Login works but the header stays blank → getUser() reads localStorage once at render; that is fine because navigate remounts. If it persists, hard-refresh.
CORS error on login but /health worked → express.json() or the CORS middleware sits after the auth routes in index.js. Both must be before.
Token stored but /auth/me returns 401 → you are sending Bearer with the wrong case or an extra space. Check api.js.
What you should be able to explain

After login we keep the JWT in the browser's localStorage and attach it to every request, so a page refresh does not log you out. The RequireRole wrapper checks the stored role before rendering a page, which is convenience only — the real enforcement is requireRole on the server, because anything in the browser can be edited by the user. The four demo buttons exist so we can switch between household, worker and admin in one tap during the presentation.

Git commit

feat(web): login screen, session storage, role based routing

Log entry
[T07][B] Login screen live at /login with 4 one-tap demo accounts. Session (token + user) in localStorage under worksphere_token / worksphere_user. Roles route to /household, /worker, /admin (placeholders for now). RequireRole and AppHeader components created. Sign-out clears the session.
T08 · Service request intake with the fallback NLP extractor

Owner A · Prereqs: T06 · ~20 min

Goal

Implement GET /api/skills, POST /api/requests, GET /api/requests/mine and GET /api/requests/:id, using the keyword fallback extractor only. The LLM is added in T19 behind the same interface.

Build the fallback first so the demo can never be broken by an API outage.

Files to create

worksphere/backend/src/services/nlp.js

js
// NLP extraction for service requests.
// Contract: 01_SHARED_BRIEF.md section 8.
// T19 adds the Gemini path above the fallback. The fallback must always work.

const VALID_SKILLS = ['plumbing', 'electrical', 'cleaning', 'carpentry', 'appliance_repair', 'painting'];
const VALID_URGENCY = ['low', 'normal', 'high', 'emergency'];

// Keywords in English, Hindi and Gujarati. Lowercased before matching.
const SKILL_KEYWORDS = {
  plumbing: ['plumb', 'tap', 'faucet', 'leak', 'pipe', 'drain', 'toilet', 'flush', 'basin', 'water',
             'नल', 'पाइप', 'लीक', 'टपक', 'पानी', 'नली', 'शौचालय',
             'નળ', 'પાઇપ', 'લીક', 'ટપક', 'પાણી'],
  electrical: ['electric', 'wiring', 'fan', 'light', 'bulb', 'switch', 'socket', 'short circuit', 'mcb', 'power',
               'बिजली', 'पंखा', 'लाइट', 'बल्ब', 'स्विच', 'तार', 'करंट',
               'વીજળી', 'પંખો', 'લાઇટ', 'બલ્બ', 'સ્વિચ', 'લાઈટ'],
  cleaning: ['clean', 'sweep', 'mop', 'dust', 'housekeeping', 'maid', 'wash', 'bathroom clean', 'deep clean',
             'सफाई', 'साफ', 'झाड़ू', 'पोछा', 'धुलाई',
             'સફાઈ', 'સાફ', 'ઝાડુ', 'પોતું'],
  carpentry: ['carpent', 'wood', 'door', 'furniture', 'cupboard', 'hinge', 'drawer', 'table', 'chair',
              'बढ़ई', 'लकड़ी', 'दरवाजा', 'अलमारी', 'फर्नीचर',
              'સુથાર', 'લાકડું', 'દરવાજો', 'કબાટ', 'ફર્નિચર'],
  appliance_repair: ['fridge', 'refrigerator', 'washing machine', 'ac ', 'air conditioner', 'microwave',
                     'geyser', 'oven', 'tv', 'appliance', 'cooler',
                     'फ्रिज', 'वॉशिंग', 'एसी', 'गीजर', 'माइक्रोवेव',
                     'ફ્રિજ', 'વોશિંગ', 'એસી', 'ગીઝર'],
  painting: ['paint', 'whitewash', 'wall colour', 'wall color', 'putty', 'distemper',
             'पेंट', 'रंग', 'सफेदी', 'दीवार',
             'પેઇન્ટ', 'રંગ', 'દીવાલ'],
};

const URGENCY_KEYWORDS = {
  emergency: ['emergency', 'urgent immediately', 'flooding', 'sparking', 'fire', 'danger',
              'तुरंत', 'आपातकाल', 'खतरा', 'તાત્કાલિક', 'કટોકટી'],
  high: ['urgent', 'asap', 'today', 'right now', 'immediately', 'quickly', 'soon',
         'जल्दी', 'आज', 'अभी', 'जरूरी', 'આજે', 'જલ્દી', 'તરત'],
  low: ['whenever', 'no hurry', 'next week', 'sometime', 'not urgent',
        'कभी भी', 'जल्दी नहीं', 'ક્યારેય પણ'],
};

/** Crude script detection: Devanagari -> hi, Gujarati -> gu, otherwise en. */
function detectLanguage(text) {
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

function extractWithFallback(rawText) {
  const text = String(rawText).toLowerCase();

  let bestSkill = null;
  let bestHits = 0;
  for (const [code, words] of Object.entries(SKILL_KEYWORDS)) {
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits > bestHits) { bestHits = hits; bestSkill = code; }
  }

  let urgency = 'normal';
  for (const level of ['emergency', 'high', 'low']) {
    if (URGENCY_KEYWORDS[level].some((w) => text.includes(w))) { urgency = level; break; }
  }

  const skill_code = bestSkill || 'cleaning'; // documented default, see brief section 8
  const summary = String(rawText).trim().slice(0, 60);

  return {
    skill_code,
    issue_summary: summary,
    urgency,
    detected_language: detectLanguage(String(rawText)),
    confidence: 0.40,
    source: 'fallback',
  };
}

/**
 * Single entry point used by the routes. T19 adds the LLM branch here.
 * Always resolves — never throws — so intake cannot fail because of NLP.
 */
async function extractServiceDetails(rawText) {
  return extractWithFallback(rawText);
}

module.exports = { extractServiceDetails, extractWithFallback, VALID_SKILLS, VALID_URGENCY };

worksphere/backend/src/routes/skills.js

js
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

worksphere/backend/src/routes/requests.js

js
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
File to modify

worksphere/backend/src/index.js — add above the 404 handler, after the auth route line:

js
const skillsRoutes = require('./routes/skills');
const requestRoutes = require('./routes/requests');
app.use('/api/skills', skillsRoutes);
app.use('/api/requests', requestRoutes);
Verification checklist

Get a household token from T06 check 1 first.

bash
curl http://localhost:4000/api/skills
   → `{"items":[{"id":1,"code":"plumbing","name":"Plumbing"}, ... 6 items]}`

2. English plumbing, urgent:
```bash
   curl -X POST http://localhost:4000/api/requests -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"raw_text\":\"My bathroom tap is leaking, need someone today\",\"input_mode\":\"text\"}"
```
   → 201 with `"skill_code":"plumbing"`, `"urgency":"high"`, `"detected_language":"en"`, `"nlp_source":"fallback"`, `"nlp_confidence":0.4`, `"status":"parsed"`

3. Hindi input:
```bash
   curl -X POST http://localhost:4000/api/requests -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"raw_text\":\"मेरे बाथरूम का नल टपक रहा है, आज ही चाहिए\"}"
```
   → `"skill_code":"plumbing"`, `"detected_language":"hi"`, `"urgency":"high"`

4. Gujarati electrical:
```bash
   curl -X POST http://localhost:4000/api/requests -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"raw_text\":\"મારો પંખો ચાલતો નથી\"}"
```
   → `"skill_code":"electrical"`, `"detected_language":"gu"`

5. Empty text:
```bash
   curl -X POST http://localhost:4000/api/requests -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"raw_text\":\"  \"}"
```
   → 400 `VALIDATION_ERROR`

6. `GET /api/requests/mine` with the token → `items` contains the requests above, newest first.

7. Wrong owner: log in as Meera (`9876500002`), call `GET /api/requests/1` with her token → 403 `NOT_OWNER`.

8. Worker token calling `POST /api/requests` → 403 `FORBIDDEN_ROLE`.

### Done when
Checks 2, 3 and 4 each classify correctly, and 7 returns `NOT_OWNER`.

### Common errors
- **`GET /api/requests/mine` returns `id must be a number`** → the `/:id` route is declared before `/mine`. Order matters in Express; `/mine` must come first.
- **Hindi/Gujarati text arrives as `????`** → your terminal encoding. Test those two through the browser or Postman instead of curl; the API itself is fine.
- **`skill_id` is null** → `nlp.skill_code` returned something not in the `skills` table. Check the six codes match 01 §3 exactly.
- **`nlp_confidence` comes back as the string `"0.40"`** → Postgres NUMERIC returns strings in `pg`. That is what the `shape()` function converts. Do not remove it.

### What you should be able to explain
Intake stores the household's own words untouched in `raw_text`, then a separate extraction step fills in `skill_id`, `urgency` and a summary — so we always keep the original and can re-parse later. Right now that extraction is a keyword matcher covering English, Hindi and Gujarati, which is our guaranteed fallback; the LLM sits in front of it and the field `nlp_source` records which one actually ran. Keeping the fallback first means a network failure during the demo downgrades quality but never breaks the flow.

### Git commit
`feat(api): service request intake with multilingual keyword fallback nlp`

### Log entry

[T08][A] GET /api/skills, POST /api/requests, GET /api/requests/mine, GET /api/requests/:id live. src/services/nlp.js implements the keyword fallback (en/hi/gu) behind extractServiceDetails(); nlp_source='fallback', confidence 0.40. LLM branch still to be added in T19. Route order: /mine declared before /:id.


---
---

# T09 · Household home — new request screen
**Owner B · Prereqs: T07, T08 · ~20 min**

### Goal
A screen where the household types a need in any language, submits it, and immediately sees what the system understood.

### Files to modify

**`worksphere/frontend/src/lib/api.js`** — extend the `api` object:
```js
export const api = {
  health: () => apiRequest('/health'),
  login: (phone, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { phone, password } }),
  me: () => apiRequest('/auth/me'),
  skills: () => apiRequest('/skills'),
  createRequest: (raw_text, input_mode = 'text') =>
    apiRequest('/requests', { method: 'POST', body: { raw_text, input_mode } }),
  myRequests: () => apiRequest('/requests/mine'),
  getRequest: (id) => apiRequest(`/requests/${id}`),
};
```

**`worksphere/frontend/src/lib/formatters.js`** — create (plain JS, no JSX):
```js
export const URGENCY_LABEL = {
  low: 'Low', normal: 'Normal', high: 'Urgent', emergency: 'Emergency',
};

export const URGENCY_CLASS = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-800',
  emergency: 'bg-red-100 text-red-800',
};

export const LANGUAGE_LABEL = { en: 'English', hi: 'Hindi', gu: 'Gujarati' };

export function rupees(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export function shortTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
```

### Files to create

**`worksphere/frontend/src/components/Badge.jsx`**
```jsx
export default function Badge({ children, className = 'bg-slate-100 text-slate-700' }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${className}`}>
      {children}
    </span>
  );
}
```

**`worksphere/frontend/src/components/RequestResultCard.jsx`**
```jsx
import Badge from './Badge';
import { URGENCY_LABEL, URGENCY_CLASS, LANGUAGE_LABEL } from '../lib/formatters';

export default function RequestResultCard({ request }) {
  if (!request) return null;
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold">What we understood</h3>
        <Badge className={URGENCY_CLASS[request.urgency] || URGENCY_CLASS.normal}>
          {URGENCY_LABEL[request.urgency] || request.urgency}
        </Badge>
      </div>

      <p className="text-sm text-slate-500 italic">"{request.raw_text}"</p>

      <dl className="text-sm space-y-1">
        <div className="flex justify-between">
          <dt className="text-slate-500">Service</dt>
          <dd className="font-semibold">{request.skill_name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Issue</dt>
          <dd className="font-semibold text-right">{request.issue_summary}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Language detected</dt>
          <dd className="font-semibold">{LANGUAGE_LABEL[request.detected_language] || '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Understood by</dt>
          <dd className="font-semibold">
            {request.nlp_source === 'llm' ? 'AI language model' : 'Keyword fallback'}
            {' '}({Math.round((request.nlp_confidence || 0) * 100)}%)
          </dd>
        </div>
      </dl>
    </div>
  );
}
```

**`worksphere/frontend/src/pages/HouseholdHome.jsx`**
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import RequestResultCard from '../components/RequestResultCard';

const EXAMPLES = [
  'My bathroom tap is leaking, need someone today',
  'મારો પંખો ચાલતો નથી',
  'मेरे बाथरूम का नल टपक रहा है, आज ही चाहिए',
];

export default function HouseholdHome() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [request, setRequest] = useState(null);

  async function submit() {
    setError(null);
    setBusy(true);
    setRequest(null);
    try {
      const created = await api.createRequest(text, 'text');
      setRequest(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">What do you need help with?</h2>
        <p className="text-sm text-slate-500">Type in English, Hindi or Gujarati.</p>
      </div>

      <textarea
        className="w-full rounded-lg border border-slate-300 px-3 py-3 h-28"
        placeholder="e.g. My kitchen sink is blocked"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => setText(ex)}
                  className="text-xs bg-white border border-slate-300 rounded-full px-3 py-1 text-slate-600">
            {ex.length > 28 ? `${ex.slice(0, 28)}…` : ex}
          </button>
        ))}
      </div>

      <ErrorBox message={error} />

      <Button disabled={busy || !text.trim()} onClick={submit}>
        {busy ? 'Understanding…' : 'Submit request'}
      </Button>

      {request && (
        <>
          <RequestResultCard request={request} />
          <Button variant="success" onClick={() => navigate(`/household/requests/${request.id}/matches`)}>
            Find available workers
          </Button>
        </>
      )}

      <button className="w-full text-sm text-slate-500 underline pt-2"
              onClick={() => navigate('/household/bookings')}>
        My bookings
      </button>
    </div>
  );
}
```

**`worksphere/frontend/src/App.jsx`** — replace the route block, keeping the shell:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import RequireRole from './components/RequireRole';
import HealthPage from './pages/HealthPage';
import LoginPage from './pages/LoginPage';
import HouseholdHome from './pages/HouseholdHome';

function Placeholder({ name }) {
  return <div className="p-4 text-slate-500">{name} — coming in a later task.</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex justify-center">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-xl">
          <AppHeader />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/health" element={<HealthPage />} />

            <Route path="/household" element={
              <RequireRole role="household"><HouseholdHome /></RequireRole>} />
            <Route path="/household/requests/:id/matches" element={
              <RequireRole role="household"><Placeholder name="Matches" /></RequireRole>} />
            <Route path="/household/bookings" element={
              <RequireRole role="household"><Placeholder name="My bookings" /></RequireRole>} />

            <Route path="/worker" element={
              <RequireRole role="worker"><Placeholder name="Worker home" /></RequireRole>} />
            <Route path="/admin" element={
              <RequireRole role="admin"><Placeholder name="Admin dashboard" /></RequireRole>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
```

### Expected output
Log in as Ramesh → a text box with three example chips. Tap the Gujarati chip, submit → a white card appears reading Service: Electrical, Language detected: Gujarati, Understood by: Keyword fallback (40%).

### Verification checklist
1. Log in as **Household — Ramesh Patel**, land on `/household`.
2. Tap the English example chip → submit → card shows **Plumbing**, urgency badge **Urgent** (amber), Language **English**.
3. Tap the Gujarati chip → submit → **Electrical**, Language **Gujarati**.
4. Tap the Hindi chip → submit → **Plumbing**, Language **Hindi**, badge **Urgent**.
5. Clear the box → the Submit button is disabled.
6. Stop the backend, submit → red box "Cannot reach the server." Restart it.
7. Sign out, then paste `http://localhost:5173/household` directly → redirected to `/login`.
8. Log in as a **worker**, paste `/household` in the URL → redirected to `/login`.

### Done when
Checks 2, 3 and 4 all show the correct service and language.

### Common errors
- **403 `FORBIDDEN_ROLE` on submit** → you are logged in as the wrong role. Sign out, use the household demo button.
- **Card shows `undefined` for Service** → the backend returned `skill_name: null`, meaning `skill_id` was null. Check T08 verification 2.
- **Gujarati text will not type** → use the example chips; you do not need an Indic keyboard.
- **`Cannot read properties of null (reading 'urgency')`** → you rendered `RequestResultCard` without the `if (!request) return null` guard.

### What you should be able to explain
The household never picks a category from a dropdown — they describe the problem in their own language, and the backend turns that into a structured service type and urgency. We show the household exactly what the system understood, including which engine understood it and how confident it was, so the user can correct a bad reading rather than discovering it when the wrong worker arrives. The frontend only renders what the API returned; all the classification happens server-side.

### Git commit
`feat(web): household request intake screen with nlp result card`

### Log entry

[T09][B] /household screen live: free-text intake in en/hi/gu with 3 example chips, posts to POST /api/requests and renders RequestResultCard (service, issue, urgency badge, detected language, nlp source + confidence). RequireRole now wired on all household/worker/admin routes. Routes added: /household/requests/:id/matches and /household/bookings (placeholders).


---
---

# T10 · Fair-matching engine
**Owner A · Prereqs: T08 · ~20 min · ⚠ HIGHEST-VALUE TASK — this is the differentiator judges will probe**

### Goal
Implement `GET /api/requests/:id/matches` exactly per `01_SHARED_BRIEF.md` §4.1, persisting every ranking to `match_candidates`.

### Files to create

**`worksphere/backend/src/services/matching.js`**
```js
// Fair-matching engine. Specification: 01_SHARED_BRIEF.md section 4.1.
// Every constant here is from the brief. Do not tune them.

const MAX_DISTANCE_KM = 15;
const WEIGHT_PROXIMITY = 0.45;
const WEIGHT_SKILL = 0.30;
const WEIGHT_ROTATION = 0.25;
const TOP_N = 5;
const EARTH_RADIUS_KM = 6371;

function toRadians(deg) { return (deg * Math.PI) / 180; }

/** Great-circle distance between two lat/lon points, in kilometres. */
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function round(value, places) {
  return Number(Number(value).toFixed(places));
}

/**
 * Ranks eligible workers for a service request and rewrites match_candidates.
 * Runs inside the caller's transaction client.
 * Returns the top N candidate objects, already shaped for the API response.
 */
async function computeMatches(client, serviceRequest) {
  const { id: requestId, skill_id, household_latitude, household_longitude } = serviceRequest;

  if (skill_id === null || household_latitude === null || household_longitude === null) {
    return [];
  }

  // Eligibility filter: right role, verified, available, has the skill.
  // Distance is filtered in JS because Haversine is easier to read and debug here.
  const eligible = await client.query(
    `SELECT u.id AS worker_user_id, u.full_name, u.phone,
            u.latitude, u.longitude,
            wp.rating_avg, wp.jobs_completed_this_cycle, wp.last_assigned_at
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     JOIN worker_skills ws   ON ws.worker_user_id = u.id
     WHERE u.role = 'worker'
       AND wp.verified = TRUE
       AND wp.is_available = TRUE
       AND ws.skill_id = $1
       AND u.latitude IS NOT NULL
       AND u.longitude IS NOT NULL`,
    [skill_id]
  );

  const withinRange = [];
  for (const w of eligible.rows) {
    const distance = haversineKm(
      Number(household_latitude), Number(household_longitude),
      Number(w.latitude), Number(w.longitude)
    );
    if (distance <= MAX_DISTANCE_KM) {
      withinRange.push({ ...w, distance_km: round(distance, 2) });
    }
  }

  if (withinRange.length === 0) return [];

  // cycle_max is computed over THIS request's eligible pool, so rotation is
  // measured relative to the workers actually competing for this job.
  const cycleMax = Math.max(
    1,
    ...withinRange.map((w) => Number(w.jobs_completed_this_cycle))
  );

  const scored = withinRange.map((w) => {
    const proximity_score = round(Math.max(0, 1 - w.distance_km / MAX_DISTANCE_KM), 3);
    const skill_score = round(Number(w.rating_avg) / 5, 3);
    const rotation_score = round(1 - Number(w.jobs_completed_this_cycle) / cycleMax, 3);
    const total_score = round(
      WEIGHT_PROXIMITY * proximity_score +
      WEIGHT_SKILL * skill_score +
      WEIGHT_ROTATION * rotation_score,
      3
    );
    return {
      worker_user_id: w.worker_user_id,
      full_name: w.full_name,
      phone: w.phone,
      rating_avg: Number(w.rating_avg),
      jobs_completed_this_cycle: Number(w.jobs_completed_this_cycle),
      last_assigned_at: w.last_assigned_at,
      distance_km: w.distance_km,
      proximity_score,
      skill_score,
      rotation_score,
      total_score,
    };
  });

  // Order: total_score DESC, then least-recently-assigned (NULL first), then id ASC.
  scored.sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    const at = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : -Infinity;
    const bt = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : -Infinity;
    if (at !== bt) return at - bt;
    return a.worker_user_id - b.worker_user_id;
  });

  const top = scored.slice(0, TOP_N).map((c, i) => ({ ...c, rank_position: i + 1 }));

  // Persist for auditability. Rewrite rather than append, so a re-run is clean.
  await client.query('DELETE FROM match_candidates WHERE service_request_id = $1', [requestId]);
  for (const c of top) {
    await client.query(
      `INSERT INTO match_candidates
         (service_request_id, worker_user_id, rank_position, distance_km,
          proximity_score, skill_score, rotation_score, total_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [requestId, c.worker_user_id, c.rank_position, c.distance_km,
       c.proximity_score, c.skill_score, c.rotation_score, c.total_score]
    );
  }

  return top.map((c) => ({
    rank_position: c.rank_position,
    worker_user_id: c.worker_user_id,
    full_name: c.full_name,
    phone: c.phone,
    rating_avg: c.rating_avg,
    jobs_completed_this_cycle: c.jobs_completed_this_cycle,
    distance_km: c.distance_km,
    proximity_score: c.proximity_score,
    skill_score: c.skill_score,
    rotation_score: c.rotation_score,
    total_score: c.total_score,
  }));
}

module.exports = { computeMatches, haversineKm };
```

### File to modify

**`worksphere/backend/src/routes/requests.js`** — add these lines. At the top, after the other requires:
```js
const { computeMatches } = require('../services/matching');
```
Then add this route **after** `GET /:id` and **before** `module.exports`:
```js
// GET /api/requests/:id/matches  (household owner)
router.get('/:id/matches', requireAuth, requireRole('household'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'VALIDATION_ERROR', 'id must be a number.');

    const r = await client.query(
      `SELECT sr.id, sr.household_user_id, sr.skill_id, sr.status,
              u.latitude  AS household_latitude,
              u.longitude AS household_longitude
       FROM service_requests sr
       JOIN users u ON u.id = sr.household_user_id
       WHERE sr.id = $1`,
      [id]
    );
    if (r.rowCount === 0) return fail(res, 404, 'NOT_FOUND', 'Service request not found.');

    const sr = r.rows[0];
    if (sr.household_user_id !== req.auth.user_id) {
      return fail(res, 403, 'NOT_OWNER', 'This request does not belong to you.');
    }
    if (sr.status === 'booked') {
      return fail(res, 409, 'INVALID_STATE', 'This request is already booked.');
    }

    await client.query('BEGIN');
    const items = await computeMatches(client, sr);
    if (items.length > 0) {
      await client.query(
        `UPDATE service_requests SET status = 'matched' WHERE id = $1 AND status <> 'booked'`,
        [id]
      );
    }
    await client.query('COMMIT');

    return res.json({ service_request_id: id, items });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});
```

### Verification checklist
Log in as Ramesh (`9876500001`). Create a plumbing request (T08 check 2) — note its id, say `1`.

1. ```bash
   curl http://localhost:4000/api/requests/1/matches -H "Authorization: Bearer <TOKEN>"

→ 200 with 4 items (not 5 — Prakash Joshi is unverified and must be excluded).

The fairness result. The order must be:
rank	worker	approx distance	cycle	approx total
1	Jignesh Parmar	~1.7 km	0	~0.92
2	Bhavna Chauhan	~3.9 km	1	~0.77
3	Suresh Thakor	~0.6 km	4	~0.72
4	Ilyas Shaikh	~5.8 km	2	~0.70
Scores may differ in the third decimal; the order must match. Suresh is the nearest and highest-rated plumber and is ranked third — that is the anti-monopoly rotation working, and it is the single most important thing to be able to point at on stage.
Confirm Prakash Joshi (9876500023) is absent from the list.
Persistence:
sql
   SELECT rank_position, worker_user_id, distance_km, proximity_score,
          skill_score, rotation_score, total_score
   FROM match_candidates WHERE service_request_id = 1 ORDER BY rank_position;

→ 4 rows matching the response.

Re-run the same curl → still 4 rows in match_candidates, not 8. (The DELETE-then-insert prevents duplicates.)
Request status: SELECT status FROM service_requests WHERE id = 1; → matched
Create a painting request → only Rakesh Prajapati returns (1 item).
Wrong owner: Meera's token on /api/requests/1/matches → 403 NOT_OWNER.
Done when

Check 2's ordering is exactly as shown. If Suresh comes first, the rotation term is not being applied — re-read the weights.

Common errors
All rotation_score are 1.000 → cycleMax is being taken as 1 because jobs_completed_this_cycle came back as a string. Number() it before Math.max.
Math.max(1, ...[]) returns -Infinity → the array was empty; the if (withinRange.length === 0) return [] guard above prevents this. Do not remove it.
distance_km is NaN → latitude/longitude arrived as strings from pg. The Number() calls handle it; check you kept them.
duplicate key value violates unique constraint on match_candidates → the DELETE before the inserts is missing.
Empty items for a valid request → skill_id is null on the request (T08 problem), or all workers are beyond 15 km.
What you should be able to explain

Every eligible worker gets three scores between 0 and 1 — how close they are, their rating, and how little work they have already had this cycle — and we combine them 45/30/25 into one number. The rotation term is what makes it a cooperative rather than a marketplace: a worker who has already taken four jobs this week scores zero on rotation and drops below a worker who has taken none, even if he is nearer and better rated. We write every ranking into match_candidates, so if a worker asks why they were not offered a job, we can show them the exact numbers.

Git commit

feat(api): fair matching engine with proximity, skill and anti-monopoly rotation

Log entry
[T10][A] GET /api/requests/:id/matches live. src/services/matching.js: Haversine distance, 15km cap, eligibility filter (role=worker, verified, available, has skill), scores proximity 0.45 / skill 0.30 / rotation 0.25, tie-break last_assigned_at then id, top 5. Rankings persisted to match_candidates (delete-then-insert, re-runnable). Request status -> 'matched'. VERIFIED on seed data: Jignesh (cycle 0) outranks Suresh (cycle 4) despite Suresh being nearer and better rated — this is the fairness demo moment.
T11 · Matches screen with score breakdown

Owner B · Prereqs: T09, T10 · ~20 min

Goal

Show the ranked workers with a visible, explainable score breakdown, so a judge can see why each worker is where they are.

Files to modify

worksphere/frontend/src/lib/api.js — add to api:

js
  getMatches: (requestId) => apiRequest(`/requests/${requestId}/matches`),
Files to create

worksphere/frontend/src/components/ScoreBar.jsx

jsx
export default function ScoreBar({ label, value, weight, colorClass }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label} <span className="text-slate-400">({Math.round(weight * 100)}%)</span></span>
        <span className="font-mono">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

worksphere/frontend/src/components/WorkerCard.jsx

jsx
import { useState } from 'react';
import Badge from './Badge';
import ScoreBar from './ScoreBar';
import Button from './Button';

export default function WorkerCard({ candidate, onSelect }) {
  const [open, setOpen] = useState(false);
  const c = candidate;

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-slate-900 text-white rounded-full w-6 h-6 flex items-center justify-center">
              {c.rank_position}
            </span>
            <h3 className="font-bold">{c.full_name}</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {c.distance_km} km away · ★ {c.rating_avg.toFixed(1)}
          </p>
        </div>
        <Badge className={c.jobs_completed_this_cycle === 0
          ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
          {c.jobs_completed_this_cycle} jobs this cycle
        </Badge>
      </div>

      <button className="text-xs text-slate-500 underline" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Why this rank?'} · score {c.total_score.toFixed(3)}
      </button>

      {open && (
        <div className="space-y-2 bg-slate-50 rounded-lg p-3">
          <ScoreBar label="Proximity" value={c.proximity_score} weight={0.45} colorClass="bg-blue-500" />
          <ScoreBar label="Skill rating" value={c.skill_score} weight={0.30} colorClass="bg-purple-500" />
          <ScoreBar label="Fair rotation" value={c.rotation_score} weight={0.25} colorClass="bg-green-500" />
          <p className="text-xs text-slate-500 pt-1">
            Fair rotation lowers the score of workers who have already had more jobs this cycle,
            so work is shared across the co-op.
          </p>
        </div>
      )}

      <Button variant="success" onClick={() => onSelect(c)}>
        Book {c.full_name.split(' ')[0]}
      </Button>
    </div>
  );
}

worksphere/frontend/src/pages/MatchesPage.jsx

jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import WorkerCard from '../components/WorkerCard';
import ErrorBox from '../components/ErrorBox';

export default function MatchesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMatches(id)
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  }, [id]);

  function onSelect(candidate) {
    // Booking form is built in T12/T13. Carry the choice in router state.
    navigate(`/household/requests/${id}/book`, { state: { candidate } });
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Fair-matched workers</h2>
        <p className="text-sm text-slate-500">
          Ranked by proximity, skill rating and fair rotation.
        </p>
      </div>

      <ErrorBox message={error} />

      {items === null && !error && <p className="text-slate-500">Finding workers…</p>}

      {items && items.length === 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <p className="font-semibold">No workers available</p>
          <p className="text-sm text-slate-500">
            No verified, available worker with this skill is within 15 km right now.
          </p>
        </div>
      )}

      {items && items.map((c) => (
        <WorkerCard key={c.worker_user_id} candidate={c} onSelect={onSelect} />
      ))}

      <button className="w-full text-sm text-slate-500 underline pt-2"
              onClick={() => navigate('/household')}>
        Back
      </button>
    </div>
  );
}

worksphere/frontend/src/App.jsx — replace the matches placeholder route:

jsx
import MatchesPage from './pages/MatchesPage';
jsx
            <Route path="/household/requests/:id/matches" element={
              <RequireRole role="household"><MatchesPage /></RequireRole>} />
            <Route path="/household/requests/:id/book" element={
              <RequireRole role="household"><Placeholder name="Booking" /></RequireRole>} />
Expected output

After submitting the plumbing request and tapping Find available workers, four cards appear. Jignesh Parmar is rank 1 with a green "0 jobs this cycle" badge; Suresh Thakor is rank 3 with "4 jobs this cycle". Tapping "Why this rank?" opens three coloured bars.

Verification checklist
Household → submit the English plumbing example → tap Find available workers.
Four cards, in the order Jignesh, Bhavna, Suresh, Ilyas.
Suresh's card shows the smallest distance (~0.6 km) yet rank 3.
Tap "Why this rank?" on Suresh → the Fair rotation bar is empty (0.000) while Proximity is nearly full.
Tap "Why this rank?" on Jignesh → Fair rotation bar is full (1.000).
Submit a painting request → matches page shows exactly one card.
Submit a request that matches no one within range — not possible with the seed, so instead run in Neon: UPDATE worker_profiles SET is_available = FALSE; then reload a matches page → the "No workers available" card appears. Then undo: UPDATE worker_profiles SET is_available = TRUE;
Tap Book Jignesh → navigates to /household/requests/:id/book (placeholder for now).
Done when

Checks 3 and 4 both hold — that visual contrast is your demo.

Common errors
c.rating_avg.toFixed is not a function → the API returned it as a string. Fix in the backend with Number() (T10 already does).
Cards render but score bars are invisible → Tailwind cannot see a dynamic class. That is why width uses an inline style, not a class. Keep it that way.
items.map is not a function → you set items to the whole response instead of data.items.
Infinite loading → check the browser Network tab; a 403 means you are the wrong household for that request id.
What you should be able to explain

The household sees a ranked shortlist, not a forced assignment — they still choose, which keeps trust, but the ordering is ours and it is fair by construction. Each card can expand to show the three component scores and their weights, so the ranking is explainable rather than a black box. The clearest proof is Suresh: the nearest, highest-rated plumber sits at rank three purely because he has already had four jobs this cycle.

Git commit

feat(web): fair match list with explainable score breakdown

Log entry
[T11][B] /household/requests/:id/matches live. WorkerCard shows rank, distance, rating, jobs-this-cycle badge, and an expandable "Why this rank?" panel with three weighted ScoreBars. Empty state handled. Selecting a worker routes to /household/requests/:id/book carrying the candidate in router state. DEMO NOTE: Suresh ranks 3rd despite being nearest — this is the fairness moment.
T12 · Booking creation with OTP and pending payment

Owner A · Prereqs: T10 · ~20 min

Goal

Implement POST /api/bookings, GET /api/bookings/mine and GET /api/bookings/:id, including OTP generation and the OTP visibility rule from 01_SHARED_BRIEF.md §7.4.

Files to create

worksphere/backend/src/services/otp.js

js
// OTP rules: 01_SHARED_BRIEF.md section 4.2.
const crypto = require('crypto');

const MAX_ATTEMPTS = 5;

/** 6-digit numeric string, 100000-999999, cryptographically random. */
function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/** Constant-time compare so timing cannot leak the code. */
function otpMatches(stored, supplied) {
  if (typeof stored !== 'string' || typeof supplied !== 'string') return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(String(supplied).trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateOtp, otpMatches, MAX_ATTEMPTS };

worksphere/backend/src/services/payments.js

js
// Payment split: 01_SHARED_BRIEF.md section 4.3.
// The welfare fund absorbs the rounding remainder so the parts always sum exactly.
const WORKER_SHARE = 0.75;
const COOP_SHARE = 0.15;

function computeSplit(totalInr) {
  const total = Math.trunc(Number(totalInr));
  const worker_payout_inr = Math.floor(total * WORKER_SHARE);
  const coop_overhead_inr = Math.floor(total * COOP_SHARE);
  const welfare_fund_inr = total - worker_payout_inr - coop_overhead_inr;
  return { total_amount_inr: total, worker_payout_inr, coop_overhead_inr, welfare_fund_inr };
}

const SPLIT_PERCENTAGES = { worker: 75, coop_overhead: 15, welfare_fund: 10 };

module.exports = { computeSplit, SPLIT_PERCENTAGES };

worksphere/backend/src/routes/bookings.js

js
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
File to modify

worksphere/backend/src/index.js — add above the 404 handler:

js
const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);
Verification checklist

Use Ramesh's token and the matched request id from T10.

Create the booking:
bash
   curl -X POST http://localhost:4000/api/bookings -H "Content-Type: application/json" -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" -d "{\"service_request_id\":1,\"worker_user_id\":6,\"scheduled_slot\":\"Today 4-6 PM\",\"quoted_amount_inr\":500}"

(worker_user_id 6 is Jignesh with the standard seed: admin=1, households 2–4, workers start at 5.) Confirm the real id first:
SELECT id, full_name FROM users WHERE phone='9876500012';
→ 201, with a 6-digit start_otp, completion_otp: null, status: "pending".

Double-book the same request → 409 INVALID_STATE.
sql
SELECT * FROM payments WHERE booking_id = 1;
   → one row, `total_amount_inr = 500`, the three split columns 0, `status = 'pending'`.

4. ```sql
   SELECT status FROM service_requests WHERE id = 1;

→ booked

OTP visibility. Log in as Jignesh (9876500012), then:
bash
   curl http://localhost:4000/api/bookings/mine -H "Authorization: Bearer <WORKER_TOKEN>"

→ the booking appears, but "start_otp": null and "completion_otp": null. This is the critical check. If the worker can see the OTP, the whole verification is meaningless.

Same call with the household token → start_otp is the 6-digit string.
Log in as Meera, GET /api/bookings/1 → 403 NOT_OWNER.
quoted_amount_inr: -50 → 400 VALIDATION_ERROR.
Done when

Check 5 returns null OTPs for the worker and check 6 returns the real OTP for the household.

Common errors
null value in column "start_otp" → generateOtp() was not called; check the import path.
crypto.randomInt is not a function → Node is older than 14.10. Confirm node -v shows v20.
Worker can see the OTP → you passed req.auth.role instead of the computed isHousehold ? 'household' : ... in GET /:id. Re-read shapeBooking.
insert or update on table "payments" violates foreign key → the booking insert rolled back. Look for an earlier error in the terminal.
GET /api/bookings/mine returns id must be a number → /mine is declared after /:id. Move it up.
What you should be able to explain

Creating a booking does three things in one transaction — the booking row, a six-digit start OTP, and a pending payment record — so we can never end up with a job that has no payment attached. The OTP is returned to the household and deliberately hidden from the worker, because the worker proves they are physically at the door by getting the code from the customer. In production that code goes by SMS; in the prototype we show it on the household's screen, and we say so out loud during the demo.

Git commit

feat(api): booking creation with start otp and pending payment record

Log entry
[T12][A] POST /api/bookings, GET /api/bookings/mine, GET /api/bookings/:id live. Booking + start_otp + pending payments row created in one transaction; service_request status -> 'booked'. src/services/otp.js (crypto.randomInt, timingSafeEqual, MAX_ATTEMPTS=5) and src/services/payments.js (75/15/10, welfare absorbs remainder) created. OTP VISIBILITY VERIFIED: worker receives null for both OTP fields, household receives the real values.

END OF PART A. Say next for Part B: T13–T24, the cut line, the feature freeze, and the hour-by-hour schedule.

next

markdown
# 02_PROTOTYPE_PLAN.md — PART B (Tasks T13–T24)
# WorkSphere prototype · blocks 2–4, cut line, freeze, schedule

## DEPENDENCY MAP FOR PART B

T12 ── T13 ──┐
T12 ── T14 ──┼── T15 ──┐
├── T16 ──┼── T22
T14 ── T17 ── T18 ─────┘
T08 ── T19
--------------------------- CUT LINE ---------------------------
T09 ── T20 T18 ── T21 T16 ── T22 T03 ── T23
--------------------------- ALWAYS -----------------------------
T24 (freeze + rehearsal) — never cut, never skipped


**Seeded user IDs** (assumed throughout Part B): `1` admin · `2` Ramesh · `3` Meera · `4` Anil · `5` Suresh · `6` Jignesh · `7` Bhavna · `8` Ilyas · `9` Kiran · `10` Dinesh · `11` Ushaben · `12` Lata · `13` Mahesh · `14` Farid · `15` Rakesh · `16` Nitin · `17` Prakash.
Confirm once with `SELECT id, full_name FROM users ORDER BY id;` before relying on them.

---
---

# T13 · Booking form screen
**Owner B · Prereqs: T11, T12 · ~20 min**

### Goal
Let the household confirm a slot and price for the chosen worker, create the booking, and see the start OTP.

### Files to modify

**`worksphere/frontend/src/lib/api.js`** — add to `api`:
```js
  createBooking: (service_request_id, worker_user_id, scheduled_slot, quoted_amount_inr) =>
    apiRequest('/bookings', {
      method: 'POST',
      body: { service_request_id, worker_user_id, scheduled_slot, quoted_amount_inr },
    }),
  myBookings: () => apiRequest('/bookings/mine'),
  getBooking: (id) => apiRequest(`/bookings/${id}`),
```

### Files to create

**`worksphere/frontend/src/components/OtpDisplay.jsx`**
```jsx
/**
 * Shows an OTP to the household. The prototype label is deliberate and must
 * stay on screen: there is no SMS gateway, so we show the code instead.
 */
export default function OtpDisplay({ label, otp, hint }) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-center space-y-1">
      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-mono font-bold tracking-[0.3em] text-amber-900">
        {otp || '——————'}
      </p>
      {hint && <p className="text-xs text-amber-700">{hint}</p>}
      <p className="text-[10px] text-amber-600 pt-1">
        Prototype: shown on screen. Production sends this by SMS.
      </p>
    </div>
  );
}
```

**`worksphere/frontend/src/pages/BookingFormPage.jsx`**
```jsx
import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees } from '../lib/formatters';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import OtpDisplay from '../components/OtpDisplay';

const SLOTS = ['Today 4-6 PM', 'Today 6-8 PM', 'Tomorrow 9-11 AM', 'Tomorrow 4-6 PM'];
const AMOUNTS = [300, 500, 800, 1200];

export default function BookingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const candidate = state?.candidate;

  const [slot, setSlot] = useState(SLOTS[0]);
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);

  if (!candidate) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-slate-600">No worker selected.</p>
        <Button variant="secondary" onClick={() => navigate(`/household/requests/${id}/matches`)}>
          Back to matches
        </Button>
      </div>
    );
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      const created = await api.createBooking(Number(id), candidate.worker_user_id, slot, amount);
      setBooking(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (booking) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="font-bold text-green-900">Booking confirmed</p>
          <p className="text-sm text-green-800">
            {booking.worker_name} · {booking.scheduled_slot} · {rupees(booking.quoted_amount_inr)}
          </p>
        </div>
        <OtpDisplay
          label="Start OTP"
          otp={booking.start_otp}
          hint="Give this code to the worker only when they arrive at your door."
        />
        <Button onClick={() => navigate('/household/bookings')}>Go to my bookings</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Confirm booking</h2>
        <p className="text-sm text-slate-500">
          {candidate.full_name} · {candidate.distance_km} km · ★ {candidate.rating_avg.toFixed(1)}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Choose a slot</p>
        <div className="grid grid-cols-2 gap-2">
          {SLOTS.map((s) => (
            <button key={s} onClick={() => setSlot(s)}
              className={`text-sm rounded-lg px-3 py-3 border ${
                slot === s ? 'bg-slate-900 text-white border-slate-900'
                           : 'bg-white text-slate-700 border-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Estimated amount</p>
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map((a) => (
            <button key={a} onClick={() => setAmount(a)}
              className={`text-sm rounded-lg px-2 py-3 border ${
                amount === a ? 'bg-slate-900 text-white border-slate-900'
                             : 'bg-white text-slate-700 border-slate-300'}`}>
              {rupees(a)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 text-sm space-y-1">
        <p className="font-semibold">How {rupees(amount)} will be split</p>
        <div className="flex justify-between"><span className="text-slate-500">Worker payout (75%)</span>
          <span className="font-semibold">{rupees(Math.floor(amount * 0.75))}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Co-op overhead (15%)</span>
          <span className="font-semibold">{rupees(Math.floor(amount * 0.15))}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Welfare fund (10%)</span>
          <span className="font-semibold">
            {rupees(amount - Math.floor(amount * 0.75) - Math.floor(amount * 0.15))}</span></div>
      </div>

      <ErrorBox message={error} />
      <Button variant="success" disabled={busy} onClick={confirm}>
        {busy ? 'Booking…' : `Confirm booking · ${rupees(amount)}`}
      </Button>
      <button className="w-full text-sm text-slate-500 underline"
              onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
```

**`worksphere/frontend/src/App.jsx`** — replace the booking placeholder route:
```jsx
import BookingFormPage from './pages/BookingFormPage';
```
```jsx
            <Route path="/household/requests/:id/book" element={
              <RequireRole role="household"><BookingFormPage /></RequireRole>} />
```

### Verification checklist
1. Household → new request → matches → **Book Jignesh** → the form shows Jignesh's name, distance and rating.
2. Tap ₹800 → the split card updates to ₹600 / ₹120 / ₹80. The three numbers must sum to exactly 800.
3. Tap ₹300 → 225 / 45 / **30**. (Confirms the welfare fund absorbs the remainder.)
4. Confirm → green banner, then an amber OTP box with 6 digits and the prototype label visible.
5. Tap Back from the matches page, then re-enter the book page by URL → the "No worker selected" fallback appears instead of a crash.
6. Try booking the same request twice (go back to matches, book again) → red box "This request is already booked."

### Done when
Check 3 sums to 300 and check 4 shows the OTP with its prototype label.

### Common errors
- **`Cannot read properties of undefined (reading 'full_name')`** → the page was opened directly without router state. The `if (!candidate)` guard handles it; keep it.
- **Split shown in the UI disagrees with the API later** → the frontend preview must use the same `Math.floor` logic as `payments.js`. Do not switch to `Math.round`.
- **409 on first booking** → the request was already booked in an earlier test. Create a fresh request.

### What you should be able to explain
The household confirms a slot and an estimated amount, and before confirming they can see exactly how that money divides between the worker, the co-op's running costs and the welfare fund. The split is shown up front because transparency is the cooperative's selling point against commercial platforms where the commission is hidden. The start OTP is issued at booking time and only the household can see it.

### Git commit
`feat(web): booking confirmation screen with split preview and start otp`

### Log entry

[T13][B] /household/requests/:id/book live. Slot picker (4 options), amount picker (300/500/800/1200), live 75/15/10 split preview matching backend floor logic, POST /api/bookings, then confirmation + OtpDisplay showing start_otp with the visible "prototype: shown on screen" label.


---
---

# T14 · Booking lifecycle — accept, OTP verification, payment settlement, cancel
**Owner A · Prereqs: T12 · ~20 min · ⚠ CRITICAL — the completion transaction must be correct**

### Goal
Implement the four state-changing endpoints and `GET /api/bookings/:id/payment` per `01_SHARED_BRIEF.md` §7.4, §7.5, §4.2, §4.4.

### File to modify

**`worksphere/backend/src/routes/bookings.js`** — add the imports at the top:
```js
const { generateOtp, otpMatches, MAX_ATTEMPTS } = require('../services/otp');
const { computeSplit, SPLIT_PERCENTAGES } = require('../services/payments');
```
(replace the existing single `generateOtp` import line)

Then insert everything below **before** `module.exports = router;`:

```js
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
```

### Verification checklist
Booking `1`, household Ramesh, worker Jignesh. Get both tokens.

1. Worker accepts:
```bash
   curl -X POST http://localhost:4000/api/bookings/1/accept -H "Authorization: Bearer <WORKER_TOKEN>"
```
   → 200, `"status":"accepted"`
2. Accept again → 409 `INVALID_STATE`.
3. **Wrong OTP:**
```bash
   curl -X POST http://localhost:4000/api/bookings/1/verify-start-otp -H "Content-Type: application/json" -H "Authorization: Bearer <WORKER_TOKEN>" -d "{\"otp\":\"000000\"}"
```
   → 400, message ends "4 attempts remaining." Repeat → "3 attempts remaining."
4. Get the real OTP with the **household** token (`GET /api/bookings/1`), then verify → 200, `"status":"in_progress"`, `"completion_otp_generated":true`.
5. `SELECT completion_otp FROM bookings WHERE id=1;` → a new 6-digit code, different from `start_otp`.
6. Wrong completion OTP → 400 with the attempts message.
7. Correct completion OTP → 200 with the payment object: for ₹500 → `375 / 75 / 50`, `"status":"settled"`.
8. **Ledger integrity:**
```sql
   SELECT total_amount_inr,
          worker_payout_inr + coop_overhead_inr + welfare_fund_inr AS parts_sum
   FROM payments WHERE booking_id = 1;
```
   → the two columns must be **equal**.
9. **Rotation incremented:**
```sql
   SELECT jobs_completed_this_cycle, jobs_completed_total, last_assigned_at
   FROM worker_profiles WHERE user_id = 6;
```
   → Jignesh's cycle went 0 → 1, total 6 → 7, `last_assigned_at` is now.
10. **The fairness loop closes:** create a *new* plumbing request as Ramesh and fetch matches → Jignesh's `rotation_score` has dropped and his rank may change. Point this out on stage.
11. Cancel a completed booking → 409 `INVALID_STATE`.
12. Create a second booking, cancel it as the household → 200 `cancelled`, and its `service_requests.status` is back to `matched`.

### Done when
Checks 7, 8 and 9 all pass. Check 8 is non-negotiable: a ledger that does not balance is a broken demo.

### Common errors
- **`timingSafeEqual` throws "Input buffers must have the same byte length"** → the length guard in `otpMatches` prevents this; do not remove it.
- **Attempt counter never increases** → you returned before the UPDATE. The UPDATE must run first, then the response uses its returned count.
- **Payment stays `pending`** → the `UPDATE payments` targets `booking_id`, not `id`. Check the WHERE clause.
- **`current transaction is aborted`** → an earlier statement in the transaction failed. Look further up the terminal for the first error; the ROLLBACK is already handled.
- **Counters incremented but booking not completed** → you ran the UPDATEs outside `BEGIN`/`COMMIT`. All four steps must be inside one transaction.

### What you should be able to explain
Two OTPs bracket the job: one proves the worker arrived, one proves the household accepted the work as finished. Only when the second is verified do we complete the booking, settle the payment ledger and increment the worker's rotation counter — all four in one database transaction, so the system can never record a completed job without a settled payment. The floor-based split with the remainder going to the welfare fund means the three parts always add back to the exact amount, which you can check in the payments table.

### Git commit
`feat(api): booking lifecycle with dual otp verification and payment settlement`

### Log entry

[T14][A] Lifecycle complete. POST /:id/accept, /:id/verify-start-otp, /:id/verify-completion-otp, /:id/cancel, GET /:id/payment. Start OTP -> in_progress + issues completion OTP. Completion OTP -> ONE transaction: booking completed, payment settled (75/15/10), worker jobs_completed_total +1, jobs_completed_this_cycle +1, last_assigned_at=NOW(). Max 5 attempts per OTP, constant-time compare. Cancel allowed from pending/accepted only and returns the request to 'matched'. VERIFIED: payment parts sum exactly to total; rotation counter feeds back into the next match ranking.


---
---

# T15 · Worker screens — job list, accept, OTP entry
**Owner B · Prereqs: T13, T14 · ~20 min**

### Goal
The worker's side of the flow: see assigned jobs, accept, enter the start OTP, enter the completion OTP, see the payout.

### Files to modify

**`worksphere/frontend/src/lib/api.js`** — add to `api`:
```js
  acceptBooking: (id) => apiRequest(`/bookings/${id}/accept`, { method: 'POST' }),
  verifyStartOtp: (id, otp) =>
    apiRequest(`/bookings/${id}/verify-start-otp`, { method: 'POST', body: { otp } }),
  verifyCompletionOtp: (id, otp) =>
    apiRequest(`/bookings/${id}/verify-completion-otp`, { method: 'POST', body: { otp } }),
  cancelBooking: (id) => apiRequest(`/bookings/${id}/cancel`, { method: 'POST' }),
  getPayment: (id) => apiRequest(`/bookings/${id}/payment`),
```

**`worksphere/frontend/src/lib/formatters.js`** — append:
```js
export const BOOKING_STATUS_LABEL = {
  pending: 'Awaiting your acceptance',
  accepted: 'Accepted — not started',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUS_CLASS = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-200 text-slate-600',
};
```

### Files to create

**`worksphere/frontend/src/components/OtpInput.jsx`**
```jsx
import { useState } from 'react';
import Button from './Button';
import ErrorBox from './ErrorBox';

export default function OtpInput({ title, hint, onSubmit, busy }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);

  async function submit() {
    setError(null);
    try {
      await onSubmit(otp);
      setOtp('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div>
        <p className="font-semibold">{title}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <input
        inputMode="numeric"
        maxLength={6}
        className="w-full text-center text-2xl font-mono tracking-[0.3em] rounded-lg border border-slate-300 px-3 py-3"
        placeholder="——————"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
      />
      <ErrorBox message={error} />
      <Button variant="success" disabled={busy || otp.length !== 6} onClick={submit}>
        {busy ? 'Verifying…' : 'Verify'}
      </Button>
    </div>
  );
}
```

**`worksphere/frontend/src/pages/WorkerHome.jsx`**
```jsx
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { rupees, BOOKING_STATUS_LABEL, BOOKING_STATUS_CLASS, URGENCY_LABEL, URGENCY_CLASS }
  from '../lib/formatters';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import OtpInput from '../components/OtpInput';

export default function WorkerHome() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [settled, setSettled] = useState({}); // bookingId -> payment object

  const load = useCallback(() => {
    api.myBookings()
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function accept(id) {
    setBusyId(id);
    try { await api.acceptBooking(id); load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  }

  async function verifyStart(id, otp) {
    setBusyId(id);
    try { await api.verifyStartOtp(id, otp); load(); }
    finally { setBusyId(null); }
  }

  async function verifyDone(id, otp) {
    setBusyId(id);
    try {
      const res = await api.verifyCompletionOtp(id, otp);
      setSettled((s) => ({ ...s, [id]: res.payment }));
      load();
    } finally { setBusyId(null); }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My jobs</h2>
        <button className="text-xs underline text-slate-500" onClick={load}>Refresh</button>
      </div>

      <ErrorBox message={error} />
      {items === null && !error && <p className="text-slate-500">Loading…</p>}
      {items && items.length === 0 && (
        <p className="text-slate-500">No jobs assigned yet.</p>
      )}

      {items && items.map((b) => (
        <div key={b.id} className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{b.skill_name} · {rupees(b.quoted_amount_inr)}</p>
              <p className="text-sm text-slate-600">{b.issue_summary}</p>
              <p className="text-xs text-slate-500 mt-1">
                {b.household_name} · {b.household_address_text}
              </p>
              <p className="text-xs text-slate-500">{b.scheduled_slot}</p>
            </div>
            <div className="text-right space-y-1">
              <Badge className={BOOKING_STATUS_CLASS[b.status]}>
                {BOOKING_STATUS_LABEL[b.status]}
              </Badge>
              <div>
                <Badge className={URGENCY_CLASS[b.urgency]}>{URGENCY_LABEL[b.urgency]}</Badge>
              </div>
            </div>
          </div>

          {b.status === 'pending' && (
            <div className="flex gap-2">
              <Button variant="success" disabled={busyId === b.id} onClick={() => accept(b.id)}>
                Accept job
              </Button>
            </div>
          )}

          {b.status === 'accepted' && (
            <OtpInput
              title="Enter the start OTP"
              hint="Ask the household for the code when you reach the door."
              busy={busyId === b.id}
              onSubmit={(otp) => verifyStart(b.id, otp)}
            />
          )}

          {b.status === 'in_progress' && (
            <OtpInput
              title="Enter the completion OTP"
              hint="Ask the household for the code once they are satisfied."
              busy={busyId === b.id}
              onSubmit={(otp) => verifyDone(b.id, otp)}
            />
          )}

          {b.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-semibold text-green-900">Job complete</p>
              <p className="text-green-800">
                Your payout: {rupees(settled[b.id]?.worker_payout_inr
                  ?? Math.floor(b.quoted_amount_inr * 0.75))} (75%)
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**`worksphere/frontend/src/App.jsx`** — replace the worker placeholder:
```jsx
import WorkerHome from './pages/WorkerHome';
```
```jsx
            <Route path="/worker" element={
              <RequireRole role="worker"><WorkerHome /></RequireRole>} />
```

### Verification checklist
Two browser windows side by side: a normal window logged in as Ramesh, an **incognito** window logged in as Jignesh. (Two windows are needed because localStorage holds one session per browser profile — this is also how you should run the live demo.)

1. Household books Jignesh → in the worker window, Refresh → the job appears with an amber "Awaiting your acceptance" badge.
2. Confirm **no OTP is visible anywhere** on the worker screen. This is the security point.
3. Tap **Accept job** → badge turns blue, and an OTP entry box appears.
4. Type `000000` → red "Incorrect OTP. 4 attempts remaining."
5. Read the real start OTP from the household window, type it → badge turns purple "In progress", and a second OTP box appears.
6. Read the completion OTP from the household window (`/household/bookings`, built in T16 — until then read it from Neon) → verify → green "Job complete · Your payout: ₹375 (75%)".
7. Refresh → the completed card persists with the green box.

### Done when
Checks 2, 4 and 6 all pass.

### Common errors
- **Worker sees the OTP** → backend bug, not frontend. Re-run T12 verification 5.
- **Both windows share a login** → you opened a second tab, not an incognito window. Use incognito, or a second browser.
- **The card does not update after accept** → `load()` was not called after the action.
- **"Verify" stays disabled** → the OTP input strips non-digits; you must type exactly 6 digits.
- **Unhandled promise rejection on a wrong OTP** → `OtpInput` catches it; make sure `verifyStart` re-throws by not wrapping it in its own try/catch that swallows the error.

### What you should be able to explain
The worker never sees either OTP — they have to obtain each code from the household in person, which is what makes the codes proof of presence rather than just a button. Five wrong attempts locks the code, so guessing a six-digit number is not viable. The worker's screen changes shape with the booking status, so at any moment there is exactly one action available.

### Git commit
`feat(web): worker job list with accept and dual otp verification`

### Log entry

[T15][B] /worker live. Lists jobs from GET /bookings/mine, status-driven UI: pending -> Accept, accepted -> start OTP input, in_progress -> completion OTP input, completed -> payout box. OtpInput component (6 digits, numeric only, inline error with attempts remaining). CONFIRMED: no OTP value is rendered anywhere on the worker screen.


---
---

# T16 · Household bookings screen — status, OTPs, settled split
**Owner B · Prereqs: T13, T14 · ~20 min**

### Goal
The household's view of a live job: status, both OTPs when they exist, and the settled payment split on completion.

### Files to create

**`worksphere/frontend/src/components/SplitCard.jsx`**
```jsx
import { rupees } from '../lib/formatters';

export default function SplitCard({ payment }) {
  if (!payment) return null;
  const rows = [
    ['Worker payout', payment.worker_payout_inr, 75, 'bg-green-500'],
    ['Co-op overhead', payment.coop_overhead_inr, 15, 'bg-blue-500'],
    ['Welfare fund', payment.welfare_fund_inr, 10, 'bg-purple-500'],
  ];
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex justify-between items-baseline">
        <p className="font-bold">Transparent split</p>
        <p className="text-sm text-slate-500">
          {payment.status === 'settled' ? 'Settled' : 'Pending'}
        </p>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden">
        {rows.map(([label, , pct, color]) => (
          <div key={label} className={color} style={{ width: `${pct}%` }} />
        ))}
      </div>

      {rows.map(([label, value, pct, color]) => (
        <div key={label} className="flex justify-between text-sm">
          <span className="text-slate-600">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${color}`} />
            {label} ({pct}%)
          </span>
          <span className="font-semibold">{rupees(value)}</span>
        </div>
      ))}

      <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
        <span className="font-semibold">Total</span>
        <span className="font-bold">{rupees(payment.total_amount_inr)}</span>
      </div>
    </div>
  );
}
```

**`worksphere/frontend/src/pages/HouseholdBookings.jsx`**
```jsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { rupees, BOOKING_STATUS_LABEL, BOOKING_STATUS_CLASS } from '../lib/formatters';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ErrorBox from '../components/ErrorBox';
import OtpDisplay from '../components/OtpDisplay';
import SplitCard from '../components/SplitCard';

export default function HouseholdBookings() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [payments, setPayments] = useState({});
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api.myBookings();
      setItems(d.items);
      // Fetch the settled split for any completed booking.
      const completed = d.items.filter((b) => b.status === 'completed');
      const results = await Promise.all(
        completed.map((b) => api.getPayment(b.id).catch(() => null))
      );
      const map = {};
      completed.forEach((b, i) => { if (results[i]) map[b.id] = results[i]; });
      setPayments(map);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 5 seconds so the household sees the worker's actions without refreshing.
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function cancel(id) {
    try { await api.cancelBooking(id); load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">My bookings</h2>
        <button className="text-xs underline text-slate-500" onClick={load}>Refresh</button>
      </div>

      <ErrorBox message={error} />
      {items === null && !error && <p className="text-slate-500">Loading…</p>}
      {items && items.length === 0 && <p className="text-slate-500">No bookings yet.</p>}

      {items && items.map((b) => (
        <div key={b.id} className="space-y-3">
          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-bold">{b.skill_name} · {b.worker_name}</p>
                <p className="text-sm text-slate-600">{b.issue_summary}</p>
                <p className="text-xs text-slate-500">
                  {b.scheduled_slot} · {rupees(b.quoted_amount_inr)}
                </p>
              </div>
              <Badge className={BOOKING_STATUS_CLASS[b.status]}>
                {BOOKING_STATUS_LABEL[b.status]}
              </Badge>
            </div>

            {['pending', 'accepted'].includes(b.status) && (
              <Button variant="danger" onClick={() => cancel(b.id)}>Cancel booking</Button>
            )}
          </div>

          {b.status === 'accepted' && (
            <OtpDisplay label="Start OTP" otp={b.start_otp}
              hint="Read this to the worker when they arrive." />
          )}
          {b.status === 'pending' && (
            <OtpDisplay label="Start OTP" otp={b.start_otp}
              hint="The worker has not accepted yet." />
          )}
          {b.status === 'in_progress' && (
            <OtpDisplay label="Completion OTP" otp={b.completion_otp}
              hint="Read this to the worker only when you are satisfied with the work." />
          )}
          {b.status === 'completed' && <SplitCard payment={payments[b.id]} />}
        </div>
      ))}

      <button className="w-full text-sm text-slate-500 underline pt-2"
              onClick={() => navigate('/household')}>New request</button>
    </div>
  );
}
```

**`worksphere/frontend/src/App.jsx`** — replace the bookings placeholder:
```jsx
import HouseholdBookings from './pages/HouseholdBookings';
```
```jsx
            <Route path="/household/bookings" element={
              <RequireRole role="household"><HouseholdBookings /></RequireRole>} />
```

### Verification checklist
Same two-window setup as T15.

1. Household → My bookings → the booking shows with the amber start OTP box.
2. Worker accepts → **within 5 seconds, without touching the household window**, the badge changes to "Accepted — not started". This is the polling working; say so on stage.
3. Worker verifies the start OTP → household badge turns purple and the box switches to **Completion OTP** with a *different* 6-digit code.
4. Worker verifies the completion OTP → household shows the green "Completed" badge and the `SplitCard`.
5. The split bar renders three coloured segments; the three rupee figures sum exactly to the total.
6. Book a second job, tap **Cancel booking** while pending → status becomes Cancelled and the button disappears.
7. Try cancelling a completed booking → the button is not rendered (and the API would 409).

### Done when
Check 2 updates by itself and check 5 sums correctly.

### Common errors
- **Polling floods the terminal with requests** → expected. 5-second polling is deliberate; T18 mentions it in the honest-labels table.
- **`Maximum update depth exceeded`** → `load` is not wrapped in `useCallback`, so the interval effect re-creates every render. Keep the `useCallback`.
- **Completion OTP box is empty** → the household fetched before the worker verified the start OTP; wait for the next poll.
- **SplitCard shows nothing** → `getPayment` 403'd. Confirm you are the household on that booking.
- **Both OTPs look the same** → you are re-reading `start_otp`. Check the status branch you are in.

### What you should be able to explain
The household screen polls the backend every five seconds, so when the worker accepts or verifies a code the status changes without anyone refreshing — in the production design that same update arrives instantly over Socket.io instead. The completion OTP is only revealed once the job is actually in progress, and the household is told to withhold it until satisfied, which is what gives them leverage. On completion the household sees the exact three-way split of their money, settled from the database rather than calculated in the browser.

### Git commit
`feat(web): household bookings screen with live polling, otps and settled split`

### Log entry

[T16][B] /household/bookings live. 5-second polling of GET /bookings/mine. Status-driven OTP display: start OTP while pending/accepted, completion OTP while in_progress, SplitCard (stacked bar + 3 rows + total) once completed via GET /bookings/:id/payment. Cancel button on pending/accepted only. Two-window demo flow (normal + incognito) now works end to end.


---
---

# T17 · Admin analytics endpoints
**Owner A · Prereqs: T14 · ~20 min**

### Goal
Implement the three admin endpoints in `01_SHARED_BRIEF.md` §7.6.

### File to create

**`worksphere/backend/src/routes/admin.js`**
```js
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
```

### File to modify

**`worksphere/backend/src/index.js`** — add above the 404 handler:
```js
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
```

### Verification checklist
Log in as admin (`9876500000`).

1. ```bash
   curl http://localhost:4000/api/admin/stats -H "Authorization: Bearer <ADMIN_TOKEN>"

→ all five bookings_by_status keys present (zeros included), demand_by_skill has 6 entries, active_workers is 12 (13 workers minus the unverified Prakash).
2. Ledger consistency: total_worker_payout_inr + total_coop_overhead_inr + total_welfare_fund_inr must equal total_gmv_inr exactly.
3. ```bash
curl http://localhost:4000/api/admin/rotation-queue -H "Authorization: Bearer <ADMIN_TOKEN>"

   → 12 items. The first entries have `jobs_completed_this_cycle: 0`; Nitin Dabhi (5) is last. Prakash (unverified) is absent.
4. After completing a job in T14, re-run → that worker has moved **down** the queue. This is the fairness loop, visible.
5. `GET /api/admin/bookings` → both OTP fields are `null` on every row.
6. Household token on `/api/admin/stats` → 403 `FORBIDDEN_ROLE`.

### Done when
Checks 2 and 4 both hold.

### Common errors
- **`column "count" does not exist`** → `COUNT(*)` needs an alias; keep `::int AS count`.
- **Counts come back as strings** → Postgres returns `bigint` as a string in `pg`. The `::int` casts fix it; do not remove them.
- **`skills` is `null` instead of `[]`** → the `COALESCE(ARRAY_AGG(...) FILTER ..., '{}')` handles workers with no skills. Keep it.
- **`aggregate functions are not allowed in GROUP BY`** → you added a column to SELECT without adding it to GROUP BY.
- **403 as admin** → your token is from a non-admin login. Re-login with `9876500000`.

### What you should be able to explain
The co-op admin sees demand by service type, the money flowing through each of the three buckets, and the rotation queue showing who is next in line for work. The rotation queue is ordered by fewest jobs this cycle, so it is a direct, human-readable view of the same number the matching algorithm uses. Because every settled payment is a row, the dashboard totals are a sum of the ledger rather than a separate counter that could drift.

### Git commit
`feat(api): admin stats, rotation queue and bookings endpoints`

### Log entry

[T17][A] GET /api/admin/stats, /api/admin/rotation-queue, /api/admin/bookings live, all admin-only via router-level requireRole('admin'). Stats: request/booking totals, bookings_by_status (all 5 keys always present), GMV and the three settled buckets, active_workers, demand_by_skill. Rotation queue ordered jobs_this_cycle ASC then last_assigned_at ASC NULLS FIRST. Admin never sees OTPs. VERIFIED: bucket sums equal GMV; completing a job moves that worker down the queue.


---
---

# T18 · Admin dashboard with live polling
**Owner B · Prereqs: T16, T17 · ~20 min**

### Goal
The co-op dashboard: KPIs, demand by skill, the rotation queue, and all bookings — refreshing every 5 seconds.

### Files to modify

**`worksphere/frontend/src/lib/api.js`** — add to `api`:
```js
  adminStats: () => apiRequest('/admin/stats'),
  adminRotationQueue: () => apiRequest('/admin/rotation-queue'),
  adminBookings: () => apiRequest('/admin/bookings'),
```

### Files to create

**`worksphere/frontend/src/components/StatTile.jsx`**
```jsx
export default function StatTile({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
```

**`worksphere/frontend/src/pages/AdminDashboard.jsx`**
```jsx
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { rupees, BOOKING_STATUS_LABEL, BOOKING_STATUS_CLASS } from '../lib/formatters';
import Badge from '../components/Badge';
import StatTile from '../components/StatTile';
import ErrorBox from '../components/ErrorBox';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, q, b] = await Promise.all([
        api.adminStats(), api.adminRotationQueue(), api.adminBookings(),
      ]);
      setStats(s); setQueue(q.items); setBookings(b.items);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const maxDemand = Math.max(1, ...(stats?.demand_by_skill || []).map((d) => d.request_count));

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Co-op dashboard</h2>
        <span className="text-xs text-slate-400">
          {updatedAt ? `Live · ${updatedAt.toLocaleTimeString('en-IN')}` : 'Loading…'}
        </span>
      </div>

      <ErrorBox message={error} />

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Requests" value={stats.total_requests} />
            <StatTile label="Bookings" value={stats.total_bookings} />
            <StatTile label="Settled GMV" value={rupees(stats.total_gmv_inr)} />
            <StatTile label="Active workers" value={stats.active_workers} />
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            <p className="font-bold text-sm">Where the money went</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Worker payouts</span>
              <span className="font-semibold">{rupees(stats.total_worker_payout_inr)}</span></div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Co-op overhead</span>
              <span className="font-semibold">{rupees(stats.total_coop_overhead_inr)}</span></div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Welfare fund</span>
              <span className="font-semibold text-purple-700">
                {rupees(stats.total_welfare_fund_inr)}</span></div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            <p className="font-bold text-sm">Demand by service</p>
            {stats.demand_by_skill.map((d) => (
              <div key={d.skill_code}>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{d.skill_name}</span><span>{d.request_count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700"
                       style={{ width: `${(d.request_count / maxDemand) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <p className="font-bold text-sm">Rotation queue — next in line first</p>
        {queue.slice(0, 8).map((w, i) => (
          <div key={w.worker_user_id}
               className="flex items-center justify-between text-sm border-b border-slate-100 pb-1">
            <span className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-4">{i + 1}</span>
              <span>{w.full_name}</span>
              <span className="text-xs text-slate-400">{w.skills.join(', ')}</span>
            </span>
            <Badge className={w.jobs_completed_this_cycle === 0
              ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
              {w.jobs_completed_this_cycle} this cycle
            </Badge>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <p className="font-bold text-sm">All bookings</p>
        {bookings.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
        {bookings.slice(0, 10).map((b) => (
          <div key={b.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1">
            <span>
              <span className="text-slate-400 text-xs mr-1">#{b.id}</span>
              {b.skill_name} · {b.worker_name}
              <span className="block text-xs text-slate-400">
                {b.household_name} · {rupees(b.quoted_amount_inr)}</span>
            </span>
            <Badge className={BOOKING_STATUS_CLASS[b.status]}>
              {BOOKING_STATUS_LABEL[b.status]}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**`worksphere/frontend/src/App.jsx`** — replace the admin placeholder:
```jsx
import AdminDashboard from './pages/AdminDashboard';
```
```jsx
            <Route path="/admin" element={
              <RequireRole role="admin"><AdminDashboard /></RequireRole>} />
```

### Verification checklist
Three windows: normal (household), incognito (worker), a third profile or browser (admin).

1. Admin dashboard loads; the "Live · HH:MM:SS" stamp updates every 5 seconds.
2. Household creates a request → within 5s the **Requests** tile increments **without any refresh**. This is your live-dashboard moment.
3. Household books → **Bookings** tile increments, the booking appears at the top of All bookings with an amber badge.
4. Worker accepts, then verifies both OTPs → the badge walks amber → blue → purple → green in the admin view, hands-off.
5. On completion, **Settled GMV** jumps and the three money rows fill in; they sum to the GMV.
6. The completed worker drops down the rotation queue within 5 seconds.
7. Kill the backend → a red error box appears but the page does not crash; restart it and it recovers on the next poll.

### Done when
Checks 2, 4 and 6 all update without a manual refresh.

### Common errors
- **Tiles show `₹NaN`** → a count arrived as a string. Confirm the `::int` casts in T17.
- **Dashboard flickers** → each poll replaces state; that is fine. Do not add a loading spinner on the interval, only on first load.
- **`w.skills.join is not a function`** → `skills` came back `null`; check the COALESCE in T17.
- **Polling continues after navigating away** → the `return () => clearInterval(t)` cleanup handles it. Keep it.

### What you should be able to explain
The dashboard refreshes itself every five seconds by re-querying three endpoints, so the co-op sees demand and the rotation queue change as jobs happen — in production this is a Socket.io push instead of polling, which is the only difference. The welfare fund figure is a real running total from the payments ledger, not a display calculation. Watching a worker slide down the rotation queue the moment they complete a job is the clearest single proof that the fairness rule is live and not cosmetic.

### Git commit
`feat(web): admin dashboard with kpis, demand, rotation queue and polling`

### Log entry

[T18][B] /admin live. Polls stats + rotation-queue + bookings every 5s with a "Live · time" stamp. Shows 4 KPI tiles, the three-bucket money breakdown, demand-by-skill bars, the top 8 of the rotation queue, and the 10 most recent bookings with status badges. VERIFIED hands-off: creating/booking/completing in other windows updates this screen within 5 seconds and moves the completed worker down the queue.

*** PROTOTYPE CORE COMPLETE — the 7-step flow is demonstrable end to end. ***


---
---

# T19 · Gemini LLM for the NLP step
**Owner C (pair with A) · Prereqs: T08 · ~20 min**

### Goal
Add the real LLM in front of the keyword fallback, behind the same `extractServiceDetails()` interface, so nothing else changes.

### Get a free key
1. Go to `aistudio.google.com/apikey`, sign in with Google, **Create API key**. Free tier, no card.
2. Put it in `backend/.env`: `GEMINI_API_KEY=AIza...` and set `LLM_ENABLED=true`.
3. Confirm `GEMINI_API_KEY=` (empty) is still in `.env.example`. **Never commit the real key.**

### Commands
```bash
cd backend
npm install @google/generative-ai@0.21.0
```

### File to modify

**`worksphere/backend/src/services/nlp.js`** — add the require at the top:
```js
const { GoogleGenerativeAI } = require('@google/generative-ai');
```

Then **replace** the `extractServiceDetails` function at the bottom with everything below (keep `extractWithFallback` and all the keyword tables exactly as they are):

```js
const LLM_TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `You classify household service requests for an Indian cooperative platform.

The user message may be in English, Hindi or Gujarati.

Return ONLY a JSON object. No markdown, no code fences, no explanation.

Schema:
{
  "skill_code": one of ["plumbing","electrical","cleaning","carpentry","appliance_repair","painting"],
  "issue_summary": a short English summary, maximum 60 characters, even if the input is not English,
  "urgency": one of ["low","normal","high","emergency"],
  "detected_language": one of ["en","hi","gu"],
  "confidence": a number between 0 and 1
}

Urgency guidance:
- emergency: flooding, sparking wires, gas smell, anything dangerous right now
- high: the user says today, urgent, immediately, as soon as possible
- normal: no timing mentioned
- low: the user says whenever, no hurry, next week

Pick the single closest skill_code. Never invent a new one.`;

/** Strips ```json fences if the model adds them despite instructions. */
function stripFences(text) {
  return String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
}

/** Returns a validated object, or null if anything is wrong. */
function validateLlmOutput(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (!VALID_SKILLS.includes(parsed.skill_code)) return null;
  if (!VALID_URGENCY.includes(parsed.urgency)) return null;
  if (!['en', 'hi', 'gu'].includes(parsed.detected_language)) return null;

  let confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.8;
  confidence = Math.min(1, Math.max(0, confidence));

  const summary = String(parsed.issue_summary || '').trim().slice(0, 60);
  if (summary.length === 0) return null;

  return {
    skill_code: parsed.skill_code,
    issue_summary: summary,
    urgency: parsed.urgency,
    detected_language: parsed.detected_language,
    confidence: Number(confidence.toFixed(2)),
    source: 'llm',
  };
}

async function extractWithLlm(rawText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  });

  // Hard timeout: the demo must never hang waiting for a network call.
  const call = model.generateContent(String(rawText));
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('LLM timeout')), LLM_TIMEOUT_MS)
  );

  const result = await Promise.race([call, timeout]);
  const text = stripFences(result.response.text());
  return validateLlmOutput(JSON.parse(text));
}

/**
 * Single entry point. Tries the LLM, falls back to keywords on ANY problem.
 * Never throws: intake must not fail because of NLP.
 */
async function extractServiceDetails(rawText) {
  const enabled = process.env.LLM_ENABLED === 'true' && !!process.env.GEMINI_API_KEY;
  if (!enabled) return extractWithFallback(rawText);

  try {
    const result = await extractWithLlm(rawText);
    if (result) return result;
    console.warn('LLM output failed validation; using keyword fallback.');
  } catch (err) {
    console.warn('LLM call failed (%s); using keyword fallback.', err.message);
  }
  return extractWithFallback(rawText);
}
```

Update the exports line at the bottom:
```js
module.exports = { extractServiceDetails, extractWithFallback, VALID_SKILLS, VALID_URGENCY };
```

### Verification checklist
Restart the backend.

1. `curl http://localhost:4000/api/health` → `"llm_enabled":true`
2. Post a request that keywords would get **wrong**:
```bash
   curl -X POST http://localhost:4000/api/requests -H "Content-Type: application/json" -H "Authorization: Bearer <HOUSEHOLD_TOKEN>" -d "{\"raw_text\":\"There is water all over the floor near the washing machine and it will not stop\"}"
```
   → `"nlp_source":"llm"`, a sensible `skill_code`, `issue_summary` in English, confidence well above 0.4. The keyword matcher would have split between `plumbing` and `appliance_repair`; the LLM picks one and explains it in the summary.
3. Gujarati input → `"detected_language":"gu"` and an **English** `issue_summary`. This is the multilingual claim on your slide, proven.
4. **Fallback on outage:** set `LLM_ENABLED=false`, restart, repeat check 2 → `"nlp_source":"fallback"`, `confidence: 0.4`, and the request still succeeds with HTTP 201. **Rehearse this switch — it is your live-demo insurance.**
5. **Fallback on a bad key:** set `LLM_ENABLED=true` with `GEMINI_API_KEY=invalid`, restart, post → the terminal logs "LLM call failed", the response is still 201 with `nlp_source: "fallback"`. Restore the real key.
6. The household UI shows "Understood by: AI language model (XX%)" when the LLM ran, and "Keyword fallback (40%)" when it did not. No frontend change was needed — confirm this.

### Done when
Checks 4 and 5 both return 201. If either returns a 500, the fallback is not wired correctly and you must fix it before the demo.

### Common errors
- **`API key not valid`** → the key has whitespace or quotes in `.env`. It should be bare: `GEMINI_API_KEY=AIza...`
- **`models/gemini-2.0-flash is not found`** → the model name changed. Try `gemini-1.5-flash`. Change it in exactly one place and note it in the log.
- **`Unexpected token \` in JSON`** → the model wrapped the output in fences; `stripFences` handles it. Check you kept it.
- **429 rate limited** → free-tier quota. This is precisely why the fallback exists; set `LLM_ENABLED=false` and carry on.
- **Requests feel slow** → each intake now waits on a network call. 8 seconds is the hard ceiling, after which the fallback runs.

### What you should be able to explain
The LLM converts free speech in three languages into a structured record — service type, urgency, and an English summary — and we force it to answer in a fixed JSON schema so the output is machine-usable. Every field is validated against the same allowed values the database enforces, and if the model is slow, rate-limited, offline or returns anything unexpected, we silently drop to a keyword extractor and record `nlp_source: 'fallback'`. That means the AI improves quality but is never a single point of failure, which is why the demo cannot break because of it.

### Git commit
`feat(nlp): gemini flash extraction with schema validation and keyword fallback`

### Log entry

[T19][C] Gemini gemini-2.0-flash wired into src/services/nlp.js behind the existing extractServiceDetails() interface — no other file changed. JSON-only system prompt, responseMimeType application/json, temperature 0.1, 8s hard timeout, output validated against the 6 skill codes / 4 urgency values / 3 languages. ANY failure (disabled, missing key, timeout, bad JSON, invalid value) falls back to keywords with nlp_source='fallback'. VERIFIED: LLM_ENABLED=false and an invalid key both still return HTTP 201.


---
---
---

# ✂ CUT LINE

**Everything above (T01–T19) is the prototype you must have.** At T19 the full 7-step flow works end to end with real AI, and you can present with confidence.

**Everything below (T20–T23) is optional polish.** If you are behind schedule at the freeze time in T24, drop them in this order: T22, T23, T21, T20. Do not start a below-the-line task if fewer than 90 minutes remain before the freeze.

**T24 is never cut.** A rehearsed demo of T19 beats an unrehearsed demo of T23.

---
---
---

# T20 · Voice input (Web Speech API)
**Owner B · Prereqs: T09 · ~20 min · BELOW THE CUT LINE**

### Goal
Add a microphone button to the household intake so a request can be spoken in English, Hindi or Gujarati — step 1 of the slide's flow, with no paid speech service.

### Files to create

**`worksphere/frontend/src/lib/speech.js`** (plain JS, no React)
```js
/**
 * Thin wrapper over the browser's built-in Web Speech API.
 * Chrome and Edge only. Free, no API key, no server involvement.
 */
export function isSpeechSupported() {
  return typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export const SPEECH_LANGS = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
];

/**
 * Starts one recognition session. Returns a stop() function.
 * onResult(text) fires with the final transcript. onError(message) on failure.
 */
export function startListening({ lang = 'en-IN', onResult, onError, onEnd }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) { onError?.('Voice input is not supported in this browser.'); return () => {}; }

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult?.(transcript);
  };
  recognition.onerror = (event) => {
    const map = {
      'not-allowed': 'Microphone permission was denied.',
      'no-speech': 'No speech detected. Try again.',
      'network': 'Voice recognition needs an internet connection.',
      'audio-capture': 'No microphone found.',
    };
    onError?.(map[event.error] || `Voice input failed (${event.error}).`);
  };
  recognition.onend = () => onEnd?.();

  recognition.start();
  return () => recognition.stop();
}
```

**`worksphere/frontend/src/components/VoiceInput.jsx`**
```jsx
import { useRef, useState } from 'react';
import { isSpeechSupported, startListening, SPEECH_LANGS } from '../lib/speech';

export default function VoiceInput({ onTranscript, onError }) {
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState('en-IN');
  const stopRef = useRef(null);

  if (!isSpeechSupported()) {
    return (
      <p className="text-xs text-slate-500">
        Voice input needs Chrome or Edge. You can still type your request.
      </p>
    );
  }

  function toggle() {
    if (listening) { stopRef.current?.(); setListening(false); return; }
    setListening(true);
    stopRef.current = startListening({
      lang,
      onResult: (text) => onTranscript(text),
      onError: (msg) => { onError?.(msg); setListening(false); },
      onEnd: () => setListening(false),
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggle}
        className={`rounded-full w-12 h-12 flex items-center justify-center text-xl ${
          listening ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
        {listening ? '■' : '🎤'}
      </button>
      <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={listening}
        className="text-sm rounded-lg border border-slate-300 px-2 py-2 bg-white">
        {SPEECH_LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
      <span className="text-xs text-slate-500">
        {listening ? 'Listening… speak now' : 'Tap to speak'}
      </span>
    </div>
  );
}
```

### File to modify

**`worksphere/frontend/src/pages/HouseholdHome.jsx`** — add the import and track the input mode:
```jsx
import VoiceInput from '../components/VoiceInput';
```
Add a state line beside the others:
```jsx
  const [inputMode, setInputMode] = useState('text');
```
Change the submit call:
```jsx
      const created = await api.createRequest(text, inputMode);
```
Change the textarea's `onChange` so typing resets the mode:
```jsx
        onChange={(e) => { setText(e.target.value); setInputMode('text'); }}
```
Insert directly **above** the textarea:
```jsx
      <VoiceInput
        onTranscript={(t) => { setText(t); setInputMode('voice'); }}
        onError={(m) => setError(m)}
      />
```

### Verification checklist
1. In Chrome, the mic button and language dropdown appear above the text box.
2. Tap the mic → the browser asks for microphone permission → allow.
3. Say "my bathroom tap is leaking" → the button pulses red, then the text appears in the box.
4. Submit → the result card shows Plumbing. In Neon: `SELECT input_mode FROM service_requests ORDER BY id DESC LIMIT 1;` → `voice`.
5. Switch the dropdown to हिंदी, speak a Hindi sentence → Devanagari text appears in the box.
6. Deny microphone permission → a red error box, no crash.
7. Open the app in Firefox → the "needs Chrome or Edge" note appears and typing still works.
8. Type manually after speaking → `input_mode` reverts to `text`.

### Done when
Check 4 records `voice` and check 6 fails gracefully.

### Common errors
- **Nothing happens on tap** → Web Speech requires HTTPS or `localhost`. Both are fine; a LAN IP like `192.168.x.x` is not.
- **`network` error** → the browser sends audio to Google's servers; venue wifi may block it. **This is why you must rehearse the typed path too.**
- **Recognition stops instantly** → `continuous = false` means one utterance per tap. That is intended.
- **Wrong language transcribed** → set the dropdown before tapping the mic; the language cannot change mid-session.

### What you should be able to explain
Voice uses the browser's built-in Web Speech API, so it costs nothing and needs no key, and we send the recognised text — not audio — to our backend. We record whether each request arrived by voice or typing in `input_mode`, which matters because voice is how a worker or household with low literacy will actually use this. Speech recognition needs the internet, so the typed path is always available as a fallback.

### Git commit
`feat(web): voice request intake via web speech api in en/hi/gu`

### Log entry

[T20][B] Voice intake added to /household. src/lib/speech.js wraps Web Speech API (free, Chrome/Edge, no key); VoiceInput component with an en-IN/hi-IN/gu-IN selector and a listening state. Transcript fills the textarea and sets input_mode='voice'; typing resets it to 'text'. Unsupported browsers show a note and typing still works. CAUTION: needs internet; typed path is the demo fallback.


---
---

# T21 · Deploy — Render (backend) + Vercel (frontend)
**Owner C · Prereqs: T18 · ~20 min · BELOW THE CUT LINE**

### Goal
Put the app on public URLs as a backup and as proof it is not laptop-only. **Still demo from localhost** — it is faster and does not depend on venue wifi.

### Files to create

**`worksphere/backend/render.yaml`** (documentation of the settings; Render's dashboard is the actual source)
```yaml
# Render free web service settings for the WorkSphere backend.
# Root Directory: backend
# Build Command:  npm install
# Start Command:  npm start
# Environment:    Node
# Env vars: DATABASE_URL, JWT_SECRET, NODE_ENV=production,
#           CORS_ORIGIN=<your vercel url>, GEMINI_API_KEY, LLM_ENABLED=true
# NOTE: PORT is supplied by Render automatically; src/index.js already reads process.env.PORT.
```

### Steps

**Backend on Render**
1. render.com → sign up with GitHub → **New → Web Service** → pick the `worksphere` repo.
2. Root Directory `backend` · Build `npm install` · Start `npm start` · Instance type **Free**.
3. Add environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `GEMINI_API_KEY`, `LLM_ENABLED=true`, and `CORS_ORIGIN` — leave `CORS_ORIGIN` as a placeholder for now.
4. Deploy. Copy the URL, e.g. `https://worksphere-api.onrender.com`.
5. Visit `<url>/api/health` → must show `"db":"connected"`.

**Frontend on Vercel**
6. vercel.com → sign up with GitHub → **Add New → Project** → the `worksphere` repo.
7. Root Directory `frontend` · Framework **Vite** · Build `npm run build` · Output `dist`.
8. Environment variable: `VITE_API_BASE_URL` = `https://worksphere-api.onrender.com/api` (include `/api`, no trailing slash).
9. Deploy. Copy the URL, e.g. `https://worksphere.vercel.app`.

**Close the loop**
10. Back in Render, set `CORS_ORIGIN` to `https://worksphere.vercel.app,http://localhost:5173` and redeploy. Both origins must work.

### Verification checklist
1. `<render-url>/api/health` in a browser → `{"status":"ok","db":"connected","llm_enabled":true}`
2. Open the Vercel URL on your **phone** → the login screen renders at phone width.
3. Log in as the household on the phone, submit a request → it works. The same data appears on your laptop's admin dashboard. Say this out loud in the demo: same database, two devices.
4. Browser console on the Vercel site shows **no CORS errors**.
5. Leave it 15 minutes, reload → the first request takes 30–60 seconds. **Render's free tier sleeps when idle.** Wake it before the presentation.
6. `git log` shows no `.env` file was ever committed: `git log --all --full-history -- "**/.env"` → empty.

### Done when
Checks 1–4 pass and check 6 is empty.

### Common errors
- **Render build fails `Cannot find module`** → Root Directory is not `backend`.
- **`db: disconnected` on Render** → `DATABASE_URL` missing or mistyped in Render's env vars. They are separate from your local `.env`.
- **CORS error on Vercel** → `CORS_ORIGIN` must be the exact Vercel origin, no trailing slash, and Render must be redeployed after the change.
- **Vercel 404 on refresh of `/admin`** → SPA routing. Add `frontend/vercel.json`:
```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
- **First request takes a minute** → free-tier cold start. Open the health URL 5 minutes before you present.

### What you should be able to explain
The backend runs on Render, the frontend on Vercel, and both talk to the same Neon database, so the system is genuinely deployed rather than running on one laptop. CORS is why the backend has to be told the frontend's exact address — browsers block cross-origin calls unless the server allows them. The free tier sleeps after inactivity, which is a cost decision, not an architecture limit.

### Git commit
`chore(deploy): render and vercel configuration`

### Log entry

[T21][C] Deployed. Backend: Render free web service, root=backend, https://<render-url>. Frontend: Vercel, root=frontend, https://<vercel-url>, VITE_API_BASE_URL points at the Render /api. CORS_ORIGIN on Render lists both the Vercel origin and localhost:5173. Same Neon DB for local and deployed. WARNING: Render free tier cold-starts after ~15 min idle — wake it before presenting. DEMO DECISION: present from localhost, deployed URL is the backup.


---
---

# T22 · Resilience pass — loading, empty and error states
**Owner B · Prereqs: T16, T18 · ~20 min · BELOW THE CUT LINE**

### Goal
Make every screen behave when the network is slow, the list is empty, or the token has expired — so a hiccup on stage does not look like a crash.

### Files to create

**`worksphere/frontend/src/components/EmptyState.jsx`**
```jsx
export default function EmptyState({ title, message, action }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 text-center space-y-2">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}
```

**`worksphere/frontend/src/components/Spinner.jsx`**
```jsx
export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
      <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      {label}
    </div>
  );
}
```

### File to modify

**`worksphere/frontend/src/lib/api.js`** — in `apiRequest`, replace the `if (!res.ok)` block so an expired token logs the user out cleanly:
```js
  if (!res.ok) {
    const code = data?.error?.code || 'SERVER_ERROR';
    // An expired or invalid token should return the user to login, not show a raw 401.
    if (res.status === 401 && code === 'UNAUTHENTICATED' && getToken()) {
      clearSession();
      window.location.assign('/login');
    }
    const e = new Error(data?.error?.message || `Request failed (${res.status}).`);
    e.code = code;
    e.status = res.status;
    throw e;
  }
```

Then in each of `HouseholdBookings.jsx`, `WorkerHome.jsx`, `MatchesPage.jsx` and `AdminDashboard.jsx`:
- replace the `<p className="text-slate-500">Loading…</p>` lines with `<Spinner />`
- replace the plain empty-list paragraphs with `<EmptyState .../>`, for example in `WorkerHome.jsx`:
```jsx
      {items && items.length === 0 && (
        <EmptyState title="No jobs yet"
          message="When a household books you, the job appears here." />
      )}
```

### Verification checklist
1. Throttle the network (DevTools → Network → Slow 3G) and reload each screen → a spinner shows, nothing flashes blank.
2. Log in as Lata Makwana (`9876500018`, a worker with no bookings) → the empty state appears, not a blank page.
3. In DevTools → Application → Local Storage, set `worksphere_token` to `garbage`, then trigger any action → you land on `/login` automatically instead of seeing a 401.
4. Stop the backend while the admin dashboard is polling → the red error box appears, the page keeps its last data, and it recovers when the backend restarts.
5. Every screen (`/household`, `/household/bookings`, `/worker`, `/admin`, matches) has been checked in all three states: loading, empty, error.

### Done when
Check 3 redirects cleanly and check 4 recovers without a manual refresh.

### Common errors
- **Redirect loop on `/login`** → the `getToken()` guard prevents the redirect firing when there is no token. Keep it.
- **`clearSession is not defined`** → it is defined in the same `api.js` file; no import needed, but the function must be declared above `apiRequest`.
- **Spinner spins forever** → an error was swallowed. Every `.catch` must set state.

### What you should be able to explain
Every screen handles three states, not one: loading, empty, and error. An expired token clears the session and sends the user back to login instead of showing a raw error, because a token only lasts 24 hours. When the admin dashboard loses the backend mid-poll it keeps the last known data on screen and recovers on the next cycle, so a brief network drop during a demo is invisible.

### Git commit
`fix(web): loading, empty and error states across all screens`

### Log entry

[T22][B] Resilience pass. Spinner and EmptyState components added and applied to /household/bookings, /worker, /admin and the matches page. api.js now auto-clears the session and redirects to /login on a 401 UNAUTHENTICATED with a stored token. Verified on Slow 3G, with an empty account, with a corrupted token, and with the backend stopped mid-poll.


---
---

# T23 · Demo reset script
**Owner C · Prereqs: T03, T14 · ~20 min · BELOW THE CUT LINE**

### Goal
One command that returns the database to a clean, rehearsal-ready state in seconds — plus a pre-completed booking so the admin dashboard is not empty when you open it.

### File to create

**`worksphere/backend/db/demo-reset.js`**
```js
// Resets the database to a demo-ready state.
//   node db/demo-reset.js
// Runs the full seed, then creates ONE completed job so the admin dashboard
// opens with real numbers instead of zeros.
require('dotenv').config();
const { execSync } = require('child_process');
const { Pool } = require('pg');
const { computeSplit } = require('../src/services/payments');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const HISTORY_AMOUNT = 800;

async function main() {
  console.log('1/2  Re-seeding base data…');
  execSync('node db/seed.js', { stdio: 'inherit' });

  console.log('2/2  Creating one completed job for dashboard history…');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const anil = await client.query(`SELECT id FROM users WHERE phone = '9876500003'`);
    const nitin = await client.query(`SELECT id FROM users WHERE phone = '9876500022'`);
    const cleaning = await client.query(`SELECT id FROM skills WHERE code = 'cleaning'`);

    const sr = await client.query(
      `INSERT INTO service_requests
         (household_user_id, raw_text, input_mode, detected_language, skill_id,
          issue_summary, urgency, nlp_source, nlp_confidence, status)
       VALUES ($1, 'Need deep cleaning of the kitchen', 'text', 'en', $2,
               'Kitchen deep cleaning', 'normal', 'fallback', 0.40, 'booked')
       RETURNING id`,
      [anil.rows[0].id, cleaning.rows[0].id]
    );

    const booking = await client.query(
      `INSERT INTO bookings
         (service_request_id, household_user_id, worker_user_id, status,
          scheduled_slot, quoted_amount_inr, start_otp, completion_otp,
          accepted_at, started_at, completed_at)
       VALUES ($1,$2,$3,'completed','Yesterday 10-12 AM',$4,'111111','222222',
               NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
       RETURNING id`,
      [sr.rows[0].id, anil.rows[0].id, nitin.rows[0].id, HISTORY_AMOUNT]
    );

    const split = computeSplit(HISTORY_AMOUNT);
    await client.query(
      `INSERT INTO payments
         (booking_id, total_amount_inr, worker_payout_inr, coop_overhead_inr,
          welfare_fund_inr, status)
       VALUES ($1,$2,$3,$4,$5,'settled')`,
      [booking.rows[0].id, split.total_amount_inr, split.worker_payout_inr,
       split.coop_overhead_inr, split.welfare_fund_inr]
    );

    await client.query('COMMIT');
    console.log(`Done. Completed booking #${booking.rows[0].id}, GMV ₹${HISTORY_AMOUNT}.`);
    console.log('Demo state ready. All passwords: test1234');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
```

### File to modify

**`worksphere/backend/package.json`** — add to `"scripts"`:
```json
    "demo:reset": "node db/demo-reset.js"
```

### Verification checklist
1. `npm run demo:reset` → both steps print, ending with the GMV line.
2. Admin dashboard → Requests 1, Bookings 1, Settled GMV ₹800, money rows 600 / 120 / 80.
3. Nitin Dabhi's rotation position reflects his seeded 5 jobs (he is last).
4. Run the full demo flow, then `npm run demo:reset` again → the dashboard returns to exactly the check-2 numbers. **Under 10 seconds.**
5. Run it three times in a row → no duplicate-key errors.

### Done when
Check 4 restores the identical state.

### Common errors
- **`Cannot find module '../src/services/payments'`** → run from `backend/`, not the repo root.
- **`execSync` cannot find `node`** → run via `npm run demo:reset`, which puts node on the path.
- **Foreign key violation** → `seed.js` did not finish. Fix the seed first; the reset depends on it.

### What you should be able to explain
One command rebuilds the entire demo dataset, so we can rehearse the full flow repeatedly and reset between runs in seconds. It also inserts one historical completed job, so the co-op dashboard opens with real figures rather than an empty state. Everything it creates goes through the same tables and the same split calculation the live code uses.

### Git commit
`chore(demo): one-command database reset with seeded history`

### Log entry

[T23][C] npm run demo:reset added (backend/db/demo-reset.js). Re-runs the seed, then inserts one completed cleaning job (Anil -> Nitin, Rs 800, settled 600/120/80) so the admin dashboard opens with non-zero KPIs. Idempotent, takes under 10 seconds. USE THIS BETWEEN EVERY REHEARSAL RUN.


---
---

# T24 · Feature freeze and rehearsal
**Owner ALL · Prereqs: T19 (plus whatever else landed) · ~90 min · NEVER CUT**

# WORKSPHERE — POST-T19 CHANGE SET (T25, T26, T27)
# Slot these in AFTER T19 and BEFORE T24 (feature freeze).
# Paste 00_EXECUTOR_RULES.md and 01_SHARED_BRIEF.md above this, as usual.
# Do ONE task per chat. T25 first, then T26, then T27.

---

## BEFORE YOU START ANY OF THESE

Tag the working prototype so you can roll back:

```bash
git checkout main && git pull
git tag -a pre-ui-change -m "Working prototype at T19"
git push origin pre-ui-change
```

If T26 or T27 goes wrong and time is short: `git checkout pre-ui-change` and present that. These three tasks are polish. A working narrow-screen demo beats a broken wide-screen one.

---

## BRIEF AMENDMENT (applies to 01_SHARED_BRIEF.md — A applies this, nobody else)

**Add one error code to §6:**

| code | HTTP | when |
|---|---|---|
| `DUPLICATE_BOOKING` | 409 | the household already has an active booking with this worker for this slot |

**Add one index to §3 (`backend/db/schema.sql`), at the end of the index block:**

```sql
CREATE UNIQUE INDEX idx_bookings_no_duplicate_active
  ON bookings (household_user_id, worker_user_id, scheduled_slot)
  WHERE status IN ('pending','accepted','in_progress');
```

Nothing else in 01 changes. No table, column, endpoint or status value is renamed.

---
---

# T25 · Prevent duplicate bookings for the same worker and slot
**Owner A · Prereqs: T14 · ~20 min · DO THIS ONE FIRST**

### The bug
A household books Jignesh for "Today 4-6 PM". They sign out, sign back in, create a fresh request, and book Jignesh for the same slot again. The system accepts it. It should not: the same worker cannot be in two places at once, and the household is double-booking by accident.

The existing `INVALID_STATE` guard only catches re-booking the *same service request*. It does not catch a *new* request for the same worker and slot.

### Goal
Reject a booking when the household already has an active booking (`pending`, `accepted` or `in_progress`) with the same worker for the same `scheduled_slot`, with a clear message — enforced in both the application code and the database.

### Step 1 — apply the index

Run this in the Neon SQL Editor, and also append it to `backend/db/schema.sql` so a fresh setup gets it:

```sql
CREATE UNIQUE INDEX idx_bookings_no_duplicate_active
  ON bookings (household_user_id, worker_user_id, scheduled_slot)
  WHERE status IN ('pending','accepted','in_progress');
```

This is a **partial unique index**: it only applies to rows whose status is one of those three, so cancelled and completed bookings never block a re-book. It is the database-level guarantee — even a bug in the route cannot create a duplicate.

### Step 2 — edit `worksphere/backend/src/routes/bookings.js`

In the `POST /` handler, insert this block **after** the worker-exists check and **immediately before** `await client.query('BEGIN');`:

```js
    // Duplicate guard: the same household cannot hold two active bookings with
    // the same worker for the same slot, even across different service requests.
    const duplicate = await client.query(
      `SELECT id FROM bookings
       WHERE household_user_id = $1
         AND worker_user_id = $2
         AND scheduled_slot = $3
         AND status IN ('pending','accepted','in_progress')
       LIMIT 1`,
      [req.auth.user_id, worker_user_id, scheduled_slot]
    );
    if (duplicate.rowCount > 0) {
      return fail(res, 409, 'DUPLICATE_BOOKING',
        `You already have an active booking with this worker for ${scheduled_slot} (booking #${duplicate.rows[0].id}). Cancel it first or choose another slot.`);
    }
```

Then, in the same handler's `catch (err)` block, add the database-level fallback **before** `next(err);`:

```js
    // 23505 = unique_violation. Two requests racing each other both passed the
    // check above; the index caught the second one.
    if (err.code === '23505' && String(err.constraint || '').includes('no_duplicate_active')) {
      return fail(res, 409, 'DUPLICATE_BOOKING',
        'You already have an active booking with this worker for that slot.');
    }
```

Leave every other line of the file unchanged.

### Step 3 — edit `worksphere/frontend/src/pages/BookingFormPage.jsx`

This is a one-line change inside `confirm()`. Replace:

```js
      setError(err.message);
```

with:

```js
      setError(err.code === 'DUPLICATE_BOOKING'
        ? `${err.message} You can see it under My bookings.`
        : err.message);
```

### Verification checklist

1. Log in as Ramesh. Create a plumbing request, book **Jignesh** for **Today 4-6 PM**. → 201, booking created.
2. **Sign out. Sign back in as Ramesh.** Create a *new* plumbing request. Book **Jignesh** for **Today 4-6 PM** again.
   → red box: "You already have an active booking with this worker for Today 4-6 PM (booking #1). Cancel it first or choose another slot. You can see it under My bookings."
   **This is the bug being fixed. It must fail here.**
3. Same fresh request, but pick **Today 6-8 PM** → 201, booking succeeds. (Different slot is allowed.)
4. Same fresh request, same slot, but pick **Bhavna Chauhan** → 201, succeeds. (Different worker is allowed.)
5. Cancel booking #1 from `/household/bookings`. Now re-book Jignesh for Today 4-6 PM → 201, succeeds. (Cancelled does not block.)
6. Complete a booking with Jignesh for a slot, then book him again for that same slot → 201, succeeds. (Completed does not block.)
7. Log in as **Meera** (`9876500002`), book Jignesh for Today 4-6 PM while Ramesh has an active one → 201, succeeds. (The guard is per household, not global.)
8. Confirm the index exists:
```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'bookings' AND indexname = 'idx_bookings_no_duplicate_active';
```
   → 1 row.

### Done when
Check 2 is rejected and checks 3, 4, 5, 6 and 7 all still succeed. **If any of 3–7 is blocked, the guard is too broad — re-read the WHERE clause.**

### Common errors
- **`could not create unique index ... duplicate key value`** → you already have duplicate active bookings in the database from testing. Run `npm run demo:reset`, then create the index.
- **Checks 5 or 6 are blocked** → your status list includes `cancelled` or `completed`. It must be exactly the three active statuses.
- **Check 7 is blocked** → you left `household_user_id` out of the index or the WHERE clause.
- **`err.constraint` is undefined** → some pg errors omit it; the `String(err.constraint || '')` guard handles that safely. Keep it.

### What you should be able to explain
We enforce this in two places on purpose. The route check gives the user a clear, specific message naming the existing booking. The partial unique index is the actual guarantee — it only covers active bookings, so cancelled and completed ones never block a re-book, and it holds even if two requests arrive at the same instant. That is the difference between a validation and a constraint.

### Git commit
`fix(api): reject duplicate active bookings for the same worker and slot`

### Log entry
```text
[T25][A] Duplicate booking guard added. Route check in POST /api/bookings returns 409 DUPLICATE_BOOKING naming the existing booking id; partial unique index idx_bookings_no_duplicate_active on (household_user_id, worker_user_id, scheduled_slot) WHERE status IN (pending, accepted, in_progress) is the database-level guarantee. 23505 handled as a race fallback. BRIEF AMENDED: new error code DUPLICATE_BOOKING in 01 section 6, new index in section 3. Cancelled and completed bookings correctly do not block re-booking.
```

---
---

# T26 · Desktop 16:9 layout
**Owner B · Prereqs: T18 · ~20 min**

### Goal
Replace the phone-width column with a desktop layout that fills a standard 16:9 screen, without rewriting any page's logic. Only `App.jsx` and `AppHeader.jsx` change structurally; pages get width classes only.

### Design decision — read before building
Do **not** stretch the existing single column to full width; long lines of text across 1920px are unreadable. Use a **fixed left sidebar for navigation plus a centred content area with a max width**. This is the standard desktop dashboard shape, it looks deliberate, and it makes the admin dashboard genuinely better because three panels can sit side by side.

### Step 1 — replace `worksphere/frontend/src/App.jsx` shell

Keep every `<Route>` line exactly as it is. Replace only the wrapper `<div>`s:

```jsx
        <div className="min-h-screen flex justify-center">
          <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-xl">
            <AppHeader />
            <Routes> ... </Routes>
          </div>
        </div>
```

with:

```jsx
        <div className="min-h-screen bg-slate-100">
          <AppHeader />
          <main className="mx-auto w-full max-w-6xl px-6 py-6">
            <Routes> ... </Routes>
          </main>
        </div>
```

`max-w-6xl` (1152px) centred on a 1920px screen reads well and still fills a projector properly. Do not remove it.

### Step 2 — `worksphere/frontend/src/components/AppHeader.jsx`

Turn the header into a full-width top bar with the content constrained to the same `max-w-6xl`, so the header text lines up with the page content below it. Keep the sign-out button and the `{user.full_name} · {user.role}` line exactly as they are — just move them inside a `<div className="mx-auto w-full max-w-6xl px-6 flex items-center justify-between">`.

Add a role label on the right of the header so the audience can always tell which window they are looking at during the demo: a `Badge` reading `HOUSEHOLD`, `WORKER` or `CO-OP ADMIN` in the role's colour. This is worth more on stage than anything else in this task.

### Step 3 — per-page width rules

Change **only** the outermost `<div className="p-4 space-y-4">` on each page. Do not touch any component inside.

| Page | New outer class | Reason |
|---|---|---|
| `LoginPage.jsx` | `max-w-md mx-auto space-y-5 pt-12` | A login form should stay narrow and centred |
| `HouseholdHome.jsx` | `max-w-2xl mx-auto space-y-4` | Text entry, keep the line length readable |
| `MatchesPage.jsx` | `space-y-4` + wrap the cards in `grid grid-cols-1 md:grid-cols-2 gap-4` | Four worker cards in two columns — all visible at once, no scrolling during the demo |
| `BookingFormPage.jsx` | `max-w-2xl mx-auto space-y-4` | Form, keep narrow |
| `HouseholdBookings.jsx` | `max-w-3xl mx-auto space-y-4` | Cards with an OTP box beside them |
| `WorkerHome.jsx` | `max-w-3xl mx-auto space-y-4` | Job cards |
| `AdminDashboard.jsx` | `space-y-6` + see below | Full width, this is a dashboard |

**`AdminDashboard.jsx` specifically:** keep the four `StatTile`s in one row (`grid-cols-4`, they are currently `grid-cols-2`), then put "Where the money went", "Demand by service" and "Rotation queue" into a `grid grid-cols-1 lg:grid-cols-3 gap-4` so all three are visible without scrolling, with "All bookings" full width underneath. **Getting the whole dashboard on one screen is the point of this task** — during the demo you must not scroll while judges watch it update.

### Step 4 — keep it responsive
Every `md:` and `lg:` prefix above means the layout still collapses to one column on a narrow window. Do not remove them. If the projector turns out to be 4:3 or the venue gives you a small window, the app still works.

### Verification checklist
1. Open at 1920×1080 → no horizontal scrollbar anywhere, content centred, no giant empty gutters.
2. `/login` → the form is narrow and centred, not stretched across the screen.
3. Matches page → four worker cards in **two columns**, all four visible without scrolling.
4. `/admin` → four stat tiles in one row, three panels side by side below, all bookings underneath. **Everything above "All bookings" fits on one screen.**
5. Header → shows the role badge, and the header text lines up vertically with the page content below it.
6. Narrow the window to phone width → everything collapses to one column and remains usable.
7. Run the **entire demo flow** (`05_DEMO_AND_QA.md` section A) once at 1920×1080. Every click path still works.
8. `git diff --stat` → only `App.jsx`, `AppHeader.jsx` and the outer div of each page changed. **If any component file changed, you went too far.**

### Done when
Checks 4, 7 and 8 all pass.

### Common errors
- **Horizontal scrollbar appears** → a child has a fixed width or `w-screen`. Find it with DevTools; `max-w-full` on the offender fixes it.
- **Admin dashboard still stacked** → Tailwind needs the literal class string; `lg:grid-cols-3` must be written out, never built from a variable.
- **Cards became different heights and look ragged** → add `items-start` to the grid container.
- **Pages look empty and lost** → your `max-w-*` is too large for that page. Use the table above; do not go wider.

### What you should be able to explain
The prototype was built phone-width because the production design is a React Native mobile app, but we present on a projector, so we moved to a centred desktop layout with a maximum content width. Nothing about the pages themselves changed — only the container — because all the layout lives in the shell. The breakpoints are still there, so the same build works on a phone, which we can show on the deployed URL.

### Git commit
`style(web): desktop 16:9 layout with centred max-width shell`

### Log entry
```text
[T26][B] Layout moved from max-w-md phone column to a centred max-w-6xl desktop shell in App.jsx, with a full-width top bar in AppHeader showing a role badge (HOUSEHOLD / WORKER / CO-OP ADMIN) for demo clarity. Per-page max widths applied to outer divs only: login max-w-md, household/booking max-w-2xl, bookings/worker max-w-3xl, matches 2-column grid, admin full width with 4 stat tiles in one row and 3 panels side by side. All md:/lg: breakpoints retained so it still collapses to mobile. No component internals touched. Full demo flow re-verified at 1920x1080.
```

---
---

# T27 · UI polish — simple, sober, readable
**Owner B · Prereqs: T26 · ~20 min · BELOW THE CUT LINE**

### Goal
Tighten the visual language so it reads as considered rather than default, without adding a library, a font file, or any new dependency.

### Constraints — do not break these
- **No new packages.** Tailwind classes only.
- **No new colours beyond the palette below.** Resist the urge to add gradients, shadows-on-everything, or a brand colour.
- **Do not change any text content, label, or number.** This is presentation only.
- **Do not touch any logic, state, API call, or conditional render.** If a diff line contains `useState`, `useEffect`, `api.` or `await`, you have gone too far.

### The palette — use only these
| Use | Class |
|---|---|
| Page background | `bg-slate-100` |
| Card surface | `bg-white` |
| Card border | `border border-slate-200` (replace `shadow` with this — flat reads more professional than drop shadows) |
| Primary text | `text-slate-900` |
| Secondary text | `text-slate-500` |
| Primary action | `bg-slate-900 text-white` |
| Positive / money to worker | `text-green-700`, `bg-green-50` |
| Warning / OTP | `text-amber-800`, `bg-amber-50` |
| Welfare fund | `text-purple-700` |
| Danger / cancel | `text-red-700`, `bg-red-50` |

### Specific changes

1. **Cards** — replace every `rounded-lg shadow p-4` with `rounded-xl border border-slate-200 p-5`. Consistent corner radius and no shadows.
2. **Section headings** — every card's title becomes `text-sm font-semibold text-slate-900 uppercase tracking-wide`. Small caps headings look deliberate and stop the page reading as one flat block.
3. **Numbers** — every rupee figure, score and OTP gets `tabular-nums`. Without it, digits jitter as the dashboard polls, which looks broken. **This is the highest-value line in this task.**
4. **Vertical rhythm** — page-level spacing `space-y-6`, inside a card `space-y-3`. Nothing else.
5. **Buttons** (`Button.jsx`) — add `text-sm` and `focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2`. The focus ring is accessibility, not decoration.
6. **Status badges** (`Badge.jsx`) — add `uppercase tracking-wide text-[11px]` so all badges are visually consistent regardless of label length.
7. **Score bars** (`ScoreBar.jsx`) — bump the track to `h-2`, add `transition-all duration-300` on the fill so it animates in when "Why this rank?" opens. One subtle motion, nowhere else.
8. **Tables of figures** (`SplitCard`, admin money panel) — label left in `text-slate-500`, figure right in `font-semibold tabular-nums`, one `border-t border-slate-200 pt-2` above the total row only.
9. **Empty and loading states** — `text-slate-400 text-sm`, centred, `py-8`. They should recede, not compete.
10. **Accessibility pass** — every `<input>` gets an `aria-label` matching its placeholder; every icon-only button (the mic in `VoiceInput`, if T20 shipped) gets an `aria-label`; confirm no text sits below `text-xs`.

### Verification checklist
1. Every card on every screen has the same corner radius and border. No drop shadows anywhere.
2. Leave `/admin` open for 60 seconds while it polls → **the numbers do not shift horizontally.** (That is `tabular-nums` working.)
3. Tab through `/login` with the keyboard → every button and input shows a visible focus ring, in a sensible order.
4. Open "Why this rank?" → the three bars animate in over ~300ms.
5. Zoom the browser to 150% → nothing overlaps, nothing is cut off.
6. Check the amber OTP box still reads clearly and the "Prototype: shown on screen" label is **still visible**. Do not let polish hide an honesty label.
7. Run the full demo flow once more. Every click path unchanged.
8. `git diff` → no line containing `useState`, `useEffect`, `api.`, `await`, or any changed string literal. **Only `className` values changed.**

### Done when
Checks 2, 6 and 8 all pass. Check 8 is the important one.

### Common errors
- **A page breaks after the edit** → you changed JSX structure, not just classes. `git checkout -- <file>` and redo with classes only.
- **Numbers still jitter** → `tabular-nums` is on the container, not on the element holding the digits. It must be on the element itself.
- **Focus rings invisible** → another rule has `outline-none` without a replacement ring. Both classes must be present.
- **It now looks worse** → you added something not in the palette. Remove it. Restraint is the whole task.

### What you should be able to explain
We kept the interface deliberately plain: one neutral palette, flat bordered cards, no shadows and no brand colour, because the content is the point. Numbers use tabular figures so the live dashboard does not jitter as it polls, which is a small detail that makes a live demo look stable rather than broken. Every input has a label and every control has a visible focus ring, so the app is usable by keyboard and by a screen reader.

### Git commit
`style(web): consistent card, typography and accessibility pass`

### Log entry
```text
[T27][B] UI polish. Flat bordered cards (rounded-xl border-slate-200, shadows removed), uppercase tracking-wide section headings, tabular-nums on every figure so polling does not shift digits, consistent space-y-6 page / space-y-3 card rhythm, focus rings on all buttons and inputs, aria-labels on inputs and icon-only buttons, 300ms transition on the score bars. Palette limited to slate + green/amber/purple/red accents, no new packages, no logic touched. Honesty labels on the OTP box verified still visible. Full demo flow re-verified.
```

---
---

## ORDER AND TIMING

| Task | Owner | Do it | If short on time |
|---|---|---|---|
| T25 | A | **First.** It is a real bug and the fix is contained. | Never cut — a judge could find this. |
| T26 | B | Second. Test the full flow after it. | Cut if under 2 hours to freeze. Narrow layout demos fine. |
| T27 | C or B | Last. | Cut freely. It is cosmetic. |

After all three: **re-run the full verification of T18 and T19**, then `npm run demo:reset`, then go to T24 (freeze and rehearsal). Do not skip re-testing the flow — T26 touches every page.

### Goal
Stop building, verify the whole flow on the machine you will actually present from, and rehearse until the demo is boring.

### Part 1 — Freeze (10 min)
1. Every teammate commits and pushes. Nobody writes code after this point except to fix a bug found in rehearsal.
2. ```bash
   git checkout main && git pull
   git tag -a demo-freeze -m "SIH prototype frozen for presentation"
   git push origin demo-freeze

If anything breaks later: git checkout demo-freeze.
3. Announce in the group: feature freeze, bug fixes only.

Part 2 — Cold-start test (15 min)

On the presentation laptop, from a fresh terminal:

bash
cd worksphere
git pull
cd backend && npm install && npm run demo:reset && npm start
# new terminal
cd frontend && npm install && npm run dev

Everything must come up with no manual fixing. If it does not, that is your highest-priority bug.

Part 3 — Full flow verification (20 min)

Three windows: normal (household), incognito (worker), a second browser (admin). Walk the complete path and tick each:

 Household logs in with one tap
 Request submitted in Gujarati or Hindi, correctly classified
 Result card shows service, urgency, detected language, and which engine parsed it
 Matches list shows Suresh below Jignesh despite being nearer — the fairness moment
 "Why this rank?" opens the three weighted score bars
 Booking confirmed, split preview correct, start OTP shown
 Worker sees the job with no OTP visible — the security moment
 Worker accepts; household status flips within 5 seconds unaided
 Wrong OTP shows "4 attempts remaining"
 Correct start OTP → in progress; a different completion OTP appears for the household
 Completion OTP → settled split, three figures summing to the total
 Admin dashboard tracked every step live — the co-op moment
 Completed worker moved down the rotation queue
 npm run demo:reset restores everything in under 10 seconds
Part 4 — Failure drills (15 min)

Rehearse each until it is calm, not panicked:

LLM down: set LLM_ENABLED=false, restart the backend, run intake. Say aloud: "Our AI step has a deterministic fallback — this is it running." Restore afterwards.
Wifi down: switch off wifi, run the whole flow on localhost. Everything except voice input and the LLM must still work.
Backend crash: kill it mid-demo, restart with npm start, reload. Time yourself: under 20 seconds.
Total failure: have a screen recording of a full successful run saved locally as an MP4. Record it now, before you need it.
Part 5 — Rehearsal (30 min)

Run the script in docs/05_DEMO_AND_QA.md five times, timed. Target 2:30, hard ceiling 3:00. Rotate who speaks. Reset the database between every run.

Done when

Three consecutive clean runs under 3 minutes, and every failure drill rehearsed at least once.

Common errors
"It worked on my machine" → that is exactly what Part 2 catches. Do not skip it.
Someone pushes a "tiny fix" after the freeze → re-run Part 3 in full. No exceptions.
Demo runs long → cut explanation, never steps. The flow must complete.
What you should be able to explain

We froze the code and tagged it, so whatever happens we can return to a known-good build in one command. We rehearsed the demo on the actual presentation laptop from a clean clone, because "it works on my machine" is the most common way a demo fails. We also rehearsed the failure modes — AI offline, wifi offline, backend crashed — so a problem on stage is something we have already practised rather than something we discover in front of judges.

Git commit

chore: feature freeze for SIH presentation

Log entry
[T24][ALL] FEATURE FREEZE. Tag demo-freeze pushed. Cold-start from a fresh clone verified on the presentation laptop. Full 7-step flow verified across 3 browser windows. Failure drills rehearsed: LLM disabled, wifi off, backend restart, MP4 backup recording saved locally at <path>. Demo rehearsed 5x, best time <TIME>. NO FURTHER FEATURE WORK.

SCHEDULE — Saturday 19 to Sunday 20 September

Honest arithmetic: three people, one working day, beginners. Tasks will take 1.5–2× the 20-minute estimate the first few times. This schedule assumes that.

Block	Time	A (backend)	B (frontend)	C (data/LLM/docs)
0 · Setup	2h	T01, T02	wait for T01, then T05	accounts (Neon/Render/Vercel/Gemini), then T03
1 · Skeleton	2h	T04, T06	T07	help A test; start reading 05
2 · Core flow	3h	T08, T10, T12	T09, T11, T13	T19 with A
3 · Lifecycle	2.5h	T14, T17	T15, T16	rehearse the script, prep slides
4 · Dashboard	1.5h	support B	T18	T23 if time
— CORE COMPLETE —				
5 · Optional	1.5h	support	T20, T22	T21
6 · Freeze	1.5h	T24 — all three together		
7 · Sleep	≥5h	Non-negotiable. A rested presenter beats one more feature.		
8 · Morning	1h	wake Render, one full rehearsal, demo:reset, leave it running		

Hard rules

B must never idle. T05 and T07 need only T01 and the shared brief; B builds screens against the contract before the endpoints exist.
If block 2 is not done, cut everything below the cut line immediately and go straight to T24. A rehearsed T13 demo beats an unrehearsed T21 one.
Stop building 3 hours before you sleep. Bugs found at 3 a.m. get fixed badly.
One person owns the presentation laptop and it is the only machine the demo runs on.
WHEN STUCK — the playbook

Paste to the EXECUTOR when: a command failed, a file will not compile, an endpoint returns the wrong thing.

Paste exactly these four things, nothing else:

The command you ran and the folder you ran it in
The complete error text — not a screenshot, not a summary
The full current contents of the one file involved
What you expected instead

Come back to the PLANNER when:

Two tasks need the same file changed in conflicting ways
The shared brief is missing something a task needs
You are more than 45 minutes behind on a block and need to re-cut scope
A pinned version does not exist or will not install
You want to change the schema, an endpoint or a status value — never let an executor do this

Timebox rule: 15 minutes stuck on the same error → stop, post the four things above in the team chat, move to a different task. Do not let one bug eat an hour.

GIT WORKFLOW (beginner-safe)

Everyone works on main. With strict folder ownership, conflicts are rare.

Before you start any task:

bash
git pull

After you finish a task:

bash
git add .
git commit -m "<the message from the task>"
git pull --rebase
git push

If git pull --rebase reports a conflict, the file will be in someone else's folder — which means somebody broke the ownership rule. Do not resolve it alone:

bash
git rebase --abort

Then message the team. Never git push --force.

CONSISTENCY CHECK (verified before release)
Every endpoint used in T01–T24 exists in 01_SHARED_BRIEF.md §7 · ✔
Every table and column referenced exists in §3 · ✔
Every status value used appears in §2 · ✔
No circular prerequisites — verified against both dependency maps · ✔
Pinned versions are mutually compatible and all run on Node 20 · ✔
One brief amendment declared at the top of Part A: seed.sql → seed.js · ✔
Every task is demonstrable at its own stopping point from T05 onward · ✔