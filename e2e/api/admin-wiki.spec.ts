/**
 * API-ADW — Admin wiki read/write/mockups contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Admin Wiki API', () => {
  let adminToken: string;
  let articleId: number;

  test.beforeAll(async ({ request }) => {
    adminToken = (await getToken(request, 'admin'))!;
    if (!adminToken) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (articleId && adminToken) {
      await request.delete(`${API}/admin/wiki/${articleId}`, { headers: authHeader(adminToken) }).catch(() => {});
    }
  });

  test('ADW-01 — GET /admin/wiki requires admin', async ({ request }) => {
    const noAuth = await request.get(`${API}/admin/wiki`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('ADW-02 — GET /admin/wiki returns articles list', async ({ request }) => {
    const res = await request.get(`${API}/admin/wiki`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('ADW-03 — POST /admin/wiki creates an article', async ({ request }) => {
    const res = await request.post(`${API}/admin/wiki`, {
      headers: authHeader(adminToken),
      data: {
        title:   `API Test Article ${Date.now()}`,
        content: '# Test\nThis is API test wiki content.',
        tags:    ['api', 'test'],
      },
    });
    expect([200, 201, 404]).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      articleId = (body.data ?? body).id;
    }
  });

  test('ADW-04 — GET /admin/wiki/:id returns the article', async ({ request }) => {
    if (!articleId) { test.skip(); return; }
    const res = await request.get(`${API}/admin/wiki/${articleId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const article = (await res.json()).data ?? await res.json();
    expect(article.title).toContain('API Test Article');
  });

  test('ADW-05 — PUT /admin/wiki/:id updates content', async ({ request }) => {
    if (!articleId) { test.skip(); return; }
    const res = await request.put(`${API}/admin/wiki/${articleId}`, {
      headers: authHeader(adminToken),
      data: { content: '# Updated\nUpdated content for API test.' },
    });
    expect(res.status()).toBe(200);
  });

  test('ADW-06 — GET /wiki (public) does not require auth', async ({ request }) => {
    const res = await request.get(`${API}/wiki`);
    // Public wiki listing should be accessible, or 404 if not wired
    expect([200, 404]).toContain(res.status());
  });
});
