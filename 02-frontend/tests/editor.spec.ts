import { test, expect } from "@playwright/test";
import { mockProjectGetSuccess, mockWorkspaceApi } from "./support/mocks";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

test("workspace opens a file in Monaco and exposes editor controls", async ({ page }) => {
  await mockWorkspaceApi(page);
  await mockProjectGetSuccess(page, PROJECT_ID);
  await page.route(`**/api/v1/projects/${PROJECT_ID}/files`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { files: [{ name: "main.ts", path: "main.ts", type: "file", extension: "ts", size: 18 }] },
    }),
  }));
  await page.route(`**/api/v1/projects/${PROJECT_ID}/files/main.ts`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { path: "main.ts", name: "main.ts", content: "const answer = 42;", language: "typescript", size: 18 } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { path: "main.ts", name: "main.ts", content: "const answer = 43;", language: "typescript", size: 18 } }),
    });
  });
  await page.addInitScript(([token, projectId]) => {
    localStorage.setItem("devos_token", token!);
    localStorage.setItem("devos_active_project_id", projectId!);
  }, ["e2e-token", PROJECT_ID] as const);

  await page.goto("/app/workspace");
  await page.getByRole("button", { name: "main.ts" }).click();
  // Monaco is lazy-loaded from its CDN on first use; allow a cold load.
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Find in file" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to line" })).toBeVisible();
  await expect(page.getByLabel("Editor theme")).toHaveValue("devos-glass");
    for (const width of [320, 360, 375, 390, 414, 768]) {
    await page.setViewportSize({ width, height: 720 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("editor tab close button is reachable and closes the tab", async ({ page }) => {
    // Regression guard for the workspace layout squeeze: the editor tab row was
  // collapsed to 1px (its `overflow-x:auto` zeroed its flex min-height) so the
  // tab close button's center was covered by the editor toolbar and could not
  // be clicked. After the CSS fix the tab row keeps its height.
  await mockWorkspaceApi(page);
  await mockProjectGetSuccess(page, PROJECT_ID);
  await page.route(`**/api/v1/projects/${PROJECT_ID}/files`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { files: [{ name: "main.ts", path: "main.ts", type: "file", extension: "ts", size: 18 }] },
    }),
  }));
  const fileFulfill = {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { path: "main.ts", name: "main.ts", content: "const answer = 42;", language: "typescript", size: 18 } }),
  };
  await page.route(`**/api/v1/projects/${PROJECT_ID}/files/main.ts`, (route) => route.fulfill(fileFulfill));
  await page.addInitScript(([token, projectId]) => {
    localStorage.setItem("devos_token", token!);
    localStorage.setItem("devos_active_project_id", projectId!);
  }, ["e2e-token", PROJECT_ID] as const);

  await page.goto("/app/workspace");
  await page.getByRole("button", { name: "main.ts" }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });

    const closeBtn = page.getByRole("button", { name: /Close main\.ts/ });
  // The close button must be the topmost element at its center (its child icon
  // SVG is acceptable). Before the fix the toolbar covered the center.
  const hitTarget = await closeBtn.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const top = document.elementFromPoint(cx, cy) as HTMLElement | null;
    return top && (el === top || el.contains(top)) ? "close-button" : "covered-by-" + (top?.tagName || "null");
  });
  expect(hitTarget).toBe("close-button");

  // The tab row must retain its height instead of collapsing to 1px.
  const tabRowHeight = await page.locator(".editor-tabs").evaluate((el) => el.getBoundingClientRect().height);
  expect(tabRowHeight).toBeGreaterThan(10);

  await closeBtn.click({ timeout: 20_000 });
  await expect(page.locator(".editor-tab", { hasText: "main.ts" })).toHaveCount(0);
});

