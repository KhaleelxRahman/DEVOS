/**
 * Phase 10 C2 - auto-save honesty, verified against the REAL application.
 *
 * C2 was recorded as a PARTIAL with the claim "There is no autosave: the
 * dirty dot proves the buffer is only persisted on an explicit Save." That
 * claim was FALSE. `CodeViewer.handleChange` has always debounced a 1200ms
 * auto-save, so the status-bar claim "Auto-save enabled" was accurate and the
 * DOCUMENTATION was wrong.
 *
 * Auditing the implementation did surface one genuine defect behind it: the
 * editor kept a SINGLE shared value/baseline pair for all tabs, so a pending
 * auto-save scheduled for file A could fire after the user switched to file B
 * and persist B's text into A. The buffers are now keyed per path.
 *
 * These tests assert the REAL behaviour end to end:
 *   C1 auto-save persists an edit with no manual Save;
 *   C2 a reload shows the persisted content (proves it reached the server);
 *   C3 the status bar reports the auto-save claim truthfully;
 *   C4 switching tabs mid-debounce does not cross-contaminate buffers;
 *   C5 a FAILED save does not falsely report success.
 *
 * Requires the local dev stack:
 *   backend  http://127.0.0.1:8000
 *   frontend http://localhost:5173
 */
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `c2.autosave.${STAMP}@example.com`;
const PASSWORD = "Devos-C2-AutoSave-2026!";

/** Longer than the 1200ms debounce, with room for the network round trip. */
const AFTER_DEBOUNCE_MS = 3500;

let projectId = "";
let token = "";
const filePath = "c2-autosave.txt";
const secondPath = "c2-autosave-second.txt";

async function apiCreateProject(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: `c2-autosave-${STAMP}` },
  });
  expect(res.ok(), `project create failed: ${res.status()}`).toBeTruthy();
  return (await res.json()).data.id;
}

async function apiCreateFile(
  request: APIRequestContext,
  path: string,
  content: string,
): Promise<void> {
  // PUT /files/{path} only saves an EXISTING file (404 FILE_NOT_FOUND
  // otherwise), so a file must be created before it can be seeded.
  // CreateFileRequest is {parent_path, name}; the new file starts empty, so
  // seed it through the save route afterwards.
  const created = await request.post(`${API}/projects/${projectId}/files/file`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { parent_path: "", name: path },
  });
  expect(created.ok(), `file create failed for ${path}: ${created.status()}`).toBeTruthy();

  const saved = await request.put(`${API}/projects/${projectId}/files/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { content },
  });
  expect(saved.ok(), `file seed failed for ${path}: ${saved.status()}`).toBeTruthy();
}

async function apiReadFile(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(`${API}/projects/${projectId}/files/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `file read failed for ${path}: ${res.status()}`).toBeTruthy();
  return (await res.json()).data.content;
}

async function signIn(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("developer@example.com").fill(EMAIL);
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 30_000 });
}

