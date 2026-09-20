import { test, expect } from "@playwright/test";
import {
  authedUser,
  mockLoginSuccess,
  mockLoginFailure,
  mockRegisterSuccess,
  mockRegisterFailure,
  mockWorkspaceApi,
} from "./support/mocks";

test.describe("Authentication", () => {
  test("login page renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
  });

  test("register page renders the registration form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
  });

  test("unauthenticated users are redirected away from protected routes", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("legacy /dashboard path redirects through to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("successful login stores the token and enters the workspace", async ({ page }) => {
    await mockLoginSuccess(page);
    await mockWorkspaceApi(page);

    await page.goto("/login");
    await page.getByLabel("Email Address").fill(authedUser.email);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/app\/dashboard$/);
    const token = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(token).toBe("e2e-token");
  });

  test("failed login shows the API error message", async ({ page }) => {
    await mockLoginFailure(page, "Invalid email or password");

    await page.goto("/login");
    await page.getByLabel("Email Address").fill(authedUser.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(token).toBeNull();
  });

  test("successful registration stores the token and enters the workspace", async ({ page }) => {
    await mockRegisterSuccess(page);
    await mockWorkspaceApi(page);

    await page.goto("/register");
    await page.getByLabel("Full Name").fill(authedUser.name);
    await page.getByLabel("Email Address").fill(authedUser.email);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/app\/dashboard$/);
    const token = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(token).toBe("e2e-token");
  });

  test("failed registration shows the API error message", async ({ page }) => {
    await mockRegisterFailure(page, "An account with this email already exists");

    await page.goto("/register");
    await page.getByLabel("Full Name").fill("Someone Else");
    await page.getByLabel("Email Address").fill("taken@example.com");
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("An account with this email already exists")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("authenticated user with a valid token can access the workspace", async ({ page }) => {
    await mockWorkspaceApi(page);
    await page.addInitScript(() => localStorage.setItem("devos_token", "e2e-token"));

    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page).not.toHaveURL(/\/login$/);
  });

  test("stale token is discarded when /auth/me rejects", async ({ page }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "AUTH_INVALID_TOKEN", message: "Token expired" },
        }),
      })
    );
    await page.addInitScript(() => localStorage.setItem("devos_token", "expired-token"));

    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(token).toBeNull();
  });
});
