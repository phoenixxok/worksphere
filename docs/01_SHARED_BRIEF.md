# 01_SHARED_BRIEF.md
# WorkSphere — Single Source of Truth
# SIH26089 · Cooperative Gig Services Platform
# Paste this into EVERY executor chat, after 00_EXECUTOR_RULES.md.
# Nothing in this file may be renamed, invented, or "improved". See rule 2 of the executor rules.

---

## 0. CONVENTIONS

| Thing | Convention | Example |
|---|---|---|
| DB tables | plural, snake_case | `service_requests` |
| DB columns | snake_case | `worker_user_id` |
| JSON fields (request + response) | snake_case, identical to DB columns | `"scheduled_slot"` |
| URL paths | lowercase, kebab-case, plural nouns | `/api/bookings/:id/verify-start-otp` |
| JS variables/functions | camelCase | `computeMatchScore` |
| React components | PascalCase, one per file | `WorkerCard.jsx` |
| Timestamps | ISO 8601, UTC, always end in `Z` | `2026-09-19T14:30:00Z` |
| Money | INTEGER, whole Indian rupees. Never floats, never paise. | `500` means ₹500 |
| Coordinates | `NUMERIC(9,6)`, decimal degrees | `23.022505` |
| IDs | `SERIAL` integers, not UUIDs | `1`, `2`, `3` |

Base API URL: `/api`. Every path below is prefixed with `/api`.

---

## 1. ROLES

Exactly three. Stored in `users.role`.

- `household` — requests services
- `worker` — performs services
- `admin` — co-op staff, sees analytics and rotation queue

---

## 2. STATUS VALUES

No other values are permitted anywhere.

**`service_requests.status`**
- `new` — created, not yet parsed
- `parsed` — NLP extraction done
- `matched` — fair-matching list generated
- `booked` — a booking exists for it
- `cancelled`

**`bookings.status`**
- `pending` — household booked, worker has not accepted
- `accepted` — worker accepted, job not started
- `in_progress` — start OTP verified
- `completed` — completion OTP verified
- `cancelled`

**`payments.status`**
- `pending` — booking not completed yet
- `settled` — booking completed, split recorded

**`service_requests.urgency`**
- `low` · `normal` · `high` · `emergency`

**`service_requests.input_mode`**
- `text` · `voice`

**`service_requests.nlp_source`**
- `llm` — Gemini returned valid JSON
- `fallback` — keyword extractor used (LLM off, failed, or invalid JSON)

---

## 3. DATABASE SCHEMA (PostgreSQL)

This is the complete prototype schema. File: `backend/db/schema.sql`.

