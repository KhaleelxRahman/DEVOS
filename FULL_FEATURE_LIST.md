# FULL_FEATURE_LIST — DEVOS v1.0.0 (Pre-Phase-13 inventory)

**Method:** real inspection of every frontend page/panel, every mounted backend router
(all routes enumerated), every service method called from a route, and the actual test
suite. Nothing estimated. Paths shown use the post-Phase-11 layout (`frontend/`,
`backend/`, `tests/`).

## Real total count

**70 user-facing features**, counted from the tables below: 4 auth/account + 7 projects
+ 10 files + 9 git + 6 AI + 2 artifacts + 2 terminal + 6 executions + 2 quality + 4
preview + 8 builder + 2 testing + 4 github + 2 public forms + 1 static-pages group
+ 1 ops/health = **70**.

Supporting evidence collected during the scan:
- **Backend:** 14 mounted routers (auth, users, projects, files, git, github, ai,
  terminal, activity, testing, public_forms, builder, preview, executions), **83 route
  decorators**, plus 4 direct routes on `main.py` (`/health`, `/api/v1/health`,
  `/version`, `/api/v1/version`).
- **Dead modules found (flagged, not counted):** `backend/app/api/v1/health.py`
  (superseded by main.py direct route), `backend/app/api/v1/context.py` (superseded by
  `GET /projects/{id}/context`), `backend/app/api/v1/public.py` (superseded by
  `public_forms.py`). None is mounted in `router.py`.
- **Frontend:** 22 pages (14 app + 8 site), 12 workspace panels, 14 API client groups
  in `frontend/src/api/index.ts` consuming ~75 distinct URL templates.
- **Tests:** 17 test files, **148 tests collected & passing** (latest full run).

Legend: Impl = implemented in backend code; E2E = frontend calls the endpoint;
Test = asserted by the pytest suite (Y / partial / N).

## A. Auth & Account

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 1 | Register account | `pages/RegisterPage.tsx` | `POST /auth/register` | Y | Y | Y |
| 2 | Login | `pages/LoginPage.tsx` | `POST /auth/login` | Y | Y | Y |
| 3 | Session identity / auth guard | all authed pages via `AuthContext` | `GET /auth/me`, `GET /users/me` | Y | Y | Y |
| 4 | Logout | `DashboardPage`/header | `POST /auth/logout` | Y | Y | Y |

## B. Projects

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 5 | Create project | `pages/ProjectsPage.tsx` | `POST /projects` | Y | Y | Y |
| 6 | List projects (dashboard grid) | `pages/DashboardPage.tsx`, `pages/ProjectsPage.tsx` | `GET /projects` | Y | Y | Y |
| 7 | Project detail | `pages/ProjectDetailPage.tsx` | `GET /projects/{id}` | Y | Y | Y |
| 8 | Update project | `pages/ProjectDetailPage.tsx` | `PATCH /projects/{id}` | Y | Y | Y |
| 9 | Delete project | `pages/ProjectDetailPage.tsx` | `DELETE /projects/{id}` | Y | Y | Y |
| 10 | Project context snapshot (AI context engine) | `pages/WorkspacePage.tsx` | `GET /projects/{id}/context` | Y | Y | Y (`test_context_excludes_secrets_and_heavy_dirs`) |
| 11 | Activity feed | `pages/WorkspacePage.tsx` | `GET /activity`, `GET /projects/{id}/activity` | Y | Y | Y (`test_project_activity_recorded`) |

