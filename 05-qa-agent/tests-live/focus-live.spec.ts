import { test, expect, type Page } from "@playwright/test";

const BASE = "https://devos-ebon.vercel.app";
const API = "https://devos-backend-f3ub.onrender.com/api/v1";
const STAMP = Date.now();
const EMAIL = `qa.focus.${STAMP}@example.com`;
const PASSWORD = "Devos-Focus-QA-2026!-ok";
const NAME = "QA Focus Agent";

// Focused live production verification — exercises the critical fixes quickly:
//  1) auth flow (CORS/login)  2) editor tab close-button reachability (CSS fix)
//  3) terminal execution + status badge (deployed terminal feature)
test("DEVOS focused live production verification", async ({ page }) => {
  test.setTimeout(240_000);

  const corsErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && /CORS|blocked|cross.origin/i.test(m.text())) corsErrors.push(m.text()); });
  page.on("pageerror", (e) => pageErrors.push(String(e.message || e)));

  // ---------- 1a. Registration ----------
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Full Name").fill(NAME);
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 90_000 });
  console.log("[focus] PASS registration");

  // ---------- 1b. Logout then invalid login (CORS/401) ----------
  await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill("wrong-password-xyz");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 60_000 });
  const invalidToken = await page.evaluate(() => localStorage.getItem("devos_token"));
  expect(invalidToken).toBeNull();
  console.log("[focus] PASS invalid login shows proper error (no CORS failure)");

  // ---------- 1c. Valid login ----------
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 90_000 });
  console.log("[focus] PASS valid login");

  // ---------- Create a project ----------
  await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create Project" }).first().click();
  await page.getByLabel("Project Name").fill(`Focus ${STAMP}`);
  await page.getByRole("dialog").last().getByRole("button", { name: "Create Project" }).click();
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });

  // ---------- Create folder + file via API, open in Monaco ----------
  const token = await page.evaluate(() => localStorage.getItem("devos_token") || "");
  const projectId = await page.evaluate(() => localStorage.getItem("devos_active_project_id") || "");
  const createResult = await page.evaluate(async ([api, pid, t]) => {
    const post = (url: string, body: unknown) => fetch(`${api}/projects/${pid}${url}`, {
      method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const folderRes = await post("/files/folder", { parent_path: "", name: "src" });
    const fileRes = await post("/files/file", { parent_path: "src", name: "main.ts", content: "const answer = 42;" });
    return { folderOk: folderRes.ok, fileOk: fileRes.ok };
  }, [API, projectId, token] as const);
  expect(createResult.folderOk, "folder created via API").toBe(true);
  expect(createResult.fileOk, "file created via API").toBe(true);
  // Refresh the explorer tree, then expand the folder (refresh resets expansion).
  await page.getByRole("button", { name: "Refresh tree" }).click();
  await expect(page.locator('.tree-row[title="src"]').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('.tree-row[title="src"]').first().click(); // expand
  await page.waitForTimeout(400);
  const fileRow = page.locator('.tree-row[title="src/main.ts"]').last();
  await expect(fileRow).toBeVisible({ timeout: 15_000 });
  await fileRow.click();
  const editorTab = page.locator('.editor-tab', { hasText: 'main.ts' });
  await expect(editorTab).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 });
  console.log("[focus] PASS file created via API and opened in Monaco");

  // ---------- 2. Editor tab close-button reachability (CSS fix) ----------
  // The tab row previously collapsed to 1px (overflow-x:auto zeroed its flex
  // min-height) so the toolbar covered the close button. The deployed CSS fix
  // (flex:0 0 auto on .editor-tabs) keeps the tab row at its natural height.
  const closeBtn = page.locator('.editor-tab-close').first();
  await expect(closeBtn).toBeVisible({ timeout: 10_000 });
  const hitTarget = await closeBtn.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) as HTMLElement | null;
    return top && (el === top || el.contains(top)) ? "close-button" : "covered-by-" + (top?.tagName || "null");
  });
  expect(hitTarget).toBe("close-button");
  const tabRowHeight = await page.locator(".editor-tabs").evaluate((el) => el.getBoundingClientRect().height);
  expect(tabRowHeight).toBeGreaterThan(10);
  console.log(`[focus] PASS close button reachable (hit=${hitTarget}, tabRowH=${Math.round(tabRowHeight)})`);

  await closeBtn.click({ timeout: 20_000 });
  await expect(page.locator(".editor-tab", { hasText: "main.ts" })).toHaveCount(0);
  console.log("[focus] PASS tab closed");

  // ---------- 3. Terminal execution + status badge ----------
  const termInput = page.getByLabel("Terminal command");
  await expect(termInput).toBeVisible({ timeout: 15_000 });
  await termInput.fill("echo focus-ok");
  await page.getByRole("button", { name: "Run command" }).click();
  await expect(page.locator(".terminal-entry-status.success", { hasText: "completed" }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("focus-ok", { exact: true })).toBeVisible({ timeout: 15_000 });
  console.log("[focus] PASS terminal executed with success status badge");

  // Hygiene
  expect.soft(pageErrors, "no page errors").toEqual([]);
  expect.soft(corsErrors, "no CORS errors").toEqual([]);
  console.log("[focus] ALL CHECKS PASSED");
});