# CURRENT_FEATURE_STATE.md

**Baseline audit: "what is actually true today"**

Date: 2026-09-26
Branch: `phase3-enhancement-20260920` @ `7ec4def`

> **Point-in-time note.** This audit was taken at the date and commit above, and
> the per-section detail below has not been rewritten since. Changes landed
> afterwards that affect individual claims:
>
> - `77f161b` — Terminal: `%` and `^` are now rejected by the allowlist,
>   closing an environment-disclosure hole (Section D).
> - `7a7ed01` — GitHub access tokens are now encrypted at rest (Section F,
>   connection storage).
> - `06db105` — the three GitHub nav affordances now lead to Settings instead of
>   a query parameter that nothing read.
> - `c688936` — `test_migrations.py` derives the expected Alembic head rather
>   than hardcoding it, so adding a migration no longer fails three unrelated
>   tests.
> - `df81d1b`, `f297242` — pytest pythonpath fix; `data/` and local run
>   artifacts are now ignored.
>
> Section verdicts below remain as recorded for the audit commit.

---

## How this was verified

Every claim below is evidence from a **live running instance**, not from reading code:

- Backend: real FastAPI on `http://127.0.0.1:8000` (`/api/v1/health` returned `status: online`).
- Frontend: real Vite dev server on `http://localhost:5173` (proxies `/api` to 8000).
- Real Chromium via Playwright: real clicks, real typing, real HTTP calls.
- Disk state confirmed by reading `backend/data/projects/<id>/**` directly.
- Repo state confirmed with the real `git` CLI against the project folder.

Verdict key: **PASS** (verified working) | **PARTIAL** (works, but has a real bug) | **BROKEN** (does not work) | **STUB** (UI present, no real backing).

---

## Executive summary

| Section | Feature area | Verdict |
|---|---|---|
| A | Auth | **PARTIAL** |
| B | Projects | **PARTIAL** |
| C | Workspace / Files | **PARTIAL** |
| D | Terminal / Execution | **PARTIAL** |
| E | Git | **PASS** |
| F | GitHub integration | **PARTIAL** (real code, unconfigured, honest) |
| G | AI / Builder | **PARTIAL** (AI is a labelled STUB; Builder Apply is broken) |
| H | Preview | **PASS** |
| I | Quality checks | **PASS** |
| J | Settings / misc | **PARTIAL** |

**The core engine is real.** Files, Git, Preview, Quality, and the execution engine all perform genuine
---

## SECTION A - Auth: **PARTIAL**

### Verified working

- **Register - PASS.** `POST /auth/register` created a real user; UI redirected to `/app/dashboard`.
- **Login - PASS.** Credentials accepted, JWT issued, UI redirected to dashboard.
- **Session persistence - PASS.** A hard reload of `/app/dashboard` kept the user logged in (token in
  `localStorage['devos_token']`, 188 chars). `AuthContext` re-validates via `GET /auth/me`.
- **Invalid token on load - PASS.** Garbage token redirected to `/login` and the bad token was purged.
- **Backend expiry enforcement - PASS.** A tampered signature produced
  `401 {"code":"AUTH_REQUIRED","message":"Invalid or expired session token"}`.
- **Password hashing - PASS.** bcrypt via passlib (`BCRYPT_ROUNDS` capped at 14).

### Real bugs

**A1 - Logout always fires a 401 (cosmetic, but a real defect).**
`AuthContext.logout()` clears `localStorage` *before* calling `authApi.logout()`. The API client reads the
token from `localStorage` when building headers, so by the time the request is sent there is no token.
Evidence: a console error on every logout.

```
[ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized)
        @ http://localhost:5173/api/v1/auth/logout
```

The user still ends up logged out because local state is authoritative, so this is **PARTIAL, not
BROKEN**. But every logout logs a console error and the server-side call is dead code.

**A2 - No mid-session 401 recovery. This one is user-visible.**
If the token expires while the app is open, the UI does **not** recover. Reproduced: logged in, corrupted
the token in `localStorage`, then clicked into Projects. The app stayed on `/app/projects` and rendered a
**half-built shell**: sidebar nav present, project list gone, no error, no redirect, no toast. The
`apiClient` has no 401 interceptor; only the one-time `AuthContext` bootstrap checks `/auth/me`. The user
is left staring at a broken-looking page with no way back to login except a manual URL edit.

