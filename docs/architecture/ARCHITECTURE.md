# Architecture

DEVOS v1.0.0 uses a Vite React client and FastAPI service. The client calls JSON
endpoints under `/api/v1`; the service enforces authentication and owner
scoping before accessing project storage, Git, terminal, AI, or GitHub.

SQLite is the default local database. PostgreSQL is supported for deployment.
GitHub access tokens remain server-side and terminal commands execute without a
shell from an explicit allowlist.

See [API](./API.md), [Security](../security/SECURITY.md), and
[Deployment](../deployment/DEPLOYMENT.md).
