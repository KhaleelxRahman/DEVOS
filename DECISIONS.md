# DEVOS v1.0.0 — Architectural & Engineering Decisions Log (`DECISIONS.md`)

## ADR-01: Keep All 8 Cleanup Candidate Files Untouched ("KEEP EVERYTHING")
- **Context:** Four unmounted legacy marketing pages exist in `frontend/src/pages/{About,Contact,Privacy,Terms}Page.tsx` (superseded by `frontend/src/pages/site/*`) and four historical automation scripts exist at the repository root (`test-devos.js`, `test-devos-complete.js`, `phase11_complete.py`, `run_phase11.py`).
- **Decision:** Keep all 8 files in their original locations without deletion, relocation, or modification.
- **Consequence:** Zero risk of losing historical reference code; active routing in `frontend/src/App.tsx` continues to mount `./pages/site/*`.

## ADR-02: Non-Blocking Password Hashing via `asyncio.to_thread` in `AuthService`
- **Context:** `AuthService.login` and `AuthService.register` are `async def` coroutines running on Uvicorn's main `asyncio` event loop, but called synchronous `passlib` bcrypt functions (`verify_password`, `get_password_hash`), blocking the entire event loop for `~220–320ms` per request.
- **Decision:** Offload `verify_password` and `get_password_hash` to the default thread pool executor using `await asyncio.to_thread(...)`, and perform a constant-work dummy verification when a login email does not exist to prevent user-enumeration timing attacks.
- **Consequence:** Concurrent API requests (`/health`, `/auth/me`, `/projects`, static assets) are never stalled behind CPU-bound bcrypt hashing.

## ADR-03: Session Resilience on Transient Network/5xx Errors & Request Deduplication
- **Context:** Previously, `AuthContext` unconditionally removed `devos_token` in `.catch()` on any `/auth/me` error (including transient `502`/`503`/`504` cold starts or network blips) and fired duplicate requests under React `StrictMode`. Additionally, `TopBar` and `DashboardPage` both independently requested `/api/v1/projects`, `/api/v1/users/ai-provider`, and `/api/v1/projects/{id}/git/status` on mount.
- **Decision:**
  1. Only clear `devos_token` when `/auth/me` returns an explicit authentication rejection (`status === 401` or `status === 403`) or malformed user payload; preserve the session using cached `devos_user` metadata when a transient network or `5xx` error occurs.
  2. Deduplicate concurrent in-flight GET requests in `api/index.ts` (`projectsApi.list`, `usersApi.getAiProvider`, `authApi.me`, `gitApi.getStatus`) within a short coalescing window (`300ms`) so simultaneous mounts in `TopBar` and `DashboardPage` share a single network request.

## ADR-04: Automatic SQLite Parent Directory Creation & `WAL` Mode
- **Context:** Starting `uvicorn` on a fresh checkout without a pre-existing `backend/data/` directory caused `sqlite3.OperationalError: unable to open database file` during `bootstrap_migrate`. Furthermore, concurrent post-login requests on SQLite default rollback journal can contend on file locks.
- **Decision:** Ensure the SQLite file's parent directory is created before `create_async_engine` in `backend/app/db/session.py`, and configure `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;` on SQLite connections.

## ADR-05: Windows 8.3 Short-Path Resolution in `FileService`
- **Context:** On Windows, `tempfile` paths often use 8.3 short names (`C:\Users\RUNNER~1\...`), whereas `os.path.realpath` expands them (`C:\Users\runneradmin\...`). Mixing `get_project_root` (unexpanded) with `validate_safe_path` (`realpath`) caused `os.path.relpath` and root-equality checks in `rename`, `delete`, and `move` to mismatch.
- **Decision:** Resolve `root = os.path.realpath(self.get_project_root(project_id))` consistently across `rename`, `delete`, and `move` in `backend/app/services/file_service.py`.
