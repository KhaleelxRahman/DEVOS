import { test, expect } from "@playwright/test";

test.describe("Navigation & error handling", () => {
  test("unknown routes render the 404 page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: /404 — page not found/i })).toBeVisible();
    await expect(page).toHaveTitle(/page not found/i);
  });

  test("404 page links back home", async ({ page }) => {
    await page.goto("/nope");
    await page.getByRole("link", { name: "Return Home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/one workspace/i);
  });

  test("legacy paths redirect into /app/* (then to login when unauthenticated)", async ({
    page,
  }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login$/);
  });
});
