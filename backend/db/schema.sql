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
