// =====================================================================
// DEVOS v1.0.0 — PHASE 0 REPRODUCTION SPEC (FAIL root-cause evidence)
// REAL Chromium against production. Reproduces with diagnostics:
//   REPRO-A 059: conversation search negative filtering (network capture)
//   REPRO-B 066: artifact delete panel state (button-name dump)
//   REPRO-C 102/120: mobile 375/414 tree-row click (interception probe)
// Prep via API (safe test-data prep); ALL checks through real UI.
// =====================================================================
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://devos-ebon.vercel.app";
const API  = "https://devos-backend-f3ub.onrender.com/api/v1";
const STAMP = Date.now();
const EMAIL = `qa-repro-ui.${STAMP}@example.com`;
const PASSWORD = "Repro-UI-Phase0-2026!x";
const DIR = path.join(process.cwd(), "test-results", "phase0-repro");
fs.mkdirSync(DIR, { recursive: true });

interface Captured { url: string; status: number; body: string; }
const convGets: Captured[] = [];
const artifactCalls: Captured[] = [];

function watch(page: Page): void {
  page.on("response", async (r) => {
    const u = r.url();
    if (u.includes("/ai/conversations") && r.request().method() === "GET") {
      convGets.push({ url: u.replace(/token=[^&]+/, "token=<redacted>"), status: r.status(), body: "" });
      try { convGets[convGets.length - 1].body = (await r.text()).slice(0, 300); } catch { /* ignore */ }
    }
    if (u.includes("/ai/artifacts")) {
      artifactCalls.push({ url: `${r.request().method()} ${u}`, status: r.status(), body: "" });
      try { artifactCalls[artifactCalls.length - 1].body = (await r.text()).slice(0, 200); } catch { /* ignore */ }
    }
  });
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(DIR, `${name}.png`) }).catch(() => {});
}

