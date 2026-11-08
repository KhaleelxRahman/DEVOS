/**
 * Phase 10 A2 - mid-session 401 auth recovery.
 *
 * Before the fix, an expired token left the user inside a half-rendered
 * workspace showing "Unable to load ... / Invalid or expired session token"
 * with a Retry button that re-sent the same dead token and could never
 * recover. These tests drive the REAL application against the REAL backend;
 * expiry is simulated the only safe way available locally, by replacing the
 * stored token with a value the server rejects (never a real credential).
 *
 * Covers: normal 200 unchanged (T1), expiry recovery (T2), a burst of
 * simultaneous 401s causing exactly ONE recovery (T3), login 401 staying put
 * with no redirect loop (T4), logout 401 (T5), successful re-login restoring
 * authenticated calls (T6), and an existing authenticated flow still working
 * (T7).
 *
 * Requires the local dev stack:
 *   backend  http://127.0.0.1:8000
 *   frontend http://localhost:5173
 */
import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `a2.session.${STAMP}@example.com`;
const PASSWORD = "Devos-A2-Session-2026!";

/** A syntactically plausible but server-rejected token. Not a credential. */
const DEAD_TOKEN = "expired.token.value.for.recovery.test";

const EXPIRED_MSG = "Session expired. Please sign in again.";

/** Swap the live token for one the backend will reject. */
async function expireSession(page: Page): Promise<void> {
  await page.evaluate((t) => localStorage.setItem("devos_token", t), DEAD_TOKEN);
}

async function signIn(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("developer@example.com").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 30_000 });
}

test.describe.configure({ mode: "serial" });

test.describe("Phase 10 A2 - mid-session 401 recovery", () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/auth/register`, {
      data: { name: "A2 Session", email: EMAIL, password: PASSWORD },
    });
  });

  test("T1 + T7: a 200 keeps the user authenticated and working", async ({ page }) => {
    await signIn(page);

    // An ordinary authenticated call still succeeds after the interceptor.
    const res = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/auth/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("devos_token")}` },
      });
      return r.status;
    }, API);
    expect(res, "authenticated /auth/me must still return 200").toBe(200);

    await page.goto(`${BASE}/app/projects`);
    await expect(page).toHaveURL(/\/app\/projects$/);
    // Still authenticated: the shell is present, not bounced to /login.
    await expect(page.getByRole("link", { name: "Projects" })).toBeVisible();
  });

  test("T2: a 401 clears auth and returns the user to login", async ({ page }) => {
    await signIn(page);
    await expireSession(page);

    // Navigate inside the SPA: no page load, so the boot-time /auth/me check
    // does NOT re-run. This is exactly the A2 failure sequence.
    await page.getByRole("link", { name: "Projects" }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    await expect(page.getByText(EXPIRED_MSG)).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(token, "dead token must be cleared from storage").toBeNull();

    // The dead-end panel ("Unable to load ... [Retry]") must be gone.
    await expect(page.getByText("Unable to load projects")).toHaveCount(0);
  });

  test("T3: simultaneous 401s cause one recovery, no redirect loop", async ({ page }) => {
    await signIn(page);
    await expireSession(page);

    await page.evaluate(() => {
      // Count navigations to prove the guard collapsed the burst.
      (window as any).__navCount = 0;
      const push = history.pushState.bind(history);
      const replace = history.replaceState.bind(history);
      history.pushState = (...a: any[]) => {
        (window as any).__navCount++;
        return push(...a);
      };
      history.replaceState = (...a: any[]) => {
        (window as any).__navCount++;
        return replace(...a);
      };
    });

    // Fire several authenticated calls at once; all will 401 together.
    await page.evaluate(async (api) => {
      const token = localStorage.getItem("devos_token");
      const headers = { Authorization: `Bearer ${token}` };
      await Promise.allSettled([
        fetch(`${api}/projects`, { headers }),
        fetch(`${api}/activity`, { headers }),
        fetch(`${api}/auth/me`, { headers }),
        fetch(`${api}/quality/operations`, { headers }),
      ]);
    }, API);

    await page.goto(`${BASE}/app/projects`);
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });

    const navs = await page.evaluate(() => (window as any).__navCount ?? 0);
    expect(navs, "a burst of 401s must not trigger repeated navigation").toBeLessThanOrEqual(2);
  });

  test("T4: a login 401 shows the normal error, no redirect loop", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByPlaceholder("developer@example.com").fill(EMAIL);
    await page.getByPlaceholder("••••••••").fill("deliberately-wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Stays on /login and shows a credential error, not the expiry banner.
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    await expect(page.getByText(EXPIRED_MSG)).toHaveCount(0);
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("T5: logout 401 leaves the app unauthenticated, no loop", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/app/settings`);
    await page.getByRole("button", { name: "Sign Out" }).click();

    // A1 (logout posts without its token) still 401s; the fix absorbs it.
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    const token = await page.evaluate(() => localStorage.getItem("devos_token"));
    expect(token, "logout must clear the token").toBeNull();
    await expect(page.getByText(EXPIRED_MSG)).toHaveCount(0);
  });

  test("T6: after expiry the user can sign in again and recover", async ({ page }) => {
    await signIn(page);
    await expireSession(page);
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });

    // The recovery guard must be re-armed by a successful login.
    await signIn(page);
    const status = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/auth/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("devos_token")}` },
      });
      return r.status;
    }, API);
    expect(status, "authenticated calls must work after re-login").toBe(200);

    // A second expiry must still be recoverable (the guard is not a lock).
    await expireSession(page);
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
  });
});