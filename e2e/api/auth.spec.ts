/**
 * API-AUTH — Authentication endpoint contract tests.
 * No browser required — all assertions are on HTTP responses.
 */
import { test, expect } from '@playwright/test';
import { API, CREDS } from './helpers';

test.describe('Auth API', () => {
  test('API-AUTH-01 — valid login returns 200, token, user, tenant', async ({ request }) => {
    const res  = await request.post(`${API}/auth/login`, { data: CREDS.manager });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    expect(data.token).toBeTruthy();
    expect(data.user).toBeDefined();
    expect(data.tenant).toBeDefined();
  });

  test('API-AUTH-02 — wrong password returns 401, no token', async ({ request }) => {
    const res  = await request.post(`${API}/auth/login`, {
      data: { email: CREDS.manager.email, password: 'wrong-password' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body?.data?.token ?? body?.token).toBeFalsy();
  });

  test('API-AUTH-03 — forgot-password with known email returns 200', async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: CREDS.manager.email },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success ?? body.status).toBeTruthy();
  });

  test('API-AUTH-04 — forgot-password with unknown email returns 200 (enumeration-safe)', async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: 'no-such-user@example.com' },
    });
    // Must not return 404 — that leaks user existence
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.data?.token).toBeFalsy();
  });

  test('API-AUTH-07 — GET /auth/me with valid token returns user object', async ({ request }) => {
    // Login first to get a token
    const loginRes = await request.post(`${API}/auth/login`, { data: CREDS.manager });
    const { token } = (await loginRes.json())?.data ?? await loginRes.json();

    const res  = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const user = body.data?.user ?? body.user ?? body.data ?? body;
    expect(user.email).toBe(CREDS.manager.email);
  });

  test('API-AUTH-08 — GET /auth/me with invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API}/auth/me`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(res.status()).toBe(401);
  });
});
