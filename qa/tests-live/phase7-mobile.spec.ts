/**
 * Phase 7 — Mobile / Device Experience.
 *
 * Every assertion in this file is a real measurement or a real state change:
 *
 *   - overflow        -> document.documentElement.scrollWidth vs clientWidth,
 *                        read from the live DOM, printed to the log
 *   - touch target    -> the element's real bounding box, in CSS pixels
 *   - interception    -> document.elementFromPoint() at the control's centre,
 *                        which must land on the control or inside it
 *   - real interaction -> locator.tap() (the context has hasTouch: true), then a
 *                        network-backed assertion (Monaco save, terminal run,
 *                        history row, quality operation, git status)
 *
 * The flow LOGIN -> PROJECTS -> REAL PROJECT -> ACTIVE WORKSPACE is walked in a
 * FRESH browser context at each viewport (320/375/390/414), not once and then
 * resized, because a resize is not a mobile device.
 *
 * Requires the local dev stack:
 *   backend  http://127.0.0.1:8000   (see memory-bank/phase-status.md for the
 *                                     DATABASE_URL override this machine needs)
 *   frontend http://localhost:5173
 */
import { test, expect, type Locator, type Page } from "@playwright/test";

const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `p7.mobile.${STAMP}@example.com`;
const PASSWORD = "Devos-P7-Mobile-2026!";
const PROJECT_NAME = `P7 Mobile ${STAMP}`;

const VIEWPORTS = [320, 375, 390, 414];
/** Sub-pixel rounding on a 1x device pixel ratio can leave a 1px phantom. */
const OVERFLOW_TOLERANCE = 2;
/** Apple HIG 44px / Material 48px; 40px is the floor we refuse to ship below. */
const MIN_TOUCH = 40;

type Evidence = { viewport: number; surface: string; action: string; result: string };
const evidence: Evidence[] = [];

function note(viewport: number, surface: string, action: string, result: string) {
  evidence.push({ viewport, surface, action, result });
  console.log(`[P7] @${viewport} | ${surface} | ${action} | ${result}`);
}

// Real project content, written through the real files API.
const PACKAGE_JSON = JSON.stringify(
  {
    name: "p7-mobile",
    version: "1.0.0",
    scripts: {
      // A real dev server so the preview surface can genuinely reach READY.
      // PreviewService maps a "dev" script to `npm run dev` and appends
      // `-- --port <free port>`, so this script must honour --port itself.
      dev: "node server.mjs",
      build: "echo BUILD_OK",
      test: "echo TEST_OK",
      lint: "echo LINT_OK",
      typecheck: "echo TYPECHECK_OK",
    },
  },
  null,
  2,
);
const INDEX_HTML = "<!doctype html><html><body><h1>P7_PREVIEW_OK</h1></body></html>";
/** Minimal static server: honours the `--port N` the preview engine injects. */
const SERVER_MJS = [
  "import { createServer } from 'node:http';",
  "import { readFileSync, existsSync } from 'node:fs';",
  "const i = process.argv.indexOf('--port');",
  "const port = Number(process.argv[i + 1]) || 5173;",
  "createServer((req, res) => {",
  "  const file = existsSync('index.html') ? readFileSync('index.html') : 'no index.html';",
  "  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });",
  "  res.end(file);",
  "}).listen(port, '127.0.0.1', () => console.log('P7 preview on ' + port));",
  "",
].join("\n");
const APP_PY = "def p7_entry():\n    return 'p7-mobile'\n";
const NOTES_TXT = "phase seven mobile notes\n";

type Overflow = {
  scrollWidth: number;
  clientWidth: number;
  over: number;
  widest: { right: number; tag: string; cls: string };
};

/** Read the real layout box of the document, plus the widest descendant. */
async function measure(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const de = document.documentElement;
    const widest = Array.from(document.body.querySelectorAll<HTMLElement>("*")).reduce(
      (max, el) => {
        const r = el.getBoundingClientRect();
        if (r.right <= max.right) return max;
        return {
          right: Math.round(r.right),
          tag: el.tagName,
          cls: (typeof el.className === "string" ? el.className : "").slice(0, 70),
        };
      },
      { right: 0, tag: "-", cls: "-" },
    );
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      over: de.scrollWidth - de.clientWidth,
      widest,
    };
  });
}

/** Assert no horizontal overflow, recording the real numbers either way. */
async function assertNoOverflow(page: Page, viewport: number, surface: string) {
  const m = await measure(page);
  const reading = `scrollWidth=${m.scrollWidth} clientWidth=${m.clientWidth} overflow=${m.over}px`;
  if (m.over > OVERFLOW_TOLERANCE) {
    note(viewport, surface, "overflow", `FAIL ${reading} widest=${m.widest.tag}.${m.widest.cls} right=${m.widest.right}`);
    throw new Error(`horizontal overflow @${viewport} on ${surface}: ${reading}; widest=${m.widest.tag}.${m.widest.cls} right=${m.widest.right}`);
  }
  note(viewport, surface, "overflow", `OK ${reading}`);
  return m;
}

