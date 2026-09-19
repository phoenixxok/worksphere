# 04_PROJECT_LOG.md
# WorkSphere — Project Log
# THE BACKUP BRAIN. If we switch AI tools, lose a chat, or start from nothing,
# this file plus 00_EXECUTOR_RULES.md and 01_SHARED_BRIEF.md is enough to continue.
# Owner: C keeps this file. Everyone appends their own entries.
# Last updated: <DATE, TIME> by <NAME>

---

## 1. PROJECT SUMMARY

**Name:** WorkSphere
**Event:** Smart India Hackathon 2026, problem statement **SIH26089** — Cooperative Gig Services Platform for Household & Community Services.
**Presentation:** Sunday, 20 September 2026.
**Team:** 3 people. A = backend + database (Yash). B = frontend. C = seed data, LLM, deployment, docs, demo.

**What it is in one paragraph.** A household describes a service need out loud or in writing, in English, Hindi or Gujarati. An AI step turns that free text into a structured request — service type, issue, urgency. A fair-matching engine ranks eligible workers by proximity, skill rating and an anti-monopoly rotation term, so work spreads across the cooperative instead of concentrating on a few top-rated workers. The household picks from the ranked list and confirms a slot. Two OTPs bracket the job: one proves the worker arrived, one proves the household accepted the work. On completion the payment is split transparently — 75% worker, 15% co-op overhead, 10% welfare fund — and the co-op's dashboard updates live demand and the rotation queue.

**What makes it a cooperative rather than a marketplace:** the rotation term in the matching score, the fixed and visible payment split, and the welfare fund.

---

## 2. DECISIONS AND REASONS

### 2.1 Prototype stack differs from the submitted slide — deliberately

The PPT was submitted before building and cannot be changed. The slide describes our **production architecture**. The prototype deliberately simplifies it to fit a 20-hour window. Every simplification is **additive** to reverse — nothing needs a rewrite except the view layer.

| Slide (production) | Prototype | Why | How we present it |
|---|---|---|---|
| React Native + Tailwind | React 18 + Vite, mobile-width responsive web | Emulator/build setup would have eaten the day | "The prototype is a mobile-responsive web client; production uses React Native so it installs on low-end phones." |
| Node/Express **and** Python/FastAPI | Node 20 + Express only | Two services = two deploys, two bug surfaces | "We consolidated to one Node service; FastAPI is reserved for the ML-heavy matching and forecasting service." |
| Socket.io | 5-second polling | Removes a live-demo failure mode | "Live updates are polled here; production pushes over Socket.io." |
| Docker | None | Zero pre-demo value | "Containerisation is in our deployment phase." |
| PostgreSQL | PostgreSQL (Neon free tier) | **No change** — same database | Nothing to disclaim. |
| JWT auth | JWT auth, HS256, bcrypt | **No change** — real auth | Nothing to disclaim. |
| Vercel / Render | Vercel / Render | **No change** | Nothing to disclaim. |
| LLM NLP API | Gemini `gemini-2.0-flash` free tier + keyword fallback | Free, and the fallback means the demo cannot break | "The AI step has a deterministic fallback; here it is running." |

**Migration cost back to the slide stack** (all detailed in `03_FINAL_PRODUCT_PLAN.md` Phase 0): FastAPI ~4–6h (add a service, API contract unchanged), Socket.io ~2–3h (swap polling hooks for socket hooks), Docker ~2h (wraps working code), React Native ~10–15h (views rewritten, `src/lib/` copies unchanged).

### 2.2 Why `src/lib/` has no JSX in it
`frontend/src/lib/` (`api.js`, `formatters.js`, `speech.js`, `demoAccounts.js`) is plain JavaScript with zero React and zero DOM. Those files copy **unchanged** into the React Native app. Only `components/` and `pages/` get rewritten. This one rule is what turns "rewrite the app" into "rewrite the views."

