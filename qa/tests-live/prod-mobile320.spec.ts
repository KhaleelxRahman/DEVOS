import { test, expect } from "@playwright/test";

const PROD = "https://devos-ebon.vercel.app";
const BACKEND = "https://devos-backend-f3ub.onrender.com/api/v1";

test("MOBILE @320 — production real browser verification", async ({ browser }) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const email = `qa.prodmob.${stamp}@example.com`;
  const password = "QaProdMob123!x";
  const ctx = await browser.newContext({ viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`[PROD-MOB320] PAGEERROR: ${String(e).slice(0, 200)}`));
  page.on("console", (m) => { if (m.type() === "error") console.log(`[PROD-MOB320] CONSOLE-ERR: ${m.text().slice(0, 200)}`); });

  const r = await page.request.post(`${BACKEND}/auth/register`, { data: { name: "QA ProdMob", email, password } });
  if (!r.ok()) throw new Error(`register ${r.status()}`);
  await page.goto(`${PROD}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/(app\/)?dashboard$/, { timeout: 60_000 });
  console.log("[PROD-MOB320] login OK");

  await page.goto(`${PROD}/app/projects`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({ timeout: 30_000 });
  console.log("[PROD-MOB320] projects page OK");

  // Real project creation through the real Projects UI.
  await page.getByRole("button", { name: "Create Project" }).first().click();
  await page.getByLabel("Project Name").fill(`ProdMob ${stamp}`);
  await page.getByRole("button", { name: "Create Project" }).last().click();
  await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 60_000 });
  const active = await page.evaluate(() => localStorage.getItem("devos_active_project_id"));
  if (!active) throw new Error("no active project");
  console.log(`[PROD-MOB320] project created + workspace OK (active=${String(active).slice(0, 8)})`);

  // Real nested-file creation through the real Explorer UI (+ button).
  await expect(page.getByText(/Workspace:/i).first()).toBeVisible({ timeout: 30_000 });
  const newBtn = page.getByRole("button", { name: /new file, folder/i }).first();
  await expect(newBtn).toBeVisible({ timeout: 15_000 });
  const promptQueue: string[] = [];
  page.on("dialog", async (d) => {
    try {
      if (d.type() === "prompt") { const v = promptQueue.shift() ?? ""; await d.accept(v); }
      else await d.accept();
    } catch { /* noop */ }
  });
  await newBtn.click();
  promptQueue.push("facts");
  await page.getByRole("menuitem", { name: "New Folder" }).click();
  await expect(page.locator('.tree-row[title="facts"]').first()).toBeVisible({ timeout: 20_000 });
  console.log("[PROD-MOB320] folder 'facts' created");
  await page.locator('.tree-row[title="facts"]').first().click();
  await expect(page.locator('.tree-row[title="facts"]').first()).toHaveAttribute("aria-expanded", "true", { timeout: 10_000 });
  // Nested files are created via the folder's own context menu (real UI path:
  // right-click folder → New File → plain file name). The top-level "+" New File
  // only accepts a bare name (NAME_RE rejects slashes), so "facts/quotes.txt"
  // there is correctly rejected by the app.
  await page.locator('.tree-row[title="facts"]').first().click({ button: "right" });
  promptQueue.push("quotes.txt");
  await page.getByRole("menuitem", { name: "New File" }).click();
  const fileRow = page.locator('.tree-row[title="facts/quotes.txt"]').last();
  await expect(fileRow).toBeVisible({ timeout: 20_000 });
  console.log("[PROD-MOB320] file 'facts/quotes.txt' created");


  const fileTree = page.getByRole("tree", { name: "Project files" });
  await expect(fileTree).toBeVisible({ timeout: 20_000 });
  const expBox = await fileTree.boundingBox();
  console.log(`[PROD-MOB320] explorer tree box: ${JSON.stringify(expBox)}`);
  if (!expBox || expBox.width < 100) throw new Error(`explorer too narrow: ${JSON.stringify(expBox)}`);
  console.log("[PROD-MOB320] folder expanded (from creation flow)");

  await expect(fileRow).toBeVisible({ timeout: 15_000 });
  const box = await fileRow.boundingBox();
  const topEl = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el ? (el.closest(".tree-row") ? "tree-row" : (el.getAttribute("class") || el.tagName)) : "none"; }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
  console.log(`[PROD-MOB320] elementFromPoint=${topEl}`);
  if (!String(topEl).includes("tree-row")) throw new Error(`pointer intercepted: ${topEl}`);
  await fileRow.click({ timeout: 15_000 });
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 45_000 });
  const monBox = await page.locator(".monaco-editor").boundingBox();
  console.log(`[PROD-MOB320] monaco box: ${JSON.stringify(monBox)}`);
  if (!monBox || monBox.width < 50) throw new Error(`monaco too narrow: ${JSON.stringify(monBox)}`);
  await expect(page.locator(".editor-tab", { hasText: "quotes.txt" })).toBeVisible({ timeout: 15_000 });

  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("edited mobile 320 content");
  await page.waitForTimeout(1500);
  const dirty = await page.locator(".editor-tab", { hasText: "quotes.txt" }).innerText();
  console.log(`[PROD-MOB320] tab label after edit: "${dirty.trim()}"`);
  if (!dirty.includes("●")) throw new Error("dirty state did not appear after edit");

  // Save via the real Save button (mobile viewport may not deliver Ctrl+S to Monaco reliably).
  const saveBtn = page.getByRole("button", { name: "Save file" });
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.scrollIntoViewIfNeeded();
  const saveBox = await saveBtn.boundingBox();
  const underSave = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el ? (el.getAttribute("class") || el.tagName) : "none"; }, { x: saveBox!.x + saveBox!.width / 2, y: saveBox!.y + saveBox!.height / 2 });
  console.log(`[PROD-MOB320] elementFromPoint on Save button=${underSave}`);
  if (!underSave.includes("btn")) throw new Error(`Save button pointer intercepted: ${underSave}`);
  await saveBtn.click();
  await page.waitForTimeout(3000);
  const clean = await page.locator(".editor-tab", { hasText: "quotes.txt" }).innerText();
  console.log(`[PROD-MOB320] tab label after save: "${clean.trim()}"`);
  if (clean.includes("●")) throw new Error("dirty state did not clear after save");
  console.log("[PROD-MOB320] edit + dirty + save verified");

  const tab = page.locator(".editor-tab", { hasText: "quotes.txt" });
  await tab.getByRole("button", { name: /close/i }).click();
  await expect(page.locator(".editor-tab", { hasText: "quotes.txt" })).toHaveCount(0, { timeout: 10_000 });
  await page.locator('.tree-row[title="facts/quotes.txt"]').last().click({ timeout: 15_000 });
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 45_000 });
  console.log("[PROD-MOB320] close + reopen OK");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`[PROD-MOB320] overflow=${overflow}px`);
  if (overflow > 2) throw new Error(`horizontal overflow ${overflow}px`);
  console.log("[PROD-MOB320] VERIFIED @320: explorer + monaco usable, no interception, no overflow");
  await ctx.close();
});
