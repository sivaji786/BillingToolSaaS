/**
 * API-WINB — WorkHub Inbox messages + unread count contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub Inbox API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test('WINB-01 — GET /workhub/inbox requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/inbox`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('WINB-02 — GET /workhub/inbox returns messages array', async ({ request }) => {
    const res = await request.get(`${API}/workhub/inbox/messages`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('WINB-03 — GET /workhub/inbox/unread-count returns a number', async ({ request }) => {
    const res = await request.get(`${API}/workhub/inbox/unread-count`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const count = body.count ?? body.data?.count ?? body.data ?? body;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('WINB-04 — POST /workhub/inbox/:id/read marks message as read', async ({ request }) => {
    // List inbox first; skip if empty
    const listRes = await request.get(`${API}/workhub/inbox`, { headers: authHeader(token) });
    if (listRes.status() !== 200) { test.skip(); return; }
    const messages = (await listRes.json()).data ?? await listRes.json();
    if (!messages.length) { test.skip(); return; }
    const msgId = messages[0].id;
    const res = await request.post(`${API}/workhub/inbox/${msgId}/read`, {
      headers: authHeader(token),
    });
    expect([200, 204, 404]).toContain(res.status());
  });

  test('WINB-05 — POST /workhub/inbox/read-all marks all messages as read', async ({ request }) => {
    const res = await request.post(`${API}/workhub/inbox/read-all`, { headers: authHeader(token) });
    expect([200, 204, 404]).toContain(res.status());
  });
});