### 2.3 Fallback NLP built **before** the LLM
T08 shipped the keyword extractor; T19 added Gemini in front of it behind the same `extractServiceDetails()` interface. Rationale: the demo must never depend on a free-tier API being up. Any failure — disabled, missing key, timeout, malformed JSON, invalid value — silently drops to keywords and records `nlp_source: 'fallback'`.

### 2.4 OTPs shown on screen, not sent by SMS
No SMS gateway is free. The API returns OTPs **to the household only**; the worker receives `null` for both fields. The security property (the worker must obtain the code from the household in person) is fully preserved. The delivery channel is the only thing mocked, and it is labelled on screen.

### 2.5 Payments are a ledger, not money movement
No real gateway. `payments` rows record the exact three-way split. The split maths, the transaction guarantees and the dashboard totals are all real; only the money transfer is absent. **Never described as real payments.**

### 2.6 Rupees stored as INTEGER
Whole rupees, never floats, never paise. Floating-point money causes rounding drift. `floor()` on the worker and co-op shares; the welfare fund absorbs the remainder so the three parts always sum **exactly** to the total.

### 2.7 `cycle_max` computed per request
`rotation_score = 1 - (jobs_this_cycle / cycle_max)`, where `cycle_max` is the highest `jobs_completed_this_cycle` among **the workers eligible for this specific request**. Rotation is measured against the workers actually competing for this job, not against the whole co-op — otherwise a busy plumber would be penalised by an unrelated busy cleaner.

### 2.8 Neon cloud Postgres, not local Postgres
All three developers hit the same database. This directly fixes the "last time it only ran on my laptop" failure.

### 2.9 Rankings persisted to `match_candidates`
Every ranking is written to the database with its component scores. If a worker asks why they were not offered a job, we can show the exact numbers. Fairness that cannot be audited is just a claim.

### 2.10 Seed as `seed.js`, not `seed.sql`
**Amendment to `01_SHARED_BRIEF.md` §10.** Passwords must be bcrypt-hashed, which a plain `.sql` file cannot do safely. `seed.js` hashes at run time. This is the only deviation from the shared brief.

---

## 3. CURRENT ARCHITECTURE

┌─────────────────────────────┐
│ Browser (Chrome / Edge) │
│ React 18 + Vite + Tailwind │
│ phone-width responsive │
│ Web Speech API (voice) │ ← free, browser-native, no key
└──────────────┬──────────────┘
│ HTTPS/JSON, JWT in Authorization header
│ 5s polling on /household/bookings and /admin
┌──────────────▼──────────────┐ ┌────────────────────────┐
│ Node 20 + Express 4 │───────▶│ Google Gemini │
│ ├ routes/ auth, skills, │ │ gemini-2.0-flash │
│ │ requests, │◀───────│ free tier, 8s timeout │
│ │ bookings, admin │ └────────────────────────┘
│ ├ services/ nlp, matching, │ │ on ANY failure
│ │ otp, payments │ ▼
│ └ middleware/ auth (JWT) │ ┌────────────────────────┐
└──────────────┬──────────────┘ │ keyword fallback │
│ pg Pool, SSL │ en / hi / gu, always on│
┌──────────────▼──────────────┐ └────────────────────────┘
│ PostgreSQL 16 (Neon free) │
│ 8 tables │
└─────────────────────────────┘


**Request path, end to end:** browser → `fetch` in `src/lib/api.js` → Express route → `requireAuth` / `requireRole` → service module (nlp / matching / otp / payments) → `pg` query → Neon → JSON response → React state → screen.

**The 7-step flow mapped to code:**

| # | Step | Where it lives |
|---|---|---|
| 1 | Voice/text intake | `pages/HouseholdHome.jsx`, `lib/speech.js` → `POST /api/requests` |
| 2 | NLP extraction | `services/nlp.js` (Gemini → keyword fallback) |
| 3 | Fair matching | `services/matching.js` → `GET /api/requests/:id/matches` |
| 4 | Booking | `pages/BookingFormPage.jsx` → `POST /api/bookings` |
| 5 | Dual OTP | `services/otp.js` → `/verify-start-otp`, `/verify-completion-otp` |
| 6 | Transparent split | `services/payments.js` → settled in the completion transaction |
| 7 | Co-op analytics | `routes/admin.js` → `pages/AdminDashboard.jsx`, 5s polling |

