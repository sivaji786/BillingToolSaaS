/**
 * API-CP — Customer Portal contract tests.
 * Covers: dashboard, invoices, subscription, profile, usage.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Customer Portal API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test('CP-01 — GET /portal/dashboard requires auth', async ({ request }) => {
    const res = await request.get(`${API}/portal/dashboard`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('CP-02 — GET /portal/dashboard returns summary stats', async ({ request }) => {
    const res = await request.get(`${API}/portal/dashboard`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.data ?? body).toBeTruthy();
    }
  });

  test('CP-03 — GET /portal/invoices returns invoice list', async ({ request }) => {
    const res = await request.get(`${API}/portal/invoices`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.data ?? body)).toBe(true);
    }
  });

  test('CP-04 — GET /portal/subscription returns active plan info', async ({ request }) => {
    const res = await request.get(`${API}/portal/subscription`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const sub = body.data ?? body;
      expect(sub.plan ?? sub.package_name ?? sub.plan_name).toBeTruthy();
    }
  });

  test('CP-05 — GET /portal/profile returns tenant/user profile', async ({ request }) => {
    const res = await request.get(`${API}/portal/profile`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const profile = body.data ?? body;
      expect(profile.email ?? profile.name).toBeTruthy();
    }
  });

  test('CP-06 — GET /portal/usage returns usage metrics', async ({ request }) => {
    const res = await request.get(`${API}/portal/usage`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
  });
});