/**
 * Tap a control for real, after proving it is big enough to hit and that
 * nothing is covering it. `method: "tap"` uses a real touch tap.
 */
async function tapTarget(
  page: Page,
  viewport: number,
  surface: string,
  label: string,
  target: Locator,
  options: { min?: number; method?: "tap" | "click" } = {},
) {
  const min = options.min ?? MIN_TOUCH;
  const method = options.method ?? "tap";
  await target.scrollIntoViewIfNeeded({ timeout: 20_000 });
  await expect(target, `${label} visible`).toBeVisible({ timeout: 20_000 });

  // Measure and hit-test in ONE JS tick. Measuring the box and calling
  // elementFromPoint from two round trips races the panels' polling
  // re-renders: the panel reflows between the two calls, the box goes stale
  // and the hit test lands on whatever moved into the old coordinates, which
  // is what produced the bogus "pointer interception" verdict.
  const probe = async () =>
    target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const hitEl = document.elementFromPoint(centre.x, centre.y);
      const cls = hitEl && typeof hitEl.className === "string" ? hitEl.className : "";
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        centre,
        hit: hitEl ? `${hitEl.tagName}.${cls}`.slice(0, 70) : "none",
        contained: !!hitEl && (el === hitEl || el.contains(hitEl)),
        offscreen:
          centre.x < 0 ||
          centre.y < 0 ||
          centre.x > window.innerWidth ||
          centre.y > window.innerHeight,
      };
    });

  let m = await probe();
  if (m.offscreen) {
    // A control scrolled half off the fold has no on-screen centre to hit,
    // so elementFromPoint legitimately answers "none". Bring it fully into
    // view and re-measure once.
    await target.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
    await page.waitForTimeout(250);
    m = await probe();
  }
  if (m.h === 0 || m.w === 0) throw new Error(`${label}: not laid out (${m.w}x${m.h})`);
  if (m.h < min) throw new Error(`${label}: impossible touch target ${m.w}x${m.h}px (min height ${min}px)`);
  if (!m.contained) {
    throw new Error(
      `${label}: pointer interception — centre ${Math.round(m.centre.x)},${Math.round(m.centre.y)} ` +
        `elementFromPoint=${m.hit}`,
    );
  }
  note(viewport, surface, `${method} ${label}`, `${m.w}x${m.h}px, elementFromPoint=${m.hit}`);
  if (method === "tap") await target.tap({ timeout: 20_000 });
  else await target.click({ timeout: 20_000 });
  return { w: m.w, h: m.h, hit: m.hit };
}

type Failure = { viewport: number; surface: string; name: string; error: string };
const failures: Failure[] = [];

/**
 * Run one check and record the outcome instead of aborting the viewport.
 * A single run must enumerate every problem at every viewport, otherwise each
 * fix costs another full pass and the report is written from partial data.
 */
async function step(w: number, surface: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    note(w, surface, name, "PASS");
  } catch (error) {
    const message = String((error as Error).message ?? error).replace(/\s+/g, " ").slice(0, 300);
    failures.push({ viewport: w, surface, name, error: message });
    note(w, surface, name, `FAIL ${message}`);
  }
}

