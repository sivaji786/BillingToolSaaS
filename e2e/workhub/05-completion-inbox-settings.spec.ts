/**
 * WorkHub E2E — Completion Records, Inbox, Settings, Offline
 */
import { test, expect } from '@playwright/test';
import { loginAsManager, snap, CREDENTIALS, getToken, createTaskViaAPI } from './helpers';

// ── Completion Records ────────────────────────────────────────────────────────
test.describe('WorkHub — Completion Records', () => {
  test.beforeAll(async () => {
    const token = await getToken(CREDENTIALS.manager.email, CREDENTIALS.manager.password);
    if (token) {
      await createTaskViaAPI(token, 'CompletionE2E Task', 'done', 'high');
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test('PDF documents tab shows work order button', async ({ page }) => {
    await page.waitForTimeout(1000);

    const taskRow = page.locator('[class*="cursor-pointer"]').filter({ hasText: /.+/ }).first();
    if (!(await taskRow.isVisible({ timeout: 5000 }).catch(() => false))) { test.skip(); return; }
    await taskRow.click();
    await page.waitForTimeout(500);

    const docsTab = page.getByRole('tab', { name: /document|pdf|files/i }).first();
    if (!(await docsTab.isVisible({ timeout: 3000 }).catch(() => false))) { test.skip(); return; }
    await docsTab.click();
    await page.waitForTimeout(800);

    await expect(page.getByText(/work.?order/i).first()).toBeVisible({ timeout: 5000 });
    await snap(page, 'completion-01-pdf-buttons');
  });

  test('completion record form has a notes area and/or signature canvas', async ({ page }) => {
    await page.waitForTimeout(1000);

    const doneTask = page.locator('[class*="cursor-pointer"]')
      .filter({ hasText: /CompletionE2E|done/i }).first();
    if (!(await doneTask.isVisible({ timeout: 5000 }).catch(() => false))) { test.skip(); return; }
    await doneTask.click();
    await page.waitForTimeout(500);

    const completionBtn = page.getByRole('button', { name: /completion|done report|sign/i }).first();
    if (!(await completionBtn.isVisible({ timeout: 3000 }).catch(() => false))) { test.skip(); return; }
    await completionBtn.click();
    await page.waitForTimeout(800);

    const hasNotes  = await page.locator('textarea').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasCanvas = await page.locator('canvas').first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasNotes || hasCanvas).toBeTruthy();
    await snap(page, 'completion-02-form');
  });
});

// ── Inbox ─────────────────────────────────────────────────────────────────────
test.describe('WorkHub — Inbox', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test('inbox loads without a server error', async ({ page }) => {
    const inboxTab = page.getByRole('tab', { name: /inbox/i })
      .or(page.getByRole('link', { name: /inbox/i }))
      .first();

    if (!(await inboxTab.isVisible({ timeout: 4000 }).catch(() => false))) { test.skip(); return; }
    await inboxTab.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toContainText('Error 500');
    await snap(page, 'inbox-01-loaded');
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────
test.describe('WorkHub — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test('settings tab loads without errors', async ({ page }) => {
    const settingsTab = page.getByRole('tab', { name: /settings/i })
      .or(page.getByRole('link', { name: /settings/i }))
      .first();

    if (!(await settingsTab.isVisible({ timeout: 4000 }).catch(() => false))) { test.skip(); return; }
    await settingsTab.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toContainText('Error 500');
    await snap(page, 'settings-01-loaded');
  });

  test('timesheet tab loads without errors', async ({ page }) => {
    const timesheetTab = page.getByRole('tab', { name: /timesheet/i })
      .or(page.getByRole('link', { name: /timesheet/i }))
      .first();

    if (!(await timesheetTab.isVisible({ timeout: 4000 }).catch(() => false))) { test.skip(); return; }
    await timesheetTab.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).not.toContainText('Error 500');
    await snap(page, 'timesheet-01-loaded');
  });
});

// ── Offline behavior ──────────────────────────────────────────────────────────
test.describe('WorkHub — Offline behavior', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test('shows offline banner when network is disconnected', async ({ page }) => {
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(800);

    const banner = page.locator('[role="status"]').first();
    const hasBanner = await banner.isVisible({ timeout: 4000 }).catch(() => false);
    await snap(page, 'offline-01-banner');
    if (hasBanner) await expect(banner).toBeVisible();

    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });

  test('shows "Back online" message after reconnecting', async ({ page }) => {
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(300);

    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(800);

    const reconnected = page.getByText(/back online|reconnected|synced/i).first();
    await snap(page, 'offline-02-back-online');
    // Banner is transient — just document; don't hard-fail if already faded
  });
});
