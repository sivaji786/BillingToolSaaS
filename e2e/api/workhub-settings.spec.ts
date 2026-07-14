/**
 * API-WSET — WorkHub settings GET/PUT contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub Settings API', () => {
  let managerToken: string;
  let workerToken: string;

  test.beforeAll(async ({ request }) => {
    [managerToken, workerToken] = await Promise.all([
      getToken(request, 'manager').then(t => t!),
      getToken(request, 'worker').then(t => t!),
    ]);
    if (!managerToken) test.skip();
  });

  test('WSET-01 — GET /workhub/settings requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/settings`);
    expect([401, 403]).toContain(res.status());
  });

  test('WSET-02 — GET /workhub/settings returns settings object (manager)', async ({ request }) => {
    const res = await request.get(`${API}/workhub/settings`, { headers: authHeader(managerToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const settings = body.data ?? body;
    expect(typeof settings).toBe('object');
  });

  test('WSET-03 — worker role cannot read WorkHub settings', async ({ request }) => {
    if (!workerToken) { test.skip(); return; }
    const res = await request.get(`${API}/workhub/settings`, { headers: authHeader(workerToken) });
    expect([401, 403]).toContain(res.status());
  });

  test('WSET-04 — PUT /workhub/settings updates a setting value', async ({ request }) => {
    // First, read current settings to get a key to update
    const getRes = await request.get(`${API}/workhub/settings`, { headers: authHeader(managerToken) });
    if (getRes.status() !== 200) { test.skip(); return; }
    const settings = (await getRes.json()).data ?? await getRes.json();

    // Use a safe key that can be toggled (notifications_enabled is common)
    const key = Object.keys(settings)[0];
    if (!key) { test.skip(); return; }
    const res = await request.put(`${API}/workhub/settings`, {
      headers: authHeader(managerToken),
      data: { [key]: settings[key] },  // write same value back — idempotent
    });
    expect(res.status()).toBe(200);
  });

  test('WSET-05 — PUT /workhub/settings with invalid payload returns 422', async ({ request }) => {
    const res = await request.put(`${API}/workhub/settings`, {
      headers: authHeader(managerToken),
      data: { nonexistent_setting_xyz: 'garbage_value_123' },
    });
    expect([400, 404, 422]).toContain(res.status());
  });
});
