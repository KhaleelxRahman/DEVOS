# DEVOS v1.0.0 — Measurable Requirements Specification (`REQUIREMENTS.md`)

## R-00: Safety, Backup & File Preservation
- **R-00.1:** Full Git repository bundle (`devos_full_repo_with_checkpoints.bundle`) and pre-GSD working tree patch (`working_tree_diff_pre_gsd.patch`) must be verified restorable.
- **R-00.2:** All 8 protected files (`frontend/src/pages/{About,Contact,Privacy,Terms}Page.tsx`, `test-devos.js`, `test-devos-complete.js`, `phase11_complete.py`, `run_phase11.py`) must remain untouched in their original locations.

## R-01: Priority Zero — Authentication & Login Performance
- **R-01.1 (Non-Blocking Password Hashing):** Backend `AuthService.login` and `AuthService.register` must offload CPU-bound `bcrypt` verification/hashing (`verify_password`, `get_password_hash`) off the main `asyncio` event loop via `asyncio.to_thread` so concurrent API requests are never blocked during authentication.
- **R-01.2 (Zero Duplicate Auth / Bootstrap Calls):** `AuthContext` must deduplicate concurrent `/auth/me` bootstrap requests (including under React `StrictMode`), cache user metadata for instant session restoration, and preserve valid tokens on transient network/5xx errors (`status === 0` or `status >= 500`) while clearing tokens only on genuine `401`/`403` authentication failures.
- **R-01.3 (Post-Login Request Deduplication):** Navigating to `/app/dashboard` after login must not trigger duplicate concurrent `GET /api/v1/projects`, `GET /api/v1/users/ai-provider`, or `GET /api/v1/projects/{id}/git/status` calls across `TopBar` and `DashboardPage`.
- **R-01.4 (Login Form Hardening & Redirects):** `LoginPage` must guard against repeated/double submissions (`if (isLoading) return`), validate empty fields cleanly, support safe internal `?next=` redirects after login while defaulting to `/app/dashboard`, and surface clear loading/error states.
- **R-01.5 (Measured Latency Targets):** Local login API (`POST /api/v1/auth/login`) and submit-to-dashboard navigation must be instrumented and measured before and after optimization, with automated Playwright and API tests covering valid login, invalid credentials, empty form validation, repeated submission, slow backend response, backend unavailable, expired token, session restoration, logout, protected route, direct navigation after login, and refresh while authenticated.

## R-02: Backend & Database Integrity
- **R-02.1:** Fresh-checkout SQLite startup (`sqlite+aiosqlite:///./data/devos.db`) must automatically create `./data` if missing without overwriting existing databases, and enable `WAL` mode + `busy_timeout=5000` for concurrent request reliability.
- **R-02.2:** All 10 Alembic migrations must apply cleanly via `bootstrap_migrate`.
- **R-02.3:** Strict user ownership (`403 Forbidden` on cross-user access), path traversal protection (`validate_safe_path` + `os.path.realpath`), command execution sandboxing, and secret-stripped child environments (`build_child_env`) must be enforced.

## R-03: Full-Stack Core Feature Completeness
- **R-03.1:** All 13 workspace and application domains (Auth, Projects CRUD + Edit Modal, File Explorer + visible row actions, Monaco CodeViewer + per-tab autosave, AI Panel + file attachments + live QA audit, Builder + nested path opening, Terminal + quoted tokenizer, Git + branch sync + merge + verified commit, Repository Brain 4 live tabs, Agent + persistent run history, Diagnostics, Automated Repairs, Settings profile + AI provider status) must work end-to-end against the real backend.

## R-04: Playwright E2E & Regression Verification
- **R-04.1:** Playwright suites must verify all authentication scenarios, all main workspace workflows, and quality/regression gates (zero uncaught JS exceptions, zero unexpected failed API calls, zero cross-user data leakage, responsive desktop & mobile viewports).