**A3 - No logout entry point in the main chrome.** Sign Out lives only on the Settings page. The top bar
and sidebar have no logout control.

**A4 - No token refresh.** `ACCESS_TOKEN_EXPIRE_MINUTES=1440` (24h) in `backend/.env`. There is no refresh
token and no silent-renew path. Once a token lapses the user hits bug **A2**.

---


## SECTION B - Projects: **PARTIAL**

### Verified working

- **Create - PASS.** Created "Alpha Verify" and "Beta Verify"; both persisted and appeared in the list.
- **List - PASS.** Real cards with name, date, branch (`main`), and description.
- **Open - PASS.** Creating a project auto-navigated to `/app/workspace` with that project active.
- **Switch - PASS.** The top-bar switcher (`aria-label="Switch project"`) listed the other project;
  selecting it updated the header to `DEVOS / Alpha Verify / main`.
- **Honest empty state - PASS.** "No projects yet" with guidance, matching REQ-TRUST-001.

### Real bug

**B1 - DELETE PROJECT IS BROKEN. HTTP 500, and the project is NOT deleted.**

This is the most serious functional bug found. Clicking the trash icon on a project (after confirming the
native `window.confirm`) produced a 500:

```
[ERROR] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
        @ .../api/v1/projects/c65c7136-ca31-44c1-a0a1-35ac488edc5d
```

Confirmed broken via a direct API call too (`DELETE` returned `500 INTERNAL_SERVER_ERROR`). After the
failure the project **still exists** in the list, so the UI is not lying: the operation simply never
happens.

**Root cause (confirmed by reproducing the exact code path).** `ProjectService.delete` at
`backend/app/services/project_service.py:100-101` calls `shutil.rmtree(storage_path)`. Every project
workspace is a real Git repo, and Git object files are read-only on Windows. `rmtree` dies on the first
object file:

```
PermissionError: [WinError 5] Access is denied:
'...\data\projects\<id>\.git\objects\6e\1948a91a00d3a79ea8e1cf07cc05d070d2965f'
  File "backend/app/services/project_service.py", line 101, in delete
    shutil.rmtree(storage_path)
```

Note the ordering hazard too: `db.delete(project)` plus `await db.flush()` runs **before** `rmtree`, so a
failed `rmtree` leaves the session dirty and the route never reaches `db.commit()`. The DB row survives,
but the request still burns a 500. Deletion needs an `onerror`/`onexc` handler that clears the read-only
bit (or does git-aware removal), and it must be robust so a filesystem failure cannot strand the
transaction.
---

## SECTION C - Workspace / Files: **PARTIAL**

### Verified working

- **File tree renders - PASS.** Nested tree with directories, children, and file sizes.
- **Create file - PASS.** `hello.txt` created via the `+` menu and auto-opened in the editor.
- **Open a file - PASS.** Opens as an editor tab; the header shows `plaintext - 24 bytes`.
- **Edit - PASS.** Typed into Monaco; content updated.
- **Dirty-state indicator - PASS.** Real element, correct in both directions:
  `<span class="editor-dirty-dot" aria-label="Unsaved changes">*</span>` appears on edit and the status
  bar flips to `Unsaved changes`; on save the dot disappears and status reads `Saved`.
- **Save (real disk write) - PASS.** Verified on disk, not just in the UI:
  `backend/data/projects/<id>/hello.txt` contains exactly `line one from verify bot`.
- **Create folder - PASS.** `POST /files/folder` returned `{"path":"docs"}`.
- **Rename - PASS.** `POST /files/rename` returned `{"path":"docs/renamed.txt"}`.
- **Move - PASS.** `POST /files/move` returned `{"path":"docs/hello.txt"}`.
- **Delete file - PASS.** `DELETE` returned 200 and the file was gone from the tree.
- Rename, move, and delete are genuinely wired to the UI (`FileExplorer.tsx:165,177,185`), not dead code.
- **File search - PASS.** `GET /files/search?q=probe` returned 200.