/** Each check starts from the workspace so a failure cannot cascade. */
async function gotoWorkspace(page: Page) {
  await page.goto(`${BASE}/app/workspace`, { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('.explorer-tree[aria-label="Project files"]'),
    "workspace explorer tree",
  ).toBeVisible({ timeout: 60_000 });
}

// ---------------------------------------------------------------------------
// Seed once, through the real API, for the whole run.
// ---------------------------------------------------------------------------
let token = "";
let projectId = "";

/** Authenticated read through the real API, from inside the test's own page. */
async function apiJson(page: Page, path: string) {
  const res = await page.request.get(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status(), body: (await res.json().catch(() => null)) as any };
}

test.beforeAll(async ({ request }) => {
  await request.post(`${API}/auth/register`, {
    data: { name: "P7 Mobile", email: EMAIL, password: PASSWORD },
  });
  const login = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(login.ok(), `seed login: ${login.status()} ${await login.text()}`).toBeTruthy();
  token = (await login.json()).data.token;

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const created = await request.post(`${API}/projects`, { headers, data: { name: PROJECT_NAME } });
  expect(created.ok(), `seed project: ${created.status()} ${await created.text()}`).toBeTruthy();
  projectId = (await created.json()).data.id;

  const folder = await request.post(`${API}/projects/${projectId}/files/folder`, {
    headers,
    data: { parent_path: "", name: "src" },
  });
  expect(folder.ok(), `seed folder: ${folder.status()} ${await folder.text()}`).toBeTruthy();

  for (const [parent, name, content] of [
    ["src", "app.py", APP_PY],
    ["", "notes.txt", NOTES_TXT],
    ["", "package.json", PACKAGE_JSON],
    ["", "index.html", INDEX_HTML],
    ["", "server.mjs", SERVER_MJS],
  ] as const) {
    const res = await request.post(`${API}/projects/${projectId}/files/file`, {
      headers,
      data: { parent_path: parent, name, content },
    });
    expect(res.ok(), `seed file ${name}: ${res.status()} ${await res.text()}`).toBeTruthy();
  }
  console.log(`[P7] seeded project=${projectId} user=${EMAIL}`);
});

// ---------------------------------------------------------------------------
// 1. LOGIN -> 2. PROJECTS -> 3. REAL PROJECT -> 4. ACTIVE WORKSPACE
// ---------------------------------------------------------------------------
async function loginAndReachWorkspace(page: Page, w: number) {
  // Fresh context: no cookies, no localStorage, no service worker.
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await assertNoOverflow(page, w, "LOGIN");
  await page.getByLabel("Email Address").tap({ timeout: 20_000 });
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").tap({ timeout: 20_000 });
  await page.getByLabel("Password").fill(PASSWORD);
  await tapTarget(page, w, "LOGIN", "Sign In", page.getByRole("button", { name: "Sign In" }));
  await expect(page).toHaveURL(/\/(app\/)?dashboard$/, { timeout: 60_000 });
  note(w, "LOGIN", "submit real credentials", `authenticated -> ${new URL(page.url()).pathname}`);
  await assertNoOverflow(page, w, "DASHBOARD");

  // PROJECTS — the seeded project must be listed, and chosen by a real tap.
  await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
  await assertNoOverflow(page, w, "PROJECTS");
  const card = page.locator(".card").filter({ hasText: PROJECT_NAME }).first();
  await expect(card, `seeded project listed @${w}`).toBeVisible({ timeout: 30_000 });
  await tapTarget(
    page,
    w,
    "PROJECTS",
    `Open Workspace (${PROJECT_NAME})`,
    card.getByRole("button", { name: "Open Workspace" }),
  );

  // REAL PROJECT -> ACTIVE WORKSPACE
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 30_000 });
  const active = await page.evaluate(() => localStorage.getItem("devos_active_project_id"));
  expect(active, `active project id @${w}`).toBe(projectId);
  const activeName = await page.locator(".project-switcher-name").innerText();
  expect(activeName, `top bar active project @${w}`).toContain(PROJECT_NAME);
  note(w, "ACTIVE WORKSPACE", "reached via real tap", `active=${activeName} matches seeded project ${projectId}`);
  await assertNoOverflow(page, w, "ACTIVE WORKSPACE");

  // The workspace must show THIS project's real files, not an empty shell.
  const tree = page.locator('.explorer-tree[aria-label="Project files"]');
  await expect(tree, "explorer tree @workspace").toBeVisible({ timeout: 30_000 });
  await expect(tree.locator('.tree-row[title="notes.txt"]')).toBeVisible({ timeout: 20_000 });
  await expect(tree.locator('.tree-row[title="src"]')).toBeVisible({ timeout: 20_000 });
  note(w, "ACTIVE WORKSPACE", "real project content", "notes.txt + src/ visible in tree");
}