```sql
-- WorkSphere prototype schema. PostgreSQL 16.
-- Drop order matters (children first).
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS match_candidates CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS worker_skills CASCADE;
DROP TABLE IF EXISTS worker_profiles CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  full_name       TEXT        NOT NULL,
  phone           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT        NOT NULL,
  role            TEXT        NOT NULL
                  CHECK (role IN ('household','worker','admin')),
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  address_text    TEXT,
  language_pref   TEXT        NOT NULL DEFAULT 'en'
                  CHECK (language_pref IN ('en','hi','gu')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
CREATE TABLE skills (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,   -- machine value, used by the NLP engine
  name        TEXT NOT NULL           -- human label shown in the UI
);

-- ---------------------------------------------------------------
CREATE TABLE worker_profiles (
  user_id                    INTEGER PRIMARY KEY
                             REFERENCES users(id) ON DELETE CASCADE,
  is_available               BOOLEAN     NOT NULL DEFAULT TRUE,
  verified                   BOOLEAN     NOT NULL DEFAULT TRUE,
  rating_avg                 NUMERIC(3,2) NOT NULL DEFAULT 4.00
                             CHECK (rating_avg >= 0 AND rating_avg <= 5),
  jobs_completed_total       INTEGER     NOT NULL DEFAULT 0,
  jobs_completed_this_cycle  INTEGER     NOT NULL DEFAULT 0,
  last_assigned_at           TIMESTAMPTZ
);
-- jobs_completed_this_cycle drives anti-monopoly rotation. An admin resets it
-- to 0 for all workers at the start of each fairness cycle (weekly in production).

-- ---------------------------------------------------------------
CREATE TABLE worker_skills (
  worker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id       INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (worker_user_id, skill_id)
);

-- ---------------------------------------------------------------
CREATE TABLE service_requests (
  id                  SERIAL PRIMARY KEY,
  household_user_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text            TEXT        NOT NULL,
  input_mode          TEXT        NOT NULL DEFAULT 'text'
                      CHECK (input_mode IN ('text','voice')),
  detected_language   TEXT,                       -- 'en' | 'hi' | 'gu' | NULL
  skill_id            INTEGER     REFERENCES skills(id),
  issue_summary       TEXT,
  urgency             TEXT        CHECK (urgency IN ('low','normal','high','emergency')),
  nlp_source          TEXT        CHECK (nlp_source IN ('llm','fallback')),
  nlp_confidence      NUMERIC(3,2),               -- 0.00 to 1.00
  status              TEXT        NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new','parsed','matched','booked','cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Stores the fair-matching output so every ranking is auditable.
CREATE TABLE match_candidates (
  id                  SERIAL PRIMARY KEY,
  service_request_id  INTEGER     NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  worker_user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank_position       INTEGER     NOT NULL,
  distance_km         NUMERIC(6,2) NOT NULL,
  proximity_score     NUMERIC(4,3) NOT NULL,
  skill_score         NUMERIC(4,3) NOT NULL,
  rotation_score      NUMERIC(4,3) NOT NULL,
  total_score         NUMERIC(4,3) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_request_id, worker_user_id)
);

-- ---------------------------------------------------------------
CREATE TABLE bookings (
  id                       SERIAL PRIMARY KEY,
  service_request_id       INTEGER     NOT NULL UNIQUE
                           REFERENCES service_requests(id) ON DELETE CASCADE,
  household_user_id        INTEGER     NOT NULL REFERENCES users(id),
  worker_user_id           INTEGER     NOT NULL REFERENCES users(id),
  status                   TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','accepted','in_progress','completed','cancelled')),
  scheduled_slot           TEXT        NOT NULL,   -- free text, e.g. 'Today 4-6 PM'
  quoted_amount_inr        INTEGER     NOT NULL CHECK (quoted_amount_inr > 0),
  start_otp                TEXT,                   -- 6 digits, created with the booking
  completion_otp           TEXT,                   -- 6 digits, created when job starts
  start_otp_attempts       INTEGER     NOT NULL DEFAULT 0,
  completion_otp_attempts  INTEGER     NOT NULL DEFAULT 0,
  accepted_at              TIMESTAMPTZ,
  started_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  booking_id          INTEGER     NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  total_amount_inr    INTEGER     NOT NULL,
  worker_payout_inr   INTEGER     NOT NULL,
  coop_overhead_inr   INTEGER     NOT NULL,
  welfare_fund_inr    INTEGER     NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','settled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
CREATE INDEX idx_requests_household ON service_requests(household_user_id);
CREATE INDEX idx_bookings_worker    ON bookings(worker_user_id);
CREATE INDEX idx_bookings_household ON bookings(household_user_id);
CREATE INDEX idx_bookings_status    ON bookings(status);
CREATE INDEX idx_candidates_request ON match_candidates(service_request_id);
```

### Fixed skill rows

`skills.code` values are fixed. The NLP engine may only return one of these.

| code | name |
|---|---|
| `plumbing` | Plumbing |
| `electrical` | Electrical |
| `cleaning` | Cleaning |
| `carpentry` | Carpentry |
| `appliance_repair` | Appliance Repair |
| `painting` | Painting |

---

## 4. BUSINESS RULES (both backend and frontend depend on these)

### 4.1 Fair-matching score

Run when `GET /requests/:id/matches` is called. Results persisted to `match_candidates`.

**Eligibility filter** — a worker is eligible only if ALL are true:
- `users.role = 'worker'`
- `worker_profiles.verified = TRUE`
- `worker_profiles.is_available = TRUE`
- the worker has the requested `skill_id` in `worker_skills`
- `distance_km <= 15`

**Distance** — Haversine, earth radius 6371 km, between the household's and worker's `latitude`/`longitude`. Rounded to 2 decimals.

**Component scores** (each 0.000–1.000, rounded to 3 decimals):

proximity_score = max(0, 1 - (distance_km / 15))
skill_score = rating_avg / 5
rotation_score = 1 - (jobs_completed_this_cycle / cycle_max)
where cycle_max = the highest jobs_completed_this_cycle
among the eligible workers for THIS request, or 1 if that is 0.