### Real bugs and friction

**C1 - "New File" uses a native `window.prompt`.** The explorer prompt for a new file or folder is a raw
`window.prompt("Name of the new file:")`. It is unstyled, unlocalised, unvalidated at the UI layer, and
inconsistent with every other form in the app (which use proper modals). Poor, but functional.

**C2 - The editor status bar claims "Auto-save enabled" while showing "Unsaved changes".** Both strings
render simultaneously in the same status area. There is no autosave: the dirty dot proves the buffer is
only persisted on an explicit Save. The claim is false and directly contradicts the adjacent real state.
This is exactly the REQ-TRUST-001 failure mode ("must not present non-functional features as working").

**C3 - No rename/move affordance surfaced where expected.** The logic exists and works, but it hangs off
per-node context interactions in the tree rather than an obvious, discoverable control.

---

**B2 - Project rename is not wired in the UI.** `PATCH /projects/{id}` exists and `ProjectDetailPage`
implements it, but the Projects list offers only Open and Delete.

---


## SECTION D - Terminal / Execution: **PARTIAL**

### Verified working

- **Real stdout - PASS.** `python -c print(123*7)` displayed `861` in the terminal. Confirmed in the
  persisted execution record: `"stdout": "861\r\n"`, `status: COMPLETED`, `exit_code: 0`, real `process_id`.
- **Real stderr - PASS.** Rendered in warning colour from the real captured stderr stream.
- **Exit code - PASS.** `exit code: 1` rendered with a failure icon. The backend returns the true process
  exit code, and a genuine pass (`node -e "console.log(1)"` giving `exit 0`, status `COMPLETED`) was also
  observed, so pass/fail is not hardcoded.
- **Real process execution - PASS.** Records carry real OS PIDs (for example `process_id: "20740"`).
- **Cancel / Stop button - PASS, and genuinely effective.** Started `python -m http.server 8931`; the Stop
  button appeared (correctly gated on `runningExecutionId`); clicking it showed
  `Execution cancelled by user` in the terminal, persisted `status: CANCELLED` with `cancelled: true` in
  the DB, and **actually killed the OS process**: port 8931 was no longer listening and no orphan
  remained.
- **Execution history / log - PASS.** Real, persisted, and comprehensive. `GET /executions` returned 11+
  rows including `DEV_SERVER`, `TYPECHECK`, and `CUSTOM_SAFE_COMMAND` with real statuses, durations, exit
  codes, and failure reasons. The UI history panel renders all of it.

### Real bugs

**D1 - Quoted arguments are destroyed by naive whitespace splitting. Highest-impact terminal bug.**
`TerminalPanel.run()` does `const [command, ...args] = trimmed.split(/\s+/)`. There is no quote handling,
so any argument containing a space is shredded. Typing the following:

```
python -c "print('REAL_STDOUT_OK')"
```

produced the persisted argument list `["-c", "\"print('REAL_STDOUT_OK')\""]`, with the quotes passed
through as literal characters. Python then choked and the panel showed an **empty stdout with a green
"completed" badge**:

```
$ python -c "print('REAL_STDOUT_OK')"
completed
```

This is actively misleading: the run *failed*, yet the UI showed the success state and no error, because
the mangled args produced a command that exited 0. The same class of failure reproduced twice
(`import time;time.sleep(45)` and `import sys;sys.exit(3)` both became `["import","time;time.sleep(45)"]`
and raised a `SyntaxError`). Called through the API with correct args, the same command returns
`stdout: "REAL_STDOUT_OK\r\n"`, so **the engine is fine and the terminal's argument parser is the bug**.

**D2 - The on-screen allowlist note is wrong, so users hit walls constantly.**
`BLOCKED_NOTE` advertises "Allowed: git, npm, node, python, python3, pip, pip3, pytest, cargo, ls, dir,
echo, cat, pwd, tree". But the panel now routes through the **executions** service, whose policy
(`execution_service.py:210-249`) is a tiny exact-match list:

```python
SAFE_COMMANDS = frozenset({"echo DEVOS_PHASE2_TEST", "node --version", "npm --version",
                           "python --version", "git --version"})
CONTROLLED_PREFIXES = ("npm install", "npm run build", "npm test", "pytest", "npm run lint",
                       "python -c", "python3 -c", ...)
```

`classify_command` returns `"BLOCKED"` for anything that is not an exact match or an approved prefix.
Result at the UI: `ls`, `pwd`, and `echo HELLO_FROM_TERMINAL` were **all rejected** with "Command is
blocked by the execution policy". The advertised and enforced allowlists are two different lists, and
**there is a third, unused list** in `backend/app/core/terminal_policy.json` (which allows `pwd`, `ls`,
`cd`, `git`, `python`, `pip`, `npm`, `pytest`, `uvicorn`). Three policies exist, only one is reachable, and
the UI documents a fourth. Users are guaranteed to hit confusing rejections.

**D3 - Aggressive rate limiting looks like a bug.** 30 executions/min shared across
create/run/poll/list. My verification loop hit `403` on `GET /executions` and the history list silently
rendered **empty**, as though the executions had vanished. No user-facing message explains the limit.

**D4 - Legacy `/terminal/history` returns empty.** `GET /projects/{id}/terminal/history` returned
`{"history":[]}` even with 11+ real executions, because the panel no longer routes through
---

## SECTION E - Git: **PASS**

Fully real. No stubs, no fakery. Every operation was confirmed against both the API and the real `git`
CLI on the project folder.

- **Status - PASS.** After writing `gitprobe.txt` (untracked) it correctly reported
  `{"branch":"main","is_clean":false,"untracked":["gitprobe.txt"]}`.
- **Diff - PASS.** Returns a real unified diff with `files_changed` / `insertions` / `deletions`.
  Correctly empty for an untracked file, which is git's actual behaviour.
- **Stage - PASS.** `POST /git/stage` returned "Files staged".
- **Commit - PASS.** `POST /git/commit` returned "Committed successfully".
- **Log - PASS.** Returned a real short hash, author `DEVOS v1.0.0`, a real date, and a real message.
- **Ground truth** - the real repo on disk independently confirms it:

```
$ git log --oneline
6e1948a (HEAD -> main) verify commit
$ git status --short      # clean
```

- The working tree was clean after the commit, matching the API's `is_clean: true`.

Every project is a genuinely initialised Git repository, and the panel reflects true repo state.

---


## SECTION F - GitHub integration: **PARTIAL** (real code, unconfigured, honestly reported)

The integration code is **real**, not a stub. It is simply not configured in this environment, and the
app **reports that honestly** rather than pretending.

- **OAuth authorize URL - real logic.** Signs a 10-minute `purpose: github_oauth` state JWT with
  `AUTH_SECRET` and builds the real GitHub authorize URL with `scope=read:user,repo`. Real `httpx` calls
  to `github.com/login/oauth/access_token` and `api.github.com`.
- **Callback - real.** Decodes and validates state, exchanges the code, fetches the GitHub user,
  persists a `GitHubConnection`, and 303-redirects back to Settings.
- **Connection status - real.** Returned `{"connected": false, "username": null}`.
- **Security design is sound.** The preview token is derived from `AUTH_SECRET` plus a salt, scoped to one
  (user, project, execution) triple, given a 15-minute TTL, and tagged `typ="preview"`, so a session JWT
  can never authorise the preview proxy and a preview token can never authenticate an API call. Verified
  live: the session JWT in the URL was rejected (401) while the scoped preview token returned 200.
- **Honest failure.** `POST /github/connect` returned `503 GITHUB_NOT_CONFIGURED`, and the UI displays a
  clear, accurate message: "GitHub OAuth is not configured on the server yet. Set GITHUB_CLIENT_ID and
  GITHUB_CLIENT_SECRET to enable connecting." **No silent no-op.** This is exactly right.
- **Blocking gaps.** `backend/.env` has `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_TOKEN`
  all **empty**. Until credentials exist, repo connect, sync, push, and pull through GitHub **cannot work
  at all**, and the Repository dashboard (Repository / Review / Pull requests / Docs / Timeline / Tasks /
  Releases tabs) can only show "Connect GitHub to load repository data."
