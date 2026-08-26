# DEVOS — User Manual

Document: 13_USER_MANUAL.md
Version: 1.0
Status: Matches implemented system (post-stabilization)

---

## 1. Running DEVOS

### Backend

```bash
cd 03-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Default database: SQLite at `03-backend/devos.db` (no setup needed).
- Tables are created automatically at startup.
- For PostgreSQL: set `DATABASE_URL` and run `alembic upgrade head`.
- API docs: `http://localhost:8000/docs` and `/redoc`.
- Health: `GET /health` and `GET /api/v1/health`.

### Frontend

```bash
cd 02-frontend
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to the backend (`VITE_API_PROXY_TARGET`,
default `http://localhost:8000`). The frontend uses same-origin URLs, so it
works locally, on Replit, and behind reverse proxies unchanged.

### Test Suite

```bash
cd 04-tests && python -m pytest -q
```

Covers auth, projects, files, terminal, git, AI, context, testing jobs,
ownership enforcement, and path-traversal protection.

## 2. Signing Up and Signing In

Register at `/register` (name, email, password). Login at `/login`. A JWT is
stored in `localStorage` (`devos_token`) and sent as a bearer token on every
API request. Tokens expire after 24 hours (configurable).

## 3. Projects

The Projects page lists your projects. Create one with a name, description,
and optional GitHub URL. Open a project to make it the active workspace
context (stored per session in `sessionStorage`).

## 4. Workspace

The Workspace has five panels:

1. **Files** — real project file tree. Sensitive files (`.env`, keys),
   `.git`, `node_modules`, and build output are never exposed. Filename
   search hits the backend search index.
2. **Code Viewer** — read-only, tabbed file viewer with language detection.
3. **AI Assistant** — chat persists per project/user. The header shows the
   active provider; without an API key it is labelled **Local/Mock**. With a
   file open, `/explain`, `/debug`, `/refactor`, `/test`, `/document`,
   `/security`, and `/optimize` run against the file's content.
4. **Terminal** — executes an allowlisted set of dev commands
   (`git, npm, node, python, pip, pytest, cargo, ls, echo, cat, pwd, tree`)
   with no shell, a 30s timeout, and the project workspace as cwd. Blocked
   commands are rejected with a clear error.
5. **Git & Tests** — live branch list, stage/unstage per file, commit,
   pull/push, diff, recent commits; plus Testing Center jobs (`pytest`,
   `typecheck`, `build`) with captured logs.

## 5. AI Providers

Set one of these in `03-backend/.env`:

- `GEMINI_API_KEY` (with `AI_PROVIDER=gemini`)
- `OPENAI_API_KEY` (with `AI_PROVIDER=openai`)

Without a key, DEVOS serves **Local/Mock** responses that are clearly marked
as mock in the API and UI. AI context includes your README, file tree, active
file, and Git status; secret-like values are masked first.

## 6. GitHub

With `GITHUB_CLIENT_ID`/`SECRET` configured, `GET /api/v1/github/connect`
starts OAuth. Otherwise the connection endpoint returns
`connected: false` and the Settings page shows "Not connected". No fabricated
repositories or users are ever returned.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| 401 on all API calls | Log in again; token expired |
| `ECONNREFUSED` in dev | Start the backend on port 8000 |
| `TERMINAL_BLOCKED` | Command not on the allowlist |
| AI always says "Mock" | Set `GEMINI_API_KEY` or `OPENAI_API_KEY` |
| DB errors after switching to Postgres | Run `alembic upgrade head` |
