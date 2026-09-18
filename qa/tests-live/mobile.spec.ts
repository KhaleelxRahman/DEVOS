import { test, expect, type Page } from "@playwright/test";

// Focused Mobile Explorer + Monaco — fresh Chromium context per viewport.
const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `qa.mobile.${STAMP}@example.com`;
const PASSWORD = "Devos-Mobile-2026!-real";

test("Mobile Explorer + Monaco @320/375/390/414", async ({ browser }) => {
  test.setTimeout(600_000);

    // Register + login + seed files via API once.
  const request = await browser.newContext();
  const rq = await request.request;
  await rq.post(`${API}/auth/register`, { data: { name: "QA Mobile", email: EMAIL, password: PASSWORD } }).catch(() => {});
  const lg = await rq.post(`${API}/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  const tok = (await lg.json()).data.token;
  const proj = await rq.post(`${API}/projects`, { headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, data: { name: `Mobile ${STAMP}` } });
  const pid = (await proj.json()).data?.id;
  const h = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
  await rq.post(`${API}/projects/${pid}/files/folder`, { headers: h, data: { parent_path: "", name: "facts" } });
  await rq.post(`${API}/projects/${pid}/files/file`, { headers: h, data: { parent_path: "facts", name: "quotes.txt", content: "line one\nline two" } });
  await request.close();

  const results: { w: number; passed: boolean; detail?: string }[] = [];

  for (const w of [320, 375, 390, 414]) {
    const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    try {
      // Login through real form
      await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
      await page.getByLabel("Email Address").fill(EMAIL);
      await page.getByLabel("Password").fill(PASSWORD);
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page).toHaveURL(/\/(app\/)?dashboard$/, { timeout: 60_000 });

      // Projects → open existing project → confirm active project
      await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: "Open Workspace" }).first()).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Open Workspace" }).first().click();
      await expect(page).toHaveURL(/\/app\/workspace$/, { timeout: 30_000 });
      const active = await page.evaluate(() => localStorage.getItem("devos_active_project_id"));
      expect(active).toBeTruthy();

      // Workspace renders without horizontal overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow @${w}`).toBeLessThanOrEqual(2);

      // Explorer: expand parent folder
      const folder = page.locator('.tree-row[title="facts"]').first();
      await expect(folder).toBeVisible({ timeout: 20_000 });
      await folder.click();
      await expect(page.locator('.tree-row[title="facts"]').first()).toHaveAttribute("aria-expanded", "true", { timeout: 10_000 });

      // Open nested file → Monaco (REAL click, no pointer interception)
      const fileRow = page.locator('.tree-row[title="facts/quotes.txt"]').last();
      await expect(fileRow).toBeVisible({ timeout: 15_000 });
      await fileRow.click({ timeout: 15_000 });
      await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 45_000 });

      // Tab appears
      await expect(page.locator(".editor-tab", { hasText: "quotes.txt" })).toBeVisible({ timeout: 15_000 });

      // Edit + Save
      await page.locator(".monaco-editor").click();
      await page.keyboard.press("Control+a");
      await page.keyboard.type("edited mobile content");
      await page.keyboard.press("Control+s");
      await expect(page.locator(".editor-tab", { hasText: "quotes.txt" })).toBeVisible({ timeout: 10_000 });

      // Reopen: close tab then reopen from explorer
      await page.locator(".editor-tab", { hasText: "quotes.txt" }).locator(".editor-tab-close").click().catch(() => {});
      await expect(page.locator(".editor-tab", { hasText: "quotes.txt" })).toHaveCount(0, { timeout: 10_000 });
      await page.locator('.tree-row[title="facts/quotes.txt"]').last().click({ timeout: 15_000 });
      await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 45_000 });

      // No pointer interception: file row center is hit-testable
      const box = await fileRow.boundingBox();
      const topEl = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el ? (el.getAttribute("class") || el.tagName) : "none"; }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
      expect(topEl, `pointer intercepted @${w}: ${topEl}`).toContain("tree-row");

      results.push({ w, passed: true });
      console.log(`[MOBILE] @${w} = PASS (overflow=${overflow}px, hit=${topEl})`);
    } catch (e) {
      results.push({ w, passed: false, detail: String((e as Error).message).slice(0, 200) });
      console.log(`[MOBILE] @${w} = FAIL:`, String((e as Error).message).slice(0, 200));
    }
    await ctx.close();
  }

  for (const r of results) console.log(`[MOBILE] RESULT: ${r.w} = ${r.passed ? "PASS" : "FAIL"}${r.detail ? " :: " + r.detail : ""}`);
  expect(results.every((r) => r.passed), `mobile failures: ${results.filter((r) => !r.passed).map((r) => r.w).join(",")}`).toBeTruthy();
});