**Fair-matching score (the thing judges will probe):**

eligible = worker AND verified AND available AND has the skill AND within 15 km

proximity_score = max(0, 1 - distance_km / 15)
skill_score = rating_avg / 5
rotation_score = 1 - (jobs_completed_this_cycle / cycle_max)

total = 0.45 × proximity + 0.30 × skill + 0.25 × rotation

Order: `total DESC`, then `last_assigned_at ASC NULLS FIRST`, then `user_id ASC`. Top 5.

---

## 4. REPO STRUCTURE

worksphere/
├─ README.md
├─ .gitignore # node_modules, .env, dist
├─ backend/ ← OWNER A
│ ├─ db/
│ │ ├─ schema.sql # 8 tables, = brief section 3
│ │ ├─ seed.js # 6 skills, 17 users, idempotent
│ │ └─ demo-reset.js # seed + 1 completed job [T23]
│ ├─ src/
│ │ ├─ index.js # express app, CORS, 404, error handler
│ │ ├─ db.js # pg Pool
│ │ ├─ middleware/auth.js # requireAuth, requireRole, signToken
│ │ ├─ routes/ # auth, skills, requests, bookings, admin
│ │ └─ services/ # nlp, matching, otp, payments
│ ├─ .env # NEVER COMMITTED
│ ├─ .env.example
│ └─ package.json
├─ frontend/ ← OWNER B
│ ├─ src/
│ │ ├─ lib/ # NO JSX — copies to React Native unchanged
│ │ │ ├─ api.js formatters.js speech.js demoAccounts.js
│ │ ├─ components/ # Button ErrorBox Badge ScoreBar WorkerCard
│ │ │ # OtpInput OtpDisplay SplitCard StatTile
│ │ │ # RequireRole AppHeader Spinner EmptyState
│ │ ├─ pages/ # LoginPage HouseholdHome MatchesPage
│ │ │ # BookingFormPage HouseholdBookings
│ │ │ # WorkerHome AdminDashboard HealthPage
│ │ ├─ App.jsx main.jsx index.css
│ │ └─ .env / .env.example
│ └─ package.json
└─ docs/ ← OWNER C
├─ 00_EXECUTOR_RULES.md
├─ 01_SHARED_BRIEF.md
├─ 02_PROTOTYPE_PLAN.md
├─ 03_FINAL_PRODUCT_PLAN.md
├─ 04_PROJECT_LOG.md ← this file
└─ 05_DEMO_AND_QA.md


**Never edit a folder you do not own.** Need a change elsewhere? Message the owner. This rule is the only thing preventing merge conflicts.

---

## 5. HOW TO RUN

### First time on a new machine
```bash
git clone https://github.com/<USERNAME>/worksphere.git
cd worksphere

cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY (ask A or C for the values)
npm run seed
npm start                   # http://localhost:4000

# second terminal
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

### Every day after that
```bash
cd backend  && npm start
cd frontend && npm run dev
```

### Reset to demo state
```bash
cd backend && npm run demo:reset
```

### Demo accounts — all passwords `test1234`
| Role | Phone | Name |
|---|---|---|
| Household | `9876500001` | Ramesh Patel |
| Household | `9876500002` | Meera Shah (Gujarati) |
| Household | `9876500003` | Anil Desai (Hindi) |
| Worker | `9876500012` | Jignesh Parmar — 0 jobs this cycle, **ranks 1st** |
| Worker | `9876500011` | Suresh Thakor — 4 jobs, nearest, **ranks 3rd** ← the fairness moment |
| Admin | `9876500000` | Coop Admin |

The login screen has one-tap buttons for these; no typing needed on stage.

### Health check
`http://localhost:4000/api/health` → `{"status":"ok","db":"connected","llm_enabled":true}`

