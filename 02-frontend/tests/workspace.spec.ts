import { test, expect } from "@playwright/test";
import {
  mockAuthMe,
  mockProjectGetNotFound,
  mockProjectGetSuccess,
  mockWorkspaceApi,
} from "./support/mocks";

// The exact UUID from the BUG-001 report.
const STALE_PROJECT_ID = "e0e5b2c8-a13b-4742-af40-1eb7daf19ad6";
const LIVE_PROJECT_ID = "11111111-1111-4111-8111-111111111111";

test.describe("Workspace — stale project recovery (BUG-001)", () => {
  test("a stale active project id redirects to the project list with a friendly toast", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await mockWorkspaceApi(page);
    await mockProjectGetNotFound(page, STALE_PROJECT_ID);

    await page.addInitScript(
      ([token, staleId]) => {
        localStorage.setItem("devos_token", token!);
        localStorage.setItem("devos_active_project_id", staleId!);
      },
      ["e2e-token", STALE_PROJECT_ID] as const
    );

    await page.goto("/app/workspace");

    // Redirected to the project list instead of a broken state.
    await expect(page).toHaveURL(/\/app\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects" }).first()).toBeVisible();
    await expect(page.getByText('Project no longer exists.')).toBeVisible();

    // No unexpected JS errors — the mocked 404 resource log is expected.
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((text) => !/status of 404/i.test(text))).toEqual([]);
  });

  test("a valid active project id restores the workspace", async ({ page }) => {
    await mockWorkspaceApi(page);
    await mockProjectGetSuccess(page, LIVE_PROJECT_ID);

    await page.addInitScript(
      ([token, projectId]) => {
        localStorage.setItem("devos_token", token!);
        localStorage.setItem("devos_active_project_id", projectId!);
      },
      ["e2e-token", LIVE_PROJECT_ID] as const
    );

    await page.goto("/app/workspace");
    await expect(
      page.getByRole("heading", { name: /Workspace: Demo Project/i })
    ).toBeVisible();
  });

  test("the AI planner extracts requirements without starting code generation", async ({ page }) => {
    await mockWorkspaceApi(page);
    await mockProjectGetSuccess(page, LIVE_PROJECT_ID);
    await page.addInitScript(
      ([token, projectId]) => {
        localStorage.setItem("devos_token", token!);
        localStorage.setItem("devos_active_project_id", projectId!);
      },
      ["e2e-token", LIVE_PROJECT_ID] as const
    );

    await page.goto("/app/workspace");
    await page.getByLabel("Project idea").fill("Build a Food Delivery App with payments and notifications");
    await page.getByRole("button", { name: "Extract requirements" }).click();

    await expect(page.getByText("Intent extracted")).toBeVisible();
    await expect(page.getByLabel("Category")).toHaveValue("Marketplace / commerce");
    await expect(page.getByText("Planning only — no code will be written.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve plan" })).toBeVisible();

    await page.route("**/api/v1/projects/*/context", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { project: { id: LIVE_PROJECT_ID } } }),
      })
    );
    await page.route("**/api/v1/projects/*/testing/jobs", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { jobs: [] } }),
      })
    );
    await page.getByRole("button", { name: "Approve plan" }).click();
    await expect(page.getByText("Execution queue")).toBeVisible();
    await expect(page.getByText("Validate project context")).toBeVisible();
    await expect(page.getByText("No files changed; no external actions requested").first()).toBeVisible();
    await expect(page.getByText("Safety note:")).toBeVisible();
  });

  test("a deep link to /app/projects/:id lands on the project list instead of a 404", async ({
    page,
  }) => {
    await mockWorkspaceApi(page);
    await mockProjectGetNotFound(page, STALE_PROJECT_ID);

    // The route is protected — authenticate like a signed-in user.
    await page.addInitScript(() => {
      localStorage.setItem("devos_token", "e2e-token");
    });

    await page.goto(`/app/projects/${STALE_PROJECT_ID}`);
    await expect(page).toHaveURL(/\/app\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects" }).first()).toBeVisible();
    await expect(page.getByText('Project no longer exists.')).toBeVisible();
  });
});
