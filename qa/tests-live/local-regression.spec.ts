import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:5173";
const API = "http://localhost:8000/api/v1";
const STAMP = Date.now();
const EMAIL = `qa.regression.${STAMP}@example.com`;
const PASSWORD = "Local-QA-2026!-strong";
const NAME = "QA Regression Agent";
const REPORT_DIR = path.join(process.cwd(), "test-results", "local-regression");
fs.mkdirSync(REPORT_DIR, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Status = "PASS" | "FAIL" | "UNVERIFIED";
interface Row { id: string; area: string; name: string; status: Status; detail?: string }
const rows: Row[] = [];
let seq = 0;
function record(area: string, name: string, status: Status, detail?: string): void {
  const r: Row = { id: String(++seq).padStart(3, "0"), area, name, status, ...(detail ? { detail } : {}) };
  rows.push(r);
  console.log(`[REG] ${status} ${r.id} ${area} > ${name}` + (detail ? " :: " + detail : ""));
}
async function check(page: Page, area: string, name: string, fn: () => Promise<void>): Promise<boolean> {
  try { await fn(); record(area, name, "PASS"); return true; }
  catch (e) {
    const msg = String((e as Error)?.message ?? e).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 3).join(" | ").slice(0, 420);
    record(area, name, "FAIL", msg); return false;
  }
}

const promptQueue: string[] = [];
function routeDialogs(page: Page): void {
  page.on("dialog", async (d) => {
    try {
      if (d.type() === "prompt") { const v = promptQueue.shift() ?? ""; console.log(`[dialog] prompt -> "${v}"`); await d.accept(v); }
      else { console.log(`[dialog] ${d.type()} accepted`); await d.accept(); }
    } catch { }
  });
}
const queuePrompt = (v: string) => { promptQueue.push(v); };

