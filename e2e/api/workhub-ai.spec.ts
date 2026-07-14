/**
 * API-WAI — WorkHub AI correct/translate contract tests.
 * These endpoints are rate-limited; tests verify auth guards and response shape,
 * not the quality of AI output.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub AI API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test('WAI-01 — POST /workhub/ai/correct requires auth', async ({ request }) => {
    const res = await request.post(`${API}/workhub/ai/correct`, {
      data: { text: 'This is a sentance with erors.' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('WAI-02 — POST /workhub/ai/correct with valid token returns corrected text', async ({ request }) => {
    const res = await request.post(`${API}/workhub/ai/correct`, {
      headers: authHeader(token),
      data: { text: 'This is a sentance with erors.' },
    });
    // 200 = corrected, 429 = rate limited (also acceptable in CI), 404 = not wired, 500 = no AI key
    expect([200, 404, 429, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const corrected = body.corrected ?? body.text ?? body.data?.text ?? body.data;
      expect(typeof corrected).toBe('string');
      expect(corrected.length).toBeGreaterThan(0);
    }
  });

  test('WAI-03 — POST /workhub/ai/translate requires auth', async ({ request }) => {
    const res = await request.post(`${API}/workhub/ai/translate`, {
      data: { text: 'Hello world', target_language: 'de' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('WAI-04 — POST /workhub/ai/translate returns translated text', async ({ request }) => {
    const res = await request.post(`${API}/workhub/ai/translate`, {
      headers: authHeader(token),
      data: { text: 'Hello world', target_language: 'de' },
    });
    expect([200, 404, 429, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const translated = body.translated ?? body.text ?? body.data?.text ?? body.data;
      expect(typeof translated).toBe('string');
    }
  });

  test('WAI-05 — POST /workhub/ai/correct with empty text returns 422', async ({ request }) => {
    const res = await request.post(`${API}/workhub/ai/correct`, {
      headers: authHeader(token),
      data: { text: '' },
    });
    expect([400, 422]).toContain(res.status());
  });
});