**Total**

total_score = (0.45 * proximity_score)
+ (0.30 * skill_score)
+ (0.25 * rotation_score)


**Ordering** — `total_score` DESC. Tie-break 1: `last_assigned_at` ASC, NULLs first. Tie-break 2: `users.id` ASC.
`rank_position` starts at 1. Return the top 5.

`rotation_score` is the anti-monopoly term: a worker who has already taken many jobs this cycle scores lower, so work spreads across the co-op.

### 4.2 OTP rules

- 6 digits, zero-padded, random `100000`–`999999`, stored as TEXT.
- `start_otp` is generated when the booking is created.
- `completion_otp` is generated when the start OTP is successfully verified.
- Max **5** attempts per OTP. On the 6th attempt return `OTP_ATTEMPTS_EXCEEDED`.
- **Prototype only:** OTPs are returned in API responses and displayed on screen because there is no SMS gateway. This is deliberate and must be labelled in the demo.
- Only the assigned `worker_user_id` may call the verify endpoints.

### 4.3 Payment split

Fixed cooperative split, applied on completion:

worker_payout_inr = floor(total_amount_inr * 0.75)
coop_overhead_inr = floor(total_amount_inr * 0.15)
welfare_fund_inr = total_amount_inr - worker_payout_inr - coop_overhead_inr

The welfare fund absorbs the rounding remainder, so the three parts always sum exactly to `total_amount_inr`. `total_amount_inr` = the booking's `quoted_amount_inr`.

A `payments` row is created with status `pending` when the booking is created, and updated to `settled` when the completion OTP is verified.

### 4.4 Completion side effects

When the completion OTP is verified, in ONE database transaction:
1. `bookings.status` → `completed`, `completed_at` → now
2. `payments` row → amounts computed, `status` → `settled`
3. `worker_profiles.jobs_completed_total` +1
4. `worker_profiles.jobs_completed_this_cycle` +1
5. `worker_profiles.last_assigned_at` → now

---

## 5. AUTHENTICATION

- JWT, HS256, signed with `JWT_SECRET`, expiry `24h`.
- Header: `Authorization: Bearer <token>`
- Payload: `{ "user_id": 1, "role": "household", "iat": ..., "exp": ... }`
- Passwords hashed with bcrypt, 10 rounds.
- Auth column in the table below:
  - `none` — public
  - `any` — any logged-in user
  - `household` / `worker` / `admin` — that role only

---

## 6. STANDARD RESPONSE SHAPES

**Success** — the resource object, or `{ "items": [...] }` for lists. HTTP 200, or 201 on create.

**Error** — always this shape:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable sentence." } }
```

**Error codes** (the complete set):

| code | HTTP | when |
|---|---|---|
| `VALIDATION_ERROR` | 400 | missing or malformed field |
| `PHONE_ALREADY_REGISTERED` | 409 | register with an existing phone |
| `INVALID_CREDENTIALS` | 401 | bad phone/password |
| `UNAUTHENTICATED` | 401 | missing/expired/bad token |
| `FORBIDDEN_ROLE` | 403 | wrong role for this endpoint |
| `NOT_OWNER` | 403 | not your booking/request |
| `NOT_FOUND` | 404 | id does not exist |
| `INVALID_STATE` | 409 | action not allowed from current status |
| `NO_WORKERS_AVAILABLE` | 200 | matches list is empty (not an error response — returns `{"items": []}`) |
| `INVALID_OTP` | 400 | wrong OTP |
| `OTP_ATTEMPTS_EXCEEDED` | 429 | more than 5 attempts |
| `SERVER_ERROR` | 500 | anything unhandled |

---

## 7. API CONTRACT

### 7.1 Auth

**`POST /api/auth/register`** · auth `none`
```json
// request
{ "full_name": "Ramesh Patel", "phone": "9876500001", "password": "test1234",
  "role": "household", "latitude": 23.022505, "longitude": 72.571365,
  "address_text": "Navrangpura, Ahmedabad", "language_pref": "en" }
// 201
{ "token": "eyJ...", "user": { "id": 1, "full_name": "Ramesh Patel", "phone": "9876500001",
  "role": "household", "language_pref": "en" } }
