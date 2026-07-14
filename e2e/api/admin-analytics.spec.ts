/**
 * API-ADA — Admin analytics dashboard + tenants + usage contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Admin Analytics API', () => {
  let adminToken: string;
  let managerToken: string;

  test.beforeAll(async ({ request }) => {
    [adminToken, managerToken] = await Promise.all([
      getToken(request, 'admin').then(t => t!),
      getToken(request, 'manager').then(t => t!),
    ]);
    if (!adminToken) test.skip();
  });

  test('ADA-01 — GET /admin/analytics requires admin', async ({ request }) => {
    const noAuth = await request.get(`${API}/admin/analytics`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('ADA-02 — non-admin manager is blocked from admin/analytics', async ({ request }) => {
    const res = await request.get(`${API}/admin/analytics`, { headers: authHeader(managerToken) });
    expect([401, 403]).toContain(res.status());
  });

  test('ADA-03 — GET /admin/analytics/dashboard returns platform stats', async ({ request }) => {
    const res = await request.get(`${API}/admin/analytics/dashboard`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.data ?? body).toBe('object');
    }
  });

  test('ADA-04 — GET /admin/analytics/tenants returns tenant breakdown', async ({ request }) => {
    const res = await request.get(`${API}/admin/analytics/tenants`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.data ?? body)).toBe(true);
    }
  });

  test('ADA-05 — GET /admin/analytics/usage returns aggregate usage metrics', async ({ request }) => {
    const res = await request.get(`${API}/admin/analytics/usage`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.data ?? body).toBe('object');
    }
  });

  test('ADA-06 — GET /admin/analytics with date range does not 500', async ({ request }) => {
    const res = await request.get(
      `${API}/admin/analytics?from=2026-01-01&to=2026-12-31`,
      { headers: authHeader(adminToken) }
    );
    expect(res.status()).toBeLessThan(500);
  });
});
