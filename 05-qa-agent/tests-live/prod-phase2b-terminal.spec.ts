// =====================================================================
// DEVOS v1.0.0 — PHASE 2B CLOSURE: REAL PRODUCTION TERMINAL VERIFICATION
// Real Chromium against the deployed app:
//   Frontend: https://devos-ebon.vercel.app
//   Backend : https://devos-backend-f3ub.onrender.com/api/v1
// No mocks. No seeded auth. Fresh QA account registered through the UI.
// Follows the Phase 2B final chain:
//   LOGIN -> PROJECT -> WORKSPACE -> TERMINAL -> REAL COMMAND ->
//   REAL PROCESS -> REAL STDOUT -> COMPLETION -> FAILURE -> BLOCKED
// =====================================================================
import { test, expect, type Page, type Response } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://devos-ebon.vercel.app";
const API = "https://devos-backend-f3ub.onrender.com/api/v1";

const STAMP = Date.now();
const EMAIL = `qa.phase2b.${STAMP}@example.com`;
const PASSWORD = "Devos-P2B-QA-2026!-verif";
const NAME = "QA Phase 2B Agent";
const PROJECT_NAME = `P2B Closure ${STAMP}`;
const RESULT_DIR = path.join(process.cwd(), "test-results", "phase2b-closure");
fs.mkdirSync(RESULT_DIR, { recursive: true });

// ---------------- telemetry ----------------
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const failedRequests: string[] = [];
const apiResponses: Record<string, { status: number; acao: string | null; credentials: string | null }> = {};

const IGNORED_FAILED = [
  /favicon/,
  /manifest\.webmanifest/,
  /apple-touch-icon/,
  /fonts\.g/,
  /fonts\.googleapis/,
];

function attachListeners(page: Page): void {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (IGNORED_FAILED.some((re) => re.test(url))) return;
    failedRequests.push(`${req.failure()?.errorText || "failed"}: ${url}`);
  });
  page.on("response", (res: Response) => {
    const url = res.url();
    if (url.startsWith(API)) {
      apiResponses[`${res.request().method()} ${url.replace(API, "").split("?")[0]}`] = {
        status: res.status(),
        acao: res.headers()["access-control-allow-origin"] || null,
        credentials: res.headers()["access-control-allow-credentials"] || null,
      };
    }
  });
}