```
Errors: `VALIDATION_ERROR`, `PHONE_ALREADY_REGISTERED`.
If `role` is `worker`, the backend also creates a `worker_profiles` row with defaults.

**`POST /api/auth/login`** · auth `none`
```json
// request
{ "phone": "9876500001", "password": "test1234" }
// 200 — same shape as register
{ "token": "eyJ...", "user": { "id": 1, "full_name": "Ramesh Patel", "phone": "9876500001",
  "role": "household", "language_pref": "en" } }
```
Errors: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`.

**`GET /api/auth/me`** · auth `any`
```json
// 200
{ "id": 1, "full_name": "Ramesh Patel", "phone": "9876500001", "role": "household",
  "latitude": 23.022505, "longitude": 72.571365,
  "address_text": "Navrangpura, Ahmedabad", "language_pref": "en" }
```

### 7.2 Skills

**`GET /api/skills`** · auth `none`
```json
// 200
{ "items": [ { "id": 1, "code": "plumbing", "name": "Plumbing" } ] }
```

### 7.3 Service requests

**`POST /api/requests`** · auth `household`
Creates the request AND runs the NLP extraction synchronously.
```json
// request
{ "raw_text": "मेरे बाथरूम का नल टपक रहा है, आज ही चाहिए", "input_mode": "voice" }
// 201
{ "id": 7, "household_user_id": 1,
  "raw_text": "मेरे बाथरूम का नल टपक रहा है, आज ही चाहिए",
  "input_mode": "voice", "detected_language": "hi",
  "skill_id": 1, "skill_code": "plumbing", "skill_name": "Plumbing",
  "issue_summary": "Leaking bathroom tap", "urgency": "high",
  "nlp_source": "llm", "nlp_confidence": 0.92,
  "status": "parsed", "created_at": "2026-09-19T14:30:00Z" }
```
Errors: `VALIDATION_ERROR` (empty `raw_text`), `FORBIDDEN_ROLE`.
`skill_code` and `skill_name` are joined in for convenience; they are not columns on `service_requests`.

**`GET /api/requests/:id`** · auth `any` (owner or admin) — same object as above.
Errors: `NOT_FOUND`, `NOT_OWNER`.

**`GET /api/requests/mine`** · auth `household`
```json
{ "items": [ /* request objects, newest first */ ] }
```

**`GET /api/requests/:id/matches`** · auth `household` (owner)
Runs fair-matching, wipes and rewrites `match_candidates` for this request, sets request status to `matched`.
```json
// 200
{ "service_request_id": 7,
  "items": [
    { "rank_position": 1, "worker_user_id": 12, "full_name": "Suresh Thakor",
      "phone": "9876500012", "rating_avg": 4.60, "jobs_completed_this_cycle": 1,
      "distance_km": 2.30, "proximity_score": 0.847, "skill_score": 0.920,
      "rotation_score": 0.750, "total_score": 0.845 }
  ] }
```
Empty list is a valid 200 response. Errors: `NOT_FOUND`, `NOT_OWNER`, `INVALID_STATE` (request already `booked`).

### 7.4 Bookings

**`POST /api/bookings`** · auth `household` (owner of the request)
Creates the booking, the `start_otp`, and a `pending` payments row. Sets request status to `booked`.
```json
// request
{ "service_request_id": 7, "worker_user_id": 12,
  "scheduled_slot": "Today 4-6 PM", "quoted_amount_inr": 500 }
// 201
{ "id": 3, "service_request_id": 7, "household_user_id": 1, "worker_user_id": 12,
  "worker_name": "Suresh Thakor", "status": "pending",
  "scheduled_slot": "Today 4-6 PM", "quoted_amount_inr": 500,
  "start_otp": "417392", "completion_otp": null,
  "created_at": "2026-09-19T14:35:00Z" }
```
`start_otp` is returned to the household only (prototype stand-in for SMS).
Errors: `VALIDATION_ERROR`, `NOT_FOUND`, `NOT_OWNER`, `INVALID_STATE` (request already booked).

