import { test, expect } from '@playwright/test';

const BASE = 'https://devos-ebon.vercel.app';
const API = 'https://devos-backend-f3ub.onrender.com/api/v1';
const EMAIL = `drawer.diag.${Date.now()}@example.com`;
const PASSWORD = 'Diag-Pass-2026!';
const NAME = 'Drawer Diag';

test.setTimeout(600_000);

test('diagnose mobile drawer + scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();

  // 1. Register + create a project via API to guarantee data exists
  const reg = await p.request.post(`${API}/auth/register`, { data: { name: NAME, email: EMAIL, password: PASSWORD } });
  console.log('register:', reg.status());
  const login = await p.request.post(`${API}/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  const body = await login.json();
  const token = body?.data?.token;
  console.log('login:', login.status(), 'token?', !!token);
  const proj = await p.request.post(`${API}/projects`, { data: { name: 'Diag Project', description: 'x' }, headers: { Authorization: `Bearer ${token}` } });
  const projBody = await proj.json();
  const pid = projBody?.data?.id;
  console.log('project:', proj.status(), pid);

  // 2. UI login
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await p.getByLabel('Email Address').fill(EMAIL);
  await p.getByLabel('Password').fill(PASSWORD);
  await p.getByRole('button', { name: 'Sign In' }).click();
  await expect(p).toHaveURL(/\/app\/dashboard$/, { timeout: 60_000 });
  await p.evaluate((id) => localStorage.setItem('devos_active_project_id', id), pid);
  await p.goto(`${BASE}/app/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(p.getByText('Good to see you', { exact: false })).toBeVisible({ timeout: 30_000 });

  // 3. Pre-click state of the toggle button
  const toggle = p.locator('.app-menu-toggle');
  console.log('toggle count:', await toggle.count());
  console.log('toggle aria-label before:', await toggle.getAttribute('aria-label'));
  console.log('toggle visible before:', await toggle.isVisible());
  const box = await toggle.boundingBox();
  console.log('toggle boundingBox:', JSON.stringify(box));

  // 4. Click and observe
  await toggle.click();
  await p.waitForTimeout(1500);
  console.log('toggle aria-label after click:', await toggle.getAttribute('aria-label'));
  const backdrop = p.locator('.mobile-nav-backdrop');
  console.log('backdrop count:', await backdrop.count(), 'visible:', await backdrop.isVisible());
  const closeNav = p.getByRole('button', { name: 'Close navigation' });
  console.log('"Close navigation" buttons:', await closeNav.count());
  for (let i = 0; i < await closeNav.count(); i++) {
    console.log(`  closeNav[${i}] visible:`, await closeNav.nth(i).isVisible(), 'label:', await closeNav.nth(i).getAttribute('aria-label'));
  }
  await p.screenshot({ path: 'test-results/diag-drawer-open.png', fullPage: true });

  // 5. Scroll diagnostics on workspace
  await p.goto(`${BASE}/app/workspace`, { waitUntil: 'domcontentloaded' });
  await expect(p.locator('.workspace-page').or(p.getByText(/Workspace:/i)).first()).toBeVisible({ timeout: 30_000 });
  const scroll = await p.evaluate(() => {
    const mc = document.querySelector('.main-content');
    const app = document.querySelector('.app-shell');
    window.scrollTo(0, 400);
    return {
      winY: window.scrollY,
      docSH: document.documentElement.scrollHeight,
      docCH: document.documentElement.clientHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      appShellOverflow: app ? getComputedStyle(app).overflow : null,
      mcOverflowY: mc ? getComputedStyle(mc).overflowY : null,
      mcScrollH: mc ? mc.scrollHeight : null,
      mcClientH: mc ? mc.clientHeight : null,
      mcScrollTopAfter: mc ? mc.scrollTop : null,
    };
  });
  console.log('scroll diagnostics:', JSON.stringify(scroll, null, 2));
  await ctx.close();
});
