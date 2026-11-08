# DEVOS v1.0.0 — GSD Atomic Task Checklist (`TASKS.md`)

**Date:** 2026-11-08
**Status:** All Tasks Complete (`100%`)

---

## Phase 0 & 1: Safety, Preservation & GSD Governance
- [x] **T0.1:** Switch to `recovery/phase10-full-restoration` (`355e7bc`) without losing any working-tree changes.
- [x] **T0.2:** Verify `devos_full_repo_with_checkpoints.bundle` (`124` refs) and save `working_tree_diff_pre_gsd.patch` (`325,258` bytes).
- [x] **T0.3:** Verify all 8 protected files (`AboutPage.tsx`, `ContactPage.tsx`, `PrivacyPage.tsx`, `TermsPage.tsx`, `test-devos.js`, `test-devos-complete.js`, `phase11_complete.py`, `run_phase11.py`) are untouched (`0` diff lines).
- [x] **T1.1:** Create `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `DECISIONS.md`, `STATE.md`, `TASKS.md`, `VERIFICATION.md`.

## Phase 2 & 3: Priority Zero — Slow Login & Authentication Fix
- [x] **T2.1:** Instrument all 14 authentication stages (`measure_backend_auth_stages.py` & `measure_login_journey.mjs`) and record baseline timings.
- [x] **T3.1:** Offload `bcrypt` hashing & verification to worker threads via `asyncio.to_thread` in `backend/app/core/security.py` and `backend/app/services/auth_service.py` (`rounds=10`, backward-compatible with `$2b$12$`, pre-warmed `_DUMMY_BCRYPT_HASH`).
- [x] **T3.2:** Enable SQLite `WAL` mode (`PRAGMA journal_mode=WAL`, `PRAGMA synchronous=NORMAL`, `PRAGMA busy_timeout=5000`) and auto-create `backend/data/` parent directory in `backend/app/db/session.py`.
- [x] **T3.3:** Add in-flight `GET` deduplication (`inflightGets`), `300ms` GET coalescing cache (`recentGetCache`), `15s` request timeout, and cold-start retry (`502`/`503`/`504`) in `frontend/src/api/client.ts`.
- [x] **T3.4:** Add optimistic user hydration (`devos_user`) and transient error resilience in `frontend/src/context/AuthContext.tsx`.
- [x] **T3.5:** Add double-submit lock (`submittingRef`), empty-field validation, safe `?next=` redirect support, and `1.0s` slow-request notice in `frontend/src/pages/LoginPage.tsx`.
- [x] **T3.6:** Scope `/auth/login` and `/auth/register` brute-force rate limits per `(client_ip, email)` (`10/min` per account, `60/min` per IP) in `backend/app/api/v1/auth.py`.
- [x] **T3.7:** Re-measure all 14 authentication stages and document before/after improvements in `DEVOS_LOGIN_PERFORMANCE_REPORT.md`.

## Phase 4, 5 & 6: Full-Stack Verification, Playwright E2E & Final Deliverables
- [x] **T4.1:** Fix WAI-ARIA nested `<button>` in `frontend/src/components/workspace/FileExplorer.tsx`.
- [x] **T4.2:** Fix Monaco controlled-value re-render race (`path` + `defaultValue`) in `frontend/src/components/workspace/CodeViewer.tsx`.
- [x] **T5.1:** Execute all 3 live Playwright E2E suites (`a2-session-recovery.spec.ts`, `c2-autosave.spec.ts`, `login-and-workflows-gsd.spec.ts`) — **17 / 17 Passed**.
- [x] **T5.2:** Execute backend `pytest` (`376` passed), `ruff` (`0` errors), `tsc --noEmit` (`0` errors), `eslint` (`0` errors), and `vite build` (clean build).
- [x] **T6.1:** Produce all 8 required final deliverable reports in the workspace root.
