# DEVOS Live Deployment

## Frontend (Vercel)

Root Directory:
02-frontend

Build Command:
npm run build

Output Directory:
dist

## Backend (Render)

Root Directory:
03-backend

Build Command:
pip install -r requirements.txt

Start Command:
uvicorn app.main:app --host 0.0.0.0 --port $PORT

## PostgreSQL

Connect DATABASE_URL from Render PostgreSQL.

## Environment Variables

- DATABASE_URL
- SECRET_KEY
- OPENAI_API_KEY
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- BACKEND_URL