// ---------------------------------------------------------------------------
// Navigation / sidebar / drawer — open, navigate, close, Escape
// ---------------------------------------------------------------------------
async function verifyNavigation(page: Page, w: number) {
  await page.goto(`${BASE}/app/dashboard`, { waitUntil: "domcontentloaded" });
  await tapTarget(page, w, "NAVIGATION", "Open navigation (drawer toggle)", page.getByRole("button", { name: "Open navigation" }));
  await expect(page.getByRole("button", { name: "Close navigation" }).first()).toBeVisible({ timeout: 15_000 });
  // The drawer slides in. A single measurement taken mid-transition reads the
  // off-canvas position (x=-248) and reports a defect that is not one, so wait
  // for the real resting position and then measure that.
  await expect
    .poll(
      async () => Math.round((await page.locator(".sidebar").boundingBox())?.x ?? -999),
      { timeout: 10_000, message: "sidebar never reached an on-screen x" },
    )
    .toBeGreaterThanOrEqual(0);
  const box = await page.locator(".sidebar").boundingBox();
  if (!box) throw new Error("drawer opened but .sidebar has no box");
  if (Math.round(box.x) < 0) throw new Error(`drawer still off-canvas: x=${box.x}`);
  note(w, "NAVIGATION", "drawer open (settled after slide-in)", `sidebar x=${Math.round(box.x)} w=${Math.round(box.width)}`);
  await assertNoOverflow(page, w, "NAVIGATION");

  // Real navigation from inside the drawer.
  await tapTarget(page, w, "NAVIGATION", "drawer link Projects", page.getByRole("link", { name: "Projects" }).first());
  await expect(page).toHaveURL(/\/app\/projects$/, { timeout: 20_000 });
  note(w, "NAVIGATION", "drawer link navigated", "/app/projects");

  // Escape must close the drawer (keyboard interaction on a mobile viewport).
  await page.getByRole("button", { name: "Open navigation" }).tap({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Close navigation" }).first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible({ timeout: 15_000 });
  note(w, "NAVIGATION", "Escape closed the drawer", "Open navigation visible again");
}

// ---------------------------------------------------------------------------
// Command palette — keyboard path, then the touch-only reachability check
// ---------------------------------------------------------------------------
async function verifyCommandPalette(page: Page, w: number) {
  await page.goto(`${BASE}/app/dashboard`, { waitUntil: "domcontentloaded" });
  // The chord is handled by a window listener that React attaches when the
  // shell mounts. Sending it the instant the document exists races that mount
  // (it lost the race at @414), so wait for the shell itself first.
  await expect(page.locator(".top-bar"), `app shell mounted @${w}`).toBeVisible({ timeout: 30_000 });
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await page.keyboard.press("Control+k");
  await expect(dialog, `command palette opens @${w}`).toBeVisible({ timeout: 15_000 });
  await assertNoOverflow(page, w, "COMMAND PALETTE");
  const search = dialog.getByLabel("Search commands");
  await tapTarget(page, w, "COMMAND PALETTE", "search field", search, { method: "click" });
  await search.fill("proj");
  const item = dialog.locator(".command-palette-item").first();
  await expect(item).toBeVisible({ timeout: 15_000 });
  await tapTarget(page, w, "COMMAND PALETTE", "command entry", item);
  note(w, "COMMAND PALETTE", "keyboard chord + real tap", "Ctrl+K opened, filtered, entry tapped");
  await page.keyboard.press("Escape");

  // A touch-only device has no Ctrl+K, so the palette needs a real tap path.
  // (It had none: Ctrl+K was the only way in, which made every command in the
  // app unreachable on a phone.)
  const trigger = page.getByRole("button", { name: "Open command palette" });
  await expect(trigger, `palette has a tappable entry point @${w}`).toBeVisible({ timeout: 15_000 });
  await tapTarget(page, w, "COMMAND PALETTE", "palette trigger (touch-only path)", trigger);
  await expect(dialog, "palette opens from a real tap").toBeVisible({ timeout: 15_000 });
  const tapped = await dialog.locator(".command-palette-item").count();
  note(w, "COMMAND PALETTE", "touch-only path", `no keyboard needed: the top-bar trigger opened the palette (${tapped} commands listed)`);
  await page.keyboard.press("Escape");
}

// ---------------------------------------------------------------------------
// Explorer / nested files / Monaco — the save is proven by a real API read
// ---------------------------------------------------------------------------
async function verifyExplorerAndMonaco(page: Page, w: number) {
  await gotoWorkspace(page);
  const folder = page.locator('.tree-row[title="src"]').first();
  await tapTarget(page, w, "EXPLORER", "nested folder src/", folder);
  await expect(folder).toHaveAttribute("aria-expanded", "true", { timeout: 15_000 });
  const nested = page.locator('.tree-row[title="src/app.py"]').last();
  await expect(nested, "nested file src/app.py visible").toBeVisible({ timeout: 15_000 });
  note(w, "EXPLORER", "nested file revealed", "src/app.py listed under src/");
  await assertNoOverflow(page, w, "EXPLORER");

  await tapTarget(page, w, "MONACO", "open src/app.py", nested);
  await expect(page.locator(".monaco-editor").first(), "Monaco mounted").toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".editor-tab", { hasText: "app.py" }), "editor tab").toBeVisible({ timeout: 20_000 });
  note(w, "MONACO", "nested file opened", "Monaco mounted with an app.py tab");
  await assertNoOverflow(page, w, "MONACO");

  // Real write path: type, Ctrl+S, then verify against the files API directly.
  const marker = `p7_mobile_${w}_${STAMP}`;

  // Monaco 0.56 drives typing through the native EditContext API: the editable
  // surface is div.native-edit-context[role=textbox], NOT the legacy
  // textarea.view-inputarea. Tapping .view-lines therefore puts focus on a
  // plain container, every keystroke is dropped, and the model never changes.
  // Tapping the editor surface is what a finger actually does, and that lands
  // on the edit context.
  await page.locator(".monaco-editor").first().tap({ position: { x: 150, y: 60 }, timeout: 20_000 });
  const focus = await page.evaluate(() => {
    const monaco = (window as unknown as { monaco?: { editor?: { getEditors?: () => { hasTextFocus?: () => boolean }[] } } }).monaco;
    const editors = monaco?.editor?.getEditors?.() ?? [];
    if (editors.some((ed) => ed.hasTextFocus?.())) return "editor-has-text-focus";
    // Fall back to focusing the edit context the editor itself mounted.
    const ec = document.querySelector<HTMLElement>(".native-edit-context");
    if (ec) ec.focus();
    return editors.some((ed) => ed.hasTextFocus?.()) ? "focused-via-edit-context" : "never-focused";
  });
  if (focus === "never-focused") {
    throw new Error(`Monaco never took text focus @${w} — typed input would be silently dropped`);
  }
  note(w, "MONACO", "editor focus", `${focus} (tapped the real editor surface, not .view-lines)`);

  // Replace the buffer with real text input. Playwright's keyboard.type()
  // dispatches raw key events, which the native EditContext input path never
  // converts into textupdate events in this build, so the model stays
  // untouched and Ctrl+S then saves the old text. insertText is the same
  // OS-level text insertion a soft keyboard performs, and it does land.
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(`# ${marker}\n`);
  await expect
    .poll(
      async () =>
        page.evaluate((m) => {
          const monaco = (window as unknown as { monaco?: { editor?: { getEditors?: () => { getModel?: () => { getValue(): string } | null }[] } } }).monaco;
          const model = monaco?.editor?.getEditors?.()?.[0]?.getModel?.();
          return model ? String(model.getValue()).includes(m) : "no-model";
        }, marker),
      { timeout: 10_000, message: "typed text never reached the Monaco model" },
    )
    .toBe(true);
  note(w, "MONACO", "typed into the model", `model now contains ${marker}`);
  await page.keyboard.press("Control+s");
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`${API}/projects/${projectId}/files/src/app.py`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok()) return `http-${res.status()}`;
        const body = await res.json();
        return String(body?.data?.content ?? "").includes(marker);
      },
      { timeout: 30_000, message: `Ctrl+S never persisted @${w}` },
    )
    .toBe(true);
  note(w, "MONACO", "edit + Ctrl+S saved", `real GET files/src/app.py contains ${marker}`);
}

