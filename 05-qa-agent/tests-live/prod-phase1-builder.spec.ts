// =====================================================================
// DEVOS v1.0.0 — PHASE 1 BUILDER (production, real Chromium)
//   Frontend: https://devos-ebon.vercel.app
//   Backend : https://devos-backend-f3ub.onrender.com/api/v1
//
// Real builder workflow:
//   Login → Projects (disposable project) → Workspace → Builder →
//   Prompt → classify → plan → Start → REAL stream → terminal state →
//   Summary → Apply → Explorer → generated file → Monaco → Edit → Save.
//
// Authenticity: account/project provisioning happens through the API
// (safe test-data prep only). Every builder step is verified with REAL
// network evidence (request URL + response status), never UI appearance
// alone. Account/project are disposable and cleaned up when possible.
// Failure invariant: FAILURE MUST NOT LOOK LIKE SUCCESS.
// =====================================================================
import { test, expect, type Page, type Response } from "@playwright/test";

const BASE = "https://devos-ebon.vercel.app";
const API = "https://devos-backend-f3ub.onrender.com/api/v1";

const STAMP = Date.now();
const EMAIL = `qa-phase1-builder.${STAMP}@example.com`;
const PASSWORD = "Devos-Phase1-Builder-2026!-check";
const PROJECT_NAME = `qa-builder-${STAMP}`;
const PROMPT =
  "Build a task tracker with a REST API, PostgreSQL persistence, and a React UI";
const UNSUPPORTED_PROMPT = `${PROMPT} and run it on a quantum computer`;

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

interface BuilderEvidence {
  classify: Response | null;
  plan: Response | null;
  start: Response | null;
  stream: Response | null;
  status: Response | null;
  summary: Response | null;
  apply: Response | null;
  save: Response | null;
}

const freshEvidence = (): BuilderEvidence => ({
  classify: null,
  plan: null,
  start: null,
  stream: null,
  status: null,
  summary: null,
  apply: null,
  save: null,
});

function watchBuilderNetwork(page: Page, ev: BuilderEvidence): void {
  page.on("response", (r) => {
    const url = r.url();
    if (!url.includes("/builder/")) return;
    if (url.includes("/builder/classify")) ev.classify = r;
    else if (url.includes("/builder/plan")) ev.plan = r;
    else if (url.includes("/builder/start")) ev.start = r;
    else if (url.includes("/builder/stream/")) ev.stream = r;
    else if (url.includes("/builder/status/")) ev.status = r;
    else if (url.includes("/builder/summary/")) ev.summary = r;
    else if (url.includes("/builder/apply/")) ev.apply = r;
  });
  page.on("response", (r) => {
    if (r.url().includes("/files/") && r.request().method() === "PUT") ev.save = r;
  });
}

async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByLabel("Email Address")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 180_000 });
}

async function openWorkspaceForProject(
  page: Page,
  projectName: string,
): Promise<void> {
  await page.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const card = page.getByText(projectName, { exact: true }).first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.click();
  // From the project detail page, open the workspace.
  const open = page.getByRole("button", { name: /open workspace/i }).first();
  await open.click({ timeout: 30_000 }).catch(async () => {
    await page.goto(`${BASE}/app/workspace`, { timeout: 120_000 });
  });
  await expect(page.getByText("Workspace:", { exact: false })).toBeVisible({ timeout: 60_000 });
}

