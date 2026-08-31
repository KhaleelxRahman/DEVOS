import { test, expect } from "@playwright/test";

test("DEVOS Homepage", async ({ page }) => {

  await page.goto("https://devos-jp2y0o70p-khaleelxrahmans-projects.vercel.app");

  await expect(page).toHaveTitle(/DEVOS/i);

  await page.waitForTimeout(3000);

});