**`GET /api/bookings/mine`** · auth `household` or `worker`
Returns bookings where the caller is the household **or** the worker, newest first.
```json
{ "items": [
  { "id": 3, "service_request_id": 7, "status": "pending",
    "scheduled_slot": "Today 4-6 PM", "quoted_amount_inr": 500,
    "household_user_id": 1, "household_name": "Ramesh Patel",
    "household_address_text": "Navrangpura, Ahmedabad",
    "worker_user_id": 12, "worker_name": "Suresh Thakor",
    "skill_name": "Plumbing", "issue_summary": "Leaking bathroom tap",
    "urgency": "high",
    "start_otp": "417392", "completion_otp": null,
    "created_at": "2026-09-19T14:35:00Z" } ] }
```
**OTP visibility rule:** for `role = household` the OTP fields are returned. For `role = worker` both OTP fields are returned as `null` — the worker must be told the code by the household. This is the whole point of the OTP.

**`GET /api/bookings/:id`** · auth `any` (household owner, assigned worker, or admin) — same object shape, same OTP visibility rule.

**`POST /api/bookings/:id/accept`** · auth `worker` (assigned)
Requires status `pending`. Sets status `accepted`, `accepted_at` now.
```json
// 200
{ "id": 3, "status": "accepted", "accepted_at": "2026-09-19T14:40:00Z" }
```
Errors: `NOT_FOUND`, `NOT_OWNER`, `INVALID_STATE`.

**`POST /api/bookings/:id/verify-start-otp`** · auth `worker` (assigned)
Requires status `accepted`.
```json
// request
{ "otp": "417392" }
// 200 — correct
{ "id": 3, "status": "in_progress", "started_at": "2026-09-19T16:02:00Z",
  "completion_otp_generated": true }
// 400 — wrong
{ "error": { "code": "INVALID_OTP",
  "message": "Incorrect OTP. 3 attempts remaining." } }
```
Increments `start_otp_attempts` on failure. Errors: `INVALID_OTP`, `OTP_ATTEMPTS_EXCEEDED`, `INVALID_STATE`, `NOT_OWNER`.
The new `completion_otp` is NOT returned here — the household fetches it from `GET /bookings/:id`.

**`POST /api/bookings/:id/verify-completion-otp`** · auth `worker` (assigned)
Requires status `in_progress`. Performs the §4.4 transaction.
```json
// request
{ "otp": "805114" }
// 200
{ "id": 3, "status": "completed", "completed_at": "2026-09-19T17:10:00Z",
  "payment": { "total_amount_inr": 500, "worker_payout_inr": 375,
               "coop_overhead_inr": 75, "welfare_fund_inr": 50, "status": "settled" } }
```
Errors: as above.

**`POST /api/bookings/:id/cancel`** · auth `household` (owner) or `worker` (assigned)
Allowed from `pending` or `accepted` only. Sets status `cancelled`, `cancelled_at` now, and the linked request back to `matched`.
```json
{ "id": 3, "status": "cancelled", "cancelled_at": "2026-09-19T15:00:00Z" }
```

### 7.5 Payments

**`GET /api/bookings/:id/payment`** · auth `any` (household owner, assigned worker, or admin)
```json
// 200
{ "booking_id": 3, "total_amount_inr": 500, "worker_payout_inr": 375,
  "coop_overhead_inr": 75, "welfare_fund_inr": 50, "status": "settled",
  "split_percentages": { "worker": 75, "coop_overhead": 15, "welfare_fund": 10 } }
```

### 7.6 Admin analytics

**`GET /api/admin/stats`** · auth `admin`
```json
// 200
{ "total_requests": 14, "total_bookings": 9,
  "bookings_by_status": { "pending": 1, "accepted": 2, "in_progress": 1,
                          "completed": 5, "cancelled": 0 },
  "total_gmv_inr": 4200, "total_worker_payout_inr": 3150,
  "total_coop_overhead_inr": 630, "total_welfare_fund_inr": 420,
  "active_workers": 12,
  "demand_by_skill": [ { "skill_code": "plumbing", "skill_name": "Plumbing", "request_count": 6 } ] }
```

**`GET /api/admin/rotation-queue`** · auth `admin`
Workers ordered by `jobs_completed_this_cycle` ASC, then `last_assigned_at` ASC NULLS FIRST — i.e. next in line for work first.
```json
{ "items": [ { "worker_user_id": 15, "full_name": "Kiran Solanki",
    "skills": ["cleaning"], "jobs_completed_this_cycle": 0,
    "jobs_completed_total": 3, "last_assigned_at": null,
    "is_available": true, "rating_avg": 4.20 } ] }
```