// ---------------------------------------------------------------------------
// Terminal + History — a real allowlisted command, then its real history row
// ---------------------------------------------------------------------------
async function verifyTerminalAndHistory(page: Page, w: number) {
  await gotoWorkspace(page);

  // 1. A command the policy actually allows. terminal_policy.json is
  //    default-deny: only the exact literals in SAFE_COMMANDS may run, and
  //    `echo DEVOS_PHASE2_TEST` is one of them. An invented marker such as
  //    `echo P7_MOBILE_320_OK` is correctly refused with 403 BLOCKED_COMMAND,
  //    which is the product working, not a failure to accommodate.
  const input = page.getByLabel("Terminal command");
  await tapTarget(page, w, "TERMINAL", "command input", input, { method: "click" });
  await input.fill("echo DEVOS_PHASE2_TEST");
  await tapTarget(page, w, "TERMINAL", "Run command", page.getByRole("button", { name: "Run command" }));
  await expect(
    page.locator(".terminal-entry-status.success").first(),
    "real completed status",
  ).toBeVisible({ timeout: 90_000 });
  // Authoritative: the execution really completed and its captured stdout is
  // the command's own output (no getByText echo false positive).
  await expect
    .poll(
      async () => {
        const { status, body } = await apiJson(page, `/projects/${projectId}/executions?limit=50`);
        if (status !== 200) return `http-${status}`;
        const rows = (body?.data ?? []) as { command: string; status: string; stdout?: string }[];
        const hit = rows.find((r) => r.status === "COMPLETED" && (r.stdout ?? "").includes("DEVOS_PHASE2_TEST"));
        return hit ? `COMPLETED stdout=${JSON.stringify((hit.stdout ?? "").trim().slice(0, 40))}` : "no completed run yet";
      },
      { timeout: 30_000, message: "no COMPLETED execution carrying the real stdout" },
    )
    .toContain("COMPLETED stdout=");
  note(w, "TERMINAL", "real allowlisted run", "echo DEVOS_PHASE2_TEST -> COMPLETED + real stdout via API");

  // 2. The default-deny half of the policy, asserted rather than avoided: a
  //    non-allowlisted command must be BLOCKED, and must not produce a
  //    success entry on screen.
  const successCountBefore = await page.locator(".terminal-entry-status.success").count();
  await input.fill("echo P7_DENY_PROBE");
  await tapTarget(page, w, "TERMINAL", "Run denied command", page.getByRole("button", { name: "Run command" }));
  await expect
    .poll(
      async () => {
        const { status, body } = await apiJson(page, `/projects/${projectId}/executions?limit=50`);
        if (status !== 200) return `http-${status}`;
        const rows = (body?.data ?? []) as { command: string; arguments?: string[]; status: string }[];
        const denied = rows.find((r) => (r.arguments ?? []).includes("P7_DENY_PROBE"));
        return denied ? `status=${denied.status}` : "no execution recorded yet";
      },
      { timeout: 30_000, message: "the denied command was never recorded as an execution" },
    )
    .toMatch(/status=(BLOCKED|FAILED)/);
  await expect
    .poll(
      async () => page.locator(".terminal-entry-status.success").count(),
      { timeout: 15_000 },
    )
    .toBe(successCountBefore);
  note(w, "TERMINAL", "default-deny policy", "echo P7_DENY_PROBE -> BLOCKED, no success entry added");
  await assertNoOverflow(page, w, "TERMINAL");

  // History must contain a REAL row for that run, reached by real taps.
  const testsCard = page.locator(".card").filter({ hasText: "Git & Tests" }).first();
  await tapTarget(page, w, "HISTORY", "Refresh execution history", page.getByRole("button", { name: "Refresh execution history" }));
  // Expand THIS run's row, not merely the newest one: the default-deny probe
  // runs after the allowlisted command, so the newest row belongs to the
  // probe and expanding it can never show the allowlisted run's stdout.
  const runItem = testsCard.locator("li").filter({ hasText: "DEVOS_PHASE2_TEST" }).first();
  await expect(runItem, "history lists a row for the allowlisted run").toBeVisible({ timeout: 30_000 });
  const runRow = runItem.locator('div[role="button"]').first();
  await tapTarget(page, w, "HISTORY", "expand the allowlisted run's row", runRow);
  expect(await runRow.getAttribute("aria-expanded"), "history row reports itself expanded").toBe("true");
  // The expanded detail's first <pre> is that run's captured stdout.
  await expect(
    runItem.locator("pre").first(),
    "history detail shows this run's real stdout",
  ).toHaveText(/DEVOS_PHASE2_TEST/, { timeout: 30_000 });
  note(w, "HISTORY", "real execution row", "the allowlisted run's row expands to its captured stdout");
  await assertNoOverflow(page, w, "HISTORY");
}

