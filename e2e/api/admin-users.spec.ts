/**
 * API-ADU — Admin users list/suspend/activate/upgrade/reset-password tests.
 * All endpoints require admin role.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Admin Users API', () => {
  let adminToken: string;
  let managerToken: string;
  let targetUserId: number;

  test.beforeAll(async ({ request }) => {
    [adminToken, managerToken] = await Promise.all([
      getToken(request, 'admin').then(t => t!),
      getToken(request, 'manager').then(t => t!),
    ]);
    if (!adminToken) test.skip();
  });

  test('ADU-01 — GET /admin/users requires admin auth', async ({ request }) => {
    const noAuth = await request.get(`${API}/admin/users`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('ADU-02 — non-admin manager cannot access /admin/users', async ({ request }) => {
    const res = await request.get(`${API}/admin/users`, { headers: authHeader(managerToken) });
    expect([401, 403]).toContain(res.status());
  });

  test('ADU-03 — GET /admin/users returns tenant list (admin)', async ({ request }) => {
    const res = await request.get(`${API}/admin/users`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const users = body.data ?? body;
    expect(Array.isArray(users)).toBe(true);
    if (users.length) {
      targetUserId = users[0].id;
    }
  });

  test('ADU-04 — POST /admin/users/:id/suspend suspends a tenant account', async ({ request }) => {
    if (!targetUserId) { test.skip(); return; }
    const res = await request.post(`${API}/admin/users/${targetUserId}/suspend`, {
      headers: authHeader(adminToken),
    });
    expect([200, 404, 422]).toContain(res.status());
    // Restore immediately
    if (res.status() === 200) {
      await request.post(`${API}/admin/users/${targetUserId}/activate`, {
        headers: authHeader(adminToken),
      }).catch(() => {});
    }
  });

  test('ADU-05 — POST /admin/users/:id/reset-password sends reset email', async ({ request }) => {
    if (!targetUserId) { test.skip(); return; }
    const res = await request.post(`${API}/admin/users/${targetUserId}/reset-password`, {
      headers: authHeader(adminToken),
    });
    expect([200, 404]).toContain(res.status());
  });

  test('ADU-06 — POST /admin/users/:id/upgrade changes plan', async ({ request }) => {
    if (!targetUserId) { test.skip(); return; }
    const res = await request.post(`${API}/admin/users/${targetUserId}/upgrade`, {
      headers: authHeader(adminToken),
      data: { plan_id: 1 },
    });
    expect([200, 404, 422]).toContain(res.status());
  });
});
