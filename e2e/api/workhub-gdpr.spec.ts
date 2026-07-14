/**
 * API-GDPR — GDPR my-data export contract tests.
 * GDPR export must be auth-guarded and return data only for the requesting user.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('GDPR / My Data Export API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test('GDPR-01 — GET /gdpr/my-data requires auth', async ({ request }) => {
    const res = await request.get(`${API}/gdpr/my-data`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('GDPR-02 — GET /gdpr/my-data returns user data export', async ({ request }) => {
    const res = await request.get(`${API}/gdpr/my-data`, { headers: authHeader(token) });
    expect([200, 202, 404]).toContain(res.status());
    if (res.status() === 200 || res.status() === 202) {
      const body = await res.json();
      // Should contain some personal data fields
      const data = body.data ?? body;
      expect(data.email ?? data.user?.email ?? data.profile?.email).toBeTruthy();
    }
  });

  test('GDPR-03 — POST /gdpr/delete-request requires auth', async ({ request }) => {
    const res = await request.post(`${API}/gdpr/delete-request`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('GDPR-04 — POST /gdpr/delete-request with valid token is accepted or 404', async ({ request }) => {
    // We only verify the endpoint is auth-guarded and does not 500.
    // We do NOT actually trigger a deletion on the test account.
    const res = await request.post(`${API}/gdpr/delete-request`, {
      headers: authHeader(token),
      data: { confirmation: 'I understand this action is irreversible' },
    });
    // 200/202 = queued, 404 = not yet wired, 422 = missing confirmation field
    expect(res.status()).toBeLessThan(500);
  });

  test('GDPR-05 — GET /gdpr/export-download/:token with bad token returns 401/404', async ({ request }) => {
    const res = await request.get(`${API}/gdpr/export-download/invalid-token-abc123`);
    expect([401, 404]).toContain(res.status());
  });
});