async function openFile(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE}/app/projects/${projectId}`);
  // The explorer renders one button per file inside the "Project files" tree.
  // Match by exact accessible name so `c2-autosave.txt` cannot resolve to the
  // `c2-autosave-second.txt` row.
  const fileButton = page.getByRole("button", { name: path, exact: true }).first();
  await expect(fileButton, `explorer entry for ${path}`).toBeVisible({ timeout: 30_000 });
  await fileButton.click();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });
}

/** Replace the whole Monaco buffer with `text` and fire the change event. */
async function setMonacoContent(page: Page, text: string): Promise<void> {
  await page.locator(".monaco-editor").first().click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  // Typing exercises the real onChange path; Monaco's model is not exposed on
  // window in the production bundle, so the keyboard is the honest route.
  await page.keyboard.type(text);
  await page.waitForTimeout(400);
}
test.describe.configure({ mode: "serial" });

test.describe("Phase 10 C2 - auto-save is real and honest", () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/auth/register`, {
      data: { name: "C2 Autosave", email: EMAIL, password: PASSWORD },
    });
    const login = await request.post(`${API}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(login.ok(), `login failed: ${login.status()}`).toBeTruthy();
    // The auth response field is `token` (see /auth/login -> data.token).
    token = (await login.json()).data.token;
    projectId = await apiCreateProject(request);
    await apiCreateFile(request, filePath, "original-content-A\n");
    await apiCreateFile(request, secondPath, "original-content-B\n");
  });

  test("C1: an edit persists with NO manual Save", async ({ page }) => {
    await signIn(page);
    await openFile(page, filePath);

    const text = "AUTO_SAVED_NO_MANUAL_SAVE";
    await setMonacoContent(page, text);

    // The user never clicks Save. Only the debounced auto-save can persist it.
    await page.waitForTimeout(AFTER_DEBOUNCE_MS);

    const onDisk = await apiReadFile(page.request, filePath);
    expect(onDisk, "auto-save must persist without an explicit Save").toContain(text);
  });

  test("C2: a reload shows the auto-saved content (server round trip)", async ({
    page,
  }) => {
    await signIn(page);
    await openFile(page, filePath);
    const editorText = await page.locator(".monaco-editor").first().innerText();
    expect(editorText, "reloaded buffer must contain the auto-saved text").toContain(
      "AUTO_SAVED_NO_MANUAL_SAVE",
    );
  });

  test("C3: the status bar reports the auto-save claim truthfully", async ({ page }) => {
    await signIn(page);
    await openFile(page, filePath);
    const statusbar = page.locator(".editor-statusbar");
    await expect(statusbar).toBeVisible({ timeout: 20_000 });
    // Auto-save genuinely exists, so this claim is accurate and may be shown.
    await expect(statusbar).toContainText("Auto-save enabled");
    // A clean buffer reports Saved rather than a false "Unsaved changes".
    await expect(statusbar).toContainText("Saved");
  });

  test("C4: switching tabs mid-debounce does not cross-contaminate", async ({ page }) => {
    await signIn(page);
    await openFile(page, filePath);

    // Edit file A, then IMMEDIATELY switch to file B - inside the 1200ms
    // window where A's auto-save timer is still pending. Before the fix the
    // shared value/baseline refs were re-pointed at B, so A's pending timer
    // wrote B's text into A.
    await setMonacoContent(page, "CONTENT_FOR_FILE_A");
    const secondTab = page.getByRole("button", { name: secondPath, exact: true }).first();
    await secondTab.click();
    await page.waitForTimeout(150);
    await setMonacoContent(page, "CONTENT_FOR_FILE_B");

    await page.waitForTimeout(AFTER_DEBOUNCE_MS);

    const fileA = await apiReadFile(page.request, filePath);
    const fileB = await apiReadFile(page.request, secondPath);

    expect(fileA, "file A must contain A's text").toContain("CONTENT_FOR_FILE_A");
    expect(fileA, "file A must not be overwritten with B's text").not.toContain(
      "CONTENT_FOR_FILE_B",
    );
    expect(fileB, "file B must contain B's text").toContain("CONTENT_FOR_FILE_B");
  });

  test("C5: a FAILED save does not falsely report success", async ({ page }) => {
    await signIn(page);
    await openFile(page, filePath);

    // Force the save request to fail at the network layer.
    await page.route("**/files/**", (route) => route.abort("failed"));

    await setMonacoContent(page, "THIS_SAVE_MUST_FAIL");
    await page.waitForTimeout(AFTER_DEBOUNCE_MS);

    // Dirty state must persist: a failed save may not report the buffer clean.
    await expect(
      page.locator(".editor-statusbar", { hasText: "Unsaved changes" }),
      "a failed save must not report the buffer as Saved",
    ).toBeVisible({ timeout: 10_000 });

    await page.unroute("**/files/**");
    const onDisk = await apiReadFile(page.request, filePath);
    expect(onDisk, "failed save must not write to disk").not.toContain("THIS_SAVE_MUST_FAIL");
  });
});