import { Page, expect } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';
export const API_URL  = 'http://localhost:8080';

// ── Credentials (from MainSeeder.php) ────────────────────────────────────────
export const CREDENTIALS = {
  admin:   { email: 'admin@humpl.org',                 password: 'admin123' },
  manager: { email: 'alex.rivera@nexus.ai',            password: 'password123' },
  worker:  { email: 'mark.davis@nexus.ai',             password: 'password123' },
};

// Worker IDs in the nexus.ai tenant (from workhub_team_members)
export const WORKER_IDS = {
  manager: 1, // alex.rivera
  worker:  2, // mark.davis
};

// ── Get auth token via API (runs outside browser) ─────────────────────────────
export async function getToken(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.token ?? data?.token ?? null;
  } catch {
    return null;
  }
}

// ── LOGIN: inject token straight into localStorage (no UI form needed) ─────────
// This is faster and more reliable than filling the login form in the browser.
// Zustand's persist middleware reads 'auth-storage' on app load.
export async function loginByLocalStorage(
  page: Page,
  email: string,
  password: string
) {
  // 1. Call the real API to get a valid token
  const res = await page.request.post(`${API_URL}/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    throw new Error(
      `Login API failed for ${email}: HTTP ${res.status()} — ${await res.text()}`
    );
  }

  // API wraps the response: { success, message, data: { token, user, tenant } }
  const body = await res.json();
  const { token, user, tenant } = body.data ?? body;

  // 2. Open the app so we can write to its localStorage origin
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // 3. Write auth-storage into localStorage, then set the hash to #workhub.
  //    Setting window.location.hash is a same-document (hash-only) navigation —
  //    no page reload, so the URL changes but Zustand is NOT re-initialised yet.
  await page.evaluate(
    ({ token, user, tenant }) => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({ state: { isAuthenticated: true, token, user, tenant }, version: 0 })
      );
      // Hash-only change: URL becomes /#workhub but React is NOT restarted yet.
      window.location.hash = 'workhub';
    },
    { token, user, tenant }
  );

  // 4. Force a TRUE hard reload via Playwright (not a hash change).
  //    After this reload the page starts fresh at http://localhost:3000/#workhub,
  //    Zustand's persist middleware re-reads 'auth-storage' from localStorage,
  //    and App.tsx initialises currentScreen='workhub' from the hash.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export async function loginAsManager(page: Page) {
  await loginByLocalStorage(page, CREDENTIALS.manager.email, CREDENTIALS.manager.password);
}

export async function loginAsWorker(page: Page) {
  await loginByLocalStorage(page, CREDENTIALS.worker.email, CREDENTIALS.worker.password);
}

export async function loginAsAdmin(page: Page) {
  await loginByLocalStorage(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
}

// ── Stop any active timer for a worker (prevents 409 on timer/start) ──────────
export async function stopActiveTimer(token: string): Promise<void> {
  try {
    await fetch(`${API_URL}/workhub/timer/stop-current`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  } catch {
    // best-effort; ignore errors
  }
}

// ── Seed: create a task via API ───────────────────────────────────────────────
export async function createTaskViaAPI(
  token: string,
  title: string,
  status: 'open' | 'in_progress' | 'done' | 'problem' = 'open',
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  assignedWorkerId?: number
): Promise<number | null> {
  try {
    const body: Record<string, unknown> = { title, status, priority };
    if (assignedWorkerId !== undefined) body.assigned_worker_id = assignedWorkerId;
    const res = await fetch(`${API_URL}/workhub/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.id ?? data?.id ?? null;
  } catch {
    return null;
  }
}

// ── Screenshot helper ─────────────────────────────────────────────────────────
export async function snap(page: Page, label: string) {
  await page.screenshot({
    path: `playwright-report/snaps/${label}.png`,
    fullPage: false,
  });
}
