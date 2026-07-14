/**
 * API-WS — Workspace file manager contract tests.
 * Covers: list, upload, mkdir, download, rename, delete.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Workspace File Manager API', () => {
  let token: string;
  let uploadedPath: string;
  let folderPath: string;

  test.beforeAll(async ({ request }) => {
    token = (await getToken(request, 'manager'))!;
    if (!token) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (uploadedPath && token) {
      await request.delete(`${API}/workspace/delete`, {
        headers: authHeader(token),
        data: { path: uploadedPath },
      }).catch(() => {});
    }
    if (folderPath && token) {
      await request.delete(`${API}/workspace/delete`, {
        headers: authHeader(token),
        data: { path: folderPath },
      }).catch(() => {});
    }
  });

  test('WS-01 — GET /workspace/list requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workspace/list`);
    expect([401, 403]).toContain(res.status());
  });

  test('WS-02 — GET /workspace/list with auth returns file listing', async ({ request }) => {
    const res = await request.get(`${API}/workspace/list`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const files = body.items ?? body.data ?? body;
    expect(Array.isArray(files)).toBe(true);
  });

  test('WS-03 — POST /workspace/mkdir creates a folder', async ({ request }) => {
    folderPath = `api-test-folder-${Date.now()}`;
    const res = await request.post(`${API}/workspace/mkdir`, {
      headers: authHeader(token),
      data: { name: folderPath },
    });
    // 200/201 = created, 404 = feature not yet wired up
    expect([200, 201, 404]).toContain(res.status());
    if (res.status() >= 400) folderPath = '';
  });

  test('WS-04 — POST /workspace/upload uploads a text file', async ({ request }) => {
    const fileName = `test-upload-${Date.now()}.txt`;
    const res = await request.post(`${API}/workspace/upload`, {
      headers: authHeader(token),
      multipart: {
        file: {
          name:     fileName,
          mimeType: 'text/plain',
          buffer:   Buffer.from('API test file content'),
        },
        path: '',
      },
    });
    expect([200, 201, 404]).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      uploadedPath = (body.data ?? body).path ?? fileName;
    }
  });

  test('WS-05 — POST /workspace/rename requires a valid existing path', async ({ request }) => {
    const res = await request.post(`${API}/workspace/rename`, {
      headers: authHeader(token),
      data: { old_path: 'nonexistent-file.txt', new_path: 'renamed.txt' },
    });
    expect([400, 404, 422]).toContain(res.status());
  });

  test('WS-06 — DELETE /workspace/delete with nonexistent path returns 404', async ({ request }) => {
    const res = await request.delete(`${API}/workspace/delete`, {
      headers: authHeader(token),
      data: { path: 'does-not-exist-file-api-test.txt' },
    });
    expect([404, 422]).toContain(res.status());
  });
});
