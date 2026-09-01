# Deployment

The repository includes a [Render blueprint](../../config/render.yaml) and Vercel
configuration at [`02-frontend/vercel.json`](../../02-frontend/vercel.json).

Set backend secrets and origins only in the hosting provider. Set frontend
`VITE_API_BASE_URL` to the verified API prefix ending in `/api/v1` and
`VITE_SITE_URL` to the owned frontend origin before building.

Follow the [deployment checklist](./DEPLOYMENT_CHECKLIST.md) and
[rollback plan](./ROLLBACK_PLAN.md). No provider account, domain, DNS, or
secret is committed here.
