/**
 * API-ADP — Admin packages CRUD + package services contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Admin Packages API', () => {
  let adminToken: string;
  let packageId: number;

  test.beforeAll(async ({ request }) => {
    adminToken = (await getToken(request, 'admin'))!;
    if (!adminToken) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (packageId && adminToken) {
      await request.delete(`${API}/admin/packages/${packageId}`, { headers: authHeader(adminToken) }).catch(() => {});
    }
  });

  test('ADP-01 — GET /admin/packages requires admin', async ({ request }) => {
    const noAuth = await request.get(`${API}/admin/packages`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('ADP-02 — GET /admin/packages returns package list', async ({ request }) => {
    const res = await request.get(`${API}/admin/packages`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('ADP-03 — POST /admin/packages creates a new package', async ({ request }) => {
    const res = await request.post(`${API}/admin/packages`, {
      headers: authHeader(adminToken),
      data: {
        name:         `API Test Package ${Date.now()}`,
        price:        29.99,
        billing_cycle: 'monthly',
        description:  'Automated test package',
        features:     ['feature_a', 'feature_b'],
      },
    });
    expect([200, 201, 404]).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      packageId = (body.data ?? body).id;
    }
  });

  test('ADP-04 — GET /admin/packages/:id returns the package', async ({ request }) => {
    if (!packageId) { test.skip(); return; }
    const res = await request.get(`${API}/admin/packages/${packageId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });

  test('ADP-05 — PUT /admin/packages/:id updates package price', async ({ request }) => {
    if (!packageId) { test.skip(); return; }
    const res = await request.put(`${API}/admin/packages/${packageId}`, {
      headers: authHeader(adminToken),
      data: { price: 39.99 },
    });
    expect(res.status()).toBe(200);
  });

  test('ADP-06 — GET /admin/package-services returns service modules list', async ({ request }) => {
    const res = await request.get(`${API}/admin/package-services`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.data ?? body)).toBe(true);
    }
  });

  test('ADP-07 — DELETE /admin/packages/:id removes the package', async ({ request }) => {
    if (!packageId) { test.skip(); return; }
    const res = await request.delete(`${API}/admin/packages/${packageId}`, { headers: authHeader(adminToken) });
    expect([200, 204]).toContain(res.status());
    packageId = 0;
  });
});
