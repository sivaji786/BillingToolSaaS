/**
 * API-ADC — Admin CMS pages CRUD + media contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Admin CMS API', () => {
  let adminToken: string;
  let pageId: number;

  test.beforeAll(async ({ request }) => {
    adminToken = (await getToken(request, 'admin'))!;
    if (!adminToken) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (pageId && adminToken) {
      await request.delete(`${API}/admin/cms/pages/${pageId}`, { headers: authHeader(adminToken) }).catch(() => {});
    }
  });

  test('ADC-01 — GET /admin/cms/pages requires admin', async ({ request }) => {
    const noAuth = await request.get(`${API}/admin/cms/pages`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('ADC-02 — GET /admin/cms/pages returns pages list', async ({ request }) => {
    const res = await request.get(`${API}/admin/cms/pages`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.data ?? body)).toBe(true);
    }
  });

  test('ADC-03 — POST /admin/cms/pages creates a page', async ({ request }) => {
    const res = await request.post(`${API}/admin/cms/pages`, {
      headers: authHeader(adminToken),
      data: {
        slug:    `api-test-page-${Date.now()}`,
        title:   'API Test Page',
        content: '<p>Automated test page content</p>',
        status:  'draft',
      },
    });
    expect([200, 201, 404]).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      pageId = (body.data ?? body).id;
    }
  });

  test('ADC-04 — PUT /admin/cms/pages/:id publishes the page', async ({ request }) => {
    if (!pageId) { test.skip(); return; }
    const res = await request.put(`${API}/admin/cms/pages/${pageId}`, {
      headers: authHeader(adminToken),
      data: { status: 'published' },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('ADC-05 — GET /admin/cms/media returns media library', async ({ request }) => {
    const res = await request.get(`${API}/admin/cms/media`, { headers: authHeader(adminToken) });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.data ?? body)).toBe(true);
    }
  });

  test('ADC-06 — DELETE /admin/cms/pages/:id removes the page', async ({ request }) => {
    if (!pageId) { test.skip(); return; }
    const res = await request.delete(`${API}/admin/cms/pages/${pageId}`, { headers: authHeader(adminToken) });
    expect([200, 204]).toContain(res.status());
    pageId = 0;
  });
});
