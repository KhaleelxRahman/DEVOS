# API

Interactive OpenAPI documentation is served by FastAPI at `/docs` and
`/openapi.json`.

The versioned API prefix is `/api/v1`. Public endpoints include health,
waitlist, and contact. Authenticated resources include auth, projects, files,
Git, terminal, testing, AI, activity, workspace, and GitHub integration.

GitHub OAuth contract:

- `POST /api/v1/github/connect`
- `GET /api/v1/github/callback`
- `GET /api/v1/github/repositories`

See the detailed [API specification](../01-docs/07_API_SPECIFICATION.md).
