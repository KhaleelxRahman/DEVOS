import { test, expect } from "@playwright/test";

const BASE_URL="https://devos-jp2y0o70p-khaleelxrahmans-projects.vercel.app";

test("DEVOS Manual Browser QA", async ({ page }) => {

  // Open site
  await page.goto(BASE_URL,{waitUntil:"networkidle"});

  // Make sure Vercel login is NOT shown
  await expect(page).not.toHaveTitle(/Login – Vercel/i);

  // Wait so you can watch it
  await page.waitForTimeout(2000);

  // Check homepage text
  await expect(page.locator("body")).toContainText("DEVOS");

  // Try Login page
  await page.goto(BASE_URL+"/login",{waitUntil:"networkidle"});
  await page.waitForTimeout(1500);

  // Try Register page
  await page.goto(BASE_URL+"/register",{waitUntil:"networkidle"});
  await page.waitForTimeout(1500);

});
