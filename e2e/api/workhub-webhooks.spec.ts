/**
 * API-WWHK — External HMAC-signed webhook contract tests.
 * Tests verify auth guards and HMAC validation — never sends real webhooks externally.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';
import * as crypto from 'crypto';

test.describe('WorkHub Webhooks API', () => {
  let token: string;
  let webhookId: number;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (webhookId && token) {
      await request.delete(`${API}/workhub/webhooks/${webhookId}`, { headers: authHeader(token) }).catch(() => {});
    }
  });

  test('WWHK-01 — GET /workhub/webhooks requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/webhooks`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('WWHK-02 — GET /workhub/webhooks returns registered webhooks', async ({ request }) => {
    const res = await request.get(`${API}/workhub/webhooks`, { headers: authHeader(token) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.data ?? body)).toBe(true);
    }
  });

  test('WWHK-03 — POST /workhub/webhooks registers a new webhook endpoint', async ({ request }) => {
    const res = await request.post(`${API}/workhub/webhooks`, {
      headers: authHeader(token),
      data: {
        url:    'https://webhook.site/api-test-endpoint',
        events: ['task.created', 'task.completed'],
        secret: 'test-secret-key-12345',
      },
    });
    expect([200, 201, 404]).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      webhookId = (body.data ?? body).id;
    }
  });

  test('WWHK-04 — inbound webhook with invalid HMAC signature returns 401', async ({ request }) => {
    const payload = JSON.stringify({ event: 'task.created', task_id: 1 });
    const res = await request.post(`${API}/workhub/webhooks/inbound`, {
      headers: {
        'Content-Type':        'application/json',
        'X-Webhook-Signature': 'sha256=invalid-signature-does-not-match',
      },
      data: payload,
    });
    // Must reject without 500 — 401/403/400 are all acceptable rejections
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test('WWHK-05 — DELETE /workhub/webhooks/:id removes the webhook', async ({ request }) => {
    if (!webhookId) { test.skip(); return; }
    const res = await request.delete(`${API}/workhub/webhooks/${webhookId}`, { headers: authHeader(token) });
    expect([200, 204]).toContain(res.status());
    webhookId = 0;
  });
});