**`GET /api/admin/bookings`** · auth `admin`
All bookings, newest first, same object shape as `GET /bookings/mine` items, with both OTP fields returned as `null`.

**`GET /api/health`** · auth `none`
```json
{ "status": "ok", "db": "connected", "llm_enabled": true }
```

---

## 8. LLM NLP CONTRACT

Provider: Google Gemini, model `gemini-2.0-flash`, free tier. Called server-side only.

The model must return **only** this JSON object, no prose, no markdown fences:
```json
{ "skill_code": "plumbing",
  "issue_summary": "Leaking bathroom tap",
  "urgency": "high",
  "detected_language": "hi",
  "confidence": 0.92 }
```
- `skill_code` must be one of the six codes in §3. If the model returns anything else, treat the call as failed.
- `urgency` must be one of the four values in §2.
- `detected_language` must be `en`, `hi`, or `gu`.
- `confidence` is 0.00–1.00.
- `issue_summary` is always in **English**, max 60 characters, regardless of input language.

**Fallback** — used when `LLM_ENABLED=false`, the key is missing, the call errors, the call takes over 8 seconds, or the JSON fails the checks above. The fallback is a keyword matcher over English/Hindi/Gujarati terms. It sets `nlp_source = 'fallback'` and `nlp_confidence = 0.40`. If no keyword matches, `skill_code` defaults to `cleaning`, urgency to `normal`. **The demo must never depend on the LLM being up.**

---

## 9. ENVIRONMENT VARIABLES

`backend/.env` (never committed; mirror every name into `backend/.env.example`):

| name | example | notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Neon connection string |
| `JWT_SECRET` | `change_me_long_random_string` | any long random string |
| `PORT` | `4000` | backend port |
| `NODE_ENV` | `development` | `development` or `production` |
| `CORS_ORIGIN` | `http://localhost:5173` | frontend origin; comma-separated for multiple |
| `GEMINI_API_KEY` | `AIza...` | may be blank — fallback takes over |
| `LLM_ENABLED` | `true` | `false` forces the fallback extractor |

`frontend/.env`:

| name | example | notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | must include `/api`, no trailing slash |

Vite only exposes variables prefixed `VITE_`.

---

## 10. REPO LAYOUT AND FOLDER OWNERSHIP

worksphere/
├─ README.md
├─ .gitignore
├─ backend/ ← OWNER A only
│ ├─ db/
│ │ ├─ schema.sql
│ │ └─ seed.sql ← OWNER C writes, A applies
│ ├─ src/
│ │ ├─ index.js
│ │ ├─ db.js
│ │ ├─ middleware/auth.js
│ │ ├─ routes/ (auth.js, skills.js, requests.js, bookings.js, admin.js)
│ │ └─ services/ (matching.js, otp.js, payments.js, nlp.js)
│ ├─ .env.example
│ └─ package.json
├─ frontend/ ← OWNER B only
│ ├─ src/
│ │ ├─ lib/ ← NO JSX. api.js, auth.js, validation.js, formatters.js
│ │ ├─ components/
│ │ ├─ pages/
│ │ ├─ App.jsx
│ │ └─ main.jsx
│ ├─ .env.example
│ └─ package.json
└─ docs/ ← OWNER C only
├─ 04_PROJECT_LOG.md
└─ 05_DEMO_AND_QA.md


**Rule: never edit a folder you do not own.** If you need a change in someone else's folder, message them — do not edit it yourself. This is what prevents the "everything got tangled" failure.

`src/lib/` contains zero JSX and zero browser-only code on purpose: those files copy unchanged into the React Native app in the final product.

---

## 11. PINNED VERSIONS

| thing | version |
|---|---|
| Node.js | 20.x LTS |
| PostgreSQL | 16 (Neon) |
| express | 4.19.2 |
| pg | 8.12.0 |
| bcryptjs | 2.4.3 |
| jsonwebtoken | 9.0.2 |
| cors | 2.8.5 |
| dotenv | 16.4.5 |
| @google/generative-ai | 0.21.0 |
| vite | 5.4.8 |
| react | 18.3.1 |
| react-dom | 18.3.1 |
| react-router-dom | 6.26.2 |
| tailwindcss | 3.4.13 |
| postcss | 8.4.47 |
| autoprefixer | 10.4.20 |

Tailwind is pinned to **3.x deliberately**. Tailwind 4 changes the config format and will break the setup steps in the tasks.