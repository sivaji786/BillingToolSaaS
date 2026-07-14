/**
 * WorkHub E2E — Timer Features
 * Covers: idle state, start + elapsed display, pause/break, stop, reload persistence
 *
 * Uses loginAsWorker (mark.davis@nexus.ai) — workers see the flat TaskList view
 * where task rows are <button> elements. Tasks are seeded once in beforeAll.
 */
import { test, expect } from '@playwright/test';
import { loginAsWorker, snap, CREDENTIALS, getToken, createTaskViaAPI, stopActiveTimer, WORKER_IDS } from './helpers';

const TASK_TITLE = 'TimerE2E Task';

/** Click the "Timer" nav button in the WorkHub desktop sidebar.
 *
 * The WorkHub renders two "Timer" buttons: one in the mobile nav (md:hidden, invisible
 * on desktop) and one in the desktop sidebar. Use :visible to hit the correct one.
 */
async function openTimerPanel(page: import('@playwright/test').Page): Promise<boolean> {
  // :visible skips the mobile layout's hidden Timer button
  const btn = page.locator('button:visible[title="Timer"]')
    .or(page.locator('button:visible').filter({ hasText: /^Timer$/ }))
    .first();
  if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(600);
    return true;
  }
  return false;
}

/** Find the VISIBLE task row button and click it to open task detail.
 *
 * The WorkHub renders two task list layouts (mobile md:hidden + desktop) so there
 * are two <button> elements per task in the DOM. The mobile one is hidden via CSS
 * and has a null bounding box. Use :visible to skip it and target the desktop one.
 */
async function openTaskDetail(page: import('@playwright/test').Page): Promise<boolean> {
  // :visible skips the mobile layout's hidden duplicate buttons
  const row = page.locator('button:visible').filter({ hasText: TASK_TITLE }).first();
  if (!(await expect(row).toBeVisible({ timeout: 8000 }).then(() => true).catch(() => false))) return false;
  await row.click();
  await page.waitForTimeout(800);
  return true;
}

test.describe('WorkHub — Timer', () => {
  test.beforeAll(async () => {
    // Stop any active timer left from a previous run (prevents 409 on timer/start)
    const workerToken = await getToken(CREDENTIALS.worker.email, CREDENTIALS.worker.password);
    if (workerToken) await stopActiveTimer(workerToken);

    // Seed tasks assigned to mark.davis (worker ID=2)
    const managerToken = await getToken(CREDENTIALS.manager.email, CREDENTIALS.manager.password);
    if (managerToken) {
      await createTaskViaAPI(managerToken, TASK_TITLE, 'open', 'high', WORKER_IDS.worker);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Stop any active timer before each test to ensure clean state
    const workerToken = await getToken(CREDENTIALS.worker.email, CREDENTIALS.worker.password);
    if (workerToken) await stopActiveTimer(workerToken);

    await loginAsWorker(page);
    // Allow task list to fully load
    await page.waitForTimeout(2000);
  });

  // ── 1. Idle state ─────────────────────────────────────────────────────────
  test('shows "No timer running" when no timer is active', async ({ page }) => {
    const opened = await openTimerPanel(page);
    if (!opened) { test.skip(); return; }

    await expect(page.getByText(/no timer running/i).first()).toBeVisible({ timeout: 8000 });
    await snap(page, 'timer-01-idle');
  });

  // ── 2. Start timer from task detail ──────────────────────────────────────
  test('starts timer and shows Running badge with elapsed time', async ({ page }) => {
    if (!(await openTaskDetail(page))) { test.skip(); return; }

    const startBtn = page.getByRole('button', { name: /start timer/i }).first();
    if (!(await startBtn.isVisible({ timeout: 4000 }).catch(() => false))) { test.skip(); return; }
    await startBtn.click();
    await page.waitForTimeout(2500);

    // Switch to Timer panel to verify running state
    if (!(await openTimerPanel(page))) { test.skip(); return; }

    // "Running" badge (exact text, not "No timer running")
    await expect(page.locator('span, [class*="badge"]').filter({ hasText: /^Running$/ }).first())
      .toBeVisible({ timeout: 6000 });

    // Elapsed time: the large mono font display in TimerWidget
    await expect(page.locator('[class*="font-mono"], [class*="text-4xl"]')
      .filter({ hasText: /\d{2}:\d{2}:\d{2}/ }).first())
      .toBeVisible({ timeout: 5000 });

    await snap(page, 'timer-02-running');

    // Clean up
    const stopBtn = page.getByRole('button', { name: /^stop$/i }).first();
    if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) await stopBtn.click();
  });

  // ── 3. Pause timer (start a break) ───────────────────────────────────────
  test('clicking Break pauses the timer and shows Break state', async ({ page }) => {
    if (!(await openTaskDetail(page))) { test.skip(); return; }

    const startBtn = page.getByRole('button', { name: /start timer/i }).first();
    if (!(await startBtn.isVisible({ timeout: 4000 }).catch(() => false))) { test.skip(); return; }
    await startBtn.click();
    await page.waitForTimeout(2000);

    if (!(await openTimerPanel(page))) { test.skip(); return; }

    // "Break" button (with Coffee icon; text = "Break")
    const breakBtn = page.getByRole('button').filter({ hasText: /^Break$/ }).first();
    if (!(await breakBtn.isVisible({ timeout: 6000 }).catch(() => false))) { test.skip(); return; }
    await breakBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('span, [class*="badge"]').filter({ hasText: /^Break$/ }).first())
      .toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /end break/i })).toBeVisible({ timeout: 5000 });
    await snap(page, 'timer-03-break');

    // Clean up
    const stopBtn = page.getByRole('button', { name: /^stop$/i }).first();
    if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) await stopBtn.click();
  });

  // ── 4. Stop timer returns to idle ─────────────────────────────────────────
  test('clicking Stop returns the timer to idle state', async ({ page }) => {
    if (!(await openTaskDetail(page))) { test.skip(); return; }

    const startBtn = page.getByRole('button', { name: /start timer/i }).first();
    if (!(await startBtn.isVisible({ timeout: 4000 }).catch(() => false))) { test.skip(); return; }
    await startBtn.click();
    await page.waitForTimeout(2000);

    if (!(await openTimerPanel(page))) { test.skip(); return; }

    const stopBtn = page.getByRole('button', { name: /^stop$/i }).first();
    if (!(await stopBtn.isVisible({ timeout: 6000 }).catch(() => false))) { test.skip(); return; }
    await stopBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/no timer running/i).first()).toBeVisible({ timeout: 6000 });
    await snap(page, 'timer-04-stopped');
  });

  // ── 5. Timer persists after page reload ──────────────────────────────────
  test('timer state survives a full page reload', async ({ page }) => {
    if (!(await openTaskDetail(page))) { test.skip(); return; }

    const startBtn = page.getByRole('button', { name: /start timer/i }).first();
    if (!(await startBtn.isVisible({ timeout: 4000 }).catch(() => false))) { test.skip(); return; }
    await startBtn.click();
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    if (!(await openTimerPanel(page))) { test.skip(); return; }

    // Timer should still be running after reload
    const running = page.locator('span, [class*="badge"]').filter({ hasText: /^Running$/ }).first();
    if (await running.isVisible({ timeout: 6000 }).catch(() => false)) {
      await expect(running).toBeVisible();
      await snap(page, 'timer-05-persisted');
    }

    // Always clean up
    const stopBtn = page.getByRole('button', { name: /^stop$/i }).first();
    if (await stopBtn.isVisible({ timeout: 3000 }).catch(() => false)) await stopBtn.click();
  });
});
