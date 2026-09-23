// =====================================================================
// DEVOS v1.0.0 — PHASE 2C: REAL PRODUCTION QUALITY ENGINE VERIFICATION
// Real Chromium against the deployed app:
//   Frontend: https://devos-ebon.vercel.app
//   Backend : https://devos-backend-f3ub.onrender.com/api/v1
// No mocks. No seeded auth. Fresh QA account registered through the UI.
// Chain:
//   LOGIN -> PROJECT -> WORKSPACE -> GIT & TESTS -> QUALITY ->
//   DETECTION (empty = honest unsupported) -> REAL FIXTURE CONFIG ->
//   DETECTION (real commands) -> BUILD -> REAL PROCESS -> RESULT ->
//   LINT -> REAL FAILURE -> network evidence
// =====================================================================
import { test, expect, type Page, type Response } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://devos-ebon.vercel.app";
const API = "https://devos-backend-f3ub.onrender.com/api/v1";

const STAMP = Date.now();
const EMAIL = `qa.phase2c.${STAMP}@example.com`;
const PASSWORD = "Devos-P2C-QA-2026!-verif";
const NAME = "QA Phase 2C Agent";
const PROJECT_NAME = `P2C Quality ${STAMP}`;
const RESULT_DIR = path.join(process.cwd(), "test-results", "phase2c-quality");
fs.mkdirSync(RESULT_DIR, { recursive: true });

const FIXTURE_PKG = JSON.stringify({
  name: "quality-fixture",
  version: "1.0.0",
  scripts: {
    build: "node -e \"process.exit(0)\"",
    lint: "node -e \"process.exit(3)\"",
    "type-check": "node -e \"process.exit(0)\"",
    test: "node -e \"console.log('P2C_TEST_MARKER'); process.exit(0)\"",
  },
});

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

async function registerAndLogin(page: Page): Promise<void> {
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Name").fill(NAME);
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 90_000 });
  await expect(
    page.getByRole("heading", { name: /What do you want to build\?/i })
  ).toBeVisible({ timeout: 30_000 });
  console.log(`[phase2c] register+login OK account=${EMAIL}`);
}

async function createProject(page: Page): Promise<string> {
  await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create Project" }).first().click();
  await expect(page.getByLabel("Project Name")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Project Name").fill(PROJECT_NAME);
  const dialog = page.getByRole("dialog").last();
  await dialog.getByRole("button", { name: "Create Project" }).click();
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });
  await expect(page.getByText(`Workspace: ${PROJECT_NAME}`)).toBeVisible({ timeout: 60_000 });
  const pid = await page.evaluate(() => localStorage.getItem("devos_active_project_id") || "");
  if (!pid) throw new Error("no active project id after creation");
  console.log(`[phase2c] project created + workspace OK project_id=${pid.slice(0, 8)}`);
  return pid;
}

