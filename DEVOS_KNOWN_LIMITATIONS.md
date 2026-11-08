# DEVOS v1.0.0 — Known Limitations & Operational Constraints

**Date:** 2026-11-08
**Status:** Documented & Verified

---

## 1. Local AI Provider Default (`AI_PROVIDER=mock`)
- **Behavior:** When `OPENAI_API_KEY` or `GEMINI_API_KEY` is not set in `backend/.env` (or `AI_PROVIDER` is set to `mock`), the backend uses `MockProvider` (`backend/app/services/ai/mock_provider.py`) so local development and automated test suites work deterministically without external API costs.
- **Transparency:** The frontend (`DashboardPage`, `SettingsPage`, and `WorkspacePage`) queries `GET /api/v1/users/ai-provider` and explicitly displays when the AI engine is running in **Mock Mode** versus a live configured LLM (`gemini` or `openai`).

## 2. Terminal Sandbox Command Allowlist (`shell=False`)
- **Behavior:** The workspace terminal (`/api/v1/projects/{id}/terminal/execute`) executes commands via `subprocess.run(..., shell=False)` with a strict allowlist of binaries (`ls`, `dir`, `pwd`, `echo`, `cat`, `git`, `python`, `pytest`, `ruff`, `mypy`, `node`, `npm`, `npx`, `tsc`, `eslint`, `prettier`) and blocks shell metacharacters (`|`, `>`, `&&`, `;`) and inline code execution flags (`python -c`, `node -e`).
- **Rationale:** Intentional security boundary on a shared host to prevent arbitrary OS command injection and secret exfiltration. It is not an unrestricted interactive PTY shell.

## 3. Stateless JWT Logout Semantics
- **Behavior:** Authentication uses stateless HMAC-SHA256 (`HS256`) JWTs with a configurable expiration (`ACCESS_TOKEN_EXPIRE_MINUTES=30`). Calling `POST /api/v1/auth/logout` validates the bearer token, records a `user.logout` activity entry, and clears `devos_token` and `devos_user` from browser storage, but does not maintain a server-side token revocation blocklist prior to token expiry.

## 4. Single-Instance Process Tracking for Dev-Server Previews
- **Behavior:** Live dev-server preview subprocesses (`ExecutionService.start_dev_server`) are tracked in-memory per backend worker process and cleaned up on server shutdown (`lifespan`). Horizontal multi-instance scaling of the backend would require sticky routing or external container orchestration for preview proxy ports.

## 5. Retained Unreferenced & Historical Files ("KEEP EVERYTHING")
- **Behavior:** Per explicit project governance (`KEEP EVERYTHING`), the following 8 files remain in their original locations untouched:
  - **Group A (unrouted static marketing/legal page components):** `frontend/src/pages/AboutPage.tsx`, `frontend/src/pages/ContactPage.tsx`, `frontend/src/pages/PrivacyPage.tsx`, `frontend/src/pages/TermsPage.tsx`
  - **Group B (root-level historical test/automation scripts):** `test-devos.js`, `test-devos-complete.js`, `phase11_complete.py`, `run_phase11.py`