### Demo setup
Three browser windows: **normal** = household, **incognito** = worker, **second browser or profile** = admin. Sessions live in localStorage, so one browser profile holds one login.

---

## 6. TASK STATUS

Legend: ⬜ to do · 🟡 in progress · ✅ done · ✂ cut

| ID | Owner | Title | Status | Commit | Notes |
|---|---|---|---|---|---|
| T01 | A | Repo skeleton and Git | ✅ | 6b4c49f | |
| T02 | A | Neon DB + schema | ✅ | 90e55bd | |
| T03 | C | Seed data | ✅ | 8cf5566 | |
| T04 | A | Express + health | ✅ | 1044b82 | |
| T05 | B | Vite/React/Tailwind skeleton | ✅ | bb4922e | **thin slice done here** |
| T06 | A | JWT auth | ⬜ | | |
| T07 | B | Login + role routing | ⬜ | | |
| T08 | A | Request intake + fallback NLP | ⬜ | | |
| T09 | B | Household intake screen | ⬜ | | |
| T10 | A | Fair-matching engine | ⬜ | | ⚠ highest value |
| T11 | B | Matches + score breakdown | ⬜ | | |
| T12 | A | Booking + start OTP | ⬜ | | |
| T13 | B | Booking form | ⬜ | | |
| T14 | A | Lifecycle + settlement | ⬜ | | ⚠ critical transaction |
| T15 | B | Worker screens | ⬜ | | |
| T16 | B | Household bookings | ⬜ | | |
| T17 | A | Admin endpoints | ⬜ | | |
| T18 | B | Admin dashboard | ⬜ | | **core complete here** |
| T19 | C+A | Gemini LLM | ⬜ | | |
| — | | **✂ CUT LINE** | | | below = optional |
| T20 | B | Voice input | ⬜ | | |
| T21 | C | Deploy | ⬜ | | |
| T22 | B | Resilience states | ⬜ | | |
| T23 | C | Demo reset script | ⬜ | | |
| T24 | ALL | Freeze + rehearsal | ⬜ | | **never cut** |

**Cut order if behind:** T22 → T23 → T21 → T20. Do not start a below-the-line task with under 90 minutes to the freeze.

---

## 7. LOG ENTRIES

Newest at the bottom. Append after every completed task — never edit an old entry.

[DATE TIME][TASK][OWNER] what changed · commit hash · anything that surprised you


---
<!-- APPEND BELOW THIS LINE -->

[2026-09-19 15:58][T01][A] Repo created and pushed. Folders: backend/, frontend/, docs/. .gitignore excludes node_modules and .env. Repo URL shared with B and C.

[2026-09-19 16:51][T02][A] Neon Postgres project 'worksphere' created. schema.sql applied, 8 tables live. backend/.env created locally (not committed), .env.example committed. LLM_ENABLED=false for now.

[T03][C] backend/db/seed.js created and run. 6 skills, 17 users (1 admin, 3 households, 13 workers), 16 worker_skills. All passwords 'test1234'. Seed is idempotent (safe to re-run) — use it to reset before demo rehearsals.

[2026-09-19 17:30][T04][A] Backend runs on :4000. src/index.js, src/db.js created. GET /api/health returns {"status":"ok","db":"connected"}. CORS driven by CORS_ORIGIN env var. Global 404 and 500 handlers use the standard error shape.

[2026-09-19 17:50][T05][B] Frontend runs on :5173. Vite 5.4.8 + React 18.3.1 + Tailwind 3.4.13 + react-router-dom 6.26.2. src/lib/api.js holds fetch wrapper, token storage and the standard error unwrapping. /health screen proves browser -> backend -> Neon end to end. THIN SLICE COMPLETE.

---

## 8. KNOWN ISSUES

