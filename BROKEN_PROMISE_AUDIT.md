# Broken-Promise Audit

System-wide audit of every nav item, button, menu entry and workspace panel in
`frontend/src/components/layout/` and `frontend/src/components/workspace/`,
traced against the real backend routes in `backend/app/api/v1/`.

**Question asked of each item:** not "does the button exist and is it clickable"
but "does it do the real thing its label claims?"

Classification:
- **WORKING** — verified a real backend endpoint or real frontend logic backs the claim.
- **PARTIAL** — real behavior exists but incomplete, or the UI overstates what runs.
- **BROKEN PROMISE** — the label implies functionality that does not exist.

---

## Summary

| # | Item | Location | Claimed behavior | Actual behavior | Class |
|---|---|---|---|---|---|
| 1 | Deploy nav item | `layout/Sidebar.tsx:105-113` | Navigate to deployments | `<div>`, no `href`, greyed, "Soon" badge. Click does not navigate (verified) | **RESOLVED** |
| 2 | Deploy icon button | `layout/TopBar.tsx:130-136` | Navigate to deployments | `<span>`, no `href`, greyed, tooltip "coming soon" (verified) | **RESOLVED** |
| 3 | "Open deployment" command | `layout/CommandPalette.tsx:28` | Run a command | `disabled: true`, `aria-disabled`, hint "Coming soon"; other 9 commands unaffected (verified) | **RESOLVED** |
| 4 | Deploy status chip | `DashboardPage.tsx:102` | Show deploy readiness | Literal "Coming soon"; no longer derived from `activeProject` | **RESOLVED** |
| 5 | Deploy page | `ProjectsPage.tsx:82-91` | Deployment status | States plainly it is unavailable and not connected to any hosting provider | **RESOLVED** |
| 6 | GitHub nav item | `layout/Sidebar.tsx:101-104` | "Open GitHub" | Now `/app/settings`, where the real GitHub UI lives. Was `/app/projects?github=1`, which no file ever read | **RESOLVED** |
| 7 | GitHub icon button | `layout/TopBar.tsx:127-129` | "GitHub" | Same destination: `/app/settings` | **RESOLVED** |
| 8 | "Open GitHub" command | `layout/CommandPalette.tsx:27` | Navigate to GitHub | Same destination: `/app/settings` | **RESOLVED** |
| 9 | **"AI Ready" badge** | `layout/TopBar.tsx:117-119` | AI provider is ready | **Hardcoded string.** Backend `/ai/provider` returns real `is_mock`/`configured`; `AI_PROVIDER=mock` is the default, so this displays "Ready" while running a labelled local mock | **BROKEN PROMISE** |
| 10 | **"AI / Ready" chip** | `DashboardPage.tsx:96` | AI assistant is ready | **Hardcoded `<Badge>Ready</Badge>`.** Same defect as #9 | **BROKEN PROMISE** |
| 11 | Git branch badge | `layout/TopBar.tsx:114-116` | Show current branch | Renders `activeProject.default_branch \|\| 'main'` — a client-side stored default, not a live `git rev-parse`. Never fetched from the running repo | **PARTIAL** |
| 12 | "New conversation" | `layout/Sidebar.tsx:~58-65` | Start a new chat | Links to `/app/dashboard`; a real composer that calls `aiApi.chat` on submit. Creates no record until the user sends | **PARTIAL** |
| 13 | Chat list / pin / delete | `layout/Sidebar.tsx:116-150` | Manage conversations | Real `aiApi.getConversations/updateConversation/deleteConversation`, all backed by live endpoints | **WORKING** |
| 14 | Settings nav + icon | `Sidebar.tsx:154-162`, `TopBar.tsx:138-140` | Open settings | Real page, real `users` + `github` + `health` calls | **WORKING** |
| 15 | Command palette entries | `layout/CommandPalette.tsx:20-29` | Navigate to a view | All resolve to real routes; fuzzy search + recents are real logic | **WORKING** |

---

## Key finding: GitHub is a *navigation* bug, not a *feature* bug

Unlike Deploy, the GitHub feature **is fully implemented**:
`github.py` has `connect`, `callback`, `connection` (GET/DELETE), `repositories`
— all real. `SettingsPage` uses them properly, including a clear
"GitHub OAuth is not configured on the server yet" notice.

The defect was a navigation bug: `?github=1` was written by three affordances
and **read by nothing**, so clicking "GitHub" landed on the generic Projects
list. Fixed by pointing all three at `/app/settings`, where the feature lives —
**not** by deleting them and **not** by building a new page. Verified two ways:
a grep sweep confirming no file ever read the parameter (only `deploy` is read,
by `ProjectsPage.tsx:22`), and a clean `tsc --noEmit` + production `vite build`.