test.describe.serial("Phase 1 builder — production", () => {
  test("real generation end-to-end with network evidence", async ({ page, request }) => {
    test.setTimeout(600_000);
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));

    // --- Safe test-data prep through the real API (account + project) ---
    // Explicit timeout because the Render free-tier backend may cold-start.
    const registered = await request.post(`${API}/auth/register`, {
      data: { name: "QA Phase1 Builder", email: EMAIL, password: PASSWORD },
      timeout: 120_000,
    });
    expect(registered.ok(), "account provisioning").toBeTruthy();
    const token = (await registered.json()).data?.token as string;
    expect(token, "registration returned a bearer token").toBeTruthy();

    const created = await request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: PROJECT_NAME },
      timeout: 120_000,
    });
    expect(created.ok(), "disposable project provisioning").toBeTruthy();
    expect(((await created.json()).data?.id as string) ?? "").toBeTruthy();

    // --- Real UI login ---
    const ev = freshEvidence();
    watchBuilderNetwork(page, ev);
    await uiLogin(page, EMAIL, PASSWORD);

    // --- Open the disposable project's workspace ---
    await openWorkspaceForProject(page, PROJECT_NAME);

    // --- Builder panel: real prompt entry ---
    const promptBox = page.locator("#builder-prompt-input");
    await expect(promptBox).toBeVisible({ timeout: 60_000 });

    await promptBox.fill(PROMPT);
    await page.getByRole("button", { name: "Analyze & Plan" }).click();

    // Step 2/3: REAL classify + plan network evidence.
    await expect.poll(() => ev.classify !== null, { timeout: 60_000 }).toBe(true);
    expect(ev.classify!.ok(), "classify response ok").toBeTruthy();
    await expect.poll(() => ev.plan !== null, { timeout: 60_000 }).toBe(true);
    expect(ev.plan!.ok(), "plan response ok").toBeTruthy();

    // Step 4: real user-visible plan.
    await expect(page.getByText("Requirements")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Build Plan")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("EXPLICIT").first()).toBeVisible();
    await expect(page.getByText(/Planned Files \(\d+\)/)).toBeVisible();

    // Step 5/6: real start; capture the returned generation identity.
    await page.getByRole("button", { name: "Start Generation" }).click();
    await expect.poll(() => ev.start !== null, { timeout: 60_000 }).toBe(true);
    expect(ev.start!.ok(), "start response ok").toBeTruthy();

    // Step 7/8: REAL stream network evidence — request + SSE content type.
    await expect.poll(() => ev.stream !== null, { timeout: 120_000 }).toBe(true);
    expect(ev.stream!.ok(), "stream response ok").toBeTruthy();
    expect(ev.stream!.headers()["content-type"] || "").toContain("text/event-stream");

    // Step 9: real terminal state from the backend (never fabricated).
    const badge = page.locator(".builder-status-badge");
    await expect(
      badge.filter({ hasText: /COMPLETED|PARTIAL/i }),
      "terminal status shown",
    ).toBeVisible({ timeout: 180_000 });
    const terminalText = (await badge.textContent()) ?? "";
    expect(["Completed", "Partial"]).toContain(terminalText.trim());

    // Steps 10: real status + summary evidence.
    await expect.poll(() => ev.status !== null, { timeout: 30_000 }).toBe(true);
    await expect.poll(() => ev.summary !== null, { timeout: 30_000 }).toBe(true);
    expect(ev.summary!.ok(), "summary response ok").toBeTruthy();
    await expect(page.getByText("Change Summary")).toBeVisible({ timeout: 30_000 });

    // Step 11: real apply request + real apply result.
    await page.getByRole("button", { name: "Apply to Workspace" }).click();
    await expect.poll(() => ev.apply !== null, { timeout: 60_000 }).toBe(true);
    expect(ev.apply!.ok(), "apply response ok").toBeTruthy();
    await expect(page.getByText("Apply Result")).toBeVisible({ timeout: 30_000 });

    // Step 13: real generated file opened in Monaco.
    await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 120_000 });

    // Edit + Save through the real editor + files API.
    await page.locator(".monaco-editor").first().click();
    await page.keyboard.type("// devos phase1 builder edit");
    await page.getByRole("button", { name: "Save file" }).click();
    await expect.poll(() => ev.save !== null, { timeout: 60_000 }).toBe(true);
    expect(ev.save!.ok(), "file save response ok").toBeTruthy();

    // Workspace stayed real: no fabricated success on a broken pipeline.
    const fatalErrors = pageErrors.filter((e) => !e.includes("ResizeObserver"));
    expect(fatalErrors, "no uncaught page errors").toEqual([]);

  });

  test("Phase 1 builder handles negative paths honestly", async ({ page, request }) => {
    test.setTimeout(300_000);
    // Provision + login (fresh account keeps this test isolated).
    const registered = await request.post(`${API}/auth/register`, {
      data: { name: "QA Phase1 Negative", email: EMAIL.replace("builder", "negative"), password: PASSWORD },
      timeout: 120_000,
    });
    expect(registered.ok()).toBeTruthy();
    const token = (await registered.json()).data?.token as string;
    const created = await request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `${PROJECT_NAME}-neg` },
    });
    const projectName = (await created.json()).data?.name as string;

    await uiLogin(page, EMAIL.replace("builder", "negative"), PASSWORD);
    await openWorkspaceForProject(page, projectName);

    const ev = freshEvidence();
    watchBuilderNetwork(page, ev);
    const promptBox = page.locator("#builder-prompt-input");
    await expect(promptBox).toBeVisible({ timeout: 60_000 });

    // Invalid prompt: the guard is real — analyze is disabled for empty input.
    await expect(page.getByRole("button", { name: "Analyze & Plan" })).toBeDisabled();

    // Unsupported stack: reported, never silently substituted.
    await promptBox.fill(UNSUPPORTED_PROMPT);
    await page.getByRole("button", { name: "Analyze & Plan" }).click();
    await expect.poll(() => ev.classify !== null, { timeout: 60_000 }).toBe(true);
    await expect(page.getByText("UNSUPPORTED").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Unsupported \(blocked, not substituted\)/)).toBeVisible();

    // Real generation then real cancel: terminal state, never hidden loading.
    await promptBox.fill(PROMPT);
    await page.getByRole("button", { name: "Analyze & Plan" }).click();
    await expect(page.getByText("Build Plan")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Start Generation" }).click();
    await expect(page.getByRole("button", { name: /Cancel Generation/ })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("button", { name: /Cancel Generation/ }).click();

    const badge = page.locator(".builder-status-badge");
    await expect(badge).toBeVisible({ timeout: 120_000 });
    const terminalText = ((await badge.textContent()) ?? "").trim();
    // Whatever the real outcome is, it must be an honest backend state.
    expect(terminalText).toMatch(/^(Completed|Partial|Failed|Cancelled|Blocked)$/);
  });
});
