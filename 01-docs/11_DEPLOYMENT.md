DEVOS — DEPLOYMENT SPECIFICATION

Document: 11_DEPLOYMENT.md
Product: DEVOS
Version: 1.0
Status: Active Development


1. PURPOSE

This document defines how DEVOS moves from local development to production.


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

API_BASE_URL


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

GET /health

Expected:

{
  "success": true,
  "status": "online",
  "service": "DEVOS API"
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

As DEVOS grows:

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


47. HACKATHON DEPLOYMENT

Before venue/demo:

• Test production URL
• Test backend
• Test AI
• Test Git
• Test demo project
• Prepare local fallback


48. HACKATHON FALLBACK

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
