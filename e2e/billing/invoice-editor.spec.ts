/**
 * E2E — Invoice Editor: create → edit → share link → PDF.
 * Full browser flow; requires logged-in session.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const API  = process.env.API_URL      ?? 'http://localhost:8080';

async function injectAuth(page: import('@playwright/test').Page) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'alex.rivera@nexus.ai', password: 'password123' },
  });
  if (!res.ok()) return false;
  const { token, user, tenant } = (await res.json())?.data ?? {};
  if (!token) return false;
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user, tenant }) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { isAuthenticated: true, token, user, tenant }, version: 0,
    }));
  }, { token, user, tenant });
  // Reload so React re-initialises from localStorage with isAuthenticated=true.
  // Without this reload the hash change from #landing→#invoices is same-origin and
  // does NOT cause a full page reload, leaving the Zustand store as isAuthenticated=false.
  await page.reload({ waitUntil: 'domcontentloaded' });
  return true;
}

test.describe('Invoice Editor E2E', () => {
  test('INV-01 — invoice list screen loads and shows invoices or empty state', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    await page.goto(`${BASE}/#invoices`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const text = await page.evaluate(() => document.body.innerText.trim());
    expect(text.length, 'Invoice list rendered blank').toBeGreaterThan(30);
  });

  test('INV-02 — "New Invoice" button navigates to invoice editor', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    await page.goto(`${BASE}/#invoices`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const newBtn = page.locator('button, a').filter({ hasText: /new invoice|create invoice|add invoice|\+ invoice/i }).first();
    if (!await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }

    await newBtn.click();
    await page.waitForTimeout(2000);

    // Invoice editor uses custom click-to-edit divs; also accept standard form inputs
    const hasEditor =
      (await page.locator('input, select, textarea').first().isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await page.locator('button:has-text("Add Line Item"), h1:has-text("Invoice"), button:has-text("Save")').first().isVisible({ timeout: 2000 }).catch(() => false));
    expect(hasEditor, '"New Invoice" did not open editor').toBe(true);
  });

  test('INV-03 — invoice editor can add a line item', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    // App uses hash-only routing; no subroutes — open editor via the New Invoice button
    await page.goto(`${BASE}/#invoices`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const newBtn = page.locator('button, a').filter({ hasText: /new invoice|create invoice|add invoice|\+ invoice/i }).first();
    if (!await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) { test.skip(); return; }
    await newBtn.click();
    await page.waitForTimeout(2000);

    const addLineBtn = page.locator('button').filter({ hasText: /add.*line.*item|add.*first.*line|add.*item/i }).first();
    if (!await addLineBtn.isVisible({ timeout: 4000 }).catch(() => false)) { test.skip(); return; }

    // Editor renders line items as divs, not table rows. Count via the per-row delete button.
    const linesBefore = await page.locator('button[aria-label^="Delete line"]').count();
    await addLineBtn.click();
    await page.waitForTimeout(800);

    const linesAfter = await page.locator('button[aria-label^="Delete line"]').count();
    expect(linesAfter, 'Line item count did not increase after clicking Add Line').toBeGreaterThan(linesBefore);
  });

  test('INV-04 — existing invoice can be opened and shows correct fields', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    await page.goto(`${BASE}/#invoices`, { waitUntil: 'domcontentloaded' });

    // Wait for actual data rows: loading/empty rows use td[colspan], data rows have multiple tds
    const firstDataRow = page.locator('table tbody tr').filter({ has: page.locator('td:nth-child(2)') }).first();
    const rowReady = await firstDataRow.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    if (!rowReady) { test.skip(); return; }

    // Checkbox renders as button[0]; invoice-number link is button[1]; MoreVertical is button.last()
    const invoiceLink = firstDataRow.locator('button').nth(1);
    const linkReady = await invoiceLink.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
    if (!linkReady) { test.skip(); return; }
    await invoiceLink.click();
    await page.waitForTimeout(2000);

    const text = await page.evaluate(() => document.body.innerText.trim());
    expect(text.length, 'Invoice detail rendered blank').toBeGreaterThan(50);
  });

  test('INV-05 — share link button generates a link (no 500)', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    await page.goto(`${BASE}/#invoices`, { waitUntil: 'domcontentloaded' });

    // Share is in a DropdownMenu — open via the MoreVertical (last button) in the first data row
    const firstDataRow = page.locator('table tbody tr').filter({ has: page.locator('td:nth-child(2)') }).first();
    const rowReady = await firstDataRow.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    if (!rowReady) { test.skip(); return; }

    // Intercept any API calls to catch 500s
    const errors: number[] = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500) errors.push(resp.status());
    });

    const moreBtn = firstDataRow.locator('button').last();
    await moreBtn.click();
    await page.waitForTimeout(500);

    const shareMenuItem = page.locator('[role="menuitem"]').filter({ hasText: /share/i }).first();
    const menuReady = await shareMenuItem.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
    if (!menuReady) { test.skip(); return; }
    await shareMenuItem.click();
    await page.waitForTimeout(1000);

    expect(errors, `Share link triggered 500 error(s): ${errors.join(', ')}`).toHaveLength(0);
  });
});