// ---------------------------------------------------------------------------
// Quality — all four operation surfaces, with one REAL operation run
// ---------------------------------------------------------------------------
async function verifyQuality(page: Page, w: number) {
  await gotoWorkspace(page);
  for (const op of ["build", "test", "lint", "typecheck"]) {
    const button = page.getByRole("button", { name: new RegExp(`run ${op} quality operation`, "i") });
    await expect(button, `${op} operation surface present`).toBeVisible({ timeout: 30_000 });
    await expect(button, `${op} operation enabled`).toBeEnabled();
  }
  note(w, "QUALITY", "all four surfaces present", "build / test / lint / typecheck buttons visible and enabled");
  await assertNoOverflow(page, w, "QUALITY");

  // Really run one of them and require the real stdout marker.
  await tapTarget(page, w, "QUALITY", "Run build quality operation", page.getByRole("button", { name: /run build quality operation/i }));
  await expect(page.getByText("BUILD_OK").first(), "real quality stdout").toBeVisible({ timeout: 120_000 });
  // The API is the authority: a real quality execution COMPLETED and its
  // captured stdout carries the marker, so the text on screen is output and
  // not the script being echoed back.
  await expect
    .poll(
      async () => {
        const { status, body } = await apiJson(page, `/projects/${projectId}/executions?limit=50`);
        if (status !== 200) return `http-${status}`;
        const rows = (body?.data ?? []) as { status: string; stdout?: string }[];
        const hit = rows.find((r) => r.status === "COMPLETED" && (r.stdout ?? "").includes("BUILD_OK"));
        return hit ? `COMPLETED stdout=${JSON.stringify((hit.stdout ?? "").trim().slice(0, 40))}` : "no completed build yet";
      },
      { timeout: 60_000, message: "no COMPLETED quality execution carrying BUILD_OK" },
    )
    .toContain("COMPLETED stdout=");
  note(w, "QUALITY", "real build operation", "npm run build -> COMPLETED, stdout BUILD_OK (confirmed via API)");
  await assertNoOverflow(page, w, "QUALITY");
}

