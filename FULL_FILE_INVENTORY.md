# FULL FILE INVENTORY - DEVOS v1.0.0

**Generated:** 2026-09-19
**Scope:** Entire repository, file by file, excluding: node_modules/, __pycache__/, .pytest_cache/, .ruff_cache/, .venv/, .dist/, .vercel/, test-results/

Work in this order, ONE group at a time:

GROUP 1: Root Files
GROUP 2: .devos/
GROUP 3: 01-docs/
GROUP 4: 02-frontend/
GROUP 5: 03-backend/
GROUP 6: 04-tests/
GROUP 7: 05-qa-agent/
GROUP 8: DEVOS/
GROUP 9: config/
GROUP 10: memory-bank/

For EVERY file: path, type (code/config/doc/license/secret-config/other), line count or byte size, one-paragraph summary of what the file actually contains/does, and for secret files: key names only (never values).

---

## Group 1: Root Files

#### .editorconfig (296 bytes, 24 lines)
Type: config
Purpose: EditorConfig — sets UTF-8 charset, LF line endings, space indent (2 spaces default, 4 for .py), inserts final newline, trims trailing whitespace. CRLF overrides for .bat/.cmd/.ps1. No trim for .md files.
Git: TRACKED. Secrets: None.

#### .env.example (1174 bytes, 35 lines)
Type: config/template (no real secrets)
Purpose: Root-level environment configuration template. Documents all required and optional env vars: ENVIRONMENT, API_V1_STR, PROJECT_NAME, BACKEND_CORS_ORIGINS, DATABASE_URL (PostgreSQL + SQLite fallback comment), AUTH_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, PROJECTS_STORAGE_PATH, AI_PROVIDER, GEMINI_API_KEY, OPENAI_API_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI, FRONTEND_URL.
Git: TRACKED (expected - template). Secrets: NONE - all placeholder/example values.

#### .env.generated (772 bytes, 21 lines)
Type: secret-config
Purpose: Auto-generated env config with actual runtime values. Keys present (values REDACTED): ACCESS_TOKEN_EXPIRE_MIN, AI_API_KEY (placeholder: PASTE_GOOGLE_AI_STUDIO_API_KEY), AI_MODEL (gemini-2.5-flash), AI_PROVIDER (google), API_V1_STR, AUTH_SECRET (**REAL VALUE - needs rotation**), BACKEND_CORS_ORIGINS, DATABASE_URL (placeholder: PASTE_NEON_DATABASE_URL), ENVIRONMENT, FRONTEND_APP_URL, FRONTEND_URL, GITHUB_CLIENT_ID (placeholder), GITHUB_CLIENT_SECRET (placeholder), GITHUB_REDIRECT_URI, JWT_ALGORITHM, OPENAI_API_KEY (placeholder), PROJECTS_STORAGE_PATH, PROJECT_NAME, TERMINAL_MAX_OUTPUT_CHARS, TERMINAL_TIMEOUT_SECONDS, VITE_API_PROXY_TARGET.
Git: IGNORED (.gitignore .env*). Secrets: AUTH_SECRET has real 64-char hex value. All other keys have placeholder stubs.

#### .env.local (1336 bytes, 2 lines)
Type: secret-config
Purpose: Vercel CLI local env file. Single key: VERCEL_OIDC_TOKEN - a live JWT bearer token (very long base64 value).
Git: IGNORED (.gitignore .env*). Secrets: VERCEL_OIDC_TOKEN - LIVE Vercel OIDC token (project devos, org khaleelxrahman-projects, env production). NEEDS ROTATION.

#### .gitattributes (295 bytes, 18 lines)
Type: config
Purpose: Git line-ending normalization. Default: * text=auto eol=lf. CRLF for .bat/.cmd/.ps1. LF for .sh/.py/.ts/.tsx/.js/.jsx/.json/.md/.yml/.yaml/.css/.html.
Git: TRACKED. Secrets: None.

#### .gitignore (610 bytes, 42 lines)
Type: config
Purpose: Root gitignore. Patterns: node_modules/, __pycache__/, .pytest_cache/, .ruff_cache/, .vercel/, .dist/, .coverage, *.pyc, 02-frontend/dist/, 02-frontend/.vercel/, 03-backend/logs/, 03-backend/__pycache__/, 03-backend/.ruff_cache/, **/__pycache__/, .lighthouseci/, coverage/, htmlcov/, 04-tests/__pycache__/, *.log, .vercel, .env*, .env.generated, 03-backend/data/, 05-qa-agent/test-results/, 05-qa-agent/screenshots/, 05-qa-agent/videos/, 05-qa-agent/traces/, playwright-report/, test-results/, playwright/.cache/, *.db, *.db-journal, *.sqlite3, DEVOS/. Lines 23 and 42 duplicate .env*; line 24 .env.generated is redundant with line 23.
Git: TRACKED. Secrets: None.

#### .markdownlintignore (84 bytes, 6 lines)
Type: config
Purpose: Markdown lint ignore patterns: node_modules/, 02-frontend/node_modules/, .dist/, .vercel/, .pytest_cache/, .ruff_cache/.
Git: TRACKED. Secrets: None.

