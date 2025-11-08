# Project TODO Roadmap

This document organizes the identified issues and feature gaps into actionable phases. Each phase builds foundational correctness and integrity before layering on richer UX and scalability. Tasks use checkboxes; feel free to convert partially done items to `[~]` for in‑progress. Where relevant, affected files or directories are referenced. Phases are ordered to reduce rework and risk.

Legend:
- [ ] Not started
- [x] Done
- [!] Needs decision/clarification

Note: Decided items reference the authoritative section in `README.md` (see Product & UX Decisions).

---

## Phase 0: Core Constraints & Architecture Decisions
Focus: Prevent invalid states early; define policies before implementation.

- [x] Concurrency policy: multiple concurrent hackathons; selection via homepage (Decided; see README)
- [ ] Timezone strategy
  - Decide: store UTC ISO, display localized with explicit TZ label; validate inputs.
- [ ] Validation library choice (custom, zod, joi, yup) for server input sanitization.
- [x] Rubric customization data model: separate table with weights (Decided; see README)
- [ ] Archival & retention policy for concluded hackathons and judge codes.

Dependencies: Decisions here unblock Phase 1/2 schema and validation changes.

---

## Phase 1: Data Integrity & Validation ✅ COMPLETED
Focus: Prevent impossible or ambiguous data.

### Hackathon Time Validation (`server/routes/hackathons.js`, `server/db/schema.sql`)
- [x] Enforce `start_time < end_time` (server + client) - ✅ DONE: Lines 16-54
- [x] Enforce `vote_expiration > end_time` - ✅ DONE: Lines 16-54
- [x] Allow backfill: start/end/vote times may be in past if ordering valid (Decided; see README)
- [x] Multi-active support via homepage selection list (Decided; see README)
- [x] N/A (multi-active chosen): non-overlap constraint skipped

### Voting Expiration Validation (`server/routes/voting.js`)
- [x] Reject votes after `vote_expiration` - ✅ DONE: Lines 42-51, 155-164
- [x] Reject setting `vote_expiration` in past - ✅ DONE: Validated in hackathon create/update

### Email & Team Integrity (`server/routes/projects.js`)
- [x] Normalize emails to lowercase on insert (Decided; see README)
- [x] Enforce domain `newpaltz.edu` incl. subdomains (Decided; see README)
- [x] Prevent duplicate team member emails per project - ✅ DONE: Lines 15-58
- [x] Add unique compound constraint (`project_id`, `email`) - ✅ DONE: Validation function

### Length & Rate Limits
- [x] Define max lengths: hackathon description, project description - ✅ DONE: Lines 12-14
  - Hackathon name: 200 chars, description: 5000 chars
  - Project name: 200 chars, description: 10000 chars, GitHub link: 500 chars
- [x] Enforce on server & client UI character counters - ✅ DONE: Server validation complete
- [x] Rate limiting: none for now (Decided; see README) – document rationale

Acceptance: All invalid payloads return structured JSON `{ error: code, message }`; client renders friendly messages (Phase 5 ties in for UX).

---

## Phase 2: Hackathon Lifecycle & Concurrency ✅ BACKEND COMPLETED
Focus: Managing multiple hackathons and their states.

- [x] Implement `status` derivation utility (existing `hackathon-status.js`) to handle: upcoming, active (submission), judging, voting, concluded, archived, review-period. ✅
- [x] Add optional review window before public results (`review_ends_at` column) (Configurable; see README) ✅
- [x] Homepage lists active hackathons (Decided; see README) ✅
- [x] N/A (single-active constraint) – multi-active chosen ✅
- [x] API endpoint to list active + upcoming with minimal fields for navigation ✅ `GET /hackathons/active`
- [x] Archival process (mark old hackathons archived, hide from default queries) ✅ `POST /hackathons/:id/archive`

**Backend Acceptance: ✅** Status calculation supports 7 states; archive endpoint implemented; active hackathons endpoint implemented; review period controls results visibility.

**See:** [PHASE_2A_3ABC_COMPLETE.md](PHASE_2A_3ABC_COMPLETE.md) for detailed implementation.

---

## Phase 3: Project & Team Management Enhancements ✅ BACKEND COMPLETED
Focus: CRUD completeness and visibility control.

- [x] Add ability to add team member post-creation ✅ `POST /:hackathonId/projects/:projectId/team-members`
- [x] Add ability to remove team member (with confirmation dialog) ✅ `DELETE /:hackathonId/projects/:projectId/team-members/:email` (backend done, dialog is frontend)
- [x] N/A: Notifications disabled (Decided; see README) ✅
- [x] ~~Project visibility status: draft vs. published~~ ✅ **REMOVED - All projects now visible immediately**
- [ ] Limit listing to "My Projects" for authenticated users - FRONTEND TODO
- [x] Mask teammate emails for unauthenticated / non-team users (partial obfuscation) ✅ Email masking utility implemented
- [x] Remove 15-minute restriction for comment edit/delete (unlimited) (Decided; see README) ✅
- [ ] Comment edit history / audit (optional stretch) - TODO

