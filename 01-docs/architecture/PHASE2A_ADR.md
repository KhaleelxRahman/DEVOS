# DEVOS Phase 2A — Execution Foundation (Architecture Decision Record)

Branch baseline: `phase0-foundation-lock-20260901-2310` (HEAD 8885221,
Phase 1 PRODUCTION VERIFIED).
Scope lock: Phase 2A ONLY — contract + validation + record. No subprocess,
no shell, no build/test/preview runners, no streaming engine (Phase 2B+).

## 1. Existing terminal architecture (verified from repo)

- `03-backend/app/api/v1/terminal.py` — `GET /projects/{id}/terminal/history`
  and `POST /projects/{id}/terminal/execute` (rate-limited 30/60s). Owner check
  via `ProjectService.get_for_user`, execution via `TerminalService.execute`,
  audit via `ActivityService.record(..., activity_type="terminal.executed")`.
- `03-backend/app/services/terminal_service.py` — server-side allowlist
  (`ALLOWED_COMMANDS`), `BLOCKED_PATTERNS`, `SHELL_METACHARACTERS` rejection,
  per-arg `..`/abs/sensitive-file rejection, read-only npm restriction,
  `asyncio.create_subprocess_exec` (no shell), timeout + output caps.
- `03-backend/app/schemas/terminal.py` — `TerminalExecuteRequest`,
  `TerminalResultResponse`. Frontend xterm panel reuses `apiClient`.

Phase 2A does NOT duplicate this. It adds a *pre-execution* foundation: typed
execution records with ownership + policy validation, persisted, never executed.

## 2. Existing execution-related architecture

- Builder pipeline (`models/generation.py`, `schemas/builder.py`,
  `services/builder_service.py`, `api/v1/builder.py`): transaction with
  `generation_request_id`, state machine IDLE→…→COMPLETED plus
  PARTIAL/FAILED/CANCELLED/BLOCKED, `ErrorDetail` contract. Reused as the
  pattern for the execution record (identity + authoritative initial state).
- No generic execution/job/queue model exists — Phase 2A introduces it.

## 3. Project ownership mechanism

- `ProjectService.get_for_user(db, project_id, user_id)` → `ProjectNotFound`
  (404) for unknown/malformed ids, `ProjectAccessDenied` (403) for cross-user.
- Storage root per project: `get_project_storage_path(project_id)`.
- Every Phase 2A execution resolves the project through `get_for_user` —
  client-supplied project ids are never trusted.

## 4. Workspace ownership mechanism

- No standalone Workspace table exists. The workspace IS the project storage
  directory (`PROJECTS_STORAGE_PATH/<project_id>`, owner = project owner).
  Phase 2A models `workspace_id` as the project-scoped workspace identity: it
  must equal the `project_id` path segment it is requested under, and
  containment is proven by realpath containment inside the project root.
- Cross-project execution (workspace_id != project_id) is rejected server-side.

## 5. Authentication / authorization

- `api/deps.py:get_current_user` — `Bearer <JWT>` → `decode_access_token` →
  `AuthService.get_by_id`; missing/invalid → 401 `AUTH_REQUIRED`. Unchanged.
- Authorization = `get_for_user` (403 `PROJECT_ACCESS_DENIED`). Execution
  endpoints apply both, in that order.

## 6. API response / error models

- Envelope `ApiResponse[T]{success, data?, error?}` + `ErrorDetail{code,
  message}` (`schemas/common.py`). Errors as `AppException(message, code,
  status_code)` rendered by `app_exception_handler` — never raw dicts.
- Phase 2A codes: `UNAUTHENTICATED`(401 via AUTH_REQUIRED), `FORBIDDEN`(403),
  `INVALID_PROJECT`(404), `INVALID_WORKSPACE`(422),
  `INVALID_EXECUTION_TYPE`(422), `BLOCKED_COMMAND`(403),
  `INVALID_WORKING_DIRECTORY`(403), `INVALID_REQUEST`(422).

## 7. Persistence pattern

