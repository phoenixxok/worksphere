# brain.md — WorkSphere Quick Reference
# Read this before opening any other file.

---

## 1. What this project is

WorkSphere is a cooperative gig-services platform built for SIH 2026, problem statement SIH26089. A household describes a need in English, Hindi or Gujarati; an AI step classifies it; a fair-matching engine ranks verified workers by proximity, skill rating and anti-monopoly rotation; two OTPs bracket the job; and the payment splits 75 / 15 / 10 (worker / co-op overhead / welfare fund). **Deadline: Sunday 20 September 2026 presentation.** The prototype must demo all seven steps end-to-end with real auth, real Postgres, a real matching algorithm, and a live co-op dashboard — the full flow, no hand-waving.

---

## 2. File map

| File | What it is | Who reads it |
|---|---|---|
| `docs/brain.md` | This file — orientation for the whole team and the agent | Everyone, first |
| `docs/00_EXECUTOR_RULES.md` | Rules Antigravity must follow; paste at the top of every new chat | Antigravity |
| `docs/01_SHARED_BRIEF.md` | Schema, API contract, status values, env vars — single source of truth | Antigravity, A (integrator) |
| `docs/02_PROTOTYPE_PLAN.md` | Every build task T01–T24 with full code, commands and verification | Antigravity, task owner |
| `docs/03_FINAL_PRODUCT_PLAN.md` | Post-SIH phases 0–7; not needed for the presentation | Team after SIH |
| `docs/04_PROJECT_LOG.md` | Running log, architecture snapshot, session-starter template | Everyone |
| `docs/05_DEMO_AND_QA.md` | Timed demo script, honesty table, 32 judge Q&As, failure drills | Presenter, whole team |

---

## 3. The workflow loop for one task

1. Open `04_PROJECT_LOG.md` §6 → find the next `⬜` task that matches your owner tag.
2. Open a new Antigravity chat and paste the starter message from §10 of this file.
3. **Read the agent's 3-line plan before approving.** If it proposes renaming anything in `01_SHARED_BRIEF.md`, touching another owner's folder, or adding an unlisted package — stop and message the team.
4. Approve. Allow each file creation or command via the IDE pop-up.
5. Run every item in the task's **Verification checklist** yourself. Do not trust the agent's self-report.
6. Run `git diff` — confirm only the files listed in the task changed.
7. Commit using the exact message from the task.
8. Paste the task's log entry into `04_PROJECT_LOG.md` §7 and mark it `✅` in §6.
9. Tell the team: task ID, what changed, any surprises.

---

## 4. Roles

| Tag | Person | Tasks | Folder they may edit |
|---|---|---|---|
| A | Yash — backend + database | T01 T02 T04 T06 T08 T10 T12 T14 T17 | `backend/` only |
| B | Teammate — frontend | T05 T07 T09 T11 T13 T15 T16 T18 T20 T22 | `frontend/` only |
| C | Teammate — data / LLM / docs / deploy | T03 T19 T21 T23 | `backend/db/`, `docs/`, and only `backend/src/services/nlp.js` when the task names it |

**`01_SHARED_BRIEF.md` is owned by A.** Nobody else edits it. If B or C needs a schema or API change, they message A, who edits and notifies the team.

---

## 5. Order of work

```
HOUR 0–2  SKELETON — everyone together, do not split yet
  T01 A  repo + Git          T02 A  Neon schema
  T03 C  seed data           T04 A  Express + health endpoint
  T05 B  Vite/React skeleton
  ↳ THIN SLICE: browser → backend → Neon confirmed before anyone splits

HOUR 2–9  PARALLEL
  A: T06 → T08 → T10 → T12 → T14 → T17
  B: T07 → T09 → T11 → T13 → T15 → T16 → T18
  C: T19 (LLM, pairs with A after T08 is done)

INTEGRATION CHECKPOINTS
  After T05: health page shows "db: connected" in all three windows — required before splitting.
  After T18: full 7-step flow works end to end — CORE COMPLETE.

--- CUT LINE --- drop these if fewer than 90 min remain before the freeze
  T20 B  voice input         T21 C  deploy to Render + Vercel
  T22 B  resilience states   T23 C  demo reset script

T24 ALL  FEATURE FREEZE + REHEARSAL — never cut, never skipped
```

---

## 6. Rules that must never be broken

1. **`01_SHARED_BRIEF.md` is the single source of truth.** Every table name, column name, endpoint path, JSON field and status value comes from it. Never invent or rename any.
2. **One task at a time, one Antigravity chat per task.** Never start the next task in the same chat.
3. **No renaming anything from `01_SHARED_BRIEF.md`.** `service_requests` stays `service_requests` — not `requests`, not `serviceRequests`.
4. **No secrets in Git.** `.env` is in `.gitignore`. Only `.env.example` (empty values) is committed.
5. **`git pull` before each task, `git add . && git commit` before moving on.**
6. **Never edit another owner's folder.** Message the owner and wait.
7. **If the agent proposes something not in the task, say no.** Bring it to the planner for a design decision.

---

## 7. Repo layout

