# DEVOS Phase 1 — Architecture Decision Record (GATE 0/1/2 entry)

Branch: phase0-foundation-lock-20260901-2310 (HEAD 6643a02c). Phase 1 work preserves history; no reset/clean/force-push.

## 1. Existing architecture (verified from repo)

- Backend (FastAPI, async-first): `03-backend/app/main.py` (ApiResponse envelope, AppException handlers, CORS, /api/v1/health), `api/v1/router.py` mounts projects/files/ai/terminal/testing/github routers. Auth: `api/deps.py get_current_user` (Bearer JWT) + `services/auth_service.py`. Per-request `db/session.py get_db` (aiosqlite local, asyncpg prod). Config: `core/config.py` (AI_PROVIDER mock|gemini|openai, PROJECTS_STORAGE_PATH, production safety gate).
- Projects: `models/project.py` + `services/project_service.py` (owner-scoped CRUD, storage path per project id) + `api/v1/projects.py` (POST/GET/PATCH/DELETE + context/activity).
- Filesystem: `services/file_service.py` — `validate_safe_path` (containment: normpath, abs check, drive/UNC/traversal rejection), `is_sensitive` (.env/credentials block), hidden-file block, 2MB caps; `create_file/create_folder/save_file/rename/delete/move`, `get_file_content`. `api/v1/files.py` thin wrappers, owner check via ProjectService.
- AI: `services/ai_service.py` (mock|gemini|openai, SSE token streaming), `api/v1/ai.py` (/chat, /chat/stream SSE, /actions, /conversations, /artifacts). `services/conversation_service.py`, `services/artifact_service.py` (Artifact model: project/user/conversation/message, kind/content/metadata).
- Frontend: `02-frontend/src/api/client.ts` (ApiResponse<T>, Bearer from devos_token, stream() SSE parser) + `api/index.ts` (projectsApi/filesApi/aiApi/terminalApi/githubApi). `pages/WorkspacePage.tsx` composes FileExplorer + CodeViewer (Monaco) + AIPanel + ArtifactPanel; `onWorkspaceChanged -> fileRefreshToken`. `components/workspace/AIPanel.tsx` = planner scaffold (PlannerIntent/PlannerTask, requirements classification, plan buttons) + composer + SSE stream consumer. `CodeViewer.tsx` tabs/dirty/save, `FileExplorer.tsx` tree + refreshToken, `ArtifactPanel.tsx` list/preview/copy/download/delete.
- Tests: `04-tests/` (pytest, isolated sqlite+storage via conftest) + `05-qa-agent/tests-live/*` (Playwright, Phase 0 configs).

## 2. Current extension point

Phase 1 builder = NEW vertical reusing all existing mechanisms: auth/deps, ApiResponse/AppException, ProjectService, FileService (path/security), AIService (streaming), Conversation/Artifact (provenance), apiClient/SSE, FileExplorer/CodeViewer (sync/inspect/edit/save). No second system.

## 3. Files to modify (minimal diff)

- Backend NEW: `models/generation.py`, `schemas/builder.py`, `services/builder_service.py`, `api/v1/builder.py`; EDIT `api/v1/router.py` (mount), `models/__init__.py`, `schemas/__init__.py` (exports). Alembic: rely on create_all bootstrap (like existing models); add migration only if chain requires it.
- Frontend NEW: `types/builder.ts`, `components/workspace/BuilderPanel.tsx`; EDIT `api/index.ts` (builderApi), `pages/WorkspacePage.tsx` (mount panel + wire refresh/open), optionally `components/workspace/AIPanel.tsx` ONLY via props (no god-component growth).
- Tests NEW: `04-tests/api/test_builder.py` (contract/transaction/security/integrity/negative), `05-qa-agent/tests-live/prod-phase1-builder.spec.ts` + `playwright.phase1-builder.config.ts`.

## 4. New files required + why

Builder needs persistent transaction identity (Generation model) — no existing table stores generation_request_id/status/file lists. Needs normalized-spec + plan + integrity schemas (builder schemas) — no existing schema covers EXPLICIT/INFERRED/OPTIONAL/UNSUPPORTED classification or planned-vs-actual checks. Needs generation orchestration (builder_service) — FileService writes single files; AI service chats; neither normalizes specs, validates stacks, templates multi-file apps, checks cross-file consistency, or reconciles retries by identity.

## 5. Existing code being reused

get_current_user, get_db, ApiResponse, AppException (+ FILE_* codes), ProjectService (ownership/storage), FileService (validate_safe_path/is_sensitive/create/save), AIService (stream provider), Conversation/Artifact services (link generation provenance), apiClient (+stream), FileExplorer/CodeViewer/AIPanel patterns, pytest conftest isolation, Playwright live configs.

## 6. Duplicate approaches rejected

Second auth/session layer; second file-writer bypassing FileService; second streaming protocol (WS) beside SSE; parallel project store; new editor replacing Monaco; autonomous executor (shell/build/test/deploy/GitHub push) — explicitly OUT of Phase 1 boundary.

## 7. Regression surfaces

router mount (no route collisions: `/projects/{id}/builder/*`); migration bootstrap; api/index.ts exports; WorkspacePage layout; AIPanel untouched behavior; FileService caps; rate limits; CORS (same envelope).
