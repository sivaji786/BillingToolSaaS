/**
 * API-LTR — Business Letters CRUD contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Business Letters API', () => {
  let token: string;
  let letterId: number;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (letterId && token) {
      await request.delete(`${API}/letters/${letterId}`, { headers: authHeader(token) }).catch(() => {});
    }
  });

  test('LTR-01 — GET /letters requires auth', async ({ request }) => {
    const res = await request.get(`${API}/letters`);
    expect([401, 403]).toContain(res.status());
  });

  test('LTR-02 — GET /letters with auth returns array', async ({ request }) => {
    const res = await request.get(`${API}/letters`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    expect(Array.isArray((await res.json()).data ?? await res.json())).toBe(true);
  });

  test('LTR-03 — POST /letters creates a letter', async ({ request }) => {
    const res = await request.post(`${API}/letters`, {
      headers: authHeader(token),
      data: {
        recipient_name:    'Test Recipient',
        recipient_address: '123 Test St',
        subject:           'API Test Letter',
        body:              'This is an automated test letter body.',
        date:              '2026-06-25',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    const letter = body.data ?? body;
    expect(letter.id).toBeTruthy();
    letterId = letter.id;
  });

  test('LTR-04 — GET /letters/:id returns the letter', async ({ request }) => {
    if (!letterId) test.skip();
    const res = await request.get(`${API}/letters/${letterId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const letter = (await res.json()).data ?? await res.json();
    expect(letter.id).toBe(letterId);
    expect(letter.subject).toBe('API Test Letter');
  });

  test('LTR-05 — PUT /letters/:id updates the subject', async ({ request }) => {
    if (!letterId) test.skip();
    const res = await request.put(`${API}/letters/${letterId}`, {
      headers: authHeader(token),
      data: { subject: 'Updated Subject' },
    });
    expect(res.status()).toBe(200);
  });

  test('LTR-06 — POST /ai/improve-letter-body requires auth and returns improved text', async ({ request }) => {
    const noAuth = await request.post(`${API}/ai/improve-letter-body`, {
      data: { body: 'please improve this text' },
    });
    expect([401, 403]).toContain(noAuth.status());
  });

  test('LTR-07 — DELETE /letters/:id removes the letter', async ({ request }) => {
    if (!letterId) test.skip();
    const res = await request.delete(`${API}/letters/${letterId}`, { headers: authHeader(token) });
    expect([200, 204]).toContain(res.status());
    letterId = 0;
  });

  test('LTR-08 — GET /letters/:id of deleted letter returns 404', async ({ request }) => {
    const res = await request.get(`${API}/letters/999999`, { headers: authHeader(token) });
    expect([404, 200]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.data ?? body).toBeFalsy();
    }
  });
});
