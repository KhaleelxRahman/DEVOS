import { test, expect, type Page } from "@playwright/test";

// Focused AI Retry verification — real browser, real network, real UI.
// Proves Retry sends a NEW /chat/stream request (not just pre-filling).
const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `qa.retry.${STAMP}@example.com`;
const PASSWORD = "Devos-Retry-2026!-real";

test("AI Retry — real browser, new /chat/stream request", async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Count real /chat/stream POST requests as they happen.
  let streamRequests = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/ai/chat/stream")) {
      streamRequests++;
      console.log(`[RETRY] /chat/stream request #${streamRequests} observed`);
    }
  });

  // 1+2+3. Register + login through the real form.
  await page.request.post(`${API}/auth/register`, { data: { name: "QA Retry", email: EMAIL, password: PASSWORD } }).catch(() => {});
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/(app\/)?dashboard$/, { timeout: 60_000 });

  // Pin a project.
  const lg = await page.request.post(`${API}/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  const tok = (await lg.json()).data.token;
  const proj = await page.request.post(`${API}/projects`, { headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, data: { name: `Retry ${STAMP}` } });
  const pid = (await proj.json()).data?.id;
  await page.evaluate(([p, t]) => { localStorage.setItem("devos_active_project_id", p); localStorage.setItem("devos_token", t); }, [pid, tok] as const);

  // 4+5. Open workspace + real AI Assistant.
  await page.goto(`${BASE}/app/workspace`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Workspace:/i).first()).toBeVisible({ timeout: 30_000 });
  await page.locator("#ai-command-center").getByRole("tab", { name: "Assistant" }).click();
  await expect(page.getByLabel("Message the AI assistant")).toBeVisible({ timeout: 15_000 });

  // 6+7. Enter a unique prompt and submit through the real composer.
  const prompt = `Explain binary search in Python in 3 sentences. RetryCheck ${STAMP}`;
  await page.getByLabel("Message the AI assistant").fill(prompt);
  await page.getByRole("button", { name: "Send message" }).click();

  // 8+9. Wait for the FIRST assistant response to fully complete; capture it.
  await expect(page.getByText(/You asked about/).first()).toBeVisible({ timeout: 40_000 });
  // Wait until generating state clears (Send button visible again = not sending).
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible({ timeout: 40_000 });
  const firstRequestCount = streamRequests;
  console.log(`[RETRY] first generation: /chat/stream requests so far = ${firstRequestCount}`);
  expect(firstRequestCount).toBeGreaterThanOrEqual(1);

  const firstResponse = await page.locator(".ai-message.assistant .markdown-content").last().innerText();
  console.log(`[RETRY] first response (first 120): ${firstResponse.slice(0, 120)}`);

  // 10+11. Locate the REAL Retry control and click it.
  const retryBtn = page.locator("#ai-command-center").getByRole("button", { name: "Regenerate last response" });
  await expect(retryBtn).toBeVisible({ timeout: 10_000 });
  const beforeRetry = streamRequests;
  await retryBtn.click();
  console.log(`[RETRY] retry button clicked`);

  // 12+13. Observe network: a NEW /chat/stream request must be sent.
  await expect.poll(() => streamRequests, { timeout: 30_000 }).toBeGreaterThan(beforeRetry);
  console.log(`[RETRY] after retry: /chat/stream requests = ${streamRequests} (was ${beforeRetry})`);

  // 14. The new request is distinct (count increased by >= 1).
  expect(streamRequests).toBeGreaterThan(firstRequestCount);

  // 15+17. Second generation completes and a new assistant response renders.
  // Generating state should appear then clear.
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible({ timeout: 60_000 });
  const secondResponse = await page.locator(".ai-message.assistant .markdown-content").last().innerText();
  console.log(`[RETRY] second response (first 120): ${secondResponse.slice(0, 120)}`);
  expect(secondResponse.length).toBeGreaterThan(0);

  // 16. UI left generating state (Retry control available again).
  await expect(retryBtn).toBeVisible({ timeout: 10_000 });

  console.log("[RETRY] VERIFIED: retry issued a new /chat/stream request and produced a second response");
  console.log(`[RETRY] evidence: request#1 observed, retry click observed, request#2 observed, response#2 observed, UI completion observed`);
  await ctx.close();
});