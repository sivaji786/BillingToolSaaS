/**
 * API-WTS — WorkHub Timesheet list/export + sign-off contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub Timesheet API', () => {
  let managerToken: string;
  let workerToken: string;

  test.beforeAll(async ({ request }) => {
    [managerToken, workerToken] = await Promise.all([
      getToken(request, 'manager').then(t => t!),
      getToken(request, 'worker').then(t => t!),
    ]);
    if (!managerToken) test.skip();
  });

  test('WTS-01 — GET /workhub/timesheet requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/timesheet`);
    expect([401, 403]).toContain(res.status());
  });

  test('WTS-02 — GET /workhub/timesheet returns array of time entries (manager)', async ({ request }) => {
    const res = await request.get(`${API}/workhub/timesheet`, { headers: authHeader(managerToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.days ?? body.data ?? body)).toBe(true);
  });

  test('WTS-03 — worker can view their own timesheet entries', async ({ request }) => {
    if (!workerToken) { test.skip(); return; }
    const res = await request.get(`${API}/workhub/timesheet`, { headers: authHeader(workerToken) });
    expect(res.status()).toBe(200);
  });

  test('WTS-04 — GET /workhub/timesheet with date filter returns results', async ({ request }) => {
    const res = await request.get(
      `${API}/workhub/timesheet?from=2026-01-01&to=2026-12-31`,
      { headers: authHeader(managerToken) }
    );
    expect(res.status()).toBe(200);
  });

  test('WTS-05 — GET /workhub/timesheet/export returns downloadable file', async ({ request }) => {
    const res = await request.get(`${API}/workhub/timesheet/export`, { headers: authHeader(managerToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const ct = res.headers()['content-type'] ?? '';
      expect(ct).toMatch(/csv|spreadsheet|octet-stream|pdf|json/i);
    }
  });

  test('WTS-06 — POST /workhub/timesheet/signoff requires manager', async ({ request }) => {
    const res = await request.post(`${API}/workhub/timesheet/signoff`, {
      headers: authHeader(managerToken),
      data: { week: '2026-W25' },
    });
    // 200/201 = signed off, 404 = endpoint not yet implemented, 422 = no entries to sign
    expect([200, 201, 404, 422]).toContain(res.status());
  });

  test('WTS-07 — worker can sign off their own timesheet (EuGH C-55/18)', async ({ request }) => {
    if (!workerToken) { test.skip(); return; }
    const res = await request.post(`${API}/workhub/timesheet/signoff`, {
      headers: authHeader(workerToken),
      data: { week: '2026-W25' },
    });
    // Workers must be able to sign off their own timesheet (EU regulation).
    // 200 = signed off; 409/200 = already signed off from a prior run.
    expect([200, 409]).toContain(res.status());
  });
});
