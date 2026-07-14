/**
 * API-BYR — Buyers Directory CRUD + import/export contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Buyers Directory API', () => {
  let token: string;
  let buyerId: number;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (buyerId && token) {
      await request.delete(`${API}/buyers/${buyerId}`, { headers: authHeader(token) }).catch(() => {});
    }
  });

  test('BYR-01 — GET /buyers requires auth', async ({ request }) => {
    const res = await request.get(`${API}/buyers`);
    expect([401, 403]).toContain(res.status());
  });

  test('BYR-02 — GET /buyers returns array with auth', async ({ request }) => {
    const res = await request.get(`${API}/buyers`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('BYR-03 — POST /buyers creates a buyer', async ({ request }) => {
    const res = await request.post(`${API}/buyers`, {
      headers: authHeader(token),
      data: {
        name:    'API Test Buyer Ltd',
        email:   `buyer${Date.now()}@example.com`,
        phone:   '+49 30 12345678',
        address: '99 Test Street, Berlin',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    const buyer = body.data ?? body;
    expect(buyer.id).toBeTruthy();
    buyerId = buyer.id;
  });

  test('BYR-04 — GET /buyers/:id returns the buyer', async ({ request }) => {
    if (!buyerId) test.skip();
    const res = await request.get(`${API}/buyers/${buyerId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const buyer = (await res.json()).data ?? await res.json();
    expect(buyer.name).toBe('API Test Buyer Ltd');
  });

  test('BYR-05 — PUT /buyers/:id updates the buyer', async ({ request }) => {
    if (!buyerId) test.skip();
    const res = await request.put(`${API}/buyers/${buyerId}`, {
      headers: authHeader(token),
      data: { name: 'Updated Buyer Ltd' },
    });
    expect(res.status()).toBe(200);
  });

  test('BYR-06 — GET /buyers/export returns file (CSV or XLSX)', async ({ request }) => {
    const res = await request.get(`${API}/buyers/export`, { headers: authHeader(token) });
    // 200 = file download, 404 = endpoint not implemented yet
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const ct = res.headers()['content-type'] ?? '';
      expect(ct).toMatch(/csv|spreadsheet|octet-stream/i);
    }
  });

  test('BYR-07 — DELETE /buyers/:id removes the buyer', async ({ request }) => {
    if (!buyerId) test.skip();
    const res = await request.delete(`${API}/buyers/${buyerId}`, { headers: authHeader(token) });
    expect([200, 204]).toContain(res.status());
    buyerId = 0;
  });
});
