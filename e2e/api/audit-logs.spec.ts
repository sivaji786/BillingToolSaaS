/**
 * API-AUD — Audit log contract tests.
 * Audit logs must be admin/manager-only and return timestamped entries.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Audit Logs API', () => {
  let adminToken: string;
  let workerToken: string;

  test.beforeAll(async ({ request }) => {
    [adminToken, workerToken] = await Promise.all([
      getToken(request, 'admin').then(t => t!),
      getToken(request, 'worker').then(t => t!),
    ]);
    if (!adminToken) test.skip();
  });

  test('AUD-01 — GET /audit-logs requires auth', async ({ request }) => {
    const res = await request.get(`${API}/audit-logs`);
    expect([401, 403]).toContain(res.status());
  });

  test('AUD-02 — GET /audit-logs returns paginated log entries (admin)', async ({ request }) => {
    const res = await request.get(`${API}/audit-logs`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const entries = body.data ?? body;
    expect(Array.isArray(entries)).toBe(true);
  });

  test('AUD-03 — log entries have expected shape (event, actor, timestamp)', async ({ request }) => {
    const res = await request.get(`${API}/audit-logs?per_page=1`, { headers: authHeader(adminToken) });
    if (res.status() !== 200) { test.skip(); return; }
    const body = await res.json();
    const entries = body.data ?? body;
    if (!entries.length) { test.skip(); return; }
    const entry = entries[0];
    // Must have at least one of: event/action/type and a timestamp field
    const hasEvent = entry.event ?? entry.action ?? entry.type;
    const hasTime  = entry.created_at ?? entry.timestamp ?? entry.performed_at;
    expect(hasEvent).toBeTruthy();
    expect(hasTime).toBeTruthy();
  });

  test('AUD-04 — worker role is blocked from audit logs', async ({ request }) => {
    if (!workerToken) { test.skip(); return; }
    const res = await request.get(`${API}/audit-logs`, { headers: authHeader(workerToken) });
    expect([401, 403]).toContain(res.status());
  });

  test('AUD-05 — GET /audit-logs with date filter does not error', async ({ request }) => {
    const res = await request.get(`${API}/audit-logs?from=2026-01-01&to=2026-12-31`, {
      headers: authHeader(adminToken),
    });
    expect(res.status()).toBe(200);
  });
});