**Backend Acceptance: ✅** All projects visible to all users; teammates/admins see full emails; others see masked emails; team member add/remove endpoints implemented with validation.

**See:** [PHASE_2A_3ABC_COMPLETE.md](PHASE_2A_3ABC_COMPLETE.md) for detailed implementation.

---

## Phase 4: Voting & Judging System Overhaul ✅ BACKEND COMPLETED
Focus: Robust rubric, clearer flows, reversible actions.

### Rubric & Categories - ✅ BACKEND DONE
- [x] Add dynamic categories model (`hackathon_judge_categories` table) - ✅ DONE: `server/db/schema.sql` Lines 116-127
  - Default rows: Innovation/Creativity, Functionality, Design/Polish, Presentation/Demo
  - Auto-created on new hackathon: `server/db/index.js` Lines 210-226
- [ ] Admin UI to add/remove/reorder categories - ⏳ FRONTEND TODO
- [x] Persist per-category scores and comments - ✅ DONE: `judge_category_votes` table Lines 130-144
- [ ] Judge Voting UI grid reflecting rubric (layout per provided table) - ⏳ FRONTEND TODO
- [x] Per-category multiplier (weight) default 1.0, editable - ✅ DONE: Database + API endpoints
- [x] Criteria and descriptions editable by admin - ✅ DONE: API endpoints in `server/routes/admin.js` Lines 48-126
  - GET `/admin/hackathons/:id/categories` - List categories
  - POST `/admin/hackathons/:id/categories` - Create category
  - PUT `/admin/categories/:id` - Update category
  - DELETE `/admin/categories/:id` - Delete category
  - POST `/admin/hackathons/:id/categories/reorder` - Reorder categories

**Table Format (for frontend reference):**
| Criteria                    | Description                                                                                | Score (1–10) | Judge Comments |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------ | -------------- |
| **Innovation / Creativity** | Is the idea original or a novel approach to an existing problem?                           | _____/10     |                |
| **Functionality**           | Does the application work as intended? Are features implemented well and reliably?         | _____/10     |                |
| **Design / Polish**         | Is the user experience smooth? Is it accessible? Is the UI easy to use? Does it look good? | _____/10     |                |
| **Presentation / Demo**     | Was the team able to clearly communicate their idea, goals, and implementation?            | _____/10     |                |

### Judge Experience - ✅ BACKEND DONE
- [ ] Ability to edit judge names after creation (admin UI + server route) - ⏳ TODO
- [ ] Indicator of remaining unscored projects - ⏳ FRONTEND TODO
- [ ] Prevent submission until all required categories scored - ⏳ FRONTEND TODO
- [ ] Clear messaging if judging not yet open - ⏳ FRONTEND TODO
- [x] Fixed score range 1–10 - ✅ DONE: Database CHECK constraint + validation
- [x] Saved project highlight (green outline + checkbox) (Decided; see README)
- [x] Progress counter (x/y) above list (Decided; see README)
- [x] Editable until judging closes - ✅ DONE: Upsert support in `addJudgeCategoryVote`

### Popular Vote
- [ ] Thumbs-up toggle (Decided; see README) - ⏳ FRONTEND TODO
- [x] One vote per user (no self-vote) uniqueness userId+projectId (Decided; see README)
- [x] Popular vote visible on home next to project; live 5s polling (Decided; see README)
- [x] Snapshot stored at vote close and displayed (Decided; see README)
- [x] Admin "Audit Votes" page from project view (Decided; see README)
- [x] Separate result views: sort by judges aggregate vs. popularity - ✅ DONE: Weighted scoring in results
- [ ] Ability to change (delete/replace) a popular vote before expiration `[!]` clarify if allowed post initial cast

### Validation & Integrity - ✅ COMPLETED
- [x] Server-side idempotency for judge score submissions - ✅ DONE: UNIQUE constraint + ON CONFLICT
- [x] Transactional insert/update for rubric scores - ✅ DONE: `db.transaction()` in voting endpoint
- [x] Prevent duplicate scoring entries - ✅ DONE: UNIQUE(judge_code_id, project_id, category_id)
- [x] Enforce numeric range validation (1–10) - ✅ DONE: CHECK constraint + server validation Lines 186-188

**Backend Acceptance:** ✅ Distinct endpoints for judge scores vs. popular votes; database stores per-category breakdown with weights; weighted results calculation complete.

---

## Phase 5: UX Feedback, Navigation & Indicators
Focus: Reduce confusion; add clarity and responsiveness.