// ---------------------------------------------------------------------------
// Preview — surface at every viewport, real start/stop once per viewport
// ---------------------------------------------------------------------------
async function verifyPreview(page: Page, w: number, flags: { stopped: boolean }) {
  await gotoWorkspace(page);
  const start = page.getByRole("button", { name: "Start dev server preview" });
  await expect(start, "preview start surface").toBeVisible({ timeout: 30_000 });
  await tapTarget(page, w, "PREVIEW", "Start dev server preview", start);

  // READY is not a label the UI invents: the engine reaches it only after a
  // real TCP connection check against the port the dev server bound, so this
  // proves a real server is listening, not that a button turned green.
  let boundPort = 0;
  await expect
    .poll(
      async () => {
        const { status, body } = await apiJson(page, `/projects/${projectId}/preview/status`);
        if (status !== 200) return `http-${status}`;
        boundPort = Number(body?.data?.port ?? 0);
        return `${body?.data?.status ?? "unknown"}:${boundPort}`;
      },
      { timeout: 180_000, message: "preview never reached READY" },
    )
    .toMatch(/^READY:[1-9]\d*$/);

  // The badge renders "{status} · :{port}" — the same real state, in the UI.
  await expect(
    page.getByText(new RegExp(`^READY\\s*·\\s*:${boundPort}$`)).first(),
    "preview badge shows the real READY state and bound port",
  ).toBeVisible({ timeout: 30_000 });
  note(w, "PREVIEW", "real start", `engine READY on port ${boundPort} (npm run dev -> node server.mjs)`);
  await assertNoOverflow(page, w, "PREVIEW");

  // Stop for real and require the engine to report a terminal state.
  const stop = page.getByRole("button", { name: "Stop dev server preview" });
  await expect(stop, "stop control appears once a server is live").toBeVisible({ timeout: 30_000 });
  await tapTarget(page, w, "PREVIEW", "Stop dev server preview", stop);
  await expect
    .poll(
      async () => {
        const { status, body } = await apiJson(page, `/projects/${projectId}/preview/status`);
        return status === 200 ? String(body?.data?.status) : `http-${status}`;
      },
      { timeout: 60_000, message: "preview never reported a terminal state after stop" },
    )
    .toMatch(/^(STOPPED|CANCELLED|FAILED)$/);
  // The panel may still have an in-flight iframe request aimed at the server
  // this step just stopped; the proxy legitimately answers 502 from here on.
  flags.stopped = true;
  note(w, "PREVIEW", "real stop", "engine reported a terminal state after the real stop tap");
  await assertNoOverflow(page, w, "PREVIEW");
}

// ---------------------------------------------------------------------------
// Artifacts + Git surfaces
// ---------------------------------------------------------------------------
async function verifyArtifactsAndGit(page: Page, w: number) {
  await gotoWorkspace(page);
  const artifacts = page.locator(".artifact-panel").first();
  await expect(artifacts, "artifact panel present").toBeVisible({ timeout: 30_000 });
  await artifacts.scrollIntoViewIfNeeded({ timeout: 20_000 });
  const list = page.locator('.artifact-list[aria-label="Project artifacts"]');
  await expect(list, "artifact list reachable").toBeVisible({ timeout: 30_000 });
  const items = await list.locator(".artifact-item").count();
  note(w, "ARTIFACTS", "panel + list reachable", `real list rendered, items=${items}`);
  await assertNoOverflow(page, w, "ARTIFACTS");

  const gitCard = page.locator(".card").filter({ hasText: "Git & Tests" }).first();
  await gitCard.scrollIntoViewIfNeeded({ timeout: 20_000 });
  await tapTarget(page, w, "GIT", "Refresh git status", page.getByRole("button", { name: "Refresh git status" }));

  // The branch the card shows must be the branch the API reports. Asserting
  // the control set instead of the state is what made the earlier version
  // brittle: this project has one branch and no commits yet, so there is
  // genuinely nothing to switch to and no branch picker is rendered.
  const { status: gitStatus, body: gitBody } = await apiJson(page, `/projects/${projectId}/git/status`);
  expect(gitStatus, `git status @${w}`).toBe(200);
  const realBranch = String(gitBody?.data?.branch ?? gitBody?.data?.current_branch ?? "");
  expect(realBranch, `git status reported a branch @${w}: ${JSON.stringify(gitBody?.data)}`).not.toBe("");
  await expect(
    gitCard.getByText(realBranch, { exact: false }).first(),
    `card displays the real branch "${realBranch}"`,
  ).toBeVisible({ timeout: 20_000 });

  const switcher = page.getByLabel("Switch branch");
  if ((await switcher.count()) > 0) {
    await tapTarget(page, w, "GIT", "Switch branch", switcher);
    note(w, "GIT", "branch switcher", "present and tappable (more than one branch exists)");
  } else {
    note(w, "GIT", "branch switcher", `not rendered: single branch "${realBranch}", nothing to switch to`);
  }

  // A real touch keystroke into a real field, proven by the field's own value.
  const message = page.getByLabel("Commit message");
  await tapTarget(page, w, "GIT", "Commit message field", message, { method: "click" });
  await message.fill(`p7 mobile ${w}`);
  await expect(message, "commit message accepted touch input").toHaveValue(`p7 mobile ${w}`);

  const gitText = (await gitCard.innerText()).replace(/\s+/g, " ").trim().slice(0, 120);
  note(w, "GIT", "real status refresh", gitText);
  await assertNoOverflow(page, w, "GIT");
}

