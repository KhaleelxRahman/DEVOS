# DEVOS v1.0.0 Deployment Checklist

## Frontend

- [ ] Set `VITE_API_BASE_URL` to the deployed API URL ending in `/api/v1`.

- [ ] Set `VITE_SITE_URL` to the owned frontend origin before building.

- [ ] Run `npm ci && npm run build`.

- [ ] Configure SPA fallback to `index.html`.

- [ ] Verify `/manifest.webmanifest`, `/robots.txt`, and `/sitemap.xml`.

## Backend

- [ ] Set `DATABASE_URL`, `AUTH_SECRET`, and `BACKEND_CORS_ORIGINS`.

- [ ] Set GitHub OAuth credentials and callback URL.

- [ ] Set `FRONTEND_APP_URL` to the deployed frontend origin.

- [ ] Verify `/api/v1/health` returns a healthy response.

## Smoke test

- [ ] Register and log in.

- [ ] Create a project and open the workspace.

- [ ] Create a file, run an allowlisted command, and inspect Git status.

- [ ] Connect GitHub and browse repositories.

## Release readiness

- [ ] Confirm the [CI workflow](../../.github/workflows/ci.yml) passes for the
      release commit (backend lint/tests and frontend build).

- [ ] Confirm the [security workflow](../../.github/workflows/security.yml)
      passes, including dependency and secret scans.

- [ ] Confirm the [DEVOS v1.0.0 changelog](../releases/CHANGELOG.md) and
      [release notes](../releases/RELEASE_NOTES.md) match the shipped version.

- [ ] Record the deployed frontend/API URLs and rollback target in the release
      record; do not add credentials or tokens.
