/**
 * WH-079: E2E Golden Path — task creation → timer → done report → invoice
 *
 * Prerequisites:
 *   - Dev server running at BASE_URL (default http://localhost:3000)
 *   - Test tenant with WorkHub Pro plan pre-seeded (worker, planner users)
 *   - PLAYWRIGHT_BASE_URL env var or default localhost:3000
 *
 * Run: npx playwright test tests/e2e/workhub-golden-path.spec.ts
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL  = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const PLANNER_EMAIL    = process.env.E2E_PLANNER_EMAIL    ?? 'e2e-planner@test.local';
const PLANNER_PASSWORD = process.env.E2E_PLANNER_PASSWORD ?? 'Test1234!';
const WORKER_EMAIL     = process.env.E2E_WORKER_EMAIL     ?? 'e2e-worker@test.local';
const WORKER_PASSWORD  = process.env.E2E_WORKER_PASSWORD  ?? 'Test1234!';

// ---- Helpers ----

async function login(page: Page, email: string, password: string): Promise<void> {
    await page.goto(`${BASE_URL}/#login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\#dashboard|\#workhub/);
}

async function navigateToWorkHub(page: Page): Promise<void> {
    await page.goto(`${BASE_URL}/#workhub`);
    await page.waitForSelector('[data-testid="workhub-layout"], [data-page="workhub"]', { timeout: 10_000 });
}

async function drawSignature(page: Page, canvasSelector: string): Promise<void> {
    const canvas = page.locator(canvasSelector).first();
    await canvas.waitFor({ state: 'visible' });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Signature canvas not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 40, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy, { steps: 20 });
    await page.mouse.move(cx + 40, cy + 20, { steps: 10 });
    await page.mouse.up();
}

// ---- Tests ----

test.describe('WorkHub golden path', () => {
    test.setTimeout(120_000);

    let taskTitle: string;
    let taskId: string;
    let completionId: string;

    test('Step 1 — Planner creates task with worker capacity assignment', async ({ page }) => {
        taskTitle = `E2E Task ${Date.now()}`;

        await login(page, PLANNER_EMAIL, PLANNER_PASSWORD);
        await navigateToWorkHub(page);

        // Open new task modal
        await page.getByRole('button', { name: /new task|create task|\+ task/i }).click();
        await page.waitForSelector('[data-testid="new-task-modal"], [role="dialog"]');

        // Step 1: Basic info
        await page.getByLabel(/title/i).fill(taskTitle);
        await page.getByLabel(/priority/i).selectOption('high');
        await page.getByLabel(/estimated hours|est\.? hours/i).fill('3');
        await page.getByLabel(/location/i).fill('Building-7-Floor-2');

        // Navigate to step 2 (worker capacity cards)
        await page.getByRole('button', { name: /next|continue/i }).click();
        await page.waitForSelector('[data-testid="capacity-card"], .capacity-card', { timeout: 8_000 });

        // Select first available worker
        const firstCard = page.locator('[data-testid="capacity-card"]').first();
        await firstCard.click();

        // Submit
        await page.getByRole('button', { name: /create task|submit/i }).click();
        await page.waitForSelector('[data-testid="task-item"]', { timeout: 8_000 });

        // Verify task appears in list
        await expect(page.getByText(taskTitle)).toBeVisible();

        // Get task id from DOM
        const taskRow = page.locator('[data-testid="task-item"]').filter({ hasText: taskTitle });
        taskId = (await taskRow.getAttribute('data-task-id')) ?? '';
    });

    test('Step 2 — Worker starts timer, adds break, stops timer', async ({ page }) => {
        await login(page, WORKER_EMAIL, WORKER_PASSWORD);
        await navigateToWorkHub(page);

        // Find the created task
        const taskRow = page.locator('[data-testid="task-item"]').filter({ hasText: taskTitle });
        await taskRow.click();

        // Open task detail and start timer
        await page.getByRole('button', { name: /start timer/i }).click();
        await expect(page.getByRole('button', { name: /pause/i })).toBeVisible({ timeout: 5_000 });

        // Let timer run briefly
        await page.waitForTimeout(2_000);

        // Take break
        await page.getByRole('button', { name: /pause|break/i }).click();
        await expect(page.getByRole('button', { name: /resume/i })).toBeVisible({ timeout: 5_000 });

        // Resume and stop
        await page.getByRole('button', { name: /resume/i }).click();
        await page.waitForTimeout(1_000);
        await page.getByRole('button', { name: /stop/i }).click();

        // Confirm stop dialog if present
        const confirmBtn = page.getByRole('button', { name: /confirm|yes, stop/i });
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await confirmBtn.click();
        }

        // Timer should be idle again
        await expect(page.getByRole('button', { name: /start timer/i })).toBeVisible({ timeout: 8_000 });
    });

    test('Step 3 — Worker completes done report: note, AI correct, material, photo, signatures', async ({ page }) => {
        await login(page, WORKER_EMAIL, WORKER_PASSWORD);
        await navigateToWorkHub(page);

        const taskRow = page.locator('[data-testid="task-item"]').filter({ hasText: taskTitle });
        await taskRow.click();

        // Open done report modal
        await page.getByRole('button', { name: /done report|complete/i }).click();
        await page.waitForSelector('[data-testid="done-report-modal"], [aria-label="Done report"]', { timeout: 8_000 });

        // --- Step 1: Completion note ---
        const noteField = page.getByLabel(/completion note|work summary/i);
        await noteField.fill('Installation of panel 3B completed. All 12 circuits tested and verified with multimeter. Cable runs secured with approved clips. Earth bonding confirmed.');

        // AI correct (optional — may not have API key in E2E env)
        const aiBtn = page.getByRole('button', { name: /correct with ai/i });
        if (await aiBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await aiBtn.click();
            await page.waitForSelector('[data-testid="ai-diff"], .ai-diff', { timeout: 15_000 }).catch(() => {});
            const acceptBtn = page.getByRole('button', { name: /accept all/i });
            if (await acceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
                await acceptBtn.click();
            }
        }

        await page.getByRole('button', { name: /next/i }).click();

        // --- Step 2: Materials ---
        await page.getByRole('button', { name: /add material|add row/i }).click();
        await page.getByPlaceholder(/material name/i).last().fill('Cable 2.5mm NYM-J');
        await page.locator('input[name*="quantity"]').last().fill('15');
        await page.locator('select[name*="unit"]').last().selectOption('m');
        await page.locator('input[name*="unit_price"]').last().fill('1.85');

        await page.getByRole('button', { name: /next/i }).click();

        // --- Step 3: Photo upload ---
        // Create a minimal JPEG blob and upload it
        const jpegBytes = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=', 'base64');
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.getByRole('button', { name: /upload photo|add photo/i }).first().click(),
        ]);
        await fileChooser.setFiles({
            name: 'jobsite.jpg',
            mimeType: 'image/jpeg',
            buffer: jpegBytes,
        });
        await page.waitForTimeout(1_500);

        await page.getByRole('button', { name: /next/i }).click();

        // --- Step 4: Worker signature ---
        await drawSignature(page, 'canvas[data-testid="worker-signature"], canvas#worker-sig');
        await page.getByRole('button', { name: /done|sign/i }).first().click();
        await page.getByRole('button', { name: /next/i }).click();

        // --- Step 5: GDPR consent + customer signature ---
        const gdprCheckbox = page.getByRole('checkbox', { name: /consent|gdpr/i });
        if (await gdprCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await gdprCheckbox.check();
        }

        await drawSignature(page, 'canvas[data-testid="customer-signature"], canvas#customer-sig');
        await page.getByLabel(/customer name/i).fill('Hans Mustermann');
        await page.getByRole('button', { name: /done|sign/i }).last().click();
        await page.getByRole('button', { name: /next/i }).click();

        // --- Step 6: Submit ---
        await page.getByRole('button', { name: /submit|complete report/i }).click();

        // Completion success indicator
        await expect(
            page.getByText(/dual.?signed|completed|success/i)
        ).toBeVisible({ timeout: 15_000 });

        // Capture completion id for step 4 verification
        const completionEl = page.locator('[data-completion-id]').first();
        completionId = (await completionEl.getAttribute('data-completion-id')) ?? '';
    });

    test('Step 4 — Verify completion record saved and dual-signed', async ({ page }) => {
        await login(page, PLANNER_EMAIL, PLANNER_PASSWORD);
        await navigateToWorkHub(page);

        const taskRow = page.locator('[data-testid="task-item"]').filter({ hasText: taskTitle });
        await taskRow.click();

        // Task should show "done" status
        await expect(
            page.locator('[data-testid="task-status"], .task-status').filter({ hasText: /done/i })
        ).toBeVisible({ timeout: 8_000 });

        // Completion record visible
        await expect(page.getByText(/dual.?signed|customer signed/i)).toBeVisible({ timeout: 8_000 });
    });

    test('Step 5 — Verify draft invoice created with correct line items', async ({ page }) => {
        await login(page, PLANNER_EMAIL, PLANNER_PASSWORD);

        // Navigate to invoices and filter by WorkHub source
        await page.goto(`${BASE_URL}/#invoices`);
        await page.waitForTimeout(2_000);

        // Filter for WorkHub invoices
        const whFilter = page.getByRole('button', { name: /workhub/i });
        if (await whFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await whFilter.click();
        }

        // Should see a draft invoice from WorkHub source
        await expect(
            page.locator('[data-source="workhub"], .source-badge:has-text("WorkHub")')
        ).toBeVisible({ timeout: 10_000 });

        // Click the invoice
        await page.locator('[data-source="workhub"]').first().click();

        // Verify materials line item present
        await expect(page.getByText(/cable 2.5mm/i)).toBeVisible({ timeout: 5_000 });
    });

    test('Step 6 — Download completion certificate PDF', async ({ page }) => {
        await login(page, WORKER_EMAIL, WORKER_PASSWORD);
        await navigateToWorkHub(page);

        const taskRow = page.locator('[data-testid="task-item"]').filter({ hasText: taskTitle });
        await taskRow.click();

        // Open documents tab
        const docsTab = page.getByRole('tab', { name: /documents|docs/i });
        if (await docsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await docsTab.click();
        }

        // Trigger PDF download
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: /download.*completion.?cert|completion.?cert.*download/i }).click(),
        ]);

        expect(download.suggestedFilename()).toMatch(/completion|certificate/i);
        const path = await download.path();
        expect(path).toBeTruthy();
    });
});