Caveat: `GITHUB_CLIENT_ID` / `GITHUB_TOKEN` are empty in `backend/.env`, so
GitHub is functional code that cannot authenticate until configured. The
Settings page already discloses this.

## Key finding: "AI Ready" is the same class of lie as the old Deploy chip

The old Deploy chip rendered `"Ready"` whenever a project existed. The TopBar
"AI Ready" badge (hardcoded) and DashboardPage "Ready" badge (hardcoded) do the
same thing: assert readiness with no data behind them. The backend already
returns honest status — `is_mock`, `configured` — and `AIPanel` (row 20) already
displays it correctly. Rows 9–10 are a consistency defect, not a missing feature:
the fix is to render the value the API already returns.

Note: when `AI_PROVIDER` is properly configured these badges become *true*, so
this is a false statement rather than a permanently false feature — still worth
fixing, and it is the cheapest of the BROKEN PROMISE items.

---

## Verification method

- Grep sweeps over `backend/app/{api,services,models}` and `frontend/src`.
- Full backend route inventory extracted from every `@router.*` decorator.
- Frontend `*Api.*` call sites enumerated per workspace panel, then matched
  1:1 against backend routes.
- Items #1–#5 verified live in a running app (Vite 5173 + FastAPI 8011):
  a11y tree, computed styles, and a programmatic click that confirmed no
  navigation occurs.
- Row 28 caveat: verified by reading the route and the client type, not by
  executing a request.

| 16 | FileExplorer | `workspace/FileExplorer.tsx` | Browse/edit project files | 8 real calls → `files.py` (tree, search, create, rename, move, delete, upload) | **WORKING** |
| 17 | CodeViewer | `workspace/CodeViewer.tsx` | View & edit code | Controlled component; parent supplies tabs/content, saves via `filesApi.saveFile`. No direct API call by design | **WORKING** |
| 18 | GitPanel | `workspace/GitPanel.tsx` | Version control | 10 real calls → `git.py` (status, diff, commit, branches, log, stage, unstage, checkout, pull, push) | **WORKING** |
| 19 | TerminalPanel | `workspace/TerminalPanel.tsx` | Run allowlisted commands | Real `executions.py` lifecycle: create → run → poll → cancel. Phase 2H (uncommitted) | **WORKING** |
| 20 | AIPanel | `workspace/AIPanel.tsx` | AI assistant | Real `chatStream` + `runAction`; **honestly labels mock mode** (`is_mock` → "Local/Mock AI") — the correct pattern #9/#10 should follow | **WORKING** |
| 21 | BuilderPanel | `workspace/BuilderPanel.tsx` | Plan · Generate · Apply | 8 real calls → `builder.py` (classify, plan, start, status, stream, summary, apply, cancel) | **WORKING** |
| 22 | QualityPanel | `workspace/QualityPanel.tsx` | Run quality checks | Real `executions.py /quality/*`; **honestly surfaces `supported`/`available` refusals** | **WORKING** |
| 23 | TestingPanel | `workspace/TestingPanel.tsx` | Run test jobs | Real `listJobs` + `runJob` → `testing.py` | **WORKING** |
| 24 | PreviewPanel | `workspace/PreviewPanel.tsx` | Live preview | Real `previewApi` start/status/stop → `preview.py` | **WORKING** |
| 25 | HistoryPanel | `workspace/HistoryPanel.tsx` | Execution history | Real `executionApi` list/get/retry/cancel → `executions.py` | **WORKING** |
| 26 | ArtifactPanel | `workspace/ArtifactPanel.tsx` | Saved AI artifacts | Real `aiApi.listArtifacts/deleteArtifact` → `ai.py` | **WORKING** |
| 27 | RepositoryDashboard | `workspace/RepositoryDashboard.tsx` | GitHub connection status | Real `githubApi.getConnection/getRepos` → `github.py` | **WORKING** |
| 28 | healthApi.check | `api/index.ts` | Backend health | Route is real and shape matches (`{status, service}`). Shape mismatch risk: `health.py` returns a bare dict, not an `ApiResponse` envelope | **PARTIAL** |

**Totals: 3 PARTIAL (#11, #12, #28), 2 BROKEN PROMISE (#9, #10), 15 WORKING,
8 RESOLVED (#1–#8; #1–#5 in `e719340`, #6–#8 in the GitHub navigation fix).**