// =====================================================================
// DEVOS v1.0.0 — #076 GITHUB REPOSITORY + BRANCH FINAL VERIFICATION
// Real Chromium browser against production:
//   Frontend: https://devos-ebon.vercel.app
//   Backend : https://devos-backend-f3ub.onrender.com/api/v1
//
// PREREQUISITE: #075 GitHub OAuth must be GENUINELY connected.
// Per task instructions: "Do NOT continue if #075 is not genuinely
// connected." #075 was verified UNVERIFIED (real authorization URL was
// produced by production and the browser reached GitHub's login page, but
// completing authorization requires interactive human GitHub credentials;
// the DEVOS account remained "Not connected").
//
// Therefore this verification does NOT attempt repository/branch
// selection, inject tokens, edit localStorage, fake callbacks, or mock
// GitHub. It records the real connected state and the exact blocker with
// real browser + API evidence.
//
// IF #075 unavailable -> #076 = UNVERIFIED — BLOCKED BY GITHUB OAUTH
// IF UI fails despite valid OAuth -> #076 = FAIL
// =====================================================================
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://devos-ebon.vercel.app";
const API  = "https://devos-backend-f3ub.onrender.com/api/v1";

const STAMP  = Date.now();
const EMAIL  = `qa076.${STAMP}@example.com`;
const PASSWORD = "Devos-076-QA-2026!-check";
const DIR    = path.join(process.cwd(), "test-results", "076");
fs.mkdirSync(DIR, { recursive: true });

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

function attachListeners(page: Page): void {
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false }).catch(() => {});
  console.log(`[shot] ${name}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email Address")).toBeVisible();
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 120_000 });
}

async function ensureProject(page: Page): Promise<string> {
  await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
  const openExisting = page.getByRole("button", { name: "Open Workspace" }).first();
  if (await openExisting.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await openExisting.click({ timeout: 20_000 });
  } else {
    const createBtn = page.getByRole("button", { name: "Create Project" }).first();
    await createBtn.click({ timeout: 20_000 });
    await expect(page.getByLabel("Project Name")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Project Name").fill(`076 QA Project ${STAMP}`);
    await page.getByRole("dialog").last().getByRole("button", { name: "Create Project" }).click();
  }
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });
  await expect(page.getByText(/Workspace:/i)).toBeVisible({ timeout: 60_000 });
  return await page.evaluate(() => localStorage.getItem("devos_active_project_id") || "");
}
test("#076 GitHub Repository + Branch Final Verification", async ({ browser }) => {
  test.setTimeout(300000);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  attachListeners(page);

  const evidence: string[] = [];

  try {
    // Provision throwaway account (account setup only — NOT OAuth, NOT repo data)
    await page.request.post(`${API}/auth/register`, {
      data: { name: "QA 076", email: EMAIL, password: PASSWORD },
      timeout: 120000,
    });

    // ---- 1. LOGIN ------------------------------------------------
    await login(page);
    evidence.push("LOGIN: dashboard reached after Sign In");
    await shot(page, "01-login-dashboard");

    // ---- 2. PROJECTS -> Workspace (UI navigation) ----------------
    const activePid = await ensureProject(page);
    evidence.push(`PROJECT: workspace open activeProjectId=${activePid}`);
    await shot(page, "02-workspace");

    // ---- 3. GITHUB CONNECTION STATE (Settings) -------------------
    await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("GitHub Connection")).toBeVisible({ timeout: 30000 });

    // Wait for the GitHub card to settle (GET /github/connection).
    const settleDeadline = Date.now() + 45000;
    while (Date.now() < settleDeadline) {
      const hasBadge =
        (await page.getByText("Not connected").count()) +
        (await page.getByText("Connected", { exact: true }).count());
      const hasConnect = await page.getByRole("button", { name: "Connect GitHub" }).isVisible({ timeout: 2000 }).catch(() => false);
      if (hasBadge > 0 || hasConnect) break;
      await sleep(1500);
    }
    await shot(page, "03-settings-github");

    const ghCardText = await page
      .getByText("GitHub Connection").first()
      .evaluate((el) => {
        let node: HTMLElement | null = el as HTMLElement;
        for (let i = 0; i < 3 && node; i++) node = node.parentElement;
        return node ? node.innerText.slice(0, 1000) : "";
      }).catch(() => "");
    evidence.push(`GITHUB CARD TEXT: ${JSON.stringify(ghCardText)}`);

    const notConnected = await page.getByText("Not connected").count();
    const connectedBadge = await page.getByText("Connected", { exact: true }).count();
    evidence.push(`CONNECTED STATE: notConnected=${notConnected} connected=${connectedBadge}`);

    // ---- 4. VERDICT (dependency-gated per header) -----------------
    // This run does NOT attempt repository/branch selection without a
    // genuine #075 connection. It records the REAL connected state and
    // the exact blocker. Never fake connection or repository data.
    let verdict: "PASS" | "FAIL" | "UNVERIFIED";
    let reason: string;
    if (connectedBadge > 0) {
      verdict = "UNVERIFIED";
      reason = "Genuine connected GitHub state present; repository/branch selection is now exercisable but was not scripted in this dependency-gated minimal run (no fabricated repository data).";
    } else {
      verdict = "UNVERIFIED";
      reason = "#075 GitHub OAuth = UNVERIFIED (completing interactive GitHub authorization requires human credentials unavailable to automation). Dependency rule: #076 = UNVERIFIED — BLOCKED BY GITHUB OAUTH. Real production state recorded: DEVOS GitHub card shows 'Not connected'.";
    }
    await shot(page, "04-connected-state-final");

    // ---- 5. REPORT ------------------------------------------------
    evidence.push("PAGE URL: " + page.url());
    evidence.push(`CONSOLE ERRORS (${consoleErrors.length}): ${JSON.stringify(consoleErrors.slice(0, 10))}`);
    evidence.push(`PAGE ERRORS (${pageErrors.length}): ${JSON.stringify(pageErrors.slice(0, 10))}`);

    const report = {
      id: "076",
      verdict,
      reason,
      connectedState: connectedBadge > 0 ? "connected" : "not-connected",
      evidence,
    };
    fs.writeFileSync(path.join(DIR, "verdict.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(DIR, "evidence.txt"), evidence.join("\r\n"));

    console.log("\n#076:");
    console.log(verdict);
    console.log("\nReason:");
    console.log(reason);
  } finally {
    await ctx.close();
  }
});