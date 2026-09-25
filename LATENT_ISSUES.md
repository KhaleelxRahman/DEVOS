# Latent Issues

## Stale project context generator

- **Status:** Open
- **Area:** Backend context tooling
- **Observed:** 2026-09-25

`backend/data/context/project_context.json` contains 94 paths beginning with
`02-frontend`. The dormant context-search reader
(`backend/app/services/context/file_context_service.py`) parses this file when
invoked, so the stale paths could produce incorrect search results if that
feature is registered or called.

The existing generator, `backend/scripts/build_context.py`, cannot currently
refresh the file after the Phase 11 reorganization. It writes to the removed
`03-backend/data/context/project_context.json` path and fails with
`FileNotFoundError`; the current file is under `backend/data/context/`.

The active AI endpoints use `ContextService` and project data loaded through
`FileService`, not this generated snapshot. The context-search router is not
currently included by the main API router. Repair or replace the generator as a
separate scoped task rather than changing it as part of the directory cleanup.
