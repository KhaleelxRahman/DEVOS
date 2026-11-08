# DEVOS v1.0.0 — GSD Project Specification (`PROJECT.md`)

## 1. Project Identity & Mission
- **Application Name:** DEVOS v1.0.0 (Autonomous AI-First Developer Workspace & Software Engineering Platform)
- **Architecture:** Decoupled Full-Stack Web IDE & Autonomous Engineering System
  - **Frontend:** React 18.3.1, TypeScript 5.6.3, Vite 6.0.5, Monaco Editor (`@monaco-editor/react` 4.6.0), React Router DOM 6.28.0 (`frontend/`)
  - **Backend:** FastAPI 0.136.0, Python 3.11+ (`.venv` Python 3.13.9), SQLAlchemy 2.0.52 (async `aiosqlite` / `asyncpg`), Alembic 1.19.1, Pydantic 2.15.0 (`backend/`)
  - **Database:** SQLite (`sqlite+aiosqlite:///./data/devos.db` locally) / PostgreSQL (`postgresql+asyncpg` in production), 13 SQLAlchemy models, 10 Alembic migrations
  - **Verification & QA:** Pytest (`tests/unit`, `tests/api`), Node unit tests (`tests/frontend`), Playwright E2E (`qa/`)

## 2. Core Functional Subsystems
1. **Authentication, Session Recovery & Access Control:** JWT (`HS256`) authentication, bcrypt password hashing, session bootstrap (`/api/v1/auth/me`), mid-session `401` recovery (`SESSION_EXPIRED_KEY`), transient network/cold-start resilience, cross-user resource isolation, and authenticated logout.
2. **Project Management:** Create, list, search, filter, update/rename (`PATCH /api/v1/projects/{id}`), and delete projects (including Windows read-only `.git` packfile cleanup).
3. **Workspace File Explorer & Multi-Tab Monaco Editor:** Recursive file tree, create/rename/move/delete files & folders with path-traversal and Windows 8.3 short-path containment, file upload/download, ZIP export, per-tab debounced auto-save (`1.2s`), and side-by-side Monaco `DiffEditor`.
4. **AI Assistant, Streaming & Artifact Library:** Multi-turn project-aware chat, native SSE streaming (`:streamGenerateContent?alt=sse`), file attachment reading (`FileReader`), project planner, live backend-driven QA audit, inline code actions, and artifact library CRUD.
5. **3-Stage AI Software Builder:** Requirement classification, build planning, scaffold generation, workspace application (`server/index.js` nested path preservation), and direct opening in Monaco.
6. **Sandboxed Terminal & Phase 2 Execution Engine:** Quote-aware shell tokenizer (`shellTokenize.ts`), command allowlist & secret-stripped child environment (`build_child_env`), live SSE execution output streaming, process-tree cancellation, quality check detection/runner (`build`, `lint`, `typecheck`, `test`), and scoped-token (`typ="preview"`) dev-server reverse proxy.
7. **Phase 3 Diagnostics & Phase 4 Automated Self-Repair:** Grounded failure root-cause classification (`category`, `confidence`, `file_path`, `line_number`) and deterministic repair proposal, backup, application, and verification.
8. **Phase 5 Git & GitHub Integration:** Repository status, staging, committing, verified commits (`commit-verified`), branch creation/switching, protected-branch merge guards (`merge`), live `TopBar` branch synchronization, and encrypted GitHub OAuth / PAT repository import.
9. **Phase 6 Repository Brain:** Workspace file/symbol/import indexing, architecture summary, and text, symbol, reference, and semantic search in `RepositoryDashboard`.
10. **Phase 9 Autonomous Development Agent:** Bounded 11-state autonomous coding, building, testing, diagnosing, fixing, and verifying loop with persistent run history (`GET /api/v1/agent/runs`).

## 3. Non-Negotiable Preservation & Safety Constraints
- **Protected Files ("KEEP EVERYTHING"):**
  - `frontend/src/pages/AboutPage.tsx`
  - `frontend/src/pages/ContactPage.tsx`
  - `frontend/src/pages/PrivacyPage.tsx`
  - `frontend/src/pages/TermsPage.tsx`
  - `test-devos.js`
  - `test-devos-complete.js`
  - `phase11_complete.py`
  - `run_phase11.py`
- **Git & Data Safety:** Active work resides on `recovery/phase10-full-restoration` backed by offline bundle `devos_full_repo_with_checkpoints.bundle` and immutable backup tags (`backup/main-355e7bc`, `backup/cline-checkpoint-2a5b7ab`, `backup/cline-untracked-33f9d4d`). Zero destructive Git, database, or file-deletion commands are permitted.
