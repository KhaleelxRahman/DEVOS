# DEVOS Production Deployment

Frontend: Vercel
Backend: Render
Database: PostgreSQL

## Backend Start

uvicorn app.main:app --host 0.0.0.0 --port $PORT

## Frontend Build

npm run build

## Output

dist

## Required Environment Variables

DATABASE_URL=
SECRET_KEY=
OPENAI_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
BACKEND_URL=
