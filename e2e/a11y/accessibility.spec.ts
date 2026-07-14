/**
 * Accessibility — axe-core checks on all key pages.
 * Violations are reported as test failures with clear descriptions.
 * Run: npx playwright test --project=smoke e2e/a11y/
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  // Reload so React re-initialises with isAuthenticated=true from localStorage.
  // Hash-only navigation (BASE → BASE/#workhub) does not trigger a full page reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  return true;
}

function formatViolations(violations: import('axe-core').Result[]) {
  return violations.map((v) =>
    `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`
  ).join('\n');
}

test.describe('Accessibility — Landing Page', () => {
  test('A11Y-01 — landing page has no critical/serious axe violations', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules([
        'color-contrast',  // checked separately via computed style tests
      ])
      .analyze();

    const critical = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical, `Critical a11y violations:\n${formatViolations(critical)}`).toHaveLength(0);
  });

  test('A11Y-02 — all images on landing page have alt text', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();

    expect(results.violations, `Images missing alt text:\n${formatViolations(results.violations)}`).toHaveLength(0);
  });

  test('A11Y-03 — all form inputs on landing page have labels', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();

    expect(results.violations, `Inputs missing labels:\n${formatViolations(results.violations)}`).toHaveLength(0);
  });
});

test.describe('Accessibility — Login Screen', () => {
  test('A11Y-04 — login form has no critical a11y violations', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1, h2', { timeout: 8000 });

    const loginBtn = page.locator('button, a').filter({ hasText: /^log\s*in$|^sign\s*in$/i }).first();
    if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(800);
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical, `Login screen a11y violations:\n${formatViolations(critical)}`).toHaveLength(0);
  });
});

test.describe('Accessibility — WorkHub (authenticated)', () => {
  test('A11Y-05 — WorkHub kanban board has no critical a11y violations', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    await page.goto(`${BASE}/#workhub`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const critical = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical, `WorkHub a11y violations:\n${formatViolations(critical)}`).toHaveLength(0);
  });

  test('A11Y-06 — WorkHub interactive elements are keyboard reachable', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    await page.goto(`${BASE}/#workhub`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const results = await new AxeBuilder({ page })
      .withRules(['frame-focusable-content', 'scrollable-region-focusable', 'focus-order-semantics'])
      .analyze();

    expect(results.violations, `Keyboard a11y violations:\n${formatViolations(results.violations)}`).toHaveLength(0);
  });
});

test.describe('Accessibility — Invoices (authenticated)', () => {
  test('A11Y-07 — invoice list has no critical a11y violations', async ({ page }) => {
    const ok = await injectAuth(page);
    if (!ok) { test.skip(); return; }

    await page.goto(`${BASE}/#invoices`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const critical = results.violations.filter((v) =>
      v.impact === 'critical' || v.impact === 'serious'
    );
    expect(critical, `Invoice list a11y violations:\n${formatViolations(critical)}`).toHaveLength(0);
  });
});
