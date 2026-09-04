# DEVOS Production QA Report

**Product:** DEVOS v1.0.0  
**Audit:** Phase 17 production QA  
**Status:** Evidence-based audit  
**Date:** 2026-09-04

## Executive summary

The local application validation gate is green. The Vercel production alias
responded with HTTP 200 during this audit. The Render endpoint probes timed out
in the same run, so backend live availability and end-to-end production
connectivity remain unverified.

No deployment, source-code, asset, or configuration changes were made as part
of this audit.

## Deployment verification

| Surface | Result | Evidence |
| --- | --- | --- |
| Vercel frontend `https://devos-ebon.vercel.app` | Verified reachable | `curl` returned HTTP 200 and the canonical URL |
| Render `/health` | Not verified in this run | Probe timed out after 15 seconds |
| Render `/api/v1/public` | Not verified in this run | Probe timed out after 15 seconds |
| HTTPS | Frontend URL uses HTTPS | URL and successful response verified |
| Login and OAuth | Not production-verified | Requires a live backend and approved credentials |

The Vercel deployment previously inspected as Ready was not redeployed during
this audit.

## Frontend QA

Executed from `02-frontend`:

- `npm run lint` — passed
- `npm run type-check` — passed
- `npm run build` — passed
- `npm run test:e2e` — 30 passed

Playwright covered authentication, protected-route redirects, navigation,
workspace recovery, settings/GitHub states, planner and repository surfaces
using the repository's deterministic API mocks.

## Backend QA

Executed from the repository root:

- `python -m pytest .\04-tests` — 50 passed
- Coverage report — 78% total statement coverage

The test suite covers authentication, files, terminal restrictions, Git, AI,
testing, health, projects, public endpoints, and core security helpers.

## Manual product surfaces

The source and automated tests cover the following surfaces:

- Landing, login, registration, and not-found routes
- Dashboard, projects, settings, and workspace
- File explorer and code viewer
- Terminal, Git, testing, and AI panels
- Repository dashboard
- Planner and QA audit flows

Live production interaction with protected workspace features was not claimed
because the Render backend probe timed out.

## Rollback and repository state

- The repository remains on the existing branch.
- No deployment was initiated.
- The pre-deployment rollback tag remains available.
- No files were deleted or overwritten.

## Limitations

- A Lighthouse run was not performed; no Lighthouse scores are reported.
- The Playwright configuration runs Chromium at 1280 × 720 only.
- Dedicated 320, 375, 768, and 1024 px automated viewport runs are not present.
- Render availability was inconclusive because the probes timed out.

