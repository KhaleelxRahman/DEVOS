# DEVOS v1.0.0 — KNOWN LIMITATIONS & DESIGN BOUNDARIES
## Technical Constraints, Platform Requirements & Operating Boundaries

**Document Date:** November 8, 2026  
**Current Working HEAD:** `a1b90c530237413d55355fe6ab7686a5a36c95c0` (`feat(devos): finalize recovery, security, and E2E improvements`)  
**Historical Parent Base Commit:** `355e7bcf1408eec3510cecce5ace0d593a95003d` (tag: `backup/main-355e7bc`)  
**Version:** 1.0.0  

---

### 1. Development & Host Environment

- **Operating System:** Fully compatible with Windows, macOS, and Linux. On Windows, tool execution relies on `shutil.which` resolving binary `.exe` and `.cmd` wrappers.
- **Python Version:** Requires Python 3.11, 3.12, or 3.13. Asyncio sub-processes on Windows use the Proactor event loop.
- **Node.js Version:** Requires Node.js v18 or later (v20+ recommended).

---

### 2. Live Preview Dev Server Boundaries

- **Port Allocation Range:** Ports 5180 through 5299 (maximum 120 simultaneous local server instances).
- **Single Process per Project:** A project may only run one active preview server at any given time. Starting a preview automatically cancels any previous active dev server execution for that project to prevent port waste and orphan processes.
- **Static vs Build Tools:** Projects without `package.json` dev scripts fall back to `python -m http.server`. Projects utilizing custom dev frameworks (e.g. Vite, Next.js) must have dependencies installed (`npm install`) within their workspace to spin up framework dev servers.

---

### 3. Sandboxed Terminal Execution

- **Command Allowlist:** To maintain zero remote-code-execution vulnerability, terminal commands are strictly constrained to `ALLOWED_COMMANDS` (`git`, `npm`, `npx`, `node`, `python`, `pytest`, `ls`, `dir`, `cat`, etc.). Arbitrary binaries or system administration utilities (`powershell`, `cmd`, `bash`, `rm -rf /`, `curl`) cannot be executed by design.
- **Process Cancellation:** Long-running terminal executions have an enforced default timeout of 120 seconds.

---

### 4. Git Version Control Policy

- **Destructive Verbs Prohibited:** By architectural mandate (Phase 5), the Git engine rejects history-rewriting and destructive operations (`git reset --hard`, `git push --force`, `git rebase`, `git clean -fd`).
- **No Wildcard Staging:** The system forbids mass `git add .`. Changes must be explicitly staged by file path to enforce clean provenance.

---

### 5. Multi-Tab Editor Autosave

- **Debounce Latency:** 1,200ms debounce ensures excessive API write requests are not generated during rapid typing.
- **Buffer Persistence:** Unsaved changes are persisted to the in-memory map per-tab. If the browser tab is abruptly closed before the 1,200ms debounce expires, unsaved modifications might not reach the server; users can trigger immediate persistence via `Ctrl+S`.

---

### 6. Cloud Hosting & Free-Tier Cold Starts

- **Render Web Service Inactivity:** Free-tier instances on Render automatically suspend after 15 minutes of zero traffic. The initial request following inactivity incurs a 30-50 second cold-start delay while the runtime container provisions.
- **Vercel Edge Caching:** Static assets are aggressively cached on Vercel's global CDN; API requests pass directly through to Render via `VITE_API_URL`.
