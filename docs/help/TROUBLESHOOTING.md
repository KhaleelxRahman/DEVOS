# Troubleshooting

**API unreachable:** start FastAPI on port 8000 and check `/api/v1/health`.
For Vite, verify `VITE_API_PROXY_TARGET` or `VITE_API_BASE_URL`.

**Empty projects:** confirm the active account is authenticated and inspect the
Projects page before opening Workspace.

**GitHub not connected:** configure OAuth credentials and callback URL in the
backend environment; tokens are never configured in the frontend.

**Terminal command blocked:** only the documented development allowlist is
accepted; shell chaining, interpreter evaluation, package installation, and
sensitive operations are intentionally rejected.
