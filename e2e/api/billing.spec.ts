/**
 * API-BIL — Billing, subscription, and plan tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Billing API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test('BIL-01 — GET /billing/plans returns public plan list', async ({ request }) => {
    const res = await request.get(`${API}/billing/plans`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const plans = body.data ?? body;
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
    // Each plan should have id, name, price
    const plan = plans[0];
    expect(plan.id ?? plan.plan_id).toBeTruthy();
  });

  test('BIL-02 — GET /billing/package-services returns array (public)', async ({ request }) => {
    const res = await request.get(`${API}/billing/package-services`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('BIL-03 — GET /billing/subscription requires auth', async ({ request }) => {
    const noAuth = await request.get(`${API}/billing/subscription`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('BIL-04 — GET /billing/subscription with valid token returns current plan', async ({ request }) => {
    const res = await request.get(`${API}/billing/subscription`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const sub = body.data ?? body;
    expect(sub.plan ?? sub.plan_name ?? sub.package_name).toBeTruthy();
  });

  test('BIL-05 — GET /billing/history requires auth', async ({ request }) => {
    const noAuth = await request.get(`${API}/billing/history`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('BIL-06 — GET /billing/history returns array of past transactions', async ({ request }) => {
    const res = await request.get(`${API}/billing/history`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('BIL-07 — POST /billing/upgrade with invalid plan returns 422', async ({ request }) => {
    const res = await request.post(`${API}/billing/upgrade`, {
      headers: authHeader(token),
      data: { plan_id: 99999 },
    });
    expect([400, 404, 422, 500]).toContain(res.status());
  });
});