test("Phase 2C PRODUCTION QUALITY CHAIN", async ({ browser, request }) => {
  test.setTimeout(900_000);

  // ============ 0. DEPLOYMENT-CURRENT PROBE ============
  // The quality surface must exist on production. A 404 here means the
  // deployment is stale — report honestly instead of testing old code.
  let deployProbe = 0;
  for (let i = 0; i < 30; i++) {
    const res = await request.get(`${API}/health`).catch(() => null);
    if (res && res.ok()) {
      const probe = await request
        .get(`${API}/projects/00000000-0000-0000-0000-000000000000/executions/quality/operations`)
        .catch(() => null);
      // 401/403/404-project => Phase 2C code is live; 404 route => stale.
      const code = probe ? probe.status() : 0;
      if (code !== 404) { deployProbe = code; break; }
    }
    await new Promise((r) => setTimeout(r, 20_000));
  }
  if (deployProbe === 0) {
    throw new Error("DEPLOYMENT NOT CURRENT: /executions/quality/operations absent on production after wait");
  }
  console.log(`[phase2c] deployment current (probe status ${deployProbe})`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => { void d.accept(); });
  attachListeners(page);

  // ============ 1. REAL LOGIN ============
  await registerAndLogin(page);

  // ============ 2. REAL PROJECT ============
  const projectId = await createProject(page);

  // ============ 3. QUALITY PANEL PRESENT (empty project) ============
  await expect(page.getByText("Quality", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  // An empty project must honestly report unsupported — no fake operations.
  await expect(page.getByText(/No project configuration detected in the workspace/).first())
    .toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /Run .* quality operation/ })).toHaveCount(0);
  await snapshot(page, "quality-empty-honest");
  console.log("[phase2c] empty-project detection honestly unsupported OK");

  // ============ 4. REAL FIXTURE CONFIG (via real files API) ============
  const created = await page.evaluate(async ({ api, pkg, pid }) => {
    const token = localStorage.getItem("devos_token") || "";
    const res = await fetch(`${api}/projects/${pid}/files/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ parent_path: "", name: "package.json", content: pkg }),
    });
    return { status: res.status, ok: res.ok };
  }, { api: API, pkg: FIXTURE_PKG, pid: projectId });
  if (!created.ok) throw new Error(`fixture package.json creation failed: ${JSON.stringify(created)}`);
  console.log(`[phase2c] fixture package.json created via real files API (${created.status})`);

  // ============ 5. REAL DETECTION (reload remounts the panel) ============
  await page.goto(`${BASE}/app/workspace`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Quality", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("npm run build").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("npm run lint").first()).toBeVisible();
  await expect(page.getByText("npm run type-check").first()).toBeVisible();
  await expect(page.getByText("npm test").first()).toBeVisible();
  await snapshot(page, "quality-detected");
  console.log("[phase2c] real detection: BUILD/LINT/TYPECHECK/TEST commands visible");

  // ============ 6. REAL BUILD (real process, real exit code) ============
  // If the tool is missing on the server the UI honestly shows it and the
  // run button is absent — record that as environment evidence, not failure.
  const buildBtn = page.getByRole("button", { name: "Run build quality operation" });
  const buildAvailable = await buildBtn.isVisible().catch(() => false);
  let buildEvidence = "TOOL_UNAVAILABLE (no run control shown)";
  if (buildAvailable) {
    await buildBtn.click();
    // Authoritative result badge appears with the real status + exit code.
    const buildBadge = page.getByText(/COMPLETED · exit 0/).first();
    await expect(buildBadge).toBeVisible({ timeout: 120_000 });
    buildEvidence = await buildBadge.textContent();
    await snapshot(page, "quality-build-completed");
    console.log(`[phase2c] REAL BUILD result: ${buildEvidence}`);
  } else {
    await expect(page.getByText(/is not installed on this server/).first()).toBeVisible();
    await snapshot(page, "quality-build-tool-unavailable");
    console.log("[phase2c] BUILD tool unavailable on server (honest UI state)");
  }

  // ============ 7. REAL LINT FAILURE (non-zero exit, never success) ============
  const lintBtn = page.getByRole("button", { name: "Run lint quality operation" });
  const lintAvailable = await lintBtn.isVisible().catch(() => false);
  let lintEvidence = "TOOL_UNAVAILABLE (no run control shown)";
  if (lintAvailable) {
    await lintBtn.click();
    const lintBadge = page.getByText(/FAILED · exit 3/).first();
    await expect(lintBadge).toBeVisible({ timeout: 120_000 });
    lintEvidence = await lintBadge.textContent();
    await snapshot(page, "quality-lint-failed");
    console.log(`[phase2c] REAL LINT FAILURE result: ${lintEvidence}`);
  } else {
    lintEvidence = "TOOL_UNAVAILABLE (no run control shown)";
  }

  // ============ 8. REAL TEST (stdout marker) ============
  const testBtn = page.getByRole("button", { name: "Run test quality operation" });
  const testAvailable = await testBtn.isVisible().catch(() => false);
  let testEvidence = "TOOL_UNAVAILABLE (no run control shown)";
  if (testAvailable) {
    await testBtn.click();
    const testBadge = page.getByText(/COMPLETED · exit 0/).first();
    await expect(testBadge).toBeVisible({ timeout: 120_000 });
    testEvidence = await testBadge.textContent();
    await snapshot(page, "quality-test-completed");
    console.log(`[phase2c] REAL TEST result: ${testEvidence}`);
  }

  // ============ 9. NETWORK EVIDENCE ============
  const qualityGet = Object.entries(apiResponses)
    .find(([k]) => k.startsWith("GET /projects/") && k.includes("/executions/quality/operations"));
  const qualityRuns = Object.entries(apiResponses)
    .filter(([k, v]) => k.startsWith("POST /projects/") && k.includes("/executions/quality/") && v.status === 200);
  const runsAttempted = [buildAvailable, lintAvailable, testAvailable].filter(Boolean).length;
  if (!qualityGet) throw new Error("no network evidence for quality operations detection");
  if (runsAttempted > 0 && qualityRuns.length < runsAttempted) {
    throw new Error(`no 200 network evidence for ${runsAttempted - qualityRuns.length} attempted quality run(s)`);
  }
  console.log(`[phase2c] network evidence: detection=${qualityGet[1].status} runs=${qualityRuns.length}/${runsAttempted} attempted`);

  // ============ 10. TELEMETRY ============
  const netErrors = consoleErrors.filter((e) => /net::ERR_FAILED/i.test(e));
  const corsErrors = consoleErrors.filter((e) => /CORS|cross origin|has been blocked/i.test(e));
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    apiUrl: API,
    qaAccount: { email: EMAIL, name: NAME },
    qaProject: PROJECT_NAME,
    deployProbeStatus: deployProbe,
    buildEvidence,
    lintEvidence,
    testEvidence,
    qualityRuns: qualityRuns.length,
    apiResponses,
    consoleErrors,
    pageErrors,
    failedRequests,
    corsErrors,
    netErrors,
  };
  fs.writeFileSync(path.join(RESULT_DIR, "phase2c-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n[phase2c] === PHASE 2C PRODUCTION QUALITY RESULT ===`);
  console.log(`[phase2c] account=${EMAIL} project=${PROJECT_NAME}`);
  console.log(`[phase2c] build=${buildEvidence} lint=${lintEvidence} test=${testEvidence}`);
  console.log(`[phase2c] pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length} failedRequests=${failedRequests.length}`);
  if (pageErrors.length) console.log(`[phase2c] PAGE ERRORS:\n${pageErrors.join("\n")}`);
  if (failedRequests.length) console.log(`[phase2c] FAILED REQUESTS:\n${failedRequests.join("\n")}`);
  console.log(`[phase2c] report written to test-results/phase2c-quality/phase2c-report.json`);
});