#### CHANGELOG.md (114 bytes, 7 lines)
Type: doc
Purpose: Minimal changelog. Single entry under Unreleased: repository restructure completed, documentation updated, legal files added.
Git: TRACKED. Secrets: None.

#### CODE_OF_CONDUCT.md (103 bytes, 5 lines)
Type: doc
Purpose: Minimal code of conduct. 3 rules: be respectful, report security issues privately, keep discussions constructive.
Git: TRACKED. Secrets: None.

#### CONTRIBUTING.md (204 bytes, 7 lines)
Type: doc
Purpose: Basic contributing guidelines. 5 steps: fork, feature branch, focused changes, run checks before PR, submit PR with clear description.
Git: TRACKED. Secrets: None.

#### COPYRIGHT.md (5687 bytes, 265 lines)
Type: doc (legal)
Purpose: Comprehensive copyright & legal notice. Sections: Ownership (Copyright 2026 Md Khaleel Ur Rahman), Licensing (Apache 2.0), Original Works list (backend, frontend, diagrams, docs, config, DB schema, API design, auth/security, terminal sandbox, AI context engine), Third-Party Works (React/TS/Vite MIT, FastAPI/SQLAlchemy/pydantic MIT, lucide ISC, external APIs), Prohibited uses (DEVOS name/branding, custom UI/UX, architectural decisions, business logic, documentation), Trademark notice, Brand assets, Documentation ownership, Code modifications rules, Security disclosure policy, Enforcement (cease/desist, DMCA, legal action, removal from GitHub, damages), FAQ (forking, commercial use, removing notices, claiming DEVOS, using name/logo, CLA), History & Attribution (iQOO Hackathon 2026).
Git: TRACKED. Secrets: None.

#### DEVOS v1.0.0.code-workspace (119 bytes, 10 lines)
Type: config (VS Code workspace)
Purpose: VS Code workspace file. Opens repo root as single folder. Window title: DEVOS v1.0.0.
Git: TRACKED. Secrets: None.

#### DELETE_REPORT.md (7323 bytes, 87 lines)
Type: doc (prior audit report)
Purpose: Report from prior Phase 9 delete pass. Documents: 7 files deleted (empty logs, duplicate build logs, superseded inventory/tree artifacts), 15 files in Needs Manual Review (logs, .coverage, .env.generated, .env.local), 16 canonical root scaffold files kept. References .env.local Vercel OIDC token rotation requirement (Phase 0).
Git: TRACKED (staged as 'A'). Secrets: References Vercel OIDC token but does NOT contain the value.

#### DUPLICATE_AUDIT.md (46612 bytes, 538 lines)
Type: doc (prior audit report)
Purpose: Prior duplicate file audit. Lists empty files in .venv/ (scipy wheel, py.typed files, REQUESTED files, __init__.py files) and LICENSE duplicates across pip packages. .venv/-scoped, not source code.
Git: TRACKED (staged as 'A'). Secrets: None.

#### DUPLICATE_FILENAME_REPORT.md (15049 bytes, 182 lines)
Type: doc (prior audit report)
Purpose: Prior duplicate filename audit. Lists LICENSE files (130 instances) across .venv/ site-packages. .venv/-scoped, not source code.
Git: TRACKED (staged as 'A'). Secrets: None.

#### FULL_FILE_INVENTORY.md (1659 bytes, in progress)
Type: doc (this file - audit inventory)
Purpose: Comprehensive inventory of every file in the repository. Currently being written - Group 1 only so far.
Git: UNTRACKED (generated during audit). Secrets: None.

#### LICENSE (9275 bytes, 169 lines)
Type: license
Purpose: Apache License 2.0 full text. All 9 sections: Definitions, Grant of Copyright License, Grant of Patent License, Redistribution, Submission of Contributions, Trademarks, Disclaimer of Warranty, Limitation of Liability, Accepting Warranty or Additional Liability. Copyright 2026 Md Khaleel Ur Rahman.
Git: TRACKED. Secrets: None.

#### POST_MIGRATION_REPORT.md (2753 bytes, 105 lines)
Type: doc (prior migration report)
Purpose: Post-migration report from prior session. Git status (branch phase0-foundation-lock-20260901-2310, ahead by 2 commits, frontend/.gitignore staged), frontend npm install (102 packages, 2 vulnerabilities: 1 low, 1 moderate), frontend build output (Vite v8.2.2, dist with gzip sizes), frontend lint (tsc --noEmit), backend compile (folder listing), backend tests (pytest warning: no files in testpaths).
Git: UNTRACKED. Secrets: None.

#### README.md (6150 bytes, 187 lines)
Type: doc (main project README)
Purpose: Primary entry point. Badges (Python 3.13+, React 18, TypeScript 5, Apache 2.0, PWA). Project status table. Features table (Workspace/Intelligence/Delivery). Architecture diagram. Repo structure. Quick start (backend: venv + pip install + copy .env.example + uvicorn; frontend: npm ci + npm run dev). Screenshots note. Live demo links (devos-ebon.vercel.app, devos-backend-f3ub.onrender.com, verified Sept 4 2026). Release status (Release Candidate). Tech stack. Roadmap. Documentation links. Contributing. Support (email + phone). License & legal summary. Copyright. iQOO Hackathon 2026.
Git: TRACKED. Secrets: None.

