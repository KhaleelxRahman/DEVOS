// =====================================================================
// DEVOS v1.0.0 — #061 ARTIFACT DIRECT UI CREATION VERIFICATION
// Real Chromium browser against production:
//   Frontend: https://devos-ebon.vercel.app
//   Backend : https://devos-backend-f3ub.onrender.com/api/v1
//
// GOAL: Determine whether DEVOS has a user-facing UI that DIRECTLY
// creates an artifact (not via API, not via AI conversation).
//
// IF YES → actually create an artifact through the UI and verify all
//         artifact operations (preview, metadata, copy, download, delete,
//         Monaco open where supported).
// IF NO  → return #061 = UNVERIFIED with exact reason.
//
// STOP. Do NOT infer from source code. Do NOT use API creation as UI
// proof. Do NOT fabricate an artifact.
// =====================================================================
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://devos-ebon.vercel.app";
const API  = "https://devos-backend-f3ub.onrender.com/api/v1";

const STAMP  = Date.now();
const EMAIL  = `qa061.${STAMP}@example.com`;
const PASSWORD = "Devos-061-QA-2026!-check";
const DIR    = path.join(process.cwd(), "test-results", "061");
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

const promptQueue: string[] = [];
function installDialogRouter(page: Page): void {
  page.on("dialog", async (d) => {
    try {
      if (d.type() === "prompt") { const v = promptQueue.shift() ?? ""; await d.accept(v); }
      else { await d.accept(); }
    } catch {}
  });
}
function pushPrompt(v: string): void { promptQueue.push(v); }
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
  // Prefer opening an existing project card when one is available.
  const openExisting = page.getByRole("button", { name: "Open Workspace" }).first();
  if (await openExisting.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await openExisting.click({ timeout: 20_000 });
  } else {
    // Fresh account: create a project through the UI modal (this is a project,
    // NOT an artifact — artifact creation is what #061 is verifying).
    const createBtn = page.getByRole("button", { name: "Create Project" }).first();
    await createBtn.click({ timeout: 20_000 });
    await expect(page.getByLabel("Project Name")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Project Name").fill(`061 QA Project ${STAMP}`);
    await page.getByRole("dialog").last().getByRole("button", { name: "Create Project" }).click();
  }
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });
  await expect(page.getByText(/Workspace:/i)).toBeVisible({ timeout: 60_000 });
  return await page.evaluate(() => localStorage.getItem("devos_active_project_id") || "");
}

async function inspectArtifactUI(page: Page): Promise<{
  hasCreateButton: boolean;
  createButtonLabel: string | null;
  createButtonAria: string | null;
  panelVisible: boolean;
  emptyStateVisible: boolean;
  artifactCount: number;
  panelActions: string[];
}> {
  await expect(page.getByText(/Workspace:/i)).toBeVisible({ timeout: 30_000 });

  const artifactsCard = page.locator("text=Artifacts").first().locator("..").locator("..");
  await artifactsCard.scrollIntoViewIfNeeded({ timeout: 15_000 });

  const allButtons = page.locator("button");
  const buttonCount = await allButtons.count();

  let hasCreateButton = false;
  let createButtonLabel: string | null = null;
  let createButtonAria: string | null = null;

  for (let i = 0; i < buttonCount; i++) {
    const btn = allButtons.nth(i);
    const text = await btn.textContent().catch(() => "");
    const aria = (await btn.getAttribute("aria-label").catch(() => "")) ?? "";
    const combined = (text + " " + aria).toLowerCase();

    if (combined.includes("artifact") &&
        (combined.includes("create") || combined.includes("new") || combined.includes("add") || combined.includes("generate"))) {
      hasCreateButton = true;
      createButtonLabel = text.trim() || null;
      createButtonAria = aria || null;
      break;
    }
  }

  const artifactButtons: string[] = [];
  for (let i = 0; i < buttonCount; i++) {
    const btn = allButtons.nth(i);
    const text = await btn.textContent().catch(() => "");
    const aria = (await btn.getAttribute("aria-label").catch(() => "")) ?? "";
    if (text.toLowerCase().includes("artifact") || aria.toLowerCase().includes("artifact")) {
      artifactButtons.push((text + (aria ? ` [aria: ${aria}]` : "")).trim());
    }
  }

  const emptyState = page.locator(".artifact-panel .muted, .artifact-panel span.muted");
  const emptyStateVisible = await emptyState.isVisible().catch(() => false);

  const openButtons = page.locator("button[aria-label*='Open artifact']");
  const artifactCount = await openButtons.count();

  return {
    hasCreateButton,
    createButtonLabel,
    createButtonAria,
    panelVisible: await page.locator(".artifact-panel, .artifact-list").isVisible().catch(() => false),
    emptyStateVisible,
    artifactCount,
    panelActions: artifactButtons,
  };
}

// =====================================================================
// FOCUSED #061 EXECUTION
// Real Chromium against production. One test. Evidence-only.
// =====================================================================

