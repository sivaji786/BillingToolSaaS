/**
 * Smoke — Navigation, landing page, and link integrity tests.
 * Covers:
 *   BUG-010 — navigation links returned blank screens in demo env
 *   BUG-002 — "Get Started" CTA button text was invisible (white-on-white)
 *
 * These tests must all pass before any customer-facing demo.
 * Run: npx playwright test --project=smoke
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.FRONTEND_URL ?? 'http://localhost:3000';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // Wait for React to render — the hero heading should be visible.
    await page.waitForSelector('h1, h2', { timeout: 8000 });
  });

  test('LND-01 — loads without console errors or blank sections', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1500);
    // No JS errors should be present after load.
    const critical = errors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR'));
    expect(critical, `Console errors: ${critical.join('\n')}`).toHaveLength(0);
    // The page must have visible text — not blank.
    const body = await page.textContent('body');
    expect(body?.trim().length ?? 0).toBeGreaterThan(100);
  });

  test('LND-02 — hero "Get Started" / primary CTA button is visible and text is readable (BUG-002)', async ({ page }) => {
    // Locate the CTA section button — the one on the coloured hero/CTA background.
    const ctaBtn = page.locator('button, a[href]').filter({ hasText: /get started/i }).first();
    await expect(ctaBtn).toBeVisible({ timeout: 6000 });

    // The button must have a non-white, non-transparent text color.
    // white-on-white (BUG-002) was caused by parent div text-white overriding the button.
    const color = await ctaBtn.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    // rgb(255, 255, 255) = white. The fixed color is dark navy rgb(30, 58, 95).
    expect(color, `CTA button text is white-on-white (BUG-002): computed color = ${color}`)
      .not.toBe('rgb(255, 255, 255)');
  });

  test('LND-03 — "Login" / "Sign In" button navigates to the login screen', async ({ page }) => {
    const loginBtn = page.locator('button, a').filter({ hasText: /^log\s*in$|^sign\s*in$/i }).first();
    await expect(loginBtn).toBeVisible({ timeout: 5000 });
    await loginBtn.click();
    // After clicking, the URL hash should change or the login form should appear.
    await page.waitForTimeout(1000);
    const hasLoginForm = await page.locator('input[type="password"], input[name="password"]').isVisible({ timeout: 3000 }).catch(() => false);
    const hasHash       = page.url().includes('login') || page.url().includes('#login');
    expect(hasLoginForm || hasHash, 'Login button did not navigate to login screen').toBe(true);
  });

  test('LND-04 — pricing section "Get Started" buttons are all visible', async ({ page }) => {
    // Scroll to pricing section.
    await page.evaluate(() => {
      const el = document.querySelector('#pricing, [id*="pricing"], [data-section*="pricing"]');
      if (el) el.scrollIntoView();
    });
    await page.waitForTimeout(500);

    const pricingBtns = page.locator('section, div')
      .filter({ hasText: /pricing|plan/i })
      .locator('button, a')
      .filter({ hasText: /get started|choose plan|select/i });

    const count = await pricingBtns.count();
    // If no pricing section, skip.
    if (count === 0) {
      test.skip();
      return;
    }
    for (let i = 0; i < count; i++) {
      await expect(pricingBtns.nth(i)).toBeVisible();
    }
  });

  test('LND-05 — no horizontal scrollbar at 1280px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const hasHScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(hasHScroll, 'Page has horizontal scrollbar at 1280px').toBe(false);
  });

  test('LND-06 — no horizontal scrollbar at 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const hasHScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(hasHScroll, 'Page has horizontal scrollbar on mobile').toBe(false);
  });
});

test.describe('Navigation link integrity (BUG-010)', () => {
  test('NAV-01 — all internal hash links resolve to non-blank content', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Collect all anchor tags with # hrefs pointing to sections.
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href^="#"]'))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href, i, arr) => arr.indexOf(href) === i) // unique
        .slice(0, 20); // test at most 20 to keep fast
    });

    for (const link of links) {
      await page.goto(link, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const text = await page.evaluate(() => document.body.innerText.trim());
      expect(text.length, `Link ${link} led to a blank page`).toBeGreaterThan(50);
    }
  });

  test('NAV-02 — hash route #workhub shows content (not blank) after login', async ({ page }) => {
    // Seed auth into localStorage the same way E2E workhub tests do.
    const res = await page.request.post(
      `${process.env.API_URL ?? 'http://localhost:8080'}/auth/login`,
      { data: { email: 'alex.rivera@nexus.ai', password: 'password123' } }
    );
    if (!res.ok()) { test.skip(); return; }
    const { token, user, tenant } = (await res.json())?.data ?? {};
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, user, tenant }) => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { isAuthenticated: true, token, user, tenant }, version: 0,
      }));
      window.location.hash = 'workhub';
    }, { token, user, tenant });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // The WorkHub screen must render something — not a blank page.
    const text = await page.evaluate(() => document.body.innerText.trim());
    expect(text.length, '#workhub route rendered blank page (BUG-010)').toBeGreaterThan(50);
  });

  test('NAV-03 — navigating to unknown hash does not show blank screen', async ({ page }) => {
    await page.goto(`${BASE}/#unknown-route-that-does-not-exist`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const text = await page.evaluate(() => document.body.innerText.trim());
    expect(text.length, 'Unknown hash route shows blank screen').toBeGreaterThan(20);
  });
});

test.describe('Footer links', () => {
  test('FOOT-01 — legal footer links render non-empty pages', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });

    const footerLinks = page.locator('footer a, [class*="footer"] a').filter({
      hasText: /privacy|terms|impressum|cookie|legal|datenschutz/i,
    });
    const count = await footerLinks.count();
    if (count === 0) { test.skip(); return; }

    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await footerLinks.nth(i).getAttribute('href');
      if (!href) continue;
      const target = href.startsWith('http') ? href : `${BASE}${href}`;
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const text = await page.evaluate(() => document.body.innerText.trim());
      expect(text.length, `Footer link ${href} rendered empty`).toBeGreaterThan(30);
      await page.goBack();
    }
  });
});