## C. Files

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 12 | File tree explorer | `components/workspace/FileExplorer.tsx` | `GET /projects/{id}/files` | Y | Y | Y |
| 13 | Read/open file | `components/workspace/CodeViewer.tsx` | `GET /projects/{id}/files/{path}` | Y | Y | Y |
| 14 | Search files | `FileExplorer.tsx` | `GET /projects/{id}/files/search` | Y | Y | Y |
| 15 | Create file | `FileExplorer.tsx` | `POST /projects/{id}/files/file` | Y | Y | Y |
| 16 | Create folder | `FileExplorer.tsx` | `POST /projects/{id}/files/folder` | Y | Y | Y |
| 17 | Save/edit file | `CodeViewer.tsx` | `PUT /projects/{id}/files/{path}` | Y | Y | Y |
| 18 | Rename file/folder | `FileExplorer.tsx` | `POST /projects/{id}/files/rename` | Y | Y | Y |
| 19 | Move file/folder | `FileExplorer.tsx` | `POST /projects/{id}/files/move` | Y | Y | Y |
| 20 | Delete file/folder | `FileExplorer.tsx` | `DELETE /projects/{id}/files/{path}` | Y | Y | Y |
| 21 | Upload files | `FileExplorer.tsx` | `POST /projects/{id}/files/upload` | Y | Y | Y |

## D. Git

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 22 | Git status | `components/workspace/GitPanel.tsx` | `GET /projects/{id}/git/status` | Y | Y | Y |
| 23 | Git diff | `GitPanel.tsx` | `GET /projects/{id}/git/diff` | Y | Y | partial |
| 24 | Commit | `GitPanel.tsx` | `POST /projects/{id}/git/commit` | Y | Y | Y |
| 25 | Branch list | `GitPanel.tsx` | `GET /projects/{id}/git/branches` | Y | Y | Y |
| 26 | Commit log | `GitPanel.tsx` | `GET /projects/{id}/git/log` | Y | Y | Y |
| 27 | Stage / unstage | `GitPanel.tsx` | `POST .../git/stage`, `POST .../git/unstage` | Y | Y | partial |
| 28 | Checkout / create branch | `GitPanel.tsx` | `POST .../git/checkout` | Y | Y | partial |
| 29 | Pull | `GitPanel.tsx` | `POST .../git/pull` | Y | Y | partial |
| 30 | Push | `GitPanel.tsx` | `POST .../git/push` | Y | Y | partial |

(Notes for D: `test_git_status_branches_commit_log` directly asserts status, branches,
commit, log. Diff/stage/unstage/checkout/pull/push are implemented and consumed by the
frontend but only exercised indirectly by the suite — marked `partial`, not "N".)

## E. AI assistant

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 31 | AI chat (mock or real provider) | `components/workspace/AIPanel.tsx` | `POST /projects/{id}/ai/chat` | Y | Y | Y |
| 32 | Streaming AI chat (SSE) | `AIPanel.tsx` | `POST /projects/{id}/ai/chat/stream` | Y | Y | Y |
| 33 | Conversation management (list/create/pin/delete) | `AIPanel.tsx` | `GET/POST/PATCH/DELETE /projects/{id}/ai/conversations[/{cid}]` | Y | Y | Y |
| 34 | Conversation message history | `AIPanel.tsx` | `GET /projects/{id}/ai/conversations/{cid}/messages` | Y | Y | Y |
| 35 | AI provider status | `AIPanel.tsx`, `pages/SettingsPage.tsx` | `GET /projects/{id}/ai/provider` | Y | Y | Y (unit: `test_ai_service.py`) |
| 36 | AI code actions (explain/debug/refactor/test/document/security/optimize) | `AIPanel.tsx`, `CodeViewer.tsx` | `POST /projects/{id}/ai/actions` | Y | Y | Y |

## F. Artifacts

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 37 | Artifact create + list | `components/workspace/ArtifactPanel.tsx` | `GET/POST /projects/{id}/ai/artifacts` | Y | Y | Y (`test_ai_stream_persists_messages_and_artifacts`) |
| 38 | Artifact view + delete | `ArtifactPanel.tsx` | `GET/DELETE /projects/{id}/ai/artifacts/{artifact_id}` | Y | Y | partial |

