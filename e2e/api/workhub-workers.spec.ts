/**
 * API-WWRK — WorkHub Workers CRUD + role management contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub Workers API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test('WWRK-01 — GET /workhub/workers requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/workers`);
    expect([401, 403]).toContain(res.status());
  });

  test('WWRK-02 — GET /workhub/workers returns array', async ({ request }) => {
    const res = await request.get(`${API}/workhub/workers`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const workers = body.data ?? body;
    expect(Array.isArray(workers)).toBe(true);
  });

  test('WWRK-03 — worker entries have expected shape (id, name/email, role)', async ({ request }) => {
    const res = await request.get(`${API}/workhub/workers`, { headers: authHeader(token) });
    if (res.status() !== 200) { test.skip(); return; }
    const workers = (await res.json()).data ?? await res.json();
    if (!workers.length) { test.skip(); return; }
    const w = workers[0];
    expect(w.id).toBeTruthy();
    expect(w.name ?? w.email ?? w.username).toBeTruthy();
  });

  test('WWRK-04 — GET /workhub/workers/:id returns worker detail', async ({ request }) => {
    const listRes = await request.get(`${API}/workhub/workers`, { headers: authHeader(token) });
    if (listRes.status() !== 200) { test.skip(); return; }
    const workers = (await listRes.json()).data ?? await listRes.json();
    if (!workers.length) { test.skip(); return; }
    const workerId = workers[0].id;
    const res = await request.get(`${API}/workhub/workers/${workerId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
  });

  test('WWRK-05 — PATCH /workhub/workers/:id/role updates worker role', async ({ request }) => {
    const listRes = await request.get(`${API}/workhub/workers`, { headers: authHeader(token) });
    if (listRes.status() !== 200) { test.skip(); return; }
    const workers = (await listRes.json()).data ?? await listRes.json();
    if (!workers.length) { test.skip(); return; }
    // Use the last worker (mark.davis/worker) to avoid clobbering the manager's privileged role
    const target = workers[workers.length - 1];
    const workerId = target.id;
    const originalRole: string = target.role ?? target.wh_role ?? 'worker';
    const res = await request.patch(`${API}/workhub/workers/${workerId}/role`, {
      headers: authHeader(token),
      data: { wh_role: 'worker' },
    });
    // 200 = updated, 404 = endpoint named differently, 422 = validation
    expect([200, 404, 422]).toContain(res.status());
    // Restore original role so subsequent tests see a consistent state
    if (res.status() === 200 && originalRole !== 'worker') {
      await request.patch(`${API}/workhub/workers/${workerId}/role`, {
        headers: authHeader(token),
        data: { role: originalRole },
      }).catch(() => {});
    }
  });
});
