# DEVOS — Developer Environment Operating System

DEVOS is a project-aware AI developer command center. It unifies project
management, a file explorer, a code viewer, an allowlisted sandboxed terminal,
Git version control, a testing center, and a context-aware AI assistant into a
single dark, developer-first workspace.

## Repository Layout

| Directory      | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `01-docs/`     | Product, architecture, security, and API documents |
| `02-frontend/` | React 18 + TypeScript + Vite frontend              |
| `03-backend/`  | FastAPI backend (Python 3.11+)                     |
| `04-tests/`    | pytest suite (API + unit)                          |

## Quick Start (Local)

### Backend

```bash
cd 03-backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional; sensible defaults are built in
uvicorn app.main:app --reload --port 8000
```

The backend defaults to a local SQLite database (`./devos.db`) and creates
tables automatically on startup. No external services are required. To use
PostgreSQL instead, set `DATABASE_URL` in `.env` and run
`alembic upgrade head`.

Interactive API documentation is available at `http://localhost:8000/docs`.

### Frontend

```bash
cd 02-frontend
npm install
npm run dev                   # http://localhost:5173
```

The frontend talks to the backend through same-origin `/api` requests. The
Vite dev server proxies `/api` to `http://localhost:8000` by default
(override with `VITE_API_PROXY_TARGET`). This works identically on Replit or
behind reverse proxies without CORS changes or hardcoded backend URLs.

### Tests

```bash
cd 04-tests
python -m pytest -q
```

## Configuration

See `03-backend/.env.example` and `02-frontend/.env.example` for every
supported variable. Highlights:

- `AUTH_SECRET` — JWT signing secret; **must be changed in production**.
- `AI_PROVIDER` / `GEMINI_API_KEY` / `OPENAI_API_KEY` — without a key, the AI
  assistant runs in **Local/Mock mode** and clearly labels its responses.
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — enable GitHub OAuth. When
  unset, GitHub endpoints honestly report "not connected" instead of serving
  fake data.
- `TERMINAL_TIMEOUT_SECONDS`, `TERMINAL_MAX_OUTPUT_CHARS` — terminal sandbox
  limits.

## Security Model (Summary)

- Passwords hashed with Argon2 (bcrypt fallback for legacy hashes).
- JWT bearer auth on every project-scoped endpoint.
- Terminal executes an explicit allowlist of development commands via
  `subprocess` without a shell; cwd is locked to the project workspace.
- File API blocks path traversal, dotfiles/secrets, and key material.
- AI context excludes `.git`, `node_modules`, secrets, and masks secret-like
  values before they reach any provider.
- GitHub tokens are stored server-side and never returned by the API.

See `01-docs/06_SECURITY.md` for the full model.