// ---------------------------------------------------------------------------
// AI composer — a real send, proven by a real assistant reply
// ---------------------------------------------------------------------------
async function verifyAIComposer(page: Page, w: number) {
  await gotoWorkspace(page);
  const card = page.locator("#ai-command-center");
  await card.scrollIntoViewIfNeeded({ timeout: 20_000 });
  await tapTarget(page, w, "AI COMPOSER", "Assistant tab", card.getByRole("tab", { name: "Assistant" }));
  const composer = page.getByLabel("Message the AI assistant");
  await tapTarget(page, w, "AI COMPOSER", "composer field", composer, { method: "click" });
  const prompt = `p7 mobile composer check ${w}`;
  await composer.fill(prompt);
  await tapTarget(page, w, "AI COMPOSER", "Send message", page.getByRole("button", { name: "Send message" }));
  await expect(card.getByText(prompt).first(), "prompt rendered in the thread").toBeVisible({ timeout: 30_000 });
  // AIPanel only renders this control when an assistant reply exists, so its
  // appearance is evidence of a real response rather than a hopeful wait.
  await expect(
    page.getByRole("button", { name: "Regenerate last response" }),
    "real assistant reply arrived",
  ).toBeVisible({ timeout: 150_000 });
  note(w, "AI COMPOSER", "real send + real reply", "prompt in thread + assistant reply (Regenerate control appeared)");
  await assertNoOverflow(page, w, "AI COMPOSER");
}

// ---------------------------------------------------------------------------
// One real device per viewport: fresh context, full flow, all surfaces.
// ---------------------------------------------------------------------------
for (const w of VIEWPORTS) {
  test(`Phase 7 mobile flow @${w}`, async ({ browser }) => {
    test.setTimeout(1_500_000);
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: { width: w, height: 800 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    const flags = { stopped: false };
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().slice(0, 160));
    });
    // Every >=400 is recorded, so a rejection with no visible symptom (a 422
    // from a panel the user cannot see failing) cannot pass unnoticed.
    const httpErrors: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) {
        const url = new URL(response.url());
        httpErrors.push(`${response.status()} ${response.request().method()} ${url.pathname}`);
      }
    });
    try {
      // The required flow, walked end to end in this fresh mobile context.
      await step(w, "FLOW", "LOGIN -> PROJECTS -> REAL PROJECT -> ACTIVE WORKSPACE", () => loginAndReachWorkspace(page, w));
      await step(w, "EXPLORER", "nested folder + nested file + Monaco + real Ctrl+S save", () => verifyExplorerAndMonaco(page, w));
      await step(w, "TERMINAL+HISTORY", "real allowlisted command, completed status, real history row", () => verifyTerminalAndHistory(page, w));
      await step(w, "QUALITY", "four operation surfaces + one real build run", () => verifyQuality(page, w));
      await step(w, "PREVIEW", "real start/stop", () => verifyPreview(page, w, flags));
      await step(w, "ARTIFACTS+GIT", "artifact list + real git status refresh", () => verifyArtifactsAndGit(page, w));
      await step(w, "AI COMPOSER", "real send + real assistant reply", () => verifyAIComposer(page, w));
      await step(w, "NAVIGATION", "drawer open/navigate/Escape", () => verifyNavigation(page, w));
      await step(w, "COMMAND PALETTE", "Ctrl+K + touch reachability", () => verifyCommandPalette(page, w));
      const realErrors = consoleErrors.filter((text) => !/status of (401|403|404|405)\b/.test(text));
      await step(w, "SESSION", "console", async () => {
        if (realErrors.length) throw new Error(`console errors: ${realErrors.slice(0, 3).join(" | ")}`);
      });
      // The default-deny probe in the terminal step is meant to be refused, so
      // that single rejection is the product working. Anything else is a defect,
      // except proxy hits on a dev server this run deliberately stopped.
      const deliberate = (row: string) =>
        row === `403 POST /api/v1/projects/${projectId}/executions` ||
        (flags.stopped && /^502 GET .*\/executions\/[^/]+\/preview\//.test(row));
      const realHttp = httpErrors.filter((row) => !deliberate(row));
      await step(w, "SESSION", "http responses", async () => {
        if (realHttp.length) throw new Error(`unexpected HTTP >=400: ${realHttp.slice(0, 5).join(" | ")}`);
      });
      note(w, "SESSION", "expected rejections", `${httpErrors.length - realHttp.length} deliberate (default-deny probe)`);
      const mine = failures.filter((failure) => failure.viewport === w);
      expect(
        mine,
        `failures @${w}: ${mine.map((f) => `${f.surface}/${f.name}: ${f.error}`).join(" ;; ")}`,
      ).toHaveLength(0);
    } finally {
      await context.close();
    }
  });
}

test.afterAll(async () => {
  const surfaces = new Map<string, number>();
  for (const row of evidence) surfaces.set(row.surface, (surfaces.get(row.surface) ?? 0) + 1);
  console.log(`\n[P7] ===== evidence rows: ${evidence.length} =====`);
  for (const [surface, count] of [...surfaces].sort()) console.log(`[P7] ${surface}: ${count} recorded checks`);
  for (const w of VIEWPORTS) {
    const rows = evidence.filter((row) => row.viewport === w);
    console.log(`[P7] @${w}: ${rows.length} recorded checks`);
  }
  const overflows = evidence.filter((row) => row.action === "overflow");
  console.log(`[P7] overflow measurements recorded: ${overflows.length}`);
  for (const row of overflows) console.log(`[P7] @${row.viewport} ${row.surface} ${row.result}`);
});