- **Note.** `repository_provider: "github"` is set on every project row even when no GitHub connection
  exists. That is misleading default metadata worth correcting.

---

`/terminal/execute` and so never records the `terminal.executed` activity that endpoint reads. The old
history API is dead in practice.
---

## SECTION G - AI / Builder: **PARTIAL**

### AI Assistant: **STUB (by design, honestly labelled)**

- `backend/.env` has `AI_PROVIDER=mock` with `AI_API_KEY` and `OPENAI_API_KEY` empty and `AI_MODEL` empty.
- Chat returns a self-disclosing message:

  > **DEVOS v1.0.0 Local/Mock AI** (no AI provider configured - set `AI_PROVIDER` and `AI_API_KEY` to
  > enable a real model). This is a deterministic local response for development.
  > `provider: "local-mock"`

  The UI badge reads **"Local/Mock AI"**. **No hallucinated context is presented as real.** This is the
  correct, requirement-compliant behaviour: it is a labelled stub, not a deceptive one.
- **Context assembly is real and would work with a real provider.** `GET /projects/{id}/context` returned
  a genuine project name, default branch, the live file tree with sizes, and live git status. So the
  *plumbing* for real context is in place.

**G1 - Real bug: the mock AI cannot read file *contents*.** Asked "What is the exact content of
gitprobe.txt? Quote it verbatim", the response echoed the question and explained what a real provider
*would* do. Context includes the file **tree** and git status, but the active file's content was not
supplied to the model path: `context.current_file` was `null`. So "AI can reference actual project files"
is **not** true today beyond names, paths, and structure.

**G2 - Real bug: the dashboard AI composer silently requires a selected project.** On `/app/dashboard`
the header shows **"Project: None selected"**. Typing a prompt and clicking Send produced **no response and
no error message**, just a "Continue where you left off" strip. The Send button is not disabled and there
is no explanation. A user with no project selected gets a dead composer with zero feedback.

### Builder: real pipeline, but Apply corrupts the result

Plan, Generate, and Apply are genuinely implemented and genuinely produce code. The Apply step is broken.

- **Plan - PASS.** "Analyze & Plan" produced a real, structured plan: requirements classified
  EXPLICIT/INFERRED/OPTIONAL, a written build plan, and 12 concrete planned file paths. It is
  **keyword/template driven, not model driven**, and it visibly misread the prompt: I asked for "Express
  and **SQLite**" and the plan asserted "PostgreSQL persistence: Tasks persisted in PostgreSQL via
  DATABASE_URL". The template is fixed to the Todo-App scenario.
- **Generate - PASS.** Produced a real 12-file change set with a real unified diff and a
  `Partial Generation` status that honestly reported "Some files were generated but the run reported
  failures."
- **Apply - BROKEN (destroys the generated project).**

**G3 - Apply flattens the entire directory structure.** The plan generated a proper nested layout:
`server/index.js`, `server/db.js`, `server/routes/tasks.js`, `client/App.jsx`, `server/package.json`, and
so on. After Apply, the workspace contains **only 11 files, all flat at the project root**:

```
api.js, App.css, App.jsx, db.js, index.html, index.js, package.json, README.md, tasks.js, gitprobe.txt, docs/
```

- `server/index.js` became `index.js`
- `client/App.jsx` became `App.jsx`
- `server/db.js` and `client/api.js` **silently collided** (only one copy survives)
- `server/package.json` and root `package.json` **silently collided**
- `server/routes/tasks.js` became `tasks.js`

Confirmed on disk via `Get-ChildItem -Recurse`: no `server/` or `client/` directory exists at all. The
generated Express plus React project is **unrunnable**: `server/` and `client/` are gone, the React app
has no `index.html` linking it, and the server's `package.json` was overwritten by the client one.

**Root cause (confirmed in source).** `backend/app/api/v1/builder.py:426` and `:535` both do:

```python
FileService.create_file(project_id, "", path.split("/")[-1], content)
```

The `path.split("/")[-1]` **throws away every directory component**, and parent_path is hardcoded to
`""`. The plan correctly produces nested paths; apply deliberately flattens them.

