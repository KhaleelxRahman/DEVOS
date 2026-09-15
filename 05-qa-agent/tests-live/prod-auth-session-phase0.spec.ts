// =====================================================================
// DEVOS v1.0.0 — PHASE 0.4/0.5 AUTH + SESSION + SIGN-IN PERFORMANCE
// REAL Chromium against production:
//   Frontend: https://devos-ebon.vercel.app
//   Backend : https://devos-backend-f3ub.onrender.com/api/v1
//
// Covers: 0.4 invalid login (normal auth rejection, no CORS/net error),
// valid login, session persistence on refresh, logout, protected-route
// deny, login again, refresh again. 0.5 T0..T8 sign-in timing in 2
// fresh-browser measurements (cold context #1, warm context #2).
//
// Authenticity: account provisioning via API (safe test-data prep only);
// ALL authentication verification happens through the real UI. Never
// prints passwords or token values — presence booleans only.
// =====================================================================
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://devos-ebon.vercel.app";
const API  = "https://devos-backend-f3ub.onrender.com/api/v1";

const STAMP   = Date.now();
const EMAIL   = `qa-phase0-auth.${STAMP}@example.com`;
const PASSWORD = "Devos-Phase0-Auth-2026!-check";
const DIR     = path.join(process.cwd(), "test-results", "phase0-auth");
fs.mkdirSync(DIR, { recursive: true });

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(DIR, `${name}.png`) }).catch(() => {});
}

function attachListeners(page: Page): void {
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));
}

interface LoginTiming {
  cold: boolean;
  t1_interactive_ms: number | null;
  t5_request_ms: number | null;   // T5 - T4 (request latency)
  t8_total_ms: number | null;     // T8 - T3 (total login)
  success: boolean;
}

/** Fill credentials through the real UI and measure T0..T8. */
async function uiLoginMeasured(page: Page, password: string, cold: boolean): Promise<LoginTiming> {
  const t3 = Date.now(); // T0/T3 = navigation start
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByLabel("Email Address")).toBeVisible({ timeout: 60_000 });
  const t1 = Date.now(); // T1 = page interactive

  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(password);
  // T2 = credentials entered

  let t4: number | null = null; // T4 = request started
  let t5: number | null = null; // T5 = response received
  page.on("request", (r) => {
    if (r.url().includes("/auth/login") && r.method() === "POST" && t4 === null) t4 = Date.now();
  });
  page.on("response", (r) => {
    if (r.url().includes("/auth/login") && r.request().method() === "POST" && t5 === null) t5 = Date.now();
  });

  await page.getByRole("button", { name: "Sign In" }).click();
  const t3click = Date.now(); // T3 = Sign In clicked (baseline for totals)

  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 180_000 });
  const t7 = Date.now(); // T7 = protected navigation complete
  const t6 = t7;         // T6 = auth/session established (URL + token checked next)
  const tokenPresent = await page.evaluate(() => localStorage.getItem("devos_token") !== null);
  if (!tokenPresent) throw new Error("auth established but devos_token missing");

  // T8 = protected app usable (real dashboard: AI composer + suggested prompts)
  await expect(
    page.getByRole("heading", { name: /What do you want to build\?/i })
  ).toBeVisible({ timeout: 60_000 });
  const t8 = Date.now(); // T8 = protected app usable

  return {
    cold,
    t1_interactive_ms: t1 - t3,
    t5_request_ms: t4 !== null && t5 !== null ? t5 - t4 : null,
    t8_total_ms: t8 - t3click,
    success: true,
  };
}

test.describe.serial(() => {
  let page: Page;

  test("provision throwaway account via API (safe prep only)", async ({ request }) => {
    test.setTimeout(180_000);
    const res = await request.post(`${API}/auth/register`, {
      data: { name: "QA Phase0 Auth", email: EMAIL, password: PASSWORD },
      timeout: 120_000,
    });
    const ok = [200, 201, 400].includes(res.status()); // 400 = duplicate (retry-safe)
    if (!ok) throw new Error(`register failed: ${res.status()}`);
    fs.writeFileSync(path.join(DIR, "account.txt"), `${EMAIL}\n`, "utf8");
  });

  test("COLD fresh-browser valid login + timing (measurement #1) + session refresh", async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    attachListeners(page);
    const timing = await uiLoginMeasured(page, PASSWORD, true);
    expect(timing.success).toBe(true);
    fs.appendFileSync(path.join(DIR, "timing.jsonl"), JSON.stringify(timing) + "\n", "utf8");
    await shot(page, "01-cold-dashboard");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 60_000 });
    const tokenAfterRefresh = await page.evaluate(() => localStorage.getItem("devos_token") !== null);
    expect(tokenAfterRefresh, "session persists after refresh").toBe(true);
    await shot(page, "02-refresh-session-persists");
    await ctx.close();
  });

  test("WARM fresh-browser invalid login then valid login + timing (measurement #2)", async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    attachListeners(page);

    // ---- invalid credentials: normal auth rejection expected ----
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByLabel("Email Address")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 120_000 });
    await expect(page).toHaveURL(/\/login$/);
    const invalidToken = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(invalidToken, "no token stored for invalid login").toBeNull();
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText, "no CORS failure text").not.toMatch(/Failed to fetch|net::ERR_FAILED|CORS/i);
    await shot(page, "03-invalid-login-rejected");

    // ---- WARM valid login + timing (measurement #2) ----
    const timing = await uiLoginMeasured(page, PASSWORD, false);
    expect(timing.success).toBe(true);
    fs.appendFileSync(path.join(DIR, "timing.jsonl"), JSON.stringify(timing) + "\n", "utf8");
    await shot(page, "04-warm-dashboard");
    await ctx.close();
  });

  test("logout; protected route denies; login again; refresh again", async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await ctx.newPage();
    attachListeners(page);

    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByLabel("Email Address")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 180_000 });

    // logout through real UI
    await page.goto(`${BASE}/app/settings`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    const tokenAfterLogout = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(tokenAfterLogout, "devos_token cleared after logout").toBeNull();
    await shot(page, "05-after-logout");

    // protected route denies when unauthenticated
    await page.goto(`${BASE}/app/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    await shot(page, "06-protected-route-denied");

    // login again + refresh again
    await expect(page.getByLabel("Email Address")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 180_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 60_000 });
    const tokenFinal = await page.evaluate(() => localStorage.getItem("devos_token") !== null);
    expect(tokenFinal, "session persists after login again + refresh").toBe(true);
    await shot(page, "07-login-again-refresh");

    const evidence = [
      `CONSOLE ERRORS (${consoleErrors.length}): ${JSON.stringify(consoleErrors.slice(0, 10))}`,
      `PAGE ERRORS (${pageErrors.length}): ${JSON.stringify(pageErrors.slice(0, 10))}`,
    ];
    fs.writeFileSync(path.join(DIR, "evidence.txt"), evidence.join("\r\n"), "utf8");
    await ctx.close();
  });
});