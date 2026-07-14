/**
 * API-ROL — Roles and Rights management contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Roles & Rights API', () => {
  let adminToken: string;
  let managerToken: string;
  let createdRoleId: number;

  test.beforeAll(async ({ request }) => {
    [adminToken, managerToken] = await Promise.all([
      getToken(request, 'admin').then(t => t!),
      getToken(request, 'manager').then(t => t!),
    ]);
    if (!adminToken) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (createdRoleId && adminToken) {
      await request.delete(`${API}/roles/${createdRoleId}`, { headers: authHeader(adminToken) }).catch(() => {});
    }
  });

  test('ROL-01 — GET /roles requires auth', async ({ request }) => {
    const res = await request.get(`${API}/roles`);
    expect([401, 403]).toContain(res.status());
  });

  test('ROL-02 — GET /roles returns a list of roles', async ({ request }) => {
    const res = await request.get(`${API}/roles`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const roles = body.data ?? body;
    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);
    // Roles must have at least name and id
    const role = roles[0];
    expect(role.id ?? role.name).toBeTruthy();
  });

  test('ROL-03 — GET /rights returns permissions/rights list', async ({ request }) => {
    const res = await request.get(`${API}/rights`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.data ?? body)).toBe(true);
    }
  });

  test('ROL-04 — POST /roles creates a custom role (admin only)', async ({ request }) => {
    const res = await request.post(`${API}/roles`, {
      headers: authHeader(adminToken),
      data: { name: `API Test Role ${Date.now()}`, permissions: [] },
    });
    expect([200, 201, 404]).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      createdRoleId = (body.data ?? body).id;
    }
  });

  test('ROL-05 — non-admin manager cannot create roles', async ({ request }) => {
    const res = await request.post(`${API}/roles`, {
      headers: authHeader(managerToken),
      data: { name: 'Unauthorized Role', permissions: [] },
    });
    // Must be blocked — 403 forbidden, or 401
    expect([401, 403]).toContain(res.status());
  });

  test('ROL-06 — GET /roles/:id returns specific role', async ({ request }) => {
    const listRes = await request.get(`${API}/roles`, { headers: authHeader(adminToken) });
    if (listRes.status() !== 200) { test.skip(); return; }
    const roles = (await listRes.json()).data ?? await listRes.json();
    if (!roles.length) { test.skip(); return; }
    const roleId = roles[0].id;
    const res = await request.get(`${API}/roles/${roleId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });
});
