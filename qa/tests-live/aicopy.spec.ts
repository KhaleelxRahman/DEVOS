import { test, expect, type Page } from "@playwright/test";

// Focused AI Copy verification — real browser, real UI click, real clipboard.
// Runs against the local dev stack where the Phase 0 fix is active.
const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `qa.aicopy.${STAMP}@example.com`;
const PASSWORD = "Devos-AICopy-2026!-real";

test("AI Copy — real browser clipboard verification", async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();

  // 1. Register + Login
  await page.request.post(`${API}/auth/register`, { data: { name: "QA AICopy", email: EMAIL, password: PASSWORD } }).catch(() => {});
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/(app\/)?dashboard$/, { timeout: 60_000 });

  // Resolve a project via API and pin it to localStorage
  const lg = await page.request.post(`${API}/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  const lgj = await lg.json();
  const tok = lgj.data.token;
  const projRes = await page.request.post(`${API}/projects`, { headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, data: { name: `AICopy ${STAMP}` } });
  const proj = await projRes.json();
  console.log(`[AICOPY] project create status: ${projRes.status()}, body: ${JSON.stringify(proj).slice(0, 200)}`);
  const pid = proj.data?.id ?? proj.id;
  if (!pid) throw new Error(`project create failed: ${JSON.stringify(proj).slice(0, 200)}`);
  await page.evaluate(([p, t]) => { localStorage.setItem("devos_active_project_id", p); localStorage.setItem("devos_token", t); }, [pid, tok] as const);

  // 2. Open AI Assistant
  await page.goto(`${BASE}/app/workspace`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Workspace:/i).first()).toBeVisible({ timeout: 30_000 });
  await page.locator("#ai-command-center").getByRole("tab", { name: "Assistant" }).click();
  await expect(page.getByLabel("Message the AI assistant")).toBeVisible({ timeout: 15_000 });

  // 3. Send a real prompt
  await page.getByLabel("Message the AI assistant").fill("Explain binary search in Python in 3 sentences.");
  await page.getByRole("button", { name: "Send message" }).click();

  // 4. Wait for completed assistant response
  await expect(page.getByText(/You asked about/).first()).toBeVisible({ timeout: 40_000 });
  // Capture the assistant answer BODY (markdown content only — no heading/timestamp/copy button).
  const responseBody = await page.locator(".ai-message.assistant .markdown-content").last().innerText();
  console.log(`[AICOPY] response body (first 200): ${responseBody.slice(0, 200)}`);

  // 5. Click Copy assistant response (REAL UI click)
  const copyBtn = page.getByRole("button", { name: "Copy assistant response" }).first();
  await expect(copyBtn).toBeVisible({ timeout: 10_000 });
  await copyBtn.click();

  // 6. Read clipboard (REAL)
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  console.log(`[AICOPY] CLIPBOARD FULL:\n${clip}\n---END CLIP---`);
  console.log(`[AICOPY] RESPONSE BODY FULL:\n${responseBody}\n---END BODY---`);

  // 7. Verify copied text equals/contains the actual assistant response.
  // The copy handler writes the raw markdown message source (m.content) to the
  // clipboard, while the on-screen body is HTML-rendered (bold/backtick markers
  // stripped). Strip markdown markers from both before comparing so the check
  // reflects content equality, not rendering differences.
  expect(clip.length).toBeGreaterThan(0);
  expect(responseBody.length).toBeGreaterThan(0);
  const stripMd = (s: string) => s.replace(/(\*\*|__|\*|_|`)/g, "").replace(/\s+/g, " ").trim();
  const normalizedBody = stripMd(responseBody);
  const normalizedClip = stripMd(clip);
  const bodyCore = normalizedBody.slice(0, 120);
  expect(normalizedClip.includes(bodyCore), "clipboard does not contain the assistant answer body").toBeTruthy();
  // And the clipboard must carry the distinctive mock-provider marker, proving it is the real answer.
  expect(clip).toContain("Local/Mock AI");

  console.log("[AICOPY] VERIFIED: clipboard contains the actual assistant response");
  await ctx.close();
});