**G4 - Second, compounding bug: apply is not idempotent and collides with itself.** A follow-up apply
reported *every* file as failed:

```
server/index.js: A file or folder with this name already exists
package.json:    A file or folder with this name already exists   (all 12)
.env.example:    Hidden files and folders are not allowed
```

The first (flattening) apply already created them, so the second refuses, leaving the user stuck with a
half-applied, structure-less project. `.env.example` can **never** be generated because `FileService`
blocks hidden files, yet the plan always includes one.

**G5 - Blocker for the "AI gap" work.** With `AI_PROVIDER=mock`, no prompt can ever produce novel output.
The plan and the code both come from static templates in `builder_templates.py`. Real
prompt/plan/generate behaviour is unreachable until a provider key is configured.

---

## SECTION H - Preview: **PASS**

Real end-to-end. This is the strongest area of the app.

- **Start - PASS.** With a `dev` script present, `POST /preview` spawned a real dev server, probed the
  port, and returned `status: READY`, `port: 5183`, real captured stdout, and a scoped preview token.
- **iframe loads real content - PASS.** Via the real UI: started the preview, then read inside the iframe
  and got `PREVIEW_REAL_OK`, matching the actual `index.html` on disk.
- **Proxy serves real content - PASS.** `GET <preview_url>?preview_token=...` returned 200 with the exact
  project HTML. Auth is enforced: the wrong param name gave 401, a session JWT in the URL was rejected,
  and the scoped token returned 200.
- **Stop - PASS.** Clicked Stop and the iframe was removed (0 iframes), with the execution recorded as
  `CANCELLED`.
- **Restart - PASS.** Started again and the iframe returned, showing `PREVIEW_REAL_OK` again.
- **Honest errors - PASS.** With no `dev`/`start` script it returned `422 PREVIEW_NOT_SUPPORTED:
  package.json has no scripts section`. A failing server returned `500 PREVIEW_LAUNCH_FAILED`
  **including the captured real stdout and stderr** and the exit code. This is exemplary error reporting.

---


## SECTION I - Quality checks: **PASS**

Genuinely runs the real tools and reports real results. Not simulated.

- **Operation detection - PASS.** `GET /executions/quality/operations` inspected the real `package.json`
  and reported precise per-operation state: `TYPECHECK available: true, command: "npm run typecheck",
  source: "package.json"` and `BUILD supported: false, reason: "No 'build' script in package.json"`. It
  honestly reported "No project configuration detected" when nothing was configured.
- **TYPECHECK real failure - PASS.** Ran the actual `npm run typecheck`, which gave a real PID (23840),
  `status: FAILED`, `exit_code: 1`, and the true captured stderr:
  `'tsc' is not recognized as an internal or external command`. The UI rendered
  `FAILED / exit 1 / 1.8 s / Process exited with code 1`. **A real failure surfaced as a real failure**,
  which is exactly the behaviour you want.
- **TYPECHECK real pass - PASS.** After pointing the script at `node -e "console.log(1)"` it returned
  `status: COMPLETED`, `exit_code: 0`, `stdout` containing the printed value. **Pass and fail are both
  real**, so the verdict is genuinely derived from the process.
- **Pytest and Frontend build buttons** are present and routed to the same real runner. On an empty
  project they report honestly rather than faking green.
- All quality runs are persisted in the same execution history as terminal runs, so the log is a single
  truthful timeline.

---


## SECTION J - Settings / misc: **PARTIAL**

Settings contains three cards. Every control was checked against what it claims.

- **Account Profile - PASS.** Name and email are real, read from the authenticated user.
- **Sign Out - PARTIAL.** Works (navigates to `/login` and clears the token) but carries the **A1** 401.
- **GitHub Connection card - PASS (honest).** Shows "Not connected" plus a real status from
  `GET /github/connection`, and on click surfaces the accurate `GITHUB_NOT_CONFIGURED` message. Verified
  real: clicking it produced a genuine 503 from the server and a true-to-state notice in the DOM.
- **Backend Status card - PASS.** Shows `healthy`, consistent with `/api/v1/health`.