- SQLAlchemy async (`Base` + `TimestampMixin` + `AsyncSession` via `get_db`),
  models barrel `models/__init__.py`, bootstrap `create_all` in lifespan plus
  Alembic chain. Phase 2A adds `models/execution.py::Execution` (mirrors
  `Generation`: str UUID pk, JSON columns, tz-aware datetimes), exported from
  the barrel. No separate database. Tests use `create_all`; the Alembic
  revision is deferred to the Phase 2H deployment pass.

## 8. Logging pattern

- `core/app_logging.py::logger` (`devos`, INFO, stdout). Phase 2A logs one
  structured line per accepted request: `execution_id request_id user_id
  project_id workspace_id execution_type status`. No secrets, no env dumps.

## 9. Stream transport

- Existing SSE: `apiClient.stream` + `StreamingResponse text/event-stream`.
  Phase 2A adds NO streaming — records are polled via
  `GET /executions/{execution_id}`. Live output streaming is Phase 2B.

## 10. Proposed Phase 2A extension (new backend vertical, zero frontend changes)

- `app/models/execution.py` — `Execution` row: identity, ownership, type,
  command/args, working_directory, initial status, audit timestamps,
  exit_code nullable, failure_reason/timed_out/cancelled flags,
  request_id + parent_execution_id.
- `app/schemas/execution.py` — `ExecutionType` literal (8 types),
  `ExecutionStatus` literal (QUEUED/PREPARING/BLOCKED/FAILED),
  `ExecutionCreateRequest`, `ExecutionResponse` (contract fields), all in
  `ApiResponse` envelopes.
- `app/services/execution_service.py` — pure validation + persistence:
  `validate_working_directory` (ntpath+posix abs, drive, UNC, `..`, realpath
  containment in project root), `classify_command` (SAFE/CONTROLLED/BLOCKED),
  `create_execution` (ownership → type → policy → directory → persist QUEUED;
  BLOCKED command → persist BLOCKED record with failure_reason),
  `get_execution` (ownership-checked read). NO subprocess anywhere.
- `app/api/v1/executions.py` — `POST /projects/{id}/executions`
  (rate-limited) + `GET /projects/{id}/executions/{execution_id}`, behind
  `get_current_user` + `get_for_user`. Mounted in `api/v1/router.py`.
- `04-tests/api/test_executions_2a.py` — valid/unauth/cross-project/
  traversal/abs/drive/UNC/blocked-command/invalid-type + security battery.

## 11. Files to modify / create

- CREATE: `PHASE2A_ADR.md` (this file), `models/execution.py`,
  `schemas/execution.py`, `services/execution_service.py`,
  `api/v1/executions.py`, `04-tests/api/test_executions_2a.py`.
- EDIT (additive only): `models/__init__.py`, `schemas/__init__.py`,
  `api/v1/router.py`, `core/errors.py` (execution subclasses),
  `core/config.py` (EXECUTION_* resource-policy defaults).

## 12. Abstractions reused

`get_current_user`, `get_db`, `ApiResponse`/`ErrorDetail`/`AppException`,
`ProjectService.get_for_user` + `get_project_storage_path`, `FileService`
containment/sensitive logic shape, `Generation` record conventions,
`TimestampMixin`, `logger`, `rate_limit`. `ActivityService` is NOT written in
2A — no execution occurred, so there is nothing to audit (starts in 2B).

## 13. Potential regression surfaces

Router mount (`/projects/{id}/executions/*` vs `/builder`, `/terminal` — no
prefix collision), models barrel import order, schemas barrel exports,
`create_all` picking up the new table in lifespan + tests, rate-limit bucket.

## 14. Rejected duplicate approaches

Second auth layer; second response envelope; separate execution database;
standalone Workspace table (workspace = project storage dir); string-prefix
path checks (realpath containment required); giant blacklist command policy
(allowlist-shape classification); `shell=True`/`Popen`/`os.system`
(FORBIDDEN in 2A — nothing runs); new SSE/WebSocket channel (polling
suffices); frontend execution UI (deferred to 2F); Alembic revision in 2A
(deferred to 2H).
