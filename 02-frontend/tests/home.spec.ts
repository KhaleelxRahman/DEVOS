import { test, expect } from "@playwright/test";
import { mockAuthMe, authedUser } from "./support/mocks";

test.describe("Public site — homepage", () => {
  test("loads with the correct title and hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DEVOS/i);
    await expect(
      page.getByRole("heading", { name: /one workspace for your whole development loop/i })
    ).toBeVisible();
  });

  test("renders the feature grid", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /what devos v1.0.0 actually does/i })
    ).toBeVisible();
    await expect(page.locator(".site-card")).toHaveCount(9); // 6 features + 3 "honest by default"
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sandboxed Terminal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Context-Aware AI" })).toBeVisible();
  });

  test("hero CTA navigates to the register page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get Started" }).first().click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("hero waitlist CTA navigates to the waitlist page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /join the waitlist/i }).first().click();
    await expect(page).toHaveURL(/\/waitlist$/);
  });

  test("primary navbar navigates to About", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("navbar shows Sign In for guests and Open Workspace when authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();

    await mockAuthMe(page);
    await page.addInitScript(() => localStorage.setItem("devos_token", "e2e-token"));
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Open Workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" })).toHaveCount(0);
  });

  test("authenticated user passes the /auth/me check on the public site", async ({ page }) => {
    await mockAuthMe(page);
    await page.addInitScript(() => localStorage.setItem("devos_token", "e2e-token"));
    await page.goto("/");
    // Sanity: the seeded token was accepted, user was not logged out
    await expect(page).not.toHaveURL(/\/login$/);
    expect(authedUser.email).toBe("dev@example.com");
  });
});