## G. Terminal

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 39 | Terminal command execution (allowlisted sandbox) | `components/workspace/TerminalPanel.tsx` | `POST /projects/{id}/terminal/execute` | Y | Y | Y |
| 40 | Terminal history | `TerminalPanel.tsx` | `GET /projects/{id}/terminal/history` | Y | Y | Y |

## H. Executions (process engine)

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 41 | Create execution record (policy validation) | `HistoryPanel.tsx`, `WorkspacePage.tsx` | `POST /projects/{id}/executions` | Y | Y | Y |
| 42 | Run execution (real subprocess) | `HistoryPanel.tsx` | `POST .../executions/{eid}/run` | Y | Y | Y |
| 43 | Cancel execution | `HistoryPanel.tsx` | `POST .../executions/{eid}/cancel` | Y | Y | Y |
| 44 | Retry execution (attempt tracking) | `HistoryPanel.tsx` | `POST .../executions/{eid}/retry` | Y | Y | Y |
| 45 | Execution history (newest first, limit) | `HistoryPanel.tsx` | `GET /projects/{id}/executions` | Y | Y | Y |
| 46 | Execution detail / result (stdout, stderr, exit code) | `HistoryPanel.tsx` | `GET .../executions/{eid}`, `GET .../executions/{eid}/result` | Y | partial (detail consumed; `/result` endpoint defined, not consumed by frontend) | Y |

## I. Quality (Lint/Test/Typecheck/Build)

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 47 | Quality operation detection (per-project) | `components/workspace/QualityPanel.tsx` | `GET .../executions/quality/operations` | Y | Y | Y |
| 48 | Run quality operation | `QualityPanel.tsx` | `POST .../executions/quality/{operation}` | Y | Y | Y |

## J. Preview (dev server)

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 49 | Start dev-server preview | `components/workspace/PreviewPanel.tsx` | `POST /projects/{id}/preview` | Y | Y | Y |
| 50 | Preview status | `PreviewPanel.tsx` | `GET /projects/{id}/preview/status` | Y | Y | Y |
| 51 | Stop preview | `PreviewPanel.tsx` | `POST /projects/{id}/preview/stop` | Y | Y | Y |
| 52 | Live preview iframe (authed proxy) | `PreviewPanel.tsx` (iframe) | `GET /projects/{id}/executions/{eid}/preview/{path}` | Y | Y | Y |

## K. Builder (prompt → plan → generate → apply)

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 53 | Classify prompt | `components/workspace/BuilderPanel.tsx` | `POST /projects/{id}/builder/classify` | Y | Y | Y |
| 54 | Generate plan | `BuilderPanel.tsx` | `POST /projects/{id}/builder/plan` | Y | Y | Y |
| 55 | Start generation | `BuilderPanel.tsx` | `POST /projects/{id}/builder/start` | Y | Y | Y |
| 56 | Generation status | `BuilderPanel.tsx` | `GET .../builder/status/{rid}` | Y | Y | Y |
| 57 | Generation event stream (SSE) | `BuilderPanel.tsx` | `GET .../builder/stream/{rid}` | Y | Y | Y |
| 58 | Generation summary | `BuilderPanel.tsx` | `GET .../builder/summary/{rid}` | Y | Y | Y |
| 59 | Apply generated files | `BuilderPanel.tsx` | `POST .../builder/apply/{rid}` | Y | Y | Y |
| 60 | Cancel generation | `BuilderPanel.tsx` | `POST .../builder/cancel/{rid}` | Y | Y | Y |

## L. Testing Center

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 61 | Test job listing (available tools) | `components/workspace/TestingPanel.tsx` | `GET /projects/{id}/testing/jobs` | Y | Y | Y |
| 62 | Run test job (pytest / typecheck / build) | `TestingPanel.tsx` | `POST /projects/{id}/testing/run/{job_id}` | Y | Y | Y |

