import type { Page } from "@playwright/test";

export const authedUser = {
  id: "u-1",
  name: "Dev User",
  email: "dev@example.com",
};

const ok = (data: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ success: true, data }),
});

/**
 * Mock GET /api/v1/auth/me so a seeded `devos_token` in localStorage is
 * accepted and the user is treated as authenticated.
 */
export async function mockAuthMe(page: Page): Promise<void> {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill(ok({ user: authedUser })));
}

/** Mock POST /api/v1/auth/login to succeed. */
export async function mockLoginSuccess(page: Page, token = "e2e-token"): Promise<void> {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill(ok({ user: authedUser, token }))
  );
}

/** Mock POST /api/v1/auth/login to fail with invalid credentials. */
export async function mockLoginFailure(
  page: Page,
  message = "Invalid email or password"
): Promise<void> {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { code: "AUTH_INVALID_CREDENTIALS", message },
      }),
    })
  );
}

/** Mock POST /api/v1/auth/register to succeed. */
export async function mockRegisterSuccess(page: Page, token = "e2e-token"): Promise<void> {
  await page.route("**/api/v1/auth/register", (route) =>
    route.fulfill(ok({ user: authedUser, token }))
  );
}

/** Mock POST /api/v1/auth/register to fail validation. */
export async function mockRegisterFailure(
  page: Page,
  message = "An account with this email already exists"
): Promise<void> {
  await page.route("**/api/v1/auth/register", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { code: "AUTH_EMAIL_TAKEN", message },
      }),
    })
  );
}

/**
 * Mock every other authenticated API endpoint the app may call after login
 * (projects, activity, …) so workspace pages render without a live backend.
 */
export async function mockWorkspaceApi(page: Page): Promise<void> {
  await mockAuthMe(page);
  await page.route("**/api/v1/projects", (route) => route.fulfill(ok({ projects: [] })));
  await page.route("**/api/v1/activity**", (route) => route.fulfill(ok({ activities: [] })));
  await page.route("**/api/v1/projects/*/files", (route) => route.fulfill(ok({ files: [] })));
  await page.route("**/api/v1/projects/*/git/status", (route) =>
    route.fulfill(
      ok({
        branch: "main",
        staged: [],
        unstaged: [],
        untracked: [],
        ahead: 0,
        behind: 0,
      })
    )
  );
  await page.route("**/api/v1/projects/*/ai/provider", (route) =>
    route.fulfill(ok({ provider: "mock", model: "local-mock", is_mock: true, configured: false }))
  );
  await page.route("**/api/v1/github/connection", (route) =>
    route.fulfill(ok({ connected: false, username: null }))
  );
}
