import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Phase 2H — FINAL Phase 2 production certification (real Chromium, production).
 * Chain (UI): register → project → workspace → terminal → history → mobile.
 * Evidence: assertions + screenshots under qa/tests-live/artifacts/.
 */

const STAMP = Date.now();
const EMAIL = `p2h-ui-${STAMP}@example.com`;
const PW = "supersecret1";
const PROJ = `p2h-ui-chain-${STAMP}`;
const ART = path.join(__dirname, "artifacts");

test.describe("P2H production certification", () => {
  test("desktop chain: register → project → workspace → terminal → history", async ({ page }) => {
    fs.mkdirSync(ART, { recursive: true });

    // 1) REGISTER via UI
    await page.goto("/register");
    await page.getByPlaceholder("Developer Name").fill("P2H UI Bot");
    await page.getByPlaceholder("developer@example.com").fill(EMAIL);
    await page.getByPlaceholder("••••••••").fill(PW);
    await page.locator('button[type="submit"]').click();
    // Land on projects/dashboard (or login → then log in)
    await page.waitForURL(/projects|dashboard|login/i, { timeout: 90000 });
    if (page.url().includes("login")) {
      await page.getByPlaceholder("developer@example.com").fill(EMAIL);
      await page.getByPlaceholder("••••••••").fill(PW);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/projects|dashboard/i, { timeout: 90000 });
    }
    await expect(page.getByText("Projects", { exact: false }).first()).toBeVisible({ timeout: 90000 });

    // 2) CREATE PROJECT via UI
    await page.getByPlaceholder("e.g. Sentinel API").fill(PROJ);
    const createBtn = page.locator('button:has-text("Create")').first();
    if (await createBtn.count()) {
      await createBtn.click();
    } else {
      await page.getByPlaceholder("e.g. Sentinel API").press("Enter");
    }
    await expect(page.getByText(PROJ).first()).toBeVisible({ timeout: 90000 });

    // 3) OPEN WORKSPACE
    await page.getByText(PROJ).first().click();
    await page.waitForURL(/workspace|projects/i, { timeout: 90000 });
    const wsLink = page.locator('a:has-text("Workspace"), button:has-text("Workspace")').first();
    if (await wsLink.count()) {
      await wsLink.click().catch(() => {});
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ART, "p2h-desktop-workspace.png"), fullPage: true });

    // 4) TERMINAL: run a real command through the UI
    const termInput = page.getByPlaceholder("Terminal command");
    await expect(termInput).toBeVisible({ timeout: 90000 });
    await termInput.fill("echo P2H_UI_TERMINAL_OK");
    await page.locator('button:has-text("Run command")').click();
    await expect(page.getByText("P2H_UI_TERMINAL_OK").first()).toBeVisible({ timeout: 90000 });

    // 5) HISTORY panel present (executions surfaced in workspace)
    await expect(
      page.locator('[aria-label="Refresh execution history"], :text("Execution history")').first()
    ).toBeVisible({ timeout: 90000 });

    // 6) MOBILE viewport (375x812): terminal + history surfaces usable
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1500);
    await expect(page.getByPlaceholder("Terminal command")).toBeVisible({ timeout: 60000 });
    await expect(
      page.locator('[aria-label="Refresh execution history"], :text("Execution history")').first()
    ).toBeVisible({ timeout: 60000 });
    // Real mobile interaction proof: run one more terminal command at 375px
    await page.getByPlaceholder("Terminal command").fill("echo P2H_MOBILE_OK");
    await page.locator('button:has-text("Run command")').click();
    await expect(page.getByText("P2H_MOBILE_OK").first()).toBeVisible({ timeout: 90000 });
    await page.screenshot({ path: path.join(ART, "p2h-mobile-375.png"), fullPage: true });
  });
});
