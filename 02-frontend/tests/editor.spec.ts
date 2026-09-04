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
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await expect(page.getByRole("button", { name: "Find in file" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to line" })).toBeVisible();
  await expect(page.getByLabel("Editor theme")).toHaveValue("devos-glass");
  for (const width of [320, 360, 375, 390, 414, 768]) {
    await page.setViewportSize({ width, height: 720 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
