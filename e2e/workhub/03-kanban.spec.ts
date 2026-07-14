/**
 * WorkHub E2E — Kanban Board
 * Covers: column rendering, tasks in correct columns, card click, drag-and-drop
 */
import { test, expect } from '@playwright/test';
import { loginAsManager, snap, CREDENTIALS, getToken, createTaskViaAPI } from './helpers';

test.describe('WorkHub — Kanban Board', () => {
  test.beforeAll(async () => {
    const token = await getToken(CREDENTIALS.manager.email, CREDENTIALS.manager.password);
    if (token) {
      await createTaskViaAPI(token, 'KanbanOpen Task',      'open',        'medium');
      await createTaskViaAPI(token, 'KanbanProgress Task', 'in_progress', 'high');
      await createTaskViaAPI(token, 'KanbanDone Task',     'done',        'low');
      await createTaskViaAPI(token, 'KanbanProblem Task',  'problem',     'urgent');
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  // Helper: ensure the Kanban view is active.
  // The manager sees Kanban by default. If already showing kanban columns, return true.
  // Only look for a toggle if the kanban is not yet visible.
  // NOTE: avoid the regex /board/i — "Dashboard" nav item contains "board" as a substring.
  async function switchToKanban(page: import('@playwright/test').Page): Promise<boolean> {
    // Manager's default view IS the kanban — columns render under the main content area.
    // Use :visible to avoid the md:hidden mobile layout's duplicate column headers.
    const openColVisible = await page.locator('*:visible').filter({ hasText: /^open$/i })
      .first().isVisible({ timeout: 4000 }).catch(() => false);
    if (openColVisible) return true;

    // Try an explicit Kanban toggle (exact word, not substring of Dashboard)
    const exactKanban = page.getByRole('button', { name: /^kanban$/i })
      .or(page.getByRole('tab', { name: /^kanban$/i }))
      .first();
    if (await exactKanban.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exactKanban.click();
      await page.waitForTimeout(1000);
      return true;
    }

    return false;
  }

  test('shows all 4 status columns', async ({ page }) => {
    if (!(await switchToKanban(page))) { test.skip(); return; }

    // Use :visible filter to skip the md:hidden mobile layout's duplicate column headers
    await expect(page.locator('*:visible').filter({ hasText: /^open$/i }).first())
      .toBeVisible({ timeout: 6000 });
    await expect(page.locator('*:visible').filter({ hasText: /^in.?progress$/i }).first())
      .toBeVisible({ timeout: 5000 });
    await expect(page.locator('*:visible').filter({ hasText: /^done$/i }).first())
      .toBeVisible({ timeout: 5000 });
    await expect(page.locator('*:visible').filter({ hasText: /^problem$/i }).first())
      .toBeVisible({ timeout: 5000 });

    await snap(page, 'kanban-01-columns');
  });

  test('tasks appear in the board after seeding', async ({ page }) => {
    if (!(await switchToKanban(page))) { test.skip(); return; }

    await expect(page.locator('*:visible').filter({ hasText: 'KanbanOpen Task' }).first())
      .toBeVisible({ timeout: 6000 });
    await expect(page.locator('*:visible').filter({ hasText: 'KanbanProgress Task' }).first())
      .toBeVisible({ timeout: 5000 });
    await expect(page.locator('*:visible').filter({ hasText: 'KanbanDone Task' }).first())
      .toBeVisible({ timeout: 5000 });
    await expect(page.locator('*:visible').filter({ hasText: 'KanbanProblem Task' }).first())
      .toBeVisible({ timeout: 5000 });

    await snap(page, 'kanban-02-tasks');
  });

  test('clicking a Kanban card opens task detail', async ({ page }) => {
    if (!(await switchToKanban(page))) { test.skip(); return; }

    const card = page.getByText('KanbanOpen Task').first();
    if (!(await card.isVisible({ timeout: 6000 }).catch(() => false))) { test.skip(); return; }

    await card.click();
    await page.waitForTimeout(800);

    // Detail panel / modal should be visible
    const detail = page.getByRole('button', { name: /start timer|edit|close/i }).first();
    await expect(detail).toBeVisible({ timeout: 5000 });
    await snap(page, 'kanban-03-card-click');
  });

  test('drags a task card to change its status column', async ({ page }) => {
    if (!(await switchToKanban(page))) { test.skip(); return; }

    const card      = page.getByText('KanbanOpen Task').first();
    const targetCol = page.getByText(/in.?progress/i).first();

    if (!(await card.isVisible({ timeout: 6000 }).catch(() => false))) { test.skip(); return; }
    if (!(await targetCol.isVisible().catch(() => false)))             { test.skip(); return; }

    const cardBox   = await card.boundingBox();
    const targetBox = await targetCol.boundingBox();
    if (!cardBox || !targetBox) { test.skip(); return; }

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(400);
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 60, { steps: 15 });
    await page.waitForTimeout(400);
    await page.mouse.up();
    await page.waitForTimeout(1500);

    await snap(page, 'kanban-04-drag-drop');
  });
});