## M. GitHub integration

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 63 | Connect GitHub (OAuth start) | `pages/SettingsPage.tsx` | `POST /github/connect` | Y | Y | Y (`test_github_documented_routes_and_oauth_state`, `test_github_connect_unconfigured_returns_503`) |
| 64 | OAuth callback (state-validated) | redirect target | `GET /github/callback` | Y | partial (redirect flow; state validation unit-tested, full browser flow covered by live QA specs only) | partial |
| 65 | Connection status / disconnect | `SettingsPage.tsx` | `GET /github/connection`, `DELETE /github/connection` | Y | Y | partial |
| 66 | Repository dashboard (list repos) | `components/workspace/RepositoryDashboard.tsx` | `GET /github/repositories` | Y | Y | partial |

## N. Public / marketing

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 67 | Waitlist join (+ duplicate/validation handling) | `pages/site/WaitlistPage.tsx`, `pages/ContactPage.tsx` | `POST /waitlist` | Y | Y | Y |
| 68 | Contact form (honeypot + validation) | `pages/site/ContactPage.tsx` | `POST /contact` | Y | Y | Y |
| 69 | Static content pages (Home, About, FAQ, Privacy, Terms, ThankYou, Documentation, Help, NotFound) | `pages/site/*`, `pages/AboutPage.tsx`, `pages/PrivacyPage.tsx`, `pages/TermsPage.tsx`, `pages/DocumentationPage.tsx`, `pages/HelpPage.tsx`, `pages/NotFoundPage.tsx` | none (no backend) | Y | Y | N (static; e2e Playwright specs only) |

## O. Ops

| # | Feature | Frontend | Backend endpoint(s) | Impl | E2E | Test |
|---|---|---|---|---|---|---|
| 70 | Health + deploy identity (version) | `frontend/src/api/index.ts` (healthApi) | `GET /health`, `GET /api/v1/health`, `GET /version`, `GET /api/v1/version` | Y | Y (health) | Y (`test_health_check_endpoint`) |

## Backend-only infrastructure (not user-facing, listed for completeness)

- Alembic migration bootstrap (`app.bootstrap_migrate`, subprocess) — tested
  (`test_migrations.py`, 3 tests).
- Rate limiting (register 5/min, login 10/min, terminal/executions 30/min,
  waitlist/contact) — tested (`test_waitlist_rate_limit_enforced`,
  `test_login_rate_limit_enforced`).
- Security hardening suite — 14 tests in `test_security_2g.py` + Phase 12.1 additions.
- Production config guard (`_validate_production_safety`) — tested (unit `test_core.py`).

## Workspace panel coverage check (all 12 panels mapped)

| Panel | Feature #s |
|---|---|
| `AIPanel.tsx` | 31–36, 37–38 |
| `ArtifactPanel.tsx` | 37–38 |
| `BuilderPanel.tsx` | 53–60 |
| `CodeViewer.tsx` | 13, 17, 36 |
| `FileExplorer.tsx` | 12, 14–21 |
| `GitPanel.tsx` | 22–30 |
| `HistoryPanel.tsx` | 41–46 |
| `PreviewPanel.tsx` | 49–52 |
| `QualityPanel.tsx` | 47–48 |
| `RepositoryDashboard.tsx` | 66 |
| `TerminalPanel.tsx` | 39–40 |
| `TestingPanel.tsx` | 61–62 |

All 12 panels are wired to live endpoints. **Count of unimplemented / dead panels: 0.**

## Housekeeping findings from this scan (not blockers)

1. `executions.py` has a duplicated `@router.get("/{execution_id}")` decorator pair on
   one handler (registers the same route twice; first registration wins — cosmetic).
2. Three dead route modules exist (`api/v1/health.py`, `context.py`, `public.py`) —
   superseded but still on disk. Safe to delete in the Phase 9/10 trim pass.
3. `main.py` and `api/v1/health.py` both define `/health` — only main.py's is mounted.

**TOTAL: 70 user-facing features · 83 route decorators (14 mounted routers) + 4 direct
main.py routes · 12/12 panels connected · 148 tests passing.**