| # | Issue | Impact | Workaround | Fix in |
|---|---|---|---|---|
| 1 | OTPs shown on screen, no SMS | Not production-safe | Labelled on screen and in the demo script | 03 Phase 3 |
| 2 | Payments are a ledger only | No money moves | Never described as real | 03 Phase 4 |
| 3 | Render free tier sleeps after ~15 min | First request takes 30–60s | Open the health URL 5 min before presenting | 03 Phase 6 |
| 4 | Gemini free tier is rate-limited | Intake may fall back mid-demo | Fallback is automatic and labelled | 03 Phase 2 |
| 5 | 5s polling, not push | Up to 5s of lag | Say it: production uses Socket.io | 03 Phase 5 |
| 6 | Web Speech needs internet + Chrome/Edge | No voice offline or in Firefox | Typed path always works; rehearse it | 03 Phase 2 |
| 7 | Web app, not React Native | Cannot install as an app | Stated plainly in the demo | 03 Phase 1 |
| 8 | No rating submission flow | `rating_avg` is seeded, never updated | Out of prototype scope | 03 Phase 1 |
| 9 | No fairness-cycle reset job | `jobs_completed_this_cycle` never resets | Manual SQL / `demo:reset` | 03 Phase 1 |
| 10 | Distance is straight-line, not road | Optimistic ETAs | Acknowledge it; production uses a maps API | 03 Phase 7 |
| 11 | No refresh tokens; 24h expiry | Re-login after a day | Fine for the demo | 03 Phase 3 |
| 12 | No rate limiting on auth | Brute-force possible | Not exposed publicly during judging | 03 Phase 3 |

*Add new issues here the moment you find one. An undocumented issue becomes a surprise on stage.*

---

## 9. OPEN QUESTIONS

| # | Question | Who decides | By when |
|---|---|---|---|
| 1 | How long is a fairness cycle — weekly, or N jobs? | Team, before Phase 1 | Post-SIH |
| 2 | Should the household be able to override the ranking and pick anyone? Today they choose from the top 5 only. | Team + co-op input | Post-SIH |
| 3 | Are the 45/30/25 weights right, or should the co-op tune them per city? | Needs real data | Post-SIH |
| 4 | Is 75/15/10 the right split? Currently hard-coded. | Co-op governance | Post-SIH |
| 5 | Who verifies workers, and against what documents? | Co-op policy | Post-SIH |
| 6 | Do we need Gujarati/Hindi UI text, not just input? | Team | Post-SIH |
| 7 | Payment rail — UPI collect, Razorpay Route, or co-op-managed payouts? | Needs compliance research | Phase 4 |

*If a judge asks something we have not decided, say so and add it here. "We haven't decided, here's the trade-off" is a better answer than a made-up one.*

---

## 10. GLOSSARY

**API** — the set of URLs the frontend calls to ask the backend for things.
**Backend** — the program that holds the rules and talks to the database. Ours is Node + Express.
**bcrypt** — the one-way scrambler for passwords. You can check a password against a hash but never reverse it.
**CORS** — a browser rule that blocks a website from calling a server unless that server names the site as allowed.
**Endpoint** — one specific URL plus method, e.g. `POST /api/bookings`.
**Express** — the Node library that routes incoming requests to our code.
**Fair matching** — our ranking of workers by proximity, rating and rotation.
**Fallback** — the simpler backup that runs when the preferred path fails. Ours is the keyword extractor behind the LLM.
**Frontend** — what the user sees in the browser. Ours is React.
**Haversine** — the formula for straight-line distance between two lat/long points on a sphere.
**JWT** — a signed token proving who you are, sent with every request. Tampering breaks the signature.
**LLM** — a large language model. Ours is Gemini, used to turn free text into structured fields.
**Middleware** — code that runs on every request before it reaches the endpoint. Ours checks the token.
**Migration** — a script that changes the database structure in a repeatable, version-controlled way.
**Neon** — the cloud host for our PostgreSQL database, free tier.
**NLP** — natural language processing: turning human sentences into machine fields.
**OTP** — a one-time six-digit code. We use two: one to start a job, one to complete it.
**Polling** — asking the server "anything new?" on a timer. We poll every 5 seconds.
**PostgreSQL** — our database.
**React** — the library for building the interface out of reusable components.
**Render** — the cloud host running our backend.
**Rotation score** — the anti-monopoly term: more jobs already taken this cycle means a lower score.
**Schema** — the database's structure: tables, columns, types, constraints.
**Socket.io** — a library for pushing updates to the browser instantly. In our production design, not the prototype.
**Tailwind** — a CSS library where you style by adding class names.
**Transaction** — a group of database changes that all succeed or all fail together. Our job-completion is one.
**Vercel** — the cloud host serving our frontend.
**Vite** — the tool that builds and serves the React app during development.
**Web Speech API** — speech-to-text built into Chrome and Edge. Free, no key.

