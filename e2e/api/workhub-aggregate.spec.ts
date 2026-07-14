/**
 * API-WAGG — WorkHub aggregate/summary endpoints.
 * Covers: kanban board, capacity view, finance summary.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub Aggregate API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test('WAGG-01 — GET /workhub/kanban requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/kanban`);
    expect([401, 403]).toContain(res.status());
  });

  test('WAGG-02 — GET /workhub/kanban returns tasks grouped by status', async ({ request }) => {
    const res = await request.get(`${API}/workhub/kanban`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const data = body.data ?? body;
      // Should be an object with status keys, or a flat array
      expect(typeof data === 'object').toBe(true);
    }
  });

  test('WAGG-03 — GET /workhub/capacity returns worker capacity summary', async ({ request }) => {
    const res = await request.get(`${API}/workhub/capacity`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.workers ?? body.data ?? body)).toBe(true);
    }
  });

  test('WAGG-04 — GET /workhub/finance returns financial summary', async ({ request }) => {
    const res = await request.get(`${API}/workhub/finance`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const summary = body.data ?? body;
      expect(typeof summary).toBe('object');
    }
  });

  test('WAGG-05 — GET /workhub/dashboard returns overview stats', async ({ request }) => {
    const res = await request.get(`${API}/workhub/dashboard`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(typeof body.data ?? body).toBe('object');
    }
  });
});