let token = "";
let projectId = "";async function apiPost(page: Page, ep: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await page.request.post(`${API}${ep}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, data: body });
  return { status: res.status(), data: await res.json().catch(() => null) };
}

async function bootstrap(page: Page): Promise<void> {
  const reg = await page.request.post(`${API}/auth/register`, { data: { name: NAME, email: EMAIL, password: PASSWORD } });
  const lg = await page.request.post(`${API}/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  const lgj = await lg.json();
  token = lgj.data.token;
  const t = await page.request.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
  const projects = (await t.json()).data.projects || [];
  let proj = projects.find((p: any) => p.name === `Regression ${STAMP}`);
  if (!proj) {
    const p = await page.request.post(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` }, data: { name: `Regression ${STAMP}` } });
    proj = (await p.json()).data;
  }
  projectId = proj.id;
  const t2 = await page.request.get(`${API}/projects/${projectId}/files`, { headers: { Authorization: `Bearer ${token}` } });
  const files = (await t2.json()).data.files || [];
  if (!files.some((f: any) => f.path === "facts")) {
    await apiPost(page, `/projects/${projectId}/files/folder`, { parent_path: "", name: "facts" });
  }
  if (!files.some((f: any) => f.path === "facts/quotes.txt")) {
    await apiPost(page, `/projects/${projectId}/files/file`, { parent_path: "facts", name: "quotes.txt", content: "quote one\nquote two" });
  }
  console.log(`[reg] projectId=${projectId}`);
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email Address").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/(app\/)?dashboard$/, { timeout: 60_000 });
  await page.evaluate(([pid]) => localStorage.setItem("devos_active_project_id", pid), [projectId] as const);
}

async function openTreeFile(page: Page, rowTitle: string, parentTitle?: string): Promise<void> {
  const row = page.locator(`.tree-row[title="${rowTitle}"]`).last();
  if (!(await row.isVisible().catch(() => false)) && parentTitle) {
    await page.locator(`.tree-row[title="${parentTitle}"]`).first().click();
    await sleep(600);
  }
  await row.click({ timeout: 15_000 });
}

test.describe.serial("DEVOS Local Regression", () => {
  test("mobile tree + AI copy/retry + conversations", async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    const page = await ctx.newPage();
    routeDialogs(page);
    await bootstrap(page);

    // ================= MOBILE TREE =================
    const widths = [320, 375, 390, 414];
    for (const w of widths) {
      const mctx = await browser.newContext({ baseURL: BASE, viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, permissions: ["clipboard-read", "clipboard-write"] });
      const mp = await mctx.newPage();
      routeDialogs(mp);
      await login(mp);
      await check(mp, "MOBILE", `explorer+Monaco open file @${w}`, async () => {
        await mp.goto(`${BASE}/app/workspace`, { waitUntil: "domcontentloaded" });
        await expect(mp.locator(".workspace-page").or(mp.getByText(/Workspace:/i)).first()).toBeVisible({ timeout: 30_000 });
        await openTreeFile(mp, "facts/quotes.txt", "facts");
        await expect(mp.locator(".monaco-editor")).toBeVisible({ timeout: 45_000 });
      });
      await mctx.close();
    }
    // ================= DESKTOP AI =================
    const ctx2 = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    const p2 = await ctx2.newPage();
    routeDialogs(p2);
    await login(p2);
    await p2.goto(`${BASE}/app/workspace`, { waitUntil: "domcontentloaded" });
    await expect(p2.locator(".workspace-page").or(p2.getByText(/Workspace:/i)).first()).toBeVisible({ timeout: 30_000 });

    let streamCount = 0;
    p2.on("request", (r) => { if (r.url().includes("/chat/stream")) streamCount++; });

    await check(p2, "AI", "Open Assistant composer", async () => {
      await p2.locator("#ai-command-center").getByRole("tab", { name: "Assistant" }).click();
      await expect(p2.getByLabel("Message the AI assistant")).toBeVisible({ timeout: 15_000 });
    });
    const before = streamCount;
    await check(p2, "AI", "Send real prompt", async () => {
      await p2.getByLabel("Message the AI assistant").fill("Explain binary search in Python in 3 sentences.");
      await p2.getByRole("button", { name: "Send message" }).click();
    });
    await check(p2, "AI", "Streaming request attempted", async () => {
      await expect.poll(() => streamCount, { timeout: 30_000 }).toBeGreaterThan(before);
    });
    await check(p2, "AI", "Completion renders answer", async () => {
      await expect(p2.getByText(/You asked about/).first()).toBeVisible({ timeout: 40_000 });
    });
    await check(p2, "AI", "Copy assistant response button visible + clipboard", async () => {
      const btn = p2.getByRole("button", { name: "Copy assistant response" }).first();
      await expect(btn).toBeVisible({ timeout: 10_000 });
      await btn.click();
      const clip = await p2.evaluate(() => navigator.clipboard.readText());
      if (!/Local\/Mock AI|You asked about|DEVOS/.test(clip)) throw new Error(`clipboard missing response (got "${clip.slice(0, 80)}")`);
    });
    await p2.screenshot({ path: path.join(REPORT_DIR, "ai-copy.png") });

    await check(p2, "AI", "Retry sends a NEW stream request", async () => {
      const beforeRetry = streamCount;
      await p2.locator("#ai-command-center").getByRole("button", { name: "Regenerate last response" }).click();
      await expect(p2.getByText(/You asked about/).first()).toBeVisible({ timeout: 60_000 });
      if (streamCount <= beforeRetry) throw new Error("regenerate did not trigger a new /chat/stream request");
    });
    // Seed two conversations titled "New Conversation" (same as the production audit) so the
    // conversation-list lifecycle checks can be audited deterministically.
    {
      const seeded = await p2.evaluate(async ([api, t]) => {
        const pid = localStorage.getItem("devos_active_project_id") || "";
        const mk = (title: string) => fetch(`${api}/projects/${pid}/ai/conversations`, { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ title }) }).then((r) => r.status);
        return { a: await mk("New Conversation"), b: await mk("New Conversation") };
      }, [API, token] as const);
      if (seeded.a !== 200 || seeded.b !== 200) throw new Error(`seed conversations failed: ${JSON.stringify(seeded)}`);
    }

    // Conversations
    await p2.reload({ waitUntil: "domcontentloaded" });
    await expect(p2.locator(".workspace-page").or(p2.getByText(/Workspace:/i)).first()).toBeVisible({ timeout: 30_000 });
    await check(p2, "CONV", "Conversation list shows New Conversation", async () => {
      await p2.locator("#ai-command-center").getByRole("tab", { name: "Assistant" }).click();
      const cv = p2.getByLabel("Conversation history");
      await expect(cv.getByText("New Conversation").first()).toBeVisible({ timeout: 20_000 });
    });
    const conv = p2.getByLabel("Conversation history");
    await check(p2, "CONV", "Rename conversation via prompt", async () => {
      const row = conv.locator(".conversation-history-item", { hasText: "New Conversation" }).first();
      queuePrompt("Regression Conv X");
      await row.getByRole("button", { name: "Rename conversation" }).click({ timeout: 10_000 });
      await expect(conv.getByText("Regression Conv X").first()).toBeVisible({ timeout: 20_000 });
    });
    await check(p2, "CONV", "Pin conversation", async () => {
      const row = conv.locator(".conversation-history-item", { hasText: "Regression Conv X" }).first();
      await row.getByRole("button", { name: "Pin conversation" }).click({ timeout: 10_000 });
      await expect(row.getByRole("button", { name: "Unpin conversation" })).toBeVisible({ timeout: 15_000 });
    });
    await check(p2, "CONV", "Unpin conversation", async () => {
      const row = conv.locator(".conversation-history-item", { hasText: "Regression Conv X" }).first();
      await row.getByRole("button", { name: "Unpin conversation" }).click({ timeout: 10_000 });
      await expect(row.getByRole("button", { name: "Pin conversation" })).toBeVisible({ timeout: 15_000 });
    });
    await check(p2, "CONV", "Search filters conversations", async () => {
      const box = p2.getByLabel("Search conversations");
      await box.fill("Regression Conv X");
      await expect(conv.getByText("Regression Conv X").first()).toBeVisible({ timeout: 10_000 });
      await box.fill("zzz-no-match-regression");
      await sleep(900);
      const n = await conv.getByText("Regression Conv X").count();
      if (n !== 0) throw new Error("non-matching search still shows the conversation");
      await box.fill("");
      await sleep(600);
    });
    await check(p2, "CONV", "Delete conversation removes it", async () => {
      const row = conv.locator(".conversation-history-item", { hasText: "Regression Conv X" }).first();
      await row.getByRole("button", { name: "Delete conversation" }).click({ timeout: 10_000 });
      await expect(conv.getByText("Regression Conv X")).toHaveCount(0, { timeout: 15_000 });
    });
    await p2.screenshot({ path: path.join(REPORT_DIR, "conv-final.png") });
    await ctx2.close();

    const pass = rows.filter((r) => r.status === "PASS").length;
    const fail = rows.filter((r) => r.status === "FAIL").length;
    const unv = rows.filter((r) => r.status === "UNVERIFIED").length;
    fs.writeFileSync(path.join(REPORT_DIR, "regression-report.json"), JSON.stringify({ summary: { pass, fail, unverified: unv, total: rows.length }, rows }, null, 2));
    console.log(`\n[REG] RESULT: ${pass} PASS / ${fail} FAIL / ${rows.length} total`);
    if (fail > 0) throw new Error(`${fail} regression check(s) failed`);
  });
});