---

## 11. SESSION STARTER TEMPLATE

Paste this into **any** executor AI — AntiGravity, Claude, ChatGPT, anything — at the start of every new chat. Replace the four bracketed blocks.

I am building WorkSphere with your help. You are the EXECUTOR.
Read all four sections below before doing anything. Then do ONLY the task in section 4.

═══════════════════════════════════════
SECTION 1 — YOUR RULES
═══════════════════════════════════════
[PASTE THE ENTIRE CONTENTS OF 00_EXECUTOR_RULES.md HERE]

═══════════════════════════════════════
SECTION 2 — THE SHARED BRIEF (the single source of truth)
═══════════════════════════════════════
[PASTE THE ENTIRE CONTENTS OF 01_SHARED_BRIEF.md HERE]

═══════════════════════════════════════
SECTION 3 — WHERE THE PROJECT IS NOW
═══════════════════════════════════════
[PASTE SECTIONS 3, 4, 6 AND 8 OF 04_PROJECT_LOG.md HERE
— current architecture, repo structure, task status, known issues]

═══════════════════════════════════════
SECTION 4 — YOUR TASK
═══════════════════════════════════════
[PASTE ONE COMPLETE TASK FROM 02_PROTOTYPE_PLAN.md OR 03_FINAL_PRODUCT_PLAN.md HERE]

═══════════════════════════════════════
Confirm in one line that you have read all four sections, then do the task.
Follow the output format in section 1 rule 7. Then stop.


**If the executor's context is too small for all of that**, trim in this order — never the other way round:
1. Drop section 3's repo structure (section 4 of the log)
2. Drop section 3's known issues (section 8)
3. Trim the shared brief to only the tables and endpoints this task touches — **and say so explicitly**: *"This is an extract of the brief. Do not invent anything not shown; ask me instead."*

**Never trim:** the executor rules, or the naming and status-value sections of the brief. Those are what stop the executor inventing names that break the other half of the app.

---

## 12. HOW TO UPDATE THIS LOG

**After every completed task**, the owner does four things:

1. **Section 6** — change the task's status to ✅ and paste the short commit hash (`git log -1 --format=%h`).
2. **Section 7** — append the log entry the task gave you, prefixed with the date and time. Never edit an earlier entry; append a correction instead.
3. **Section 8** — add any new issue you hit, even if you worked around it.
4. **Header** — update the "Last updated" line at the top.

Then commit the log with the code:
```bash
git add docs/04_PROJECT_LOG.md
git commit -m "docs: log T<NN>"
git push
```

**Also update this log when, outside a task:**
- You change a decision → add it to section 2 with the reason
- You answer an open question → move it from section 9 into section 2
- You cut a task → mark it ✂ in section 6 and say why
- You change any environment variable or credential → note it in section 5 (**names only, never values**)

**Rules**
- This log is **tool-agnostic on purpose**. Never write "as the AI said earlier" or reference a chat. A stranger with only these files must be able to continue.
- **Never put a secret in here.** Not the `DATABASE_URL`, not the Gemini key. Names only. Real values live in `.env` and in your team chat.
- If the log and the code disagree, **the code is right and the log is stale** — fix the log immediately.
- C owns this file, but **anyone who finishes a task appends their own entry**. Do not wait for C.