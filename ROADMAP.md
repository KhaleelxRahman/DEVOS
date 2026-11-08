# DEVOS v1.0.0 — GSD Phased Execution Roadmap (`ROADMAP.md`)

## Phase 0: Recovery and Baseline (`COMPLETE`)
- Inspect Git repository, branch, `HEAD`, working tree, tags, reflogs, stashes, and checkpoint references (`refs/cline/checkpoints/*`, `refs/agents/*`).
- Verify offline backup bundle (`devos_full_repo_with_checkpoints.bundle`) and pre-GSD working tree patch (`working_tree_diff_pre_gsd.patch`).
- Verify all 8 protected files (`AboutPage.tsx`, `ContactPage.tsx`, `PrivacyPage.tsx`, `TermsPage.tsx`, `test-devos.js`, `test-devos-complete.js`, `phase11_complete.py`, `run_phase11.py`) are untouched.

## Phase 1: Repository and Architecture Audit (`COMPLETE`)
- Map every frontend screen and workspace panel to its API client method, FastAPI router, service layer, SQLAlchemy model, and authentication/authorization guard.
- Establish GSD execution tracking documents (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `TASKS.md`, `DECISIONS.md`, `VERIFICATION.md`).

## Phase 2: Critical Bugs and Security (`COMPLETE`)
- Fix Windows 8.3 short-path containment and root-deletion guard in `backend/app/services/file_service.py` (`os.path.realpath`).
- Fix fresh-checkout SQLite parent directory creation (`_ensure_sqlite_parent_dir`) and SQLite `WAL` / `busy_timeout` pragmas in `backend/app/db/session.py`.
- Fix `BuilderPanel.tsx` nested path stripping (`G3-FE`, `server/index.js`).
- Align `PyJWT==2.15.0` and `urllib3==2.8.0` in `backend/requirements.txt`.

## Phase 3: Priority Zero — Authentication & Login Performance (`IN PROGRESS`)
- Instrument and measure baseline timings for all 14 authentication stages (`boot -> /auth/me -> login submit -> POST /auth/login -> bcrypt verify -> JWT sign -> state update -> /app/dashboard navigation -> dashboard initial requests`).
- Offload CPU-bound `bcrypt` verification and password hashing (`verify_password`, `get_password_hash`) in `backend/app/services/auth_service.py` to worker threads via `asyncio.to_thread` so the FastAPI event loop is never blocked.
- Harden `frontend/src/context/AuthContext.tsx` and `frontend/src/api/client.ts`:
  - Deduplicate concurrent `/auth/me` requests (preventing React `StrictMode` double-fetch).
  - Cache user profile in `localStorage` (`devos_user`) for instant session restoration while background validation completes.
  - Preserve valid session tokens on transient network/5xx errors (`status === 0` or `status >= 500`), clearing tokens only on genuine `401`/`403` authentication failures.
  - Add configurable request timeout (`15s`) and cold-start retry (`1` retry on `502`/`503`/`504`/network error for idempotent/auth requests).
- Deduplicate post-login requests across `TopBar.tsx` and `DashboardPage.tsx` (`projectsApi.list`, `usersApi.getAiProvider`, `gitApi.getStatus`) so navigating to `/app/dashboard` fires each request once instead of 2–4 times.
- Harden `LoginPage.tsx` (`if (isLoading) return` double-submit guard, safe `?next=` internal redirect support, cold-start progress feedback).
- Re-measure all 14 stages after optimization and record exact before/after metrics in `DEVOS_LOGIN_PERFORMANCE_REPORT.md`.

## Phase 4: Backend API and Database (`COMPLETE`)
- Verify all 18 FastAPI routers, 13 SQLAlchemy models, 10 Alembic migrations, `PATCH /api/v1/users/me`, `GET /api/v1/users/ai-provider`, rate limiting, and cross-user isolation (`403 Forbidden`).

## Phase 5: Frontend and User Experience (`COMPLETE`)
- Verify all 22 page files (`18` mounted routes + `4` preserved legacy files) and `13` workspace panels, including `Edit Project` modal, visible `FileExplorer` row action triggers, `SettingsPage` profile/AI status, and global `Sign Out` controls.

## Phase 6: AI, Terminal, Builder, Git, and Repository Features (`COMPLETE`)
- Verify `AIPanel` (`assistant` default mode, `FileReader` attachments, live `runQaAudit`), `TerminalPanel` (`shellTokenize`, `help`/`clear`, sandbox policy), `BuilderPanel` (nested path open), `GitPanel` (branch sync, merge, verified commit), `RepositoryDashboard` (Phase 6 Repo Brain 4 live tabs), `HistoryPanel` & `QualityPanel` (Phase 3 Diagnostics + Phase 4 Repairs), and `AgentPanel` (Phase 9 run history).

## Phase 7: End-to-End Integration (`COMPLETE`)
- Execute 12-stage multi-phase backend API workflow verification (`verify_e2e_workflow.py`).

## Phase 8: Playwright Automation and Regression Testing (`IN PROGRESS`)
- Execute existing and expanded Playwright live E2E test suites (`qa/tests-live/a2-session-recovery.spec.ts`, `qa/tests-live/c2-autosave.spec.ts`, plus comprehensive login/auth + full-stack workflow + desktop/mobile viewport regression suite).

## Phase 9: Production Configuration and Reliability (`IN PROGRESS`)
- Verify production fail-fast guards (`ENVIRONMENT=production`, `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, `BACKEND_CORS_ORIGINS`, `AI_MODEL`), dependency security audit, and rollback procedures.

## Phase 10: Final Certification and Handover (`IN PROGRESS`)
- Deliver all 8 required final reports (`DEVOS_FINAL_MASTER_COMPLETION_REPORT.md`, `DEVOS_GSD_EXECUTION_LOG.md`, `DEVOS_LOGIN_PERFORMANCE_REPORT.md`, `DEVOS_PLAYWRIGHT_E2E_REPORT.md`, `DEVOS_SECURITY_AUDIT_REPORT.md`, `DEVOS_PRODUCTION_READINESS_REPORT.md`, `DEVOS_MODIFIED_FILES_LOG.md`, `DEVOS_KNOWN_LIMITATIONS.md`).
