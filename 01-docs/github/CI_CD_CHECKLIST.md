# DEVOS Deployment Checklist

## Frontend (Vercel)

- Import GitHub repository

- Root: 02-frontend

- Build: npm run build

- Output: dist

## Backend (Render)

- Root: 03-backend

- Build: pip install -r requirements.txt

- Start:
  uvicorn app.main:app --host 0.0.0.0 --port $PORT

## PostgreSQL

Configure:

- DATABASE_URL

- SECRET_KEY

- OPENAI_API_KEY

- GITHUB_CLIENT_ID

- GITHUB_CLIENT_SECRET

- BACKEND_URL

## GitHub Actions

Every push automatically verifies:

- Frontend build

- Backend compilation

- Pull Requests
