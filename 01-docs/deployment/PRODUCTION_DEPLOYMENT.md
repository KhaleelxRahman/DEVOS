# DEVOS Deployment Guide

Frontend: Vercel
Backend: Render
Database: PostgreSQL

## Backend
Start Command:
uvicorn app.main:app --host 0.0.0.0 --port $PORT

## Frontend
Build:
npm run build

Output:
dist

## Environment Variables

BACKEND_URL=
OPENAI_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
DATABASE_URL=
SECRET_KEY=
