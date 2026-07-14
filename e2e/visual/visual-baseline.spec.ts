/**
 * Visual regression baseline snapshots.
 *
 * First run (creating baselines):
 *   npx playwright test --project=visual --update-snapshots
 *
 * Subsequent runs (comparing against baselines):
 *   npx playwright test --project=visual
 *
 * Snapshots are stored in: e2e/snapshots/
 * Commit the snapshots — they are the source of truth.
 * A diff > 0.2% fails the test and blocks the PR.
 *
 * To update a specific baseline after an intentional design change:
 *   npx playwright test --project=visual -g "landing-hero" --update-snapshots
 */
import { test, expect, Page } from '@playwright/test';

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const API  = process.env.API_URL      ?? 'http://localhost:8080';

async function loginAsManager(page: Page): Promise<void> {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: 'alex.rivera@nexus.ai', password: 'password123' },
  });
  if (!res.ok()) throw new Error('Login failed in visual test setup');
  const { token, user, tenant } = (await res.json())?.data ?? {};
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user, tenant }) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { isAuthenticated: true, token, user, tenant }, version: 0,
    }));
  }, { token, user, tenant });
}

// ── Landing page ─────────────────────────────────────────────────────────────

test.describe('Landing page snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('VIS-01 — landing-hero (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page).toHaveScreenshot('landing-hero-desktop.png', { fullPage: false });
  });

  test('VIS-02 — landing-hero (375px mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot('landing-hero-mobile.png', { fullPage: false });
  });

  test('VIS-03 — landing CTA section (Get Started button must be visible and readable)', async ({ page }) => {
    // Scroll to the bottom CTA section.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('landing-cta-section.png');
  });

  test('VIS-04 — pricing section', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.querySelector('#pricing, [id*="pricing"]');
      if (el) el.scrollIntoView();
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('landing-pricing.png');
  });
});

// ── Auth screens ─────────────────────────────────────────────────────────────

test.describe('Auth screen snapshots', () => {
  test('VIS-05 — login screen (1280px)', async ({ page }) => {
    await page.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page).toHaveScreenshot('login-desktop.png');
  });

  test('VIS-06 — login screen (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot('login-mobile.png');
  });
});

// ── WorkHub snapshots ─────────────────────────────────────────────────────────

test.describe('WorkHub snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
    await page.evaluate(() => { window.location.hash = 'workhub'; });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
  });

  test('VIS-07 — WorkHub kanban board (Open column visible)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Wait for board to load.
    await page.waitForSelector('[class*="kanban"], [class*="column"], [class*="card"]', { timeout: 8000 }).catch(() => {});
    await expect(page).toHaveScreenshot('workhub-kanban.png');
  });

  test('VIS-08 — WorkHub kanban (768px tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('workhub-kanban-tablet.png');
  });
});

// ── Invoice snapshots ─────────────────────────────────────────────────────────

test.describe('Invoice snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
    await page.evaluate(() => { window.location.hash = 'invoices'; });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('VIS-09 — invoice list screen (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page).toHaveScreenshot('invoice-list.png');
  });
});

// ── Style contract assertions (CSS, not screenshots) ─────────────────────────

test.describe('Style contracts', () => {
  test('STYLE-01 — no button has white text on a white or near-white background', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const violations = await page.evaluate(() => {
      const results: string[] = [];
      document.querySelectorAll('button').forEach((btn) => {
        const st  = window.getComputedStyle(btn);
        const fg  = st.color;
        const bg  = st.backgroundColor;
        // Very crude white-on-white check: both rgb channels all ≥ 240
        const isWhiteText = /rgb\(25[0-5], 25[0-5], 25[0-5]\)|rgb\(255, 255, 255\)/.test(fg);
        const isWhiteBg   = /rgb\(25[0-5], 25[0-5], 25[0-5]\)|rgb\(255, 255, 255\)/.test(bg);
        if (isWhiteText && isWhiteBg) {
          results.push(`Button "${btn.textContent?.trim()}" has white text on white bg`);
        }
      });
      return results;
    });
    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  test('STYLE-02 — all img elements have alt attributes', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const missing = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter((img) => img.getAttribute('alt') === null)
        .map((img) => img.src);
    });
    expect(missing, `Images missing alt: ${missing.join(', ')}`).toHaveLength(0);
  });
});
