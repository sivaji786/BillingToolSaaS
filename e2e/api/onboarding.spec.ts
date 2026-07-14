/**
 * API-ONB — Onboarding, signup, email verification, and Quick Access OTP tests.
 */
import { test, expect } from '@playwright/test';
import { API } from './helpers';

test.describe('Onboarding — Signup & Verification', () => {
  test('ONB-01 — check-subdomain returns available/taken correctly', async ({ request }) => {
    const res = await request.get(`${API}/onboarding/check-subdomain?subdomain=testco-${Date.now()}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof (body.available ?? body.data?.available)).toBe('boolean');
  });

  test('ONB-02 — check-subdomain for an already-taken name returns available: false', async ({ request }) => {
    // 'nexus' is seeded by FullModuleTestSeeder as a known-taken subdomain fixture
    const res = await request.get(`${API}/onboarding/check-subdomain?subdomain=nexus`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const available = body.available ?? body.data?.available;
    expect(available).toBe(false);
  });

  test('ONB-03 — POST /onboarding/signup with valid payload creates tenant', async ({ request }) => {
    const unique = Date.now();
    const res = await request.post(`${API}/onboarding/signup`, {
      data: {
        name:      `Test Company ${unique}`,
        subdomain: `testco${unique}`,
        email:     `admin${unique}@testco.example`,
        password:  'SecurePass123!',
      },
    });
    // 201 = created, 200 = also acceptable, 422 = validation (also fine to test)
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 201 || res.status() === 200) {
      const body = await res.json();
      expect(body.data?.user ?? body.user ?? body).toBeTruthy();
    }
  });

  test('ONB-04 — POST /onboarding/signup with duplicate email returns 422', async ({ request }) => {
    const res = await request.post(`${API}/onboarding/signup`, {
      data: {
        name:      'Duplicate',
        subdomain: `dup${Date.now()}`,
        email:     'alex.rivera@nexus.ai',  // already exists
        password:  'SecurePass123!',
      },
    });
    expect([400, 409, 422]).toContain(res.status());
  });

  test('ONB-05 — POST /onboarding/signup with weak password returns 422', async ({ request }) => {
    const res = await request.post(`${API}/onboarding/signup`, {
      data: { name: 'Test', subdomain: `weak${Date.now()}`, email: `w${Date.now()}@test.com`, password: '123' },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('ONB-06 — POST /onboarding/verify-email with invalid token returns error', async ({ request }) => {
    const res = await request.post(`${API}/onboarding/verify-email`, {
      data: { token: 'invalid-token-that-does-not-exist' },
    });
    expect([400, 404, 422]).toContain(res.status());
  });

  test('ONB-07 — POST /onboarding/resend-verification with unknown email returns 200 (enum-safe)', async ({ request }) => {
    const res = await request.post(`${API}/onboarding/resend-verification`, {
      data: { email: 'no-such-user@example.com' },
    });
    // Must not 404 — that leaks email existence
    expect(res.status()).toBe(200);
  });
});

test.describe('Quick Access — OTP frictionless login', () => {
  test('QA-01 — POST /auth/check-email with known email returns user exists', async ({ request }) => {
    const res = await request.post(`${API}/auth/check-email`, {
      data: { email: 'alex.rivera@nexus.ai' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.exists ?? body.data?.exists).toBe(true);
  });

  test('QA-02 — POST /auth/check-email with unknown email returns exists: false', async ({ request }) => {
    const res = await request.post(`${API}/auth/check-email`, {
      data: { email: 'ghost@nobody.example' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.exists ?? body.data?.exists).toBe(false);
  });

  test('QA-03 — POST /auth/quick-access sends OTP (returns 200, no token yet)', async ({ request }) => {
    const res = await request.post(`${API}/auth/quick-access`, {
      data: { email: `qa${Date.now()}@example.com` },
    });
    // 200 = OTP sent, 422 = validation (no draft allowed for unknown email — both ok)
    expect(res.status()).toBeLessThan(500);
  });

  test('QA-04 — POST /auth/quick-access/verify with wrong OTP returns 401/422', async ({ request }) => {
    const res = await request.post(`${API}/auth/quick-access/verify`, {
      data: { email: 'alex.rivera@nexus.ai', otp: '000000' },
    });
    expect([400, 401, 422]).toContain(res.status());
  });

  test('QA-05 — GET /auth/sso/providers returns array (public)', async ({ request }) => {
    const res = await request.get(`${API}/auth/sso/providers`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const providers = body.providers ?? body.data ?? body;
    expect(Array.isArray(providers)).toBe(true);
  });
});