```
worksphere/
├─ backend/          A only — Node 20 + Express 4, Postgres via pg
│  ├─ db/            schema.sql · seed.js · demo-reset.js
│  └─ src/           index.js · db.js · middleware/ · routes/ · services/
├─ frontend/         B only — React 18 + Vite 5 + Tailwind 3
│  └─ src/
│     ├─ lib/        Plain JS only, NO JSX — copies unchanged into React Native
│     ├─ components/
│     └─ pages/
└─ docs/             C owns — all planning and log files live here
```

---

## 8. When something breaks

**Paste these four things to Antigravity — nothing else:**
1. Exact command and the folder you ran it in
2. Complete error text (not a screenshot, not a summary)
3. Full current contents of the one file involved
4. What you expected instead

**Stop and message the team (do not let the agent fix it) when:**
- The agent proposes changing any name in `01_SHARED_BRIEF.md`
- Two tasks need conflicting edits to the same file
- A pinned package version will not install
- You are more than 45 minutes over estimate on a block

**Drop the task and move on when:**
- Stuck on the same error for 15+ minutes after one fix attempt
- The task is below the cut line and T18 is not done
- The clock says the block is overdue per the schedule in `02_PROTOTYPE_PLAN.md` Part B

---

## 9. READ THIS FIRST — addressed to Antigravity

You are the EXECUTOR on WorkSphere. A planner has already made every design decision. Read these in order before doing anything:

1. `docs/00_EXECUTOR_RULES.md` — your operating rules. Follow every rule without exception.
2. `docs/01_SHARED_BRIEF.md` — the schema, API contract, status values, roles, env var names. Every identifier you write must come from this file.
3. The single task block pasted below — do only this task, nothing else.

**Before running any command or creating any file:**
Show a plan of exactly three lines: (a) which files you will create or modify, (b) the first command you will run, (c) what the expected output is. Then stop and wait for the human to say "go".

**Hard rules:**
- Do not rename any table, column, endpoint, JSON field, or status value from `01_SHARED_BRIEF.md`.
- Do not add any library not listed in the task.
- If the task contradicts `01_SHARED_BRIEF.md`, stop and say so — do not pick a "reasonable" default.
- After the task completes, output the five sections from rule 7 of `00_EXECUTOR_RULES.md` (CHANGED, HOW TO VERIFY, COMMIT, LOG ENTRY, EXPLAIN) and stop.

---

## 10. Starter messages

**Generic template — fill in the four bracketed blocks:**

```
SECTION 1 — RULES
[paste docs/00_EXECUTOR_RULES.md in full]

SECTION 2 — SHARED BRIEF
[paste docs/01_SHARED_BRIEF.md in full]

SECTION 3 — PROJECT STATE
[paste sections 3, 4, 6 and 8 of docs/04_PROJECT_LOG.md]

SECTION 4 — YOUR TASK
[paste the single task block from docs/02_PROTOTYPE_PLAN.md]

Confirm in one line that you have read all four sections, then show your 3-line plan and wait for approval.
```

**Owner A (backend) — replace T__ with the next A task:**

```
[SECTION 1: 00_EXECUTOR_RULES.md]
[SECTION 2: 01_SHARED_BRIEF.md]
[SECTION 3: log sections 3, 4, 6, 8]
[SECTION 4: T__ from 02_PROTOTYPE_PLAN.md]
You are building the backend. You may only create or edit files under backend/. Confirm, show your 3-line plan, wait.
```

**Owner B (frontend) — replace T__ with the next B task:**

```
[SECTION 1: 00_EXECUTOR_RULES.md]
[SECTION 2: 01_SHARED_BRIEF.md]
[SECTION 3: log sections 3, 4, 6, 8]
[SECTION 4: T__ from 02_PROTOTYPE_PLAN.md]
You are building the frontend. You may only create or edit files under frontend/. src/lib/ must contain no JSX. Confirm, show your 3-line plan, wait.
```

**Owner C (data / LLM / docs) — replace T__ with the next C task:**

```
[SECTION 1: 00_EXECUTOR_RULES.md]
[SECTION 2: 01_SHARED_BRIEF.md]
[SECTION 3: log sections 3, 4, 6, 8]
[SECTION 4: T__ from 02_PROTOTYPE_PLAN.md]
You are working on seed data, the LLM service, or deployment. You may only edit backend/db/, docs/, or backend/src/services/nlp.js if the task names it. Confirm, show your 3-line plan, wait.
```

---

## 11. First-hour checklist

- [ ] Everyone clones the repo: `git clone <url>` (URL from A after T01)
- [ ] A creates the Neon project, applies `schema.sql`, shares `DATABASE_URL` over group chat (never in Git)
- [ ] C copies `backend/.env.example` → `.env`, fills in `DATABASE_URL`, runs `node db/seed.js` → sees `users: '17'`
- [ ] A runs `cd backend && npm install && npm start` → terminal shows `listening on http://localhost:4000`
- [ ] B runs `cd frontend && npm install && npm run dev` → browser at `localhost:5173` shows health page
- [ ] **All three confirm** the health page reads "API: ok · Database: connected · LLM enabled: false" before splitting
- [ ] A starts T06, B starts T07, C reads `05_DEMO_AND_QA.md` and rehearses the demo accounts
- [ ] Update `04_PROJECT_LOG.md` §6: mark T01–T05 `✅` with their commit hashes