- [ ] Global countdown timers (header) for current phase deadlines
- [ ] Visual indicator for projects already voted on (popular + judge) per user
- [ ] Loading spinners / skeletons on async routes (projects list, hackathon load, vote submission)
- [ ] Toast notification system replacing alert() (success, error, info)
- [ ] Confirmation dialogs for destructive actions (delete project, remove member, reset scores)
- [ ] Help tooltips / inline docs for scoring criteria & voting rules
- [ ] Markdown preview for project descriptions (comments plain text, no markdown) (Decided; see README)
- [ ] Navigation entry: "My Projects"
- [ ] Judge dashboard: progress bar (# scored / total)

Acceptance: No raw alert() calls remain; consistent design tokens; user can instantly tell status & progress.

---

## Phase 6: Security, Permissions & Auditability
Focus: Access control, privacy, audit visibility.

- [ ] Enforce auth (SSO) for viewing full emails; partial obfuscation otherwise
- [ ] Secure file downloads (signed URLs or gated route with permission check) instead of direct static access
- [ ] Audit log UI page with pagination & filters (action type, user, date range)
- [ ] Persist judge codes expiration & cleanup job
- [ ] N/A: Rate limiting middleware (none; Decided; see README)
- [ ] CSRF protection (pending auth method) `[!]`
- [ ] Harden file upload: virus scan placeholder / MIME / size validation

Acceptance: Direct file URL without auth returns 403; audit page loads < 1s with pagination; logs filterable.

---

## Phase 7: File & Transaction Safety
Focus: Avoid data loss and race confusion.

- [ ] Upload workflow: store new file first, then delete old only after success
- [ ] Temporary file cleanup cron (stale > 24h)
- [ ] Wrap multi-step score submissions in transaction (atomicity)
- [ ] Debounce / disable vote buttons until server response
- [ ] Idempotency keys for voting endpoints (optional stretch)
- [ ] Use PRG (Post/Redirect/Get) pattern on form-like actions to avoid resubmits via refresh/back

Acceptance: Failed upload retains previous file; double-click vote creates only one record.

---

## Phase 8: Performance, Scalability & Maintenance
Focus: Prepare for growth.

- [ ] Indexes: emails, foreign keys, hackathon status/time columns
- [ ] Pagination on project lists & comments
- [ ] Caching layer for public project list (in-memory TTL) `[!]` evaluate need
- [ ] Archival job moves concluded hackathons to archive table or flag
- [ ] Automated cleanup of expired judge codes (scheduled interval)

Acceptance: List endpoints respond < 300ms (local) with > 500 projects simulated; documented indexes.

---

## Phase 9: Mobile & Responsive Enhancements
Focus: Usability on small screens.

- [ ] Responsive judge voting layout (stacked categories); prioritize project list (Decided; see README)
- [ ] Breakpoint tests for project cards & countdown header
- [ ] Touch target sizing & accessible contrast (min width target 375px) (Decided; see README)

Acceptance: Core flows usable at 375px width; Lighthouse accessibility score >= 90.

---

## Phase 10: Documentation & Developer Experience
Focus: Clarity for contributors and users.

- [ ] Add `docs/` folder: architecture, data model (ERD), lifecycle state machine
- [ ] Update `README.md` with rubric customization instructions
- [ ] CONTRIBUTING guide (coding standards, commit conventions)
- [ ] API error code reference

Acceptance: New contributor can set up and understand lifecycle in <30 minutes.

---

## Phase 11: Stretch & Nice-to-Have

- [ ] N/A: Real-time push (WebSocket/SSE) not needed; polling adequate (Decided; see README)
- [ ] Export results (CSV / JSON) for admins
- [ ] Analytics dashboard (participation stats)

---

## Cross-Cutting Quality Tasks

- [ ] Add unit tests for validation utilities
- [ ] Integration tests: creating hackathon, voting flows, judge rubric submission
- [ ] Lint & format enforcement (ESLint/Prettier config present? verify)
- [ ] Accessibility audit (ARIA labels, keyboard navigation)
- [ ] Error boundary / global error handler on client

---

## Open Questions / Decisions Needed

| Topic | Question | Impact |
|-------|----------|--------|
| Multi vs Single Active Hackathon | Enforce single active? | Schema constraint vs UI complexity |
| Review Period | How long between conclusion and public results? Config? | Adds `review_ends_at` |
| Rate Limiting | Library vs custom simple store | Security & abuse prevention |
| Notifications | Email, in-app, both? | Infra complexity |
| Auth Method | SSO details for gating email/file visibility | Middleware design |
| Draft Projects Autosave | Needed MVP? | Additional UI complexity |

---

## Suggested Implementation Order (Condensed)
1. Phase 0–1 decisions + validation scaffolding
2. Lifecycle & concurrency (Phase 2)
3. Project/team CRUD (Phase 3)
4. Voting/judging overhaul (Phase 4)
5. UX indicators & feedback (Phase 5)
6. Security & file hardening (Phase 6–7)
7. Performance & maintenance (Phase 8)
8. Mobile & docs (Phase 9–10)
9. Stretch features (Phase 11)

---

## Tracking Notes
Move completed items to bottom or convert to `[x]` to keep momentum visible. Use commit messages prefixed with phase: e.g. `phase4: add rubric categories table`.

---

Let this file evolve; prune tasks once delivered or superseded.
