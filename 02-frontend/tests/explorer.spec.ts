import { test, expect } from "@playwright/test";
import { mockProjectGetSuccess, mockWorkspaceApi } from "./support/mocks";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

test("file explorer expands nested folders and renames through the backend", async ({ page }) => {
  await mockWorkspaceApi(page);
  await mockProjectGetSuccess(page, PROJECT_ID);
  let tree = [
    { name: "src", path: "src", type: "directory", children: [{ name: "main.ts", path: "src/main.ts", type: "file", extension: "ts", size: 10 }] },
  ];
  await page.route(`**/api/v1/projects/${PROJECT_ID}/files`, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { files: tree } }),
  }));
  await page.route(`**/api/v1/projects/${PROJECT_ID}/files/rename`, async (route) => {
    tree = [{ ...tree[0], children: [{ ...tree[0].children[0], name: "app.ts", path: "src/app.ts" }] }];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { path: "src/app.ts" } }) });
  });
  await page.addInitScript(([token, projectId]) => {
    localStorage.setItem("devos_token", token!);
    localStorage.setItem("devos_active_project_id", projectId!);
  }, ["e2e-token", PROJECT_ID] as const);

  await page.goto("/app/workspace");
  await page.getByRole("button", { name: "src" }).click();
  await expect(page.getByRole("button", { name: "main.ts" })).toBeVisible();
  await page.getByRole("button", { name: "main.ts" }).click({ button: "right" });
  page.once("dialog", (dialog) => dialog.accept("app.ts"));
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await expect(page.getByRole("button", { name: "app.ts" })).toBeVisible();
});