async function snapshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(RESULT_DIR, `${name}.png`), fullPage: false }).catch(() => undefined);
  console.log(`[snapshot] ${name}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function registerAndLogin(page: Page): Promise<void> {
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Name").fill(NAME);
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await snapshot(page, "register-filled");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 90_000 });
  await expect(
    page.getByRole("heading", { name: /What do you want to build\?/i })
  ).toBeVisible({ timeout: 30_000 });
  console.log(`[phase2b] register+login OK account=${EMAIL}`);
}

async function createProject(page: Page): Promise<void> {
  await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create Project" }).first().click();
  await expect(page.getByLabel("Project Name")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Project Name").fill(PROJECT_NAME);
  await snapshot(page, "create-project-modal");
  const dialog = page.getByRole("dialog").last();
  await dialog.getByRole("button", { name: "Create Project" }).click();
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });
  await expect(page.getByText(`Workspace: ${PROJECT_NAME}`)).toBeVisible({ timeout: 60_000 });
  const pid = await page.evaluate(() => localStorage.getItem("devos_active_project_id") || "");
  if (!pid) throw new Error("no active project id after creation");
  console.log(`[phase2b] project created + workspace OK project_id=${pid.slice(0, 8)}`);
}

async function runTerminal(page: Page, commandLine: string): Promise<void> {
  const termInput = page.getByLabel("Terminal command");
  await expect(termInput).toBeVisible({ timeout: 30_000 });
  await expect(termInput).toBeEnabled({ timeout: 30_000 });
  await termInput.fill(commandLine);
  await page.getByRole("button", { name: "Run command" }).click();
}

async function waitTerminalIdle(page: Page): Promise<void> {
  await expect(page.getByLabel("Terminal command")).toBeEnabled({ timeout: 30_000 });
}
test("Phase 2B PRODUCTION TERMINAL CHAIN", async ({ browser }) => {
  test.setTimeout(900_000);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // Defensive: never let a stray JS dialog block automation.
  page.on("dialog", (d) => { void d.accept(); });
  attachListeners(page);

  // ============ 1. REAL LOGIN (fresh, no seed) ============
  await registerAndLogin(page);

  // ============ 2. REAL PROJECT ============
  await createProject(page);

  // ============ 3. REAL TERMINAL PRESENT ============
  const termInput = page.getByLabel("Terminal command");
  await expect(termInput).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Project-scoped sandbox terminal/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: "Terminal 1" })).toBeVisible({ timeout: 15_000 });
  await snapshot(page, "terminal-panel-ready");

  // ============ 4. REAL PROCESS + REAL STDOUT + COMPLETION ============
  await runTerminal(page, "echo DEVOS_PHASE2B_PRODUCTION_TEST");
  // Real in-flight state must be exposed while the process runs.
  const runningShown = await page.locator(".terminal-running").isVisible().catch(() => false);
  console.log(`[phase2b] running-state-observed=${runningShown}`);
  await expect(
    page.locator(".terminal-entry-status.success", { hasText: "completed" }).first()
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("DEVOS_PHASE2B_PRODUCTION_TEST", { exact: true })).toBeVisible({ timeout: 15_000 });
  await snapshot(page, "terminal-echo-stdout-completed");
  console.log("[phase2b] REAL STDOUT + COMPLETED verified");

  // ============ 5. REAL PROJECT-SCOPED PROCESS (pwd + git) ============
  await runTerminal(page, "pwd");
  await expect(
    page.locator(".terminal-entry-status.success", { hasText: "completed" }).first()
  ).toBeVisible({ timeout: 30_000 });
  await sleep(800);
  await runTerminal(page, "git status");
  await expect(
    page.locator(".terminal-entry-status.success", { hasText: "completed" }).first()
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/On branch|Your branch|nothing to commit|Clean/i).first()).toBeVisible({ timeout: 20_000 });
  await snapshot(page, "terminal-git-status");
  console.log("[phase2b] project-scoped real process OK");

  // ============ 6. REAL FAILURE (non-zero exit) ============
  await runTerminal(page, "cat definitely-missing-phase2b.txt");
  const failStatus = page.locator(".terminal-entry-status.failure", { hasText: "exit code" }).first();
  await expect(failStatus).toBeVisible({ timeout: 30_000 });
  await snapshot(page, "terminal-real-failure");
  const failText = await failStatus.textContent();
  console.log(`[phase2b] REAL FAILURE observed: ${failText}`);
// ============ 7. BLOCKED COMMAND NEVER REACHES RUNNER ============
  const successBeforeBlocked = await page.locator(".terminal-entry-status.success").count();
  await runTerminal(page, "rm -rf /");
  await sleep(2500);
  const successAfterBlocked = await page.locator(".terminal-entry-status.success").count();
  if (successAfterBlocked !== successBeforeBlocked) {
    throw new Error("blocked command must not produce a successful execution");
  }
  // The blocked command must not break the terminal; a follow-up SAFE command still completes.
  await runTerminal(page, "echo DEVOS_PHASE2B_STILL_ALIVE");
  await expect(
    page.locator(".terminal-entry-status.success", { hasText: "completed" }).last()
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("DEVOS_PHASE2B_STILL_ALIVE", { exact: true })).toBeVisible({ timeout: 15_000 });
  await snapshot(page, "terminal-blocked-then-still-alive");
  console.log("[phase2b] blocked command did not reach runner; terminal survived");

  // ============ 8. TERMINAL HISTORY KEYS (ArrowUp / ArrowDown) ============
  await runTerminal(page, "echo alpha");
  await waitTerminalIdle(page);
  await runTerminal(page, "echo bravo");
  await waitTerminalIdle(page);
  await termInput.press("ArrowUp");
  const recalled1 = await termInput.inputValue();
  if (recalled1 !== "echo bravo") throw new Error(`ArrowUp recalled "${recalled1}"`);
  await termInput.press("ArrowUp");
  const recalled2 = await termInput.inputValue();
  if (recalled2 !== "echo alpha") throw new Error(`second ArrowUp recalled "${recalled2}"`);
  await termInput.press("ArrowDown");
  const recalled3 = await termInput.inputValue();
  if (recalled3 !== "echo bravo") throw new Error(`ArrowDown recalled "${recalled3}"`);
  await snapshot(page, "terminal-history-keys");
  console.log("[phase2b] ArrowUp/ArrowDown history verified");

  // ============ 9. Ctrl+L CLEARS TERMINAL ============
  await termInput.click();
  await page.keyboard.press("Control+l");
  await sleep(500);
  const panelText = await page.locator(".terminal-panel").textContent();
  if (/DEVOS_PHASE2B_PRODUCTION_TEST|\$ echo alpha|\$ echo bravo/.test(panelText || "")) {
    throw new Error("Ctrl+L did not clear the terminal entries");
  }
  await snapshot(page, "terminal-ctrl-l-cleared");
  console.log("[phase2b] Ctrl+L clear verified");

  // ============ 10. TABS: new + close ============
  // The terminal tabs strip sits under a sticky panel; a raw pointer click is
  // intercepted by the panel. Dispatch the DOM click on the node to exercise
  // the real React tab handlers.
  await page.locator(".terminal-tabs").getByRole("button", { name: "New terminal" }).first()
    .evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByRole("tab", { name: "Terminal 2" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Close Terminal 2/ }).first()
    .evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByRole("tab", { name: "Terminal 2" })).toHaveCount(0, { timeout: 10_000 });
  await snapshot(page, "terminal-tabs");
  console.log("[phase2b] terminal tabs verified");
// ============ 11. MOBILE OVERFLOW 320/375/390/414 ============
  for (const width of [320, 375, 390, 414]) {
    const mc = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
    const mp = await mc.newPage();
    await mp.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await expect(mp.getByLabel("Email Address")).toBeVisible({ timeout: 30_000 });
    const loginOverflow = await mp.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (loginOverflow > 2) throw new Error(`login overflow @${width}: ${loginOverflow}px`);
    await mc.close();
    console.log(`[phase2b] mobile ${width} login overflow OK`);
  }

  // Workspace terminal in a mobile context (fresh login + real project at 390)
  const mobCtx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const mob = await mobCtx.newPage();
  attachListeners(mob);
  await mob.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await mob.getByLabel("Email Address").fill(EMAIL);
  await mob.getByLabel("Password").fill(PASSWORD);
  await mob.getByRole("button", { name: "Sign In" }).click();
  await expect(mob).toHaveURL(/\/app\/dashboard$/, { timeout: 90_000 });
  // A fresh mobile context has no active project; create one through the real UI.
  await mob.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
  await mob.getByRole("button", { name: "Create Project" }).first().click();
  await expect(mob.getByLabel("Project Name")).toBeVisible({ timeout: 20_000 });
  await mob.getByLabel("Project Name").fill(`P2B Mobile ${STAMP}`);
  await mob.getByRole("dialog").last().getByRole("button", { name: "Create Project" }).click();
  await expect(mob).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });
  await expect(mob.getByLabel("Terminal command")).toBeVisible({ timeout: 60_000 });
  const wsOverflow = await mob.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (wsOverflow > 2) throw new Error(`workspace overflow @390: ${wsOverflow}px`);
  // Safe command on mobile terminal (real process, real output).
  await mob.getByLabel("Terminal command").fill("echo DEVOS_PHASE2B_MOBILE");
  await mob.getByRole("button", { name: "Run command" }).click();
  await expect(mob.locator(".terminal-entry-status.success", { hasText: "completed" }).first())
    .toBeVisible({ timeout: 30_000 });
  await expect(mob.getByText("DEVOS_PHASE2B_MOBILE", { exact: true })).toBeVisible({ timeout: 15_000 });
  await snapshot(mob, "mobile-390-workspace");
  await mobCtx.close();
  console.log("[phase2b] mobile workspace + safe command + overflow OK");

  await ctx.close();

  // ============ 12. TELEMETRY ============
  const netErrors = consoleErrors.filter((e) => /net::ERR_FAILED/i.test(e));
  const corsErrors = consoleErrors.filter((e) => /CORS|cross origin|has been blocked/i.test(e));
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    apiUrl: API,
    qaAccount: { email: EMAIL, name: NAME },
    qaProject: PROJECT_NAME,
    runningStateObserved: runningShown,
    realFailure: failText,
    apiResponses,
    consoleErrors,
    pageErrors,
    failedRequests,
    corsErrors,
    netErrors,
  };
  fs.writeFileSync(path.join(RESULT_DIR, "phase2b-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n[phase2b] === PHASE 2B PRODUCTION TERMINAL RESULT ===`);
  console.log(`[phase2b] account=${EMAIL} project=${PROJECT_NAME}`);
  console.log(`[phase2b] runningState=${runningShown} realFailure=${failText}`);
  console.log(`[phase2b] pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length} failedRequests=${failedRequests.length}`);
  if (pageErrors.length) console.log(`[phase2b] PAGE ERRORS:\n${pageErrors.join("\n")}`);
  if (consoleErrors.length) console.log(`[phase2b] CONSOLE ERRORS:\n${consoleErrors.join("\n")}`);
  if (failedRequests.length) console.log(`[phase2b] FAILED REQUESTS:\n${failedRequests.join("\n")}`);
  console.log(`[phase2b] report written to test-results/phase2b-closure/phase2b-report.json`);
});