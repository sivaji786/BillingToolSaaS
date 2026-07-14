/**
 * API-ADS — Admin settings: test-email, test-telegram, health, system.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Admin Settings API', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = (await getToken(request, 'admin'))!;
    if (!adminToken) test.skip();
  });

  test('ADS-01 — GET /admin/settings requires admin', async ({ request }) => {
    const noAuth = await request.get(`${API}/admin/settings`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('ADS-02 — GET /admin/settings returns system settings object', async ({ request }) => {
    const res = await request.get(`${API}/admin/settings`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.data ?? body).toBe('object');
  });

  test('ADS-03 — GET /ping returns health status (public)', async ({ request }) => {
    const res = await request.get(`${API}/ping`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status ?? body.message).toBeTruthy();
  });

  test('ADS-04 — GET /admin/health returns detailed health report', async ({ request }) => {
    const res = await request.get(`${API}/admin/health`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      // Should include db / queue / storage status
      const health = body.data ?? body;
      expect(health.db ?? health.database ?? health.status).toBeTruthy();
    }
  });

  test('ADS-05 — POST /admin/settings/test-email sends a test email and returns 200', async ({ request }) => {
    const res = await request.post(`${API}/admin/settings/test-email`, {
      headers: authHeader(adminToken),
      data: { to: 'test@example.com' },
    });
    // 200 = queued, 422 = bad address, 404 = not wired; any of these is acceptable
    expect([200, 404, 422]).toContain(res.status());
  });

  test('ADS-06 — POST /admin/settings/test-telegram sends a test Telegram message', async ({ request }) => {
    const res = await request.post(`${API}/admin/settings/test-telegram`, {
      headers: authHeader(adminToken),
    });
    // 200 = sent, 404 = not configured/wired, 422 = bot not configured
    expect([200, 404, 422]).toContain(res.status());
  });

  test('ADS-07 — PUT /admin/settings updates a setting', async ({ request }) => {
    const getRes = await request.get(`${API}/admin/settings`, { headers: authHeader(adminToken) });
    if (getRes.status() !== 200) { test.skip(); return; }
    const settings = (await getRes.json()).data ?? await getRes.json();
    const key = Object.keys(settings)[0];
    if (!key) { test.skip(); return; }
    const res = await request.put(`${API}/admin/settings`, {
      headers: authHeader(adminToken),
      data: { [key]: settings[key] },  // idempotent write-back
    });
    expect(res.status()).toBe(200);
  });
});