test.describe.serial(() => {
  let projectId = "";
  let prepToken = "";

  test("prep via API (safe)", async ({ request }) => {
    test.setTimeout(300_000);
    await request.post(`${API}/auth/register`, {
      data: { name: "QA Repro UI", email: EMAIL, password: PASSWORD }, timeout: 120_000,
    });
    const login = await (await request.post(`${API}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD }, timeout: 60_000,
    })).json();
    const token = login.data.token as string;
    const projRes = await (await request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Repro UI Project", description: "phase0" }, timeout: 60_000,
    })).json();
    projectId = projRes.data.id as string;
    prepToken = token;
    await request.post(`${API}/projects/${projectId}/ai/conversations`, {
      headers: { Authorization: `Bearer ${token}` }, data: { title: "Repro Conv X" }, timeout: 60_000,
    });
    await request.post(`${API}/projects/${projectId}/ai/artifacts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "repro-notes.md", kind: "markdown", content: "# Repro notes", mime_type: "text/markdown" },
      timeout: 60_000,
    });
    await request.post(`${API}/projects/${projectId}/files/folder`, {
      headers: { Authorization: `Bearer ${token}` }, data: { parent_path: "", name: "facts" }, timeout: 60_000,
    });
    await request.post(`${API}/projects/${projectId}/files/file`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { parent_path: "facts", name: "quotes.txt", content: "phase0 repro file" }, timeout: 60_000,
    });
    fs.writeFileSync(path.join(DIR, "prep.json"), JSON.stringify({ projectId, hasToken: Boolean(token) }), "utf8");
    expect(projectId).toBeTruthy();
  });

  test("REPRO-A + B: conversation search + artifact delete (real UI, network captured)", async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page);

    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 180_000 });

    await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open Workspace" }).first().click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });

    // ---- DEPLOYED-DOM DIAGNOSIS: every input's accessible label ----
    const inputLabels = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input, textarea"))
        .map((i) => ({
          tag: i.tagName,
          ariaLabel: i.getAttribute("aria-label"),
          placeholder: i.getAttribute("placeholder"),
          type: (i as HTMLInputElement).type,
        }))
    );
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1, h2, h3")).map((h) => h.textContent?.trim())
    );
    fs.writeFileSync(path.join(DIR, "domInputs.json"), JSON.stringify({ inputLabels, headings }, null, 2), "utf8");

    // ---- REPRO-B: artifact delete (independent) ----
    const openArt = page.getByRole("button", { name: /Open artifact/ });
    const before = await openArt.count();
    const beforeNames = await openArt.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    await page.getByRole("button", { name: "Open artifact repro-notes.md" }).click({ timeout: 20_000 });
    await page.getByRole("button", { name: "Delete artifact" }).click({ timeout: 20_000 });
    await page.waitForTimeout(3_000);
    const after = await openArt.count();
    const afterNames = await openArt.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    const panelText = await page.locator(".artifact-panel").innerText().catch(() => "");
    fs.writeFileSync(path.join(DIR, "reproB.json"), JSON.stringify({
      before, beforeNames, after, afterNames, panelTextSlice: panelText.slice(0, 400), artifactCalls,
    }, null, 2), "utf8");
    await shot(page, "reproB-after-delete");

    // ---- REPRO-A: conversation search (locate actual box) ----
    const assistantTab = page.locator("#ai-command-center").getByRole("tab", { name: "Assistant" });
    if (await assistantTab.isVisible().catch(() => false)) {
      await assistantTab.click({ timeout: 10_000 });
      await page.waitForTimeout(1_000);
    }
    const searchBox = page.getByLabel("Search conversations");
    const searchPresent = await searchBox.count();
    if (searchPresent > 0) {
      const conv = page.getByLabel("Conversation history");
      await box_probe(conv, searchBox);
    } else {
      fs.appendFileSync(path.join(DIR, "reproA.json"), JSON.stringify({
        searchBoxPresent: false, inputLabels, note: "No 'Search conversations' input in deployed DOM",
      }, null, 2), "utf8");
    }
    await shot(page, "reproA-final");
    await ctx.close();

    async function box_probe(conv: ReturnType<Page["getByLabel"]>, box: ReturnType<Page["getByLabel"]>): Promise<void> {
      await box.fill("zzz-no-match-repro");
      await page.waitForTimeout(3_000);
      const rowsAfterNegative = await conv.locator(".conversation-history-item").count();
      const rowTexts = await conv.locator(".conversation-history-item").allInnerTexts().catch(() => []);
      const listText = await conv.innerText().catch(() => "");
      fs.appendFileSync(path.join(DIR, "reproA.json"), JSON.stringify({
        searchBoxPresent: true, rowsAfterNegative, rowTexts, listTextSlice: listText.slice(0, 400), convGets,
      }, null, 2), "utf8");
    }
  });

  test("REPRO-C: mobile 375/414 tree-row click diagnostics", async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 180_000 });
    await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open Workspace" }).first().click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });

    for (const w of [375, 414]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.waitForTimeout(1_000);
      const row = page.locator('.tree-row[title="facts/quotes.txt"]').last();
      let outcome = "";
      try {
        if (!(await row.isVisible())) {
          await page.locator('.tree-row[title="facts"]').first().click({ timeout: 10_000 });
          await page.waitForTimeout(800);
        }
        const info = await row.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const top = document.elementFromPoint(cx, cy) as Element | null;
          return {
            rect: { x: r.x, y: r.y, w: r.width, h: r.height },
            elementAtCenter: top ? `${top.tagName}.${String(top.className).slice(0, 60)}` : "null",
            isRowItself: el === top || el.contains(top),
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          };
        });
        await row.click({ timeout: 8_000 });
        outcome = `CLICKED rect=${JSON.stringify(info.rect)} atCenter=${info.elementAtCenter} isRow=${info.isRowItself} overflow=${info.scrollWidth - info.clientWidth}`;
      } catch (err) {
        outcome = `FAILED: ${String(err).slice(0, 200)}`;
      }
      fs.appendFileSync(path.join(DIR, "reproC.txt"), `WIDTH ${w}: ${outcome}\n`, "utf8");
      await shot(page, `reproC-${w}`);
      const closeBtn = page.getByRole("button", { name: /Close artifact|Close facts/ }).first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
    }
    await ctx.close();
  });

  test("REPRO-D: artifact delete WITH Monaco tab open (audit's exact sequence)", async ({ browser, request }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    watch(page);

    // Recreate the artifact via API (prep token) so the Monaco-open + delete
    // sequence matches the audit's exact state before its delete check.
    await request.post(`${API}/projects/${projectId}/ai/artifacts`, {
      headers: { Authorization: `Bearer ${prepToken}` },
      data: { name: "repro-d.md", kind: "markdown", content: "# Repro D", mime_type: "text/markdown" },
      timeout: 60_000,
    });

    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 180_000 });
    await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Open Workspace" }).first().click({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });

    const openArt = page.getByRole("button", { name: /Open artifact/ });
    await expect(openArt.first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Open artifact in Monaco" }).click({ timeout: 10_000 });
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Delete artifact" }).click({ timeout: 10_000 });
    await page.waitForTimeout(3_000);
    const after = await openArt.count();
    const afterNames = await openArt.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    const tabs = await page.locator(".editor-tab").allInnerTexts().catch(() => []);
    const panelText = await page.locator(".artifact-panel").innerText().catch(() => "");
    fs.appendFileSync(path.join(DIR, "reproD.txt"), `afterDelete openArtifactButtons=${after} names=${JSON.stringify(afterNames)} tabs=${JSON.stringify(tabs)} panel="${panelText.slice(0, 200)}"\n`, "utf8");
    await shot(page, "reproD-monaco-open-delete");
    await ctx.close();
  });
});