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
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name='bookings' ORDER BY ordinal_position;
   → must FAIL with a check-constraint error. That proves the role constraint works. (If it succeeds, the schema is wrong.)
    