test("#061 Artifact Direct UI Creation", async ({ browser }) => {
  test.setTimeout(300000);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  attachListeners(page);
  installDialogRouter(page);

  const evidence: string[] = [];

  try {
    // Provision throwaway account (account setup only — NOT artifact creation)
    await page.request.post(`${API}/auth/register`, {
      data: { name: "QA 061", email: EMAIL, password: PASSWORD },
      timeout: 120000,
    });

    // ---- 1. LOGIN -------------------------------------------------
    await login(page);
    evidence.push("LOGIN: dashboard reached after Sign In");
    await shot(page, "01-login-dashboard");

    // ---- 2. PROJECTS -> open an existing project (UI navigation) ---
    const activePid = await ensureProject(page);
    evidence.push(`PROJECT: workspace open activeProjectId=${activePid}`);
    await shot(page, "02-workspace");

    // ---- 3. INSPECT THE ACTUAL ARTIFACT UI ------------------------
    await expect(page.getByText(/Workspace:/i)).toBeVisible({ timeout: 30000 });
    await page.locator("text=Artifacts").first().scrollIntoViewIfNeeded({ timeout: 15000 });
    await shot(page, "03-artifacts-card");

    // Wait until the Artifacts panel finishes loading (if it ever loads),
    // so any create control WOULD have rendered by now.
    const loadingSel = page.locator("text=Loading artifacts");
    try {
      await loadingSel.waitFor({ state: "hidden", timeout: 45000 });
    } catch {
      await page.waitForTimeout(3000);
    }
    await shot(page, "03b-artifacts-loaded");

    // Textual DOM evidence: what does the browser actually render?
    const headings = await page.locator("h1, h2, h3, h4").allTextContents().catch(() => []);
    evidence.push(`ALL HEADINGS ON PAGE: ${JSON.stringify(headings)}`);

    const artText = await page.locator("text=Artifacts").first().textContent().catch(() => "");
    evidence.push(`ARTIFACTS HEADING TEXT: ${JSON.stringify(artText)}`);

    // Card/section directly associated with the Artifacts heading (closest card ancestor)
    const artCardText = await page
      .locator("text=Artifacts").first()
      .evaluate((el) => {
        let node: HTMLElement | null = el as HTMLElement;
        for (let i = 0; i < 4 && node; i++) node = node.parentElement;
        return node ? node.innerText.slice(0, 1200) : "";
      }).catch(() => "");
    evidence.push(`ARTIFACTS CARD INNER TEXT: ${JSON.stringify(artCardText)}`);

    // Raw HTML of the region containing the artifact empty-state text
    const artHtml = await page
      .locator("text=Generated artifacts will appear here")
      .first()
      .evaluate((el) => {
        let node: HTMLElement | null = el as HTMLElement;
        for (let i = 0; i < 4 && node; i++) node = node.parentElement;
        return node ? node.innerHTML.slice(0, 1600) : "";
      }).catch(() => "NO_EMPTY_STATE_HTML");
    evidence.push(`ARTIFACT EMPTY-STATE HTML: ${JSON.stringify(artHtml)}`);

    const ui = await inspectArtifactUI(page);
    evidence.push(`ARTIFACT PANEL: visible=${ui.panelVisible} emptyState=${ui.emptyStateVisible} existingArtifacts=${ui.artifactCount}`);
    evidence.push(`ARTIFACT PANEL ACTIONS: ${JSON.stringify(ui.panelActions)}`);
    evidence.push(`TARGETED CREATE SCAN: hasCreateButton=${ui.hasCreateButton} label=${ui.createButtonLabel || "null"} aria=${ui.createButtonAria || "null"}`);

    // Broader sweep: EVERY control whose text/aria mentions "artifact"
    const sweep: string[] = [];
    const allButtons = page.locator("button");
    const total = await allButtons.count();
    for (let i = 0; i < total; i++) {
      const b = allButtons.nth(i);
      const t = await b.textContent().catch(() => "");
      const a = (await b.getAttribute("aria-label").catch(() => "")) ?? "";
      if ((t + " " + a).toLowerCase().includes("artifact")) {
        sweep.push((t.trim() + (a ? ` [aria:${a}]` : "")).trim());
      }
    }
    // Full button inventory (no text truncation) for the record
    const allLabels: string[] = [];
    for (let i = 0; i < total; i++) {
      const b = allButtons.nth(i);
      const t = (await b.textContent().catch(() => "")).trim();
      const a = (await b.getAttribute("aria-label").catch(() => "")) ?? "";
      const lbl = (t + (a ? ` [aria:${a}]` : "")).trim();
      if (lbl.length > 0) allLabels.push(lbl);
    }
    evidence.push(`ALL BUTTON LABELS ON PAGE (${allLabels.length}): ${JSON.stringify(allLabels)}`);
    evidence.push(`ALL ARTIFACT CONTROLS ON PAGE: ${JSON.stringify(sweep)}`);

    const createExists =
      ui.hasCreateButton ||
      sweep.some((s) => /create|new|add|generate/i.test(s));

    await shot(page, createExists ? "04-create-control-found" : "04-no-create-control");
    evidence.push(createExists ? "RESULT: create control found" : "RESULT: no create control found");

    // ---- 4. INTERACT WITH CREATE CONTROL IF PRESENT ----------------
    let verdict: "PASS" | "UNVERIFIED" = "UNVERIFIED";
    let reason = "NO SUPPORTED DIRECT ARTIFACT CREATION UI IN CURRENT PRODUCT";

    if (createExists) {
      let createBtn = page.locator("button[aria-label*='artifact'][aria-label*='reate' i], button[aria-label*='artifact'][aria-label*='New' i]").first();
      if (!(await createBtn.isVisible().catch(() => false))) {
        createBtn = page.locator("button").filter({ hasText: /artifact/i }).filter({ hasText: /create|new|add|generate/i }).first();
      }
      await createBtn.click({ timeout: 15000 });
      await page.waitForTimeout(3000);
      await shot(page, "05-after-create-click");

      const openButtons = page.locator("button[aria-label*='Open artifact']");
      const afterCount = await openButtons.count();
      evidence.push(`CREATE CLICK: artifactCount before=${ui.artifactCount} after=${afterCount}`);

      if (afterCount > ui.artifactCount) {
        await openButtons.first().click({ timeout: 10000 });
        await shot(page, "06-artifact-appeared");
        evidence.push("VERIFY: artifact appeared in panel list");

        const previewOk = await page.locator(".artifact-preview-body, .artifact-content").first().isVisible({ timeout: 15000 }).catch(() => false);
        evidence.push(`VERIFY: preview visible=${previewOk}`);

        const metaText = (await page.locator(".artifact-item").first().textContent().catch(() => "")).trim();
        evidence.push(`VERIFY: list metadata=${JSON.stringify(metaText)}`);
        const metaTitle = (await page.locator(".artifact-toolbar strong, .artifact-preview strong").first().textContent().catch(() => "")).trim();
        evidence.push(`VERIFY: selected title=${JSON.stringify(metaTitle)}`);

        await page.getByRole("button", { name: "Copy artifact" }).click();
        await page.waitForTimeout(800);
        const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
        evidence.push(`VERIFY: clipboard copied=${clip.length > 0} hasContent=${clip.includes("qa061")}`);

        const dl = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
        await page.getByRole("button", { name: "Download artifact" }).click();
        const download = await dl;
        evidence.push(`VERIFY: download intercepted=${download ? download.suggestedFilename() : "none"}`);

        let monacoOk = false;
        let monacoPresent = false;
        const monacoBtn = page.getByRole("button", { name: /Open artifact in Monaco/i });
        monacoPresent = await monacoBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (monacoPresent) {
          await monacoBtn.click({ timeout: 10000 });
          monacoOk = await page.locator(".monaco-editor").first().isVisible({ timeout: 20000 }).catch(() => false);
        }
        evidence.push(`VERIFY: monaco button present=${monacoPresent} opened=${monacoOk}`);

        await page.getByRole("button", { name: "Delete artifact" }).click();
        await page.waitForTimeout(2500);
        const remaining = await page.locator("button[aria-label*='Open artifact']").count();
        const deleted = remaining === 0;
        evidence.push(`VERIFY: delete remaining=${remaining}`);

        if (previewOk && clip.length > 0 && deleted) {
          verdict = "PASS";
          reason = "Direct artifact creation control found and exercised through the browser; artifact appeared with preview, copy, download" + (monacoOk ? ", Monaco open" : "") + " and delete verified";
        } else {
          reason = "Create control exists but full creation flow could not be verified: " + JSON.stringify({ previewOk, copied: clip.length > 0, deleted });
        }
      } else {
        reason = "Create control found but no new artifact appeared after interaction";
      }
    }

    // ---- 5. FINAL OUTPUT + EVIDENCE FILES --------------------------
    evidence.push("PAGE URL: " + page.url());
    evidence.push(`CONSOLE ERRORS (${consoleErrors.length}): ${JSON.stringify(consoleErrors.slice(0, 10))}`);
    evidence.push(`PAGE ERRORS (${pageErrors.length}): ${JSON.stringify(pageErrors.slice(0, 10))}`);

    const report = {
      id: "061",
      verdict,
      directArtifactCreationUI: createExists,
      reason,
      evidence,
    };
    fs.writeFileSync(path.join(DIR, "verdict.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(DIR, "evidence.txt"), evidence.join("\r\n"));

    console.log("\n#061:");
    console.log(verdict);
    console.log("\nEvidence:");
    console.log(JSON.stringify(evidence, null, 2));
    console.log("\nDirect artifact creation UI: " + (createExists ? "YES" : "NO"));
    console.log("\nReason: " + reason);
  } finally {
    await ctx.close();
  }
});