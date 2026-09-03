DEVOS v1.0.0 — DEPLOYMENT SPECIFICATION

Document: 11_DEPLOYMENT.md
Product: DEVOS v1.0.0
Version: 1.0
Status: Active Development


1. PURPOSE

This document defines how DEVOS v1.0.0 moves from local development to production.


2. DEPLOYMENT ARCHITECTURE

Recommended:

User
↓
Frontend
↓
HTTPS
↓
Backend API
↓
PostgreSQL

Backend also connects to:

• AI provider
• GitHub
• Project workspace
• Terminal service


3. DEVELOPMENT ENVIRONMENT

Frontend:

React

Backend:

FastAPI

Database:

PostgreSQL


4. LOCAL DEVELOPMENT

Required:

• Node.js
• Python
• PostgreSQL
• Git

Optional:

• Docker


5. ENVIRONMENT VARIABLES

Frontend should only contain public configuration.

Backend contains private secrets.


6. BACKEND VARIABLES

Examples:

DATABASE_URL
AUTH_SECRET
AI_PROVIDER_KEY
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET


7. FRONTEND VARIABLES

Only public configuration.

Example:

VITE_API_BASE_URL

For a split frontend/backend deployment, set `VITE_API_BASE_URL` to the
complete backend API prefix, for example
`https://devos-api.example.com/api/v1`. Vite embeds this public value at build
time; do not put secrets in frontend variables. Render static sites do not
proxy `/api` automatically, so this variable is required unless an equivalent
reverse-proxy rewrite is configured.

The included Render blueprint sets `VITE_API_BASE_URL` to the `devos-api`
service and `FRONTEND_APP_URL` to the `devos-web` service. If either service
name is changed, update both values and the GitHub OAuth application's callback
URL (`GITHUB_REDIRECT_URI`) accordingly. On Vercel, configure
`VITE_API_BASE_URL` in the project environment before building.


8. SECRET RULE

Never commit:

.env

real API keys
tokens
passwords


9. GITIGNORE

Ensure:

.env
.env.*
__pycache__/
node_modules/
dist/
build/


10. PRODUCTION FRONTEND

Production frontend should:

• Build successfully
• Use production API URL
• Use HTTPS
• Avoid development debugging
• Handle API failures


11. PRODUCTION BACKEND

Backend should:

• Run behind HTTPS
• Validate environment configuration
• Use production database
• Restrict CORS
• Enable logging
• Provide health check


12. DATABASE DEPLOYMENT

Use managed PostgreSQL where possible.

Requirements:

• Automated backups
• Secure credentials
• Encryption
• Restricted access


13. DATABASE MIGRATIONS

Before deployment:

1. Backup database
2. Run migration
3. Verify schema
4. Start application


14. CORS

Production CORS must allow only trusted frontend origins.


15. HTTPS

Production must use HTTPS.

Secure cookies should be enabled when cookie-based authentication is used.


16. HEALTH CHECK

Endpoint:

GET /api/v1/health

Expected:

{
  "success": true,
  "status": "online",
  "service": "DEVOS v1.0.0 API"
}


17. DEPLOYMENT ORDER

Recommended:

1. Database
2. Backend
3. Environment configuration
4. Frontend
5. Health check
6. End-to-end verification


18. BACKEND STARTUP

Verify:

✓ Environment loaded
✓ Database connected
✓ Application starts
✓ Routes available
✓ Health endpoint works


19. FRONTEND STARTUP

Verify:

✓ Production build
✓ API connection
✓ Authentication
✓ Dashboard
✓ Workspace


20. DEPLOYMENT CHECKLIST

Before production:

✓ Build passes
✓ Tests pass
✓ Database ready
✓ Migrations complete
✓ Secrets configured
✓ CORS configured
✓ HTTPS enabled
✓ Health check works
✓ Authentication works


21. AI PROVIDER

Production AI integration must use backend-side credentials.

Never expose provider API keys to frontend.


22. GITHUB DEPLOYMENT

GitHub credentials must remain server-side.

OAuth callbacks must use production URLs.


23. TERMINAL DEPLOYMENT

The terminal is a high-risk component.

Production should use an isolated execution strategy.

Prefer:

Container
or
Sandboxed execution environment


24. MVP TERMINAL

If secure isolation is unavailable:

Limit terminal functionality rather than exposing unrestricted host execution.


25. LOGGING

Production logs should contain:

• Request ID
• Endpoint
• Status
• Duration
• Safe errors


26. DO NOT LOG

Never log:

• Passwords
• API keys
• Tokens
• Secrets
• Private repository content unnecessarily


27. MONITORING

Future:

• Error tracking
• Performance monitoring
• API monitoring
• AI monitoring
• Terminal monitoring


28. BACKUPS

Database backups should be:

• Automated
• Encrypted
• Tested


29. ROLLBACK

Deployment should support rollback.

Possible strategy:

Previous application version
+
Database migration rollback strategy


30. ZERO-DOWNTIME FUTURE

As DEVOS v1.0.0 grows:

• Rolling deployments
• Health checks
• Load balancing
• Multiple backend instances


31. DOMAIN

Production should use a professional domain.

Example:

devos.example.com


32. FRONTEND DEPLOYMENT

Recommended platforms may include:

• Vercel
• Netlify
• Cloudflare Pages
• Other production hosting


33. BACKEND DEPLOYMENT

Possible:

• Railway
• Render
• Fly.io
• AWS
• Other container/server platforms


34. DATABASE HOSTING

Possible:

