import { test, expect } from "@playwright/test";
import {
  mockAuthMe,
  mockGithubConnectAuthorized,
  mockGithubConnectNotConfigured,
  mockGithubConnected,
  mockGithubReposEmpty,
  mockWorkspaceApi,
} from "./support/mocks";

test.describe("Settings — GitHub connection (BUG-001)", () => {
  async function openSettings(page: import("@playwright/test").Page) {
    await page.addInitScript(() => {
      localStorage.setItem("devos_token", "e2e-token");
    });
    await page.goto("/app/settings");
  }

  test("shows a Connect GitHub button when not connected", async ({ page }) => {
    await mockWorkspaceApi(page);
    await openSettings(page);

    await expect(
      page.getByRole("button", { name: "Connect GitHub" })
    ).toBeVisible();
    await expect(page.getByText("Not connected")).toBeVisible();
  });

  test("clicking Connect GitHub starts the OAuth flow", async ({ page }) => {
    await mockWorkspaceApi(page);
    await mockGithubConnectAuthorized(page);
    // Never hit the real GitHub in E2E — intercept the authorization URL.
    await page.route("**/login/oauth/authorize**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>oauth-mock</html>" })
    );
    await openSettings(page);

    // The button navigates to the provider's authorization URL.
    await page.getByRole("button", { name: "Connect GitHub" }).click();
    await page.waitForURL(/github\.com\/login\/oauth\/authorize/, {
      timeout: 10000,
    });
    expect(page.url()).toContain("github.com/login/oauth/authorize");
  });

  test("shows a friendly notice when OAuth is not configured on the server", async ({
    page,
  }) => {
    await mockWorkspaceApi(page);
    await mockGithubConnectNotConfigured(page);
    await openSettings(page);

    await page.getByRole("button", { name: "Connect GitHub" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /not configured/i })
    ).toBeVisible();
    // The button recovers instead of staying stuck in "Connecting…".
    await expect(
      page.getByRole("button", { name: "Connect GitHub" })
    ).toBeEnabled();
  });

  test("a connected account shows the username and repositories section", async ({
    page,
  }) => {
    await mockAuthMe(page);
    await mockGithubConnected(page, "octocat");
    await mockGithubReposEmpty(page);
    await page.route("**/api/v1/projects", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { projects: [] } }) })
    );
    await page.route("**/api/v1/activity**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { activities: [] } }) })
    );
    await page.route("**/api/v1/health**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { status: "online" } }) })
    );
    await openSettings(page);

    await expect(page.getByText("Connected", { exact: true })).toBeVisible();
    await expect(page.getByText(/as octocat/)).toBeVisible();
    await expect(page.getByText("GitHub Repositories")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect GitHub" })
    ).toHaveCount(0);
  });
});