#### SECURITY.md (112 bytes, 4 lines)
Type: doc (security policy)
Purpose: Minimal security policy. 2 lines: Report vulnerabilities privately. Do not publish exploits before responsible disclosure.
Git: TRACKED. Secrets: None.

#### check_state.py (2495 bytes, 56 lines)
Type: code (utility script)
Purpose: Diagnostic utility. Uses os.walk to list trees of docs/, 01-docs/, DEVOS/ (filtering ignore dirs). Checks frontend-local-final.log existence. Runs git status --short and git log -1 --oneline via subprocess (shell=True).
Git: UNTRACKED. Secrets: None.

#### frontend-local-final.log (377 bytes, 10 lines)
Type: log
Purpose: Frontend dev server log (final attempt). Vite v8.2.2 ready in 1290ms. Local: localhost:5173, Network: 192.168.0.115:5173. ANSI color codes.
Git: IGNORED (*.log). Secrets: None.

#### gen_group1.py (924 bytes, 31 lines)
Type: code (utility script - generated this session)
Purpose: Helper script that generates the Group 1 inventory skeleton. Lists root files and writes Markdown table to FULL_FILE_INVENTORY.md.
Git: UNTRACKED. Secrets: None.

#### p2c-prod-run.log (3262 bytes, 61 lines)
Type: log (Playwright test run)
Purpose: Phase 2C production Playwright test run. 1 test, 1 worker. Test: Phase 2C PRODUCTION QUALITY CHAIN (tests-live/prod-phase2c-quality.spec.ts:109:5). Steps: deployment probe (401), register+login OK (qa.phase2c.1789308391970@example.com), project created (2e8bbe9b), empty-project detection honestly unsupported, fixture package.json via files API, real detection: BUILD/LINT/TYPECHECK/TEST visible. 1 FAILED: expect(locator).toBeVisible() for COMPLETED exit 0 badge. Timeout 120s. Screenshot + trace attached.
Git: IGNORED (*.log). Secrets: Contains real test email address (qa.phase2c.1789308391970@example.com).

#### package-lock.json (193 bytes, 12 lines)
Type: config (npm lockfile)
Purpose: Minimal npm lockfile v3. Root package: devos-workspace 1.0.0. No deps at root (monorepo - real deps in 02-frontend/package.json).
Git: TRACKED. Secrets: None.

#### package.json (523 bytes, 12 lines)
Type: config (npm manifest)
Purpose: Root npm package.json. Private monorepo root. Description: DEVOS v1.0.0 monorepo root. Scripts: test:e2e (delegates to 02-frontend), build (delegates to 02-frontend), test:backend (python -m pytest 04-tests), dev (delegates to 02-frontend).
Git: TRACKED. Secrets: None.

#### phase11_complete.py (4478 bytes, 122 lines)
Type: code (utility script)
Purpose: Phase 11 completion script. Handles repo restructuring: safety git tag, 01-docs/ to docs/ rename, DEVOS/ to docs-source/ rename, config/ruff.toml move, .github/ workflows update, pyproject.toml/CODE_OF_CONDUCT.md/CONTRIBUTING.md/README.md/CHANGELOG.md/PHASE0_FINAL_REPORT.md reference updates, file deletions, build checks. Functions: log(), run(), count_files_in_tree(), count_files(), ensure_dir_empty(), move_folder(), update_file_references(), run_build_checks().
Git: MODIFIED (not staged). Secrets: None.

#### pyproject.toml (104 bytes, 6 lines)
Type: config (Python project)
Purpose: Ruff linter config. [tool.ruff]: line-length=100, exclude=[04-tests]. [tool.ruff.lint]: select=[E4, E7, E9, F] (pycodestyle errors + pyflakes).
Git: TRACKED. Secrets: None.

#### pyrightconfig.json (99 bytes, 9 lines)
Type: config (type checker)
Purpose: Pyright config. include=[03-backend, 04-tests], extraPaths=[03-backend]. Has UTF-8 BOM.
Git: TRACKED. Secrets: None.

#### pytest.ini (131 bytes, 5 lines)
Type: config (test runner)
Purpose: Pytest config. testpaths=04-tests, pythonpath=03-backend, asyncio_mode=auto, addopts=--cov=03-backend/app --cov-report=term-missing.
Git: TRACKED. Secrets: None.

#### requirements.txt (34 bytes, 5 lines)
Type: config (Python deps)
Purpose: Python backend dependencies (5 packages): fastapi, uvicorn, pytest, ruff, black.
Git: TRACKED. Secrets: None.

#### run_phase11.py (3777 bytes, 106 lines)
Type: code (utility script)
Purpose: Phase 11 clean completion - minimal script. Creates safety git tag, renames 01-docs/ to docs/, renames DEVOS/ to docs-source/, related cleanup. Functions: log(), run().
Git: UNTRACKED (staged as 'A'). Secrets: None.
