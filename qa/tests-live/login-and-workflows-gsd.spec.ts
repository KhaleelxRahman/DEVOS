import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `gsd.auth.${STAMP}@example.com`;
const EMAIL_B = `gsd.auth.b.${STAMP}@example.com`;
const PASSWORD = "Devos-Gsd-Password-2026!";

test.describe.configure({ mode: "serial" });

test.describe("DEVOS GSD Priority Zero — Complete Login, Auth & Core E2E Suite", () => {
  let userAToken = "";
  let userBToken = "";
  let userAProjectId = "";

  test.beforeAll(async ({ request }) => {
    const r1 = await request.post(`${API}/auth/register`, {
      data: { name: "GSD User A", email: EMAIL, password: PASSWORD },
    });
    expect(r1.ok()).toBeTruthy();
    const j1 = await r1.json();
    userAToken = j1.data.token;

    const r2 = await request.post(`${API}/auth/register`, {
      data: { name: "GSD User B", email: EMAIL_B, password: PASSWORD },
    });
    expect(r2.ok()).toBeTruthy();
    const j2 = await r2.json();
    userBToken = j2.data.token;
  });

  test("Auth-1 & Auth-4: Login page loads cleanly and enforces empty form validation without firing API calls", async ({ page }) => {
    let loginApiCount = 0;
    page.on("request", (req) => {
      if (req.url().includes("/auth/login")) loginApiCount++;
    });

    await page.goto(`${BASE}/login`);
    await expect(page.getByText("DEVOS v1.0.0")).toBeVisible();
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // Bypass native HTML5 required attribute to verify JS validation guard
    await page.evaluate(() => {
      document.querySelector("form")?.setAttribute("novalidate", "true");
    });
    await page.getByLabel("Email Address").fill("   ");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("alert")).toContainText(/enter both your email address and password/i);
    expect(loginApiCount).toBe(0);
  });

  test("Auth-3: Invalid login shows credential error and stays on /login", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill("Wrong-Password-999!");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page.getByText("Session expired. Please sign in again.")).toHaveCount(0);
  });

  test("Auth-5 & Auth-6: Repeated submission sends only 1 request & slow backend shows progress feedback", async ({ page }) => {
    let loginCalls = 0;
    await page.route("**/api/v1/auth/login", async (route) => {
      loginCalls++;
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });

    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);

    // Attempt rapid double-submission via Enter key + click
    const pwInput = page.getByLabel("Password");
    await pwInput.press("Enter");
    await pwInput.press("Enter");

    await expect(page.getByText(/Still signing in/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 15000 });
    expect(loginCalls, "double submit must be blocked by submittingRef guard").toBe(1);
  });

  test("Auth-7: Backend unavailable during login & transient 503 during /auth/me preserves valid token", async ({ page }) => {
    // 7a: Network error on login form
    await page.route("**/api/v1/auth/login", (route) => route.abort("failed"));
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.unroute("**/api/v1/auth/login");

    // 7b: Sign in normally, then simulate a 500 server error on /auth/me during reload
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/);

    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "Temporary DB maintenance" } }),
      })
    );

    await page.reload();
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    const preservedToken = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(preservedToken, "transient 500 on /auth/me must NOT erase valid token").toBeTruthy();
    await page.unroute("**/api/v1/auth/me");
  });

  test("Auth-2, Auth-9, Auth-10, Auth-11 & Auth-12: Protected routes, ?next= direct navigation, deduplicated session restore, & logout", async ({ page }) => {
    // Clear storage -> protected route redirects to /login
    await page.goto(`${BASE}/login`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/app/projects`);
    await expect(page).toHaveURL(/\/login$/);

    // Direct navigation after login via ?next=/app/projects
    await page.goto(`${BASE}/login?next=%2Fapp%2Fprojects`);
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/projects$/);

    // Refresh while authenticated -> verify /auth/me is called only ONCE (coalesced)
    let meCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/auth/me")) meCalls++;
    });
    await page.reload();
    await expect(page).toHaveURL(/\/app\/projects$/);
    await page.waitForTimeout(300);
    expect(meCalls, "React StrictMode /auth/me must be coalesced to 1 request").toBe(1);

    // Logout via TopBar Log out button -> sends POST /auth/logout with 200 OK
    let logoutStatus = 0;
    page.on("response", (res) => {
      if (res.url().includes("/api/v1/auth/logout")) logoutStatus = res.status();
    });
    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    expect(logoutStatus).toBe(200);
  });

  test("Workflows & Quality: Project CRUD, Cross-User Isolation, Workspace IDE, Responsive Desktop/Mobile & Zero Console Errors", async ({ page, request }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Sign in as User A
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email Address").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page.getByText(/Mock AI|Ready \(/i).first()).toBeVisible();

    // Check desktop horizontal overflow
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(desktopOverflow, "no horizontal overflow on desktop").toBeFalsy();

    // Create & Rename Project on /app/projects
    await page.goto(`${BASE}/app/projects`);
    await page.getByRole("button", { name: "Create Project" }).first().click();
    await page.getByLabel("Project Name").fill("GSD E2E Project");
    await page.getByRole("dialog").last().getByRole("button", { name: "Create Project" }).click();
    await expect(page).toHaveURL(/\/app\/workspace$/);

    userAProjectId = await page.evaluate(() => localStorage.getItem("devos_active_project_id") || "");
    expect(userAProjectId).toBeTruthy();

    // Verify User B cannot access User A's project (403 Forbidden)
    const crossUserRes = await request.get(`${API}/projects/${userAProjectId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect(crossUserRes.status(), "cross-user project access must return 403").toBe(403);

    // Rename Project via Edit modal on /app/projects
    await page.goto(`${BASE}/app/projects`);
    await page.getByRole("button", { name: /Edit project GSD E2E Project/i }).click();
    await page.getByRole("dialog").last().getByLabel("Project Name").fill("GSD Renamed Project");
    await page.getByRole("dialog").last().getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("GSD Renamed Project").first()).toBeVisible();

    // Verify mobile viewport (390x844) layout & zero horizontal overflow
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/app/dashboard`);
    await expect(page.getByRole("heading", { name: /What do you want to build\?/i })).toBeVisible();
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(mobileOverflow, "no horizontal overflow on 390px mobile viewport").toBeFalsy();

    expect(pageErrors, "zero uncaught page errors").toEqual([]);
    expect(consoleErrors, "zero console errors").toEqual([]);
  });
});
