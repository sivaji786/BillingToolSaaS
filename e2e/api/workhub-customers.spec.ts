/**
 * API-WCU — WorkHub Customers CRUD contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub Customers API', () => {
  let token: string;
  let customerId: number;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (customerId && token) {
      await request.delete(`${API}/workhub/customers/${customerId}`, { headers: authHeader(token) }).catch(() => {});
    }
  });

  test('WCU-01 — GET /workhub/customers requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/customers`);
    expect([401, 403]).toContain(res.status());
  });

  test('WCU-02 — GET /workhub/customers returns array', async ({ request }) => {
    const res = await request.get(`${API}/workhub/customers`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('WCU-03 — POST /workhub/customers creates customer', async ({ request }) => {
    const res = await request.post(`${API}/workhub/customers`, {
      headers: authHeader(token),
      data: {
        name:  `API Test Customer ${Date.now()}`,
        email: `wh-cust-${Date.now()}@example.com`,
        phone: '+49 30 99887766',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    const cust = body.data ?? body;
    expect(cust.id).toBeTruthy();
    customerId = Number(cust.id);
  });

  test('WCU-04 — GET /workhub/customers/:id returns the customer', async ({ request }) => {
    if (!customerId) test.skip();
    const res = await request.get(`${API}/workhub/customers/${customerId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const cust = (await res.json()).data ?? await res.json();
    expect(Number(cust.id)).toBe(customerId);
  });

  test('WCU-05 — PUT /workhub/customers/:id updates the customer', async ({ request }) => {
    if (!customerId) test.skip();
    const res = await request.put(`${API}/workhub/customers/${customerId}`, {
      headers: authHeader(token),
      data: { name: 'Updated WH Customer' },
    });
    expect(res.status()).toBe(200);
  });

  test('WCU-06 — DELETE /workhub/customers/:id removes the customer', async ({ request }) => {
    if (!customerId) test.skip();
    const res = await request.delete(`${API}/workhub/customers/${customerId}`, { headers: authHeader(token) });
    expect([200, 204]).toContain(res.status());
    customerId = 0;
  });
});
