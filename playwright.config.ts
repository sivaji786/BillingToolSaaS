import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // tests share backend state — run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  timeout: 30_000,

  use: {
    baseURL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    headless: !!process.env.CI,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  // Snapshot directory for visual regression baselines
  snapshotDir: './e2e/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, threshold: 0.2 },
  },

  projects: [
    // API contract tests — no browser needed (uses request fixture)
    {
      name: 'api',
      testDir: './e2e/api',
      use: { ...devices['Desktop Chrome'] },
      timeout: 15_000,
    },
    // Smoke + navigation tests
    {
      name: 'smoke',
      testDir: './e2e/smoke',
      use: { ...devices['Desktop Chrome'] },
    },
    // WorkHub E2E
    {
      name: 'workhub',
      testDir: './e2e/workhub',
      use: { ...devices['Desktop Chrome'] },
    },
    // Visual regression — desktop only
    {
      name: 'visual',
      testDir: './e2e/visual',
      use: { ...devices['Desktop Chrome'], headless: true },
      timeout: 45_000,
    },
    // Billing E2E (invoice editor full flow)
    {
      name: 'billing',
      testDir: './e2e/billing',
      use: { ...devices['Desktop Chrome'] },
    },
    // Accessibility — axe-core checks on key pages
    {
      name: 'a11y',
      testDir: './e2e/a11y',
      use: { ...devices['Desktop Chrome'] },
      timeout: 45_000,
    },
  ],
});
