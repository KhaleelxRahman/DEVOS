# Authorization Matrix

Who can call what. Every check below is enforced server-side — the UI merely
reflects these rules.

## Public (no authentication)

| Endpoint | Auth | Purpose | Protections |
| --- | --- | --- | --- |
| `GET /health`, `GET /api/v1/health` | None | Liveness check | None needed |
| `POST /api/v1/waitlist` | None | Join early-access list | Rate limit 5/min/IP, email validation, HTML rejection, idempotent duplicate handling |
| `POST /api/v1/contact` | None | Contact form | Rate limit 5/min/IP, validation, honeypot spam trap, HTML rejection |

## Authenticated (JWT bearer, any user)

| Endpoint | Scope | Notes |
| --- | --- | --- |
| `POST /api/v1/auth/register` | Public | Rate limit 5/min/IP |
| `POST /api/v1/auth/login` | Public | Rate limit 10/min/IP |
| `GET /api/v1/auth/me` | Self | Returns own profile only |
| `POST /api/v1/auth/logout` | Self | Token invalidation |
| `GET/POST /api/v1/projects` | Own projects | List/create |
| `GET/PATCH/DELETE /api/v1/projects/{id}` | Owner only | 404/403 for other users |
| `GET /api/v1/projects/{id}/files*` | Owner only | Tree/content/search; sensitive files (.env, keys) never served |
| `POST /api/v1/projects/{id}/files/file | folder | upload | rename` | Owner only | Path traversal blocked; name validation; upload limits (10MB/file, 20/batch); executable extensions blocked |
| `PUT/DELETE /api/v1/projects/{id}/files/{path}` | Owner only | Save/delete; project root cannot be deleted/renamed |
| `POST /api/v1/projects/{id}/terminal/execute` | Owner only | Rate limit 30/min/IP; allowlisted commands only; cwd locked to project workspace |
| `POST /api/v1/projects/{id}/ai/chat | actions` | Owner only | Rate limit 20/min/IP; context sanitized & secrets masked |
| `GET/POST /api/v1/projects/{id}/git/*` | Owner only | Git operations in project workspace |
| `GET/POST /api/v1/projects/{id}/testing/*` | Owner only | Test job execution |
| `GET /api/v1/projects/{id}/activity` | Owner only | Project activity feed |
| `GET /api/v1/activity` | Self | Own activity feed |
| `GET/POST/DELETE /api/v1/github/*` | Self | Own GitHub connection; token never returned |
| `GET /api/v1/settings/*` | Self | Own settings |

## Cross-account isolation

- Every project-scoped endpoint loads the project via
  `ProjectService.get_for_user(db, project_id, current_user.id)`, which
  rejects non-owners (403) or hides the project (404) — verified by
  `test_projects.py` and `test_public_and_files.py` cross-user tests.

- Files on disk live under `PROJECTS_STORAGE_PATH/<project_id>/`; all paths
  are validated with `validate_safe_path` before any filesystem operation.

- AI conversations, terminal history, and activity rows are keyed by
  `user_id` and only ever queried for the authenticated user.

## Frontend route access

| Route | Access |
| --- | --- |
| `/`, `/about`, `/faq`, `/contact`, `/waitlist`, `/privacy`, `/terms`, `/thank-you` | Public |
| `/login`, `/register` | Public |
| `/app/*` | `ProtectedRoute` — requires a valid JWT; redirects to `/login` otherwise |
| Everything else | 404 page with links home / workspace |