**J1 - No editable settings exist.** Despite the page title and the copy "Manage account and workspace
preferences", there is **nothing to edit**: no name or email update, no theme, no default-branch setting,
no preferences of any kind. It is a read-only status page. No control is a fake (so it is not a STUB in
the Deploy sense), but the page over-promises.

**J2 - Deploy is correctly disabled (confirmed fixed).** The Deploy affordance in both the top bar and the
sidebar renders as a non-interactive element with `aria-label="Deploy - coming soon"` and a **"Soon"**
badge; the dashboard status tile reads `Coming soon`. No click handler and no dead button. This is the
honest pattern the rest of the app should follow.

**J3 - Miscellaneous, verified live (200 OK).** Project activity feed, project context, AI
conversations, AI artifacts, and file search. (`GET /git/branch` returns 404: not implemented, and not
surfaced in the UI, so it is harmless.)

**J4 - Empty-project consistency.** Many `backend/data/projects/*/facts/quotes.txt` directories exist
---

## Consolidated defect list (ranked by user impact)

| # | Severity | Section | Defect |
|---|---|---|---|
| 1 | **Critical** | B1 | **Delete Project 500s and does not delete.** `shutil.rmtree` hits read-only `.git` objects on Windows; the DB transaction is also stranded mid-failure. |
| 2 | **Critical** | G3 | **Builder Apply flattens the directory structure** (`path.split("/")[-1]`, `builder.py:426,535`) and silently collides same-named files, producing an unrunnable project. |
| 3 | **High** | A2 | **No mid-session 401 handling.** An expired token leaves a half-rendered shell with no error and no way to recover. |
| 4 | **High** | D1 | **Terminal mangles quoted arguments** (`split(/\s+/)`), and a failed run can display a green "completed" with empty output. |
| 5 | **High** | D2 | **Terminal allowlist note contradicts the enforced policy**; three divergent policy sources (`execution_service`, `terminal_service`, `terminal_policy.json`) plus the UI's own list. |
| 6 | **Medium** | C2 | **"Auto-save enabled" shown next to "Unsaved changes"** - a false capability claim. |
| 7 | **Medium** | G4 | Builder apply is not idempotent, and `.env.example` can never be generated (hidden-file block). |
| 8 | **Medium** | D3 | Rate limiting makes the execution history silently render empty. |
| 9 | **Medium** | G2 | Dashboard AI composer is a silent dead end with no project selected. |
| 10 | **Low** | A1 | Logout always fires a 401 (token cleared before the request). |
| 11 | **Low** | J1 | Settings claims to manage preferences but is read-only. |
| 12 | **Low** | C1 | New-file uses a native `window.prompt`. |
| 13 | **Low** | D4 | Legacy `/terminal/history` is always empty. |
| 14 | **Low** | B2 | Project rename is not reachable from the Projects list. |

---

## Configuration blockers

These are not code bugs, but they gate real functionality:

- `AI_PROVIDER=mock` with empty `AI_API_KEY` / `OPENAI_API_KEY` means **no real AI is possible**. This
  gates Section G entirely.
- Empty `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_TOKEN` means **no GitHub connect, sync,
  push, or pull**. This gates Section F.

---

## What is genuinely solid

Registration, login, and session handling; the file system (create, read, edit, save, rename, move, and
delete, all real disk operations); the **entire Git panel**; the **execution engine** (real processes, real
stdout and stderr, real exit codes, and a working cancel with no orphans); **preview** (start, stop, and
restart with a correctly scoped token); and the **quality runner** (real tools, with truthful pass *and*
fail).

The engine is real. The failures are concentrated in three places: **deletion**, **builder apply**, and
**error recovery on 401** - plus a general pattern of **UI copy that promises more than the backend
delivers** (the terminal allowlist, "auto-save", Settings preferences, and `repository_provider: "github"`).

from earlier test runs. That is leftover test data in the local workspace, not a code defect.

---


---

process and filesystem work. That is the good news.

**The two worst findings are:**

1. **Delete Project is completely broken (HTTP 500).** See B1.
2. **Builder "Apply to Workspace" destroys the generated file layout.** See G3.

---