• Supabase
• Neon
• Railway
• AWS RDS
• Other managed PostgreSQL providers


35. PLATFORM SELECTION

Do not choose hosting based only on popularity.

Evaluate:

• Cost
• Reliability
• Deployment simplicity
• Database compatibility
• Environment variables
• Logs
• Scaling


36. CI/CD

Future deployment pipeline:

Git push
↓
Tests
↓
Build
↓
Security checks
↓
Deploy
↓
Health check


37. DEPLOYMENT BRANCH

Recommended:

main

Production deployment should come from a controlled branch.


38. RELEASE TAGGING

Future:

v1.0.0
v1.1.0
v2.0.0


39. ENVIRONMENT SEPARATION

Development:

Local machine

Staging:

Testing environment

Production:

Real users


40. STAGING

Before production release:

Deploy to staging.

Test:

• Login
• Projects
• Workspace
• AI
• Git
• Terminal


41. PRODUCTION SECURITY

Verify:

✓ HTTPS
✓ Secure secrets
✓ Restricted CORS
✓ Authentication
✓ Authorization
✓ Rate limits
✓ Secure terminal
✓ Secure GitHub tokens


42. PERFORMANCE

Production should optimize:

• Frontend bundle
• API latency
• Database queries
• File loading
• AI requests


43. SCALING

Future architecture may support:

Frontend CDN
+
Load balancer
+
Multiple API instances
+
Managed PostgreSQL
+
Queue workers


44. BACKGROUND JOBS

Future jobs:

• Code indexing
• AI processing
• Documentation generation
• Repository synchronization


45. DEPLOYMENT FAILURE

If deployment fails:

1. Inspect logs
2. Check health endpoint
3. Verify environment
4. Verify database
5. Roll back if necessary


46. POST-DEPLOYMENT CHECK

Immediately verify:

✓ Homepage
✓ Login
✓ Project creation
✓ Workspace
✓ AI
✓ Git
✓ Health


47. PRODUCTION DEPLOYMENT

Before venue/demo:

• Test production URL
• Test backend
• Test AI
• Test Git
• Test demo project
• Prepare local fallback


48. PRODUCTION FALLBACK

If internet or deployment fails:

Maintain a local development version that demonstrates the core workflow.

Do not rely exclusively on the live deployment.


49. RELEASE DEFINITION

A release is ready when:

CODE
+
TESTS
+
SECURITY
+
DEPLOYMENT
+
DEMO

are verified.


50. FINAL DEPLOYMENT PRINCIPLE

Deploy:

SIMPLE
→
SECURE
→
REPEATABLE
→
MONITORED


END OF 11_DEPLOYMENT.md


---

# APPENDIX A — Concrete Production Deployment Runbook (verified against this repo)

These steps require human access to hosting providers. Nothing below is
pre-filled with invented credentials or URLs.

## A.1 Database (Supabase PostgreSQL)

1. Create a Supabase project (supabase.com) — requires the user's account.
2. From Project Settings → Database, copy the **connection string** and
   convert it to an async SQLAlchemy DSN:
   `postgresql+asyncpg://<user>:<password>@<host>:5432/postgres`
3. Store it as `DATABASE_URL` in the backend host's environment/secret
   manager. Do NOT put it in Git.

## A.2 Backend (Render — `render.yaml` blueprint included)

1. New → Blueprint → point at this repo (or create a Web Service manually):
   - Root directory: `03-backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/api/v1/health`
2. Environment variables (Render dashboard → Environment):
   - `ENVIRONMENT=production`
   - `DATABASE_URL` = Supabase DSN from A.1
   - `AUTH_SECRET` = output of `openssl rand -hex 32` (≥32 chars)
   - `BACKEND_CORS_ORIGINS=["https://<your-frontend-domain>"]`
   - optional: `GEMINI_API_KEY`/`OPENAI_API_KEY`, `GITHUB_CLIENT_ID/SECRET`,
     `GITHUB_REDIRECT_URI=https://<backend-domain>/api/v1/github/callback`
3. The app refuses to boot in production with the dev secret, wildcard CORS,
   or a non-PostgreSQL `DATABASE_URL` — this is intentional.
4. First boot auto-creates tables via SQLAlchemy metadata. To use Alembic
   instead: `alembic upgrade head` with `DATABASE_URL` set.

## A.3 Frontend (Vercel — `02-frontend/vercel.json` included)

1. Import the repo in Vercel, set **Root Directory** to `02-frontend`.
2. The included `vercel.json` sets the Vite build, `dist` output, and an SPA
   rewrite to `/index.html` (leaving `/api`, `/robots.txt`, `/sitemap.xml`,
   `/favicon*`, `/assets` untouched).
3. Environment variables (Vercel → Settings → Environment Variables):
   - `VITE_API_BASE_URL=https://<backend-domain>/api/v1`
   - optional: `VITE_ANALYTICS_ENDPOINT` (enables the consent banner only
     when set)
4. After deploy, verify `/`, `/about`, `/waitlist`, `/login`, `/app` (and a
   hard refresh on a deep link) all load.

## A.4 Cross-checks

- Backend CORS origin list must equal the exact frontend origin
  (scheme + host, no trailing slash).
- GitHub OAuth app callback must match `GITHUB_REDIRECT_URI` exactly.
- If a custom domain is added later, update: CORS origins,
  `VITE_API_BASE_URL`, `GITHUB_REDIRECT_URI`, `robots.txt`/`sitemap.xml`
  host, and the OAuth app settings — together.

Custom domain: NOT CONFIGURED (no domain provided; use provider URLs).
