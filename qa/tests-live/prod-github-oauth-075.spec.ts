// =====================================================================
// DEVOS v1.0.0 — #075 GITHUB OAUTH FINAL VERIFICATION
// Real Chromium browser against production:
//   Frontend: https://devos-ebon.vercel.app
//   Backend : https://devos-backend-f3ub.onrender.com/api/v1
//
// GOAL: Determine whether #075 (GitHub OAuth connect) can be completed
// with REAL production evidence.
//
// Flow: Login -> Projects -> Workspace -> GitHub (Settings) -> Connect ->
// actual GitHub authorization URL -> actual authorization -> callback ->
// DEVOS connected state.
//
// DO NOT: inject OAuth tokens, edit localStorage, fake callback, mock
// GitHub, use source code as proof.
//
// IF real OAuth completes -> #075 = PASS
// IF environment/credentials prevent completion -> #075 = UNVERIFIED
// IF OAuth itself fails -> #075 = FAIL (capture exact reproducible error)
// =====================================================================
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://devos-ebon.vercel.app";
const API  = "https://devos-backend-f3ub.onrender.com/api/v1";

const STAMP  = Date.now();
const EMAIL  = `qa075.${STAMP}@example.com`;
const PASSWORD = "Devos-075-QA-2026!-check";
const DIR    = path.join(process.cwd(), "test-results", "075");
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
    await page.getByLabel("Project Name").fill(`075 QA Project ${STAMP}`);
    await page.getByRole("dialog").last().getByRole("button", { name: "Create Project" }).click();
  }
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });
  await expect(page.getByText(/Workspace:/i)).toBeVisible({ timeout: 60_000 });
  return await page.evaluate(() => localStorage.getItem("devos_active_project_id") || "");
}
test("#075 GitHub OAuth Final Verification", async ({ browser }) => {
  test.setTimeout(480000);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  attachListeners(page);

  const evidence: string[] = [];

  try {
    // Provision throwaway account (account setup only — NOT OAuth)
    await page.request.post(`${API}/auth/register`, {
      data: { name: "QA 075", email: EMAIL, password: PASSWORD },
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

    // ---- 3. GITHUB (Settings -> GitHub Connection) ---------------
    await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("GitHub Connection")).toBeVisible({ timeout: 30000 });
    await shot(page, "03-settings-github");

    // Wait for the GitHub connection state to finish loading (GET /github/connection).
    // The card renders a spinner first; we need the settled badge/button state.
    const settleDeadline = Date.now() + 45000;
    while (Date.now() < settleDeadline) {
      const hasBadge =
        (await page.getByText("Not connected").count()) +
        (await page.getByText("Connected", { exact: true }).count());
      const hasConnect = await page.getByRole("button", { name: "Connect GitHub" }).isVisible({ timeout: 2000 }).catch(() => false);
      if (hasBadge > 0 || hasConnect) break;
      await sleep(1500);
    }
    await shot(page, "03b-github-settled");

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
    evidence.push(`INITIAL STATE: notConnected=${notConnected} connected=${connectedBadge}`);

    // ---- 4. CONNECT -> observe actual GitHub authorization -------
    const connectBtn = page.getByRole("button", { name: "Connect GitHub" });
    const connectVisible = await connectBtn.isVisible({ timeout: 10000 }).catch(() => false);
    evidence.push(`CONNECT BUTTON VISIBLE: ${connectVisible}`);
// Watch for the ACTUAL navigation to GitHub's authorization URL.
    // Also capture the POST /github/connect API response (authorization_url).
    let authUrlResponse: string | null = null;
    let connectApiOk: boolean | null = null;
    page.on("response", async (r) => {
      if (r.url().includes("/github/connect") && r.request().method() === "POST") {
        try {
          const body = await r.json();
          authUrlResponse = body?.data?.authorization_url ?? null;
          connectApiOk = r.status() >= 200 && r.status() < 300;
        } catch { connectApiOk = false; }
      }
    });

    let verdict: "PASS" | "FAIL" | "UNVERIFIED" = "UNVERIFIED";
    let reason = "NO SUPPORTED DIRECT GITHUB OAUTH COMPLETION IN THIS SESSION";

    if (connectVisible) {
      const nav = page.waitForURL(/github\.com/, { timeout: 30000 }).catch(() => null);
      await connectBtn.click({ timeout: 20000 });
      await sleep(3000);

      const observedUrl = await nav;
      if (observedUrl || page.url().includes("github.com")) {
        evidence.push(`AUTHORIZATION URL: ${authUrlResponse ?? "(from API only)"}`);
        evidence.push(`BROWSER NAVIGATED TO: ${page.url()}`);
        await shot(page, "04-github-authorize");
        reason = "Reached the real GitHub authorization URL via Connect. Completing authorization requires interactive GitHub user credentials, which a headless QA session cannot supply.";
      } else {
        evidence.push("NO GITHUB AUTHORIZATION NAVIGATION OBSERVED after Connect click");
        await shot(page, "04-no-auth-navigation");
      }
    } else {
      evidence.push("CONNECT BUTTON NOT PRESENT — cannot start OAuth");
    }

    evidence.push(`CONNECT API: ok=${connectApiOk}`);
    evidence.push(`CONNECT API AUTHORIZATION_URL: ${JSON.stringify(authUrlResponse)}`);

    // ---- 5. CONNECTED STATE (post-attempt, real browser state) ----
    if (page.url().startsWith(BASE)) {
      const connectedAfter = await page.getByText("Connected", { exact: true }).count();
      evidence.push(`CONNECTED STATE (after attempt): connected=${connectedAfter}`);
      if (connectedAfter > 0) {
        verdict = "PASS";
        reason = "DEVOS shows Connected after real GitHub OAuth authorization completed";
      }
    } else {
      evidence.push(`CONNECTED STATE (after attempt): on third-party page ${page.url().slice(0, 80)}`);
      await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
      const connectedAfter = await page.getByText("Connected", { exact: true }).count();
      evidence.push(`CONNECTED STATE (after returning): connected=${connectedAfter}`);
      if (connectedAfter > 0) {
        verdict = "PASS";
        reason = "DEVOS shows Connected after real GitHub OAuth authorization completed";
      }
    }
// ---- 6. VERDICT DECISION TREE -----------------------------------
    // PASS: connected-state reached through the real callback.
    // FAIL: OAuth flow itself errored (server/config broken, API 5xx, or
    //       Connect threw before reaching the authorization URL).
    // UNVERIFIED: environment/credentials prevent completing real
    //             authorization (no interactive GitHub credentials in a
    //             headless QA session) even though the flow started.

    const connectApiBody = authUrlResponse ?? null;

    // Detect a rendered OAuth-config error/notice on the settings page.
    const oauthNotice = await page.getByText(/GitHub OAuth is not configured/i).count();
    const oauthErr = await page.getByText(/Unable to start GitHub connection/i).count();
    evidence.push(`OAUTH NOTICE (not configured): ${oauthNotice}`);
    evidence.push(`OAUTH ERROR (unable to start): ${oauthErr}`);

    // Detect a FAIL: server refused to produce an authorization URL.
    if (verdict !== "PASS") {
      const onAuthorizePage = page.url().includes("github.com/login/oauth/authorize");
      if (connectApiOk === false && connectApiBody === null && oauthNotice === 0 && oauthErr > 0) {
        verdict = "FAIL";
        reason = "OAuth failed: Connect errored with Unable to start GitHub connection (exact message captured)";
      } else if (connectApiOk === false && connectApiBody === null && oauthNotice === 0 && oauthErr === 0) {
        verdict = "FAIL";
        reason = "OAuth failed: POST /github/connect returned an error (status/body captured in evidence)";
      } else if (onAuthorizePage) {
        verdict = "UNVERIFIED";
        reason = "Reached the real GitHub authorization URL. Environment/credentials prevent completion: interactive GitHub user sign-in is required, which a headless QA session cannot provide. The authorization navigation and authorization URL were observed for real.";
      } else if (oauthNotice > 0) {
        verdict = "UNVERIFIED";
        reason = "Environment does not enable OAuth: production returned the notice 'GitHub OAuth is not configured on the server yet' in the real browser.";
      } else if (connectApiOk === true && authUrlResponse !== null) {
        verdict = "UNVERIFIED";
        reason = "POST /github/connect produced a real authorization_url but the interactive GitHub authorization requires human credentials that a headless automation session cannot supply; environment/credentials prevent completion.";
      }
    }
// ---- 7. FINAL OUTPUT --------------------------------------------
    evidence.push("PAGE URL: " + page.url());
    evidence.push(`CONSOLE ERRORS (${consoleErrors.length}): ${JSON.stringify(consoleErrors.slice(0, 10))}`);
    evidence.push(`PAGE ERRORS (${pageErrors.length}): ${JSON.stringify(pageErrors.slice(0, 10))}`);

    const finalAuthUrl =
      authUrlResponse ||
      (page.url().includes("github.com") ? page.url() : null);

    const report = {
      id: "075",
      verdict,
      reason,
      authorizationUrl: finalAuthUrl,
      callback: null,
      connectedState: evidence.find((e) => e.startsWith("CONNECTED STATE")) ?? null,
      evidence,
    };
    fs.writeFileSync(path.join(DIR, "verdict.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(DIR, "evidence.txt"), evidence.join("\r\n"));

    console.log("\n#075:");
    console.log(verdict);
    console.log("\nAuthorization URL:");
    console.log(report.authorizationUrl ?? "(not observed)");
    console.log("\nCallback:");
    console.log(report.callback ?? "(not observed)");
    console.log("\nConnected state:");
    console.log(report.connectedState ?? "(not observed)");
    console.log("\nReason:");
    console.log(reason);
  } finally {
    await ctx.close();
  }
});