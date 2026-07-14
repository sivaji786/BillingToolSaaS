/**
 * API-WPRJ — WorkHub Projects CRUD contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('WorkHub Projects API', () => {
  let token: string;
  let workerToken: string;
  let projectId: number;

  test.beforeAll(async ({ request }) => {
    [token, workerToken] = await Promise.all([
      getToken(request, 'manager').then(t => t!),
      getToken(request, 'worker').then(t => t!),
    ]);
    if (!token) test.skip();
  });

  test.afterAll(async ({ request }) => {
    if (projectId && token) {
      await request.delete(`${API}/workhub/projects/${projectId}`, { headers: authHeader(token) }).catch(() => {});
    }
  });

  test('WPRJ-01 — GET /workhub/projects requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/projects`);
    expect([401, 403]).toContain(res.status());
  });

  test('WPRJ-02 — GET /workhub/projects returns array with valid token', async ({ request }) => {
    const res = await request.get(`${API}/workhub/projects`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('WPRJ-03 — POST /workhub/projects creates a project (manager)', async ({ request }) => {
    const res = await request.post(`${API}/workhub/projects`, {
      headers: authHeader(token),
      data: {
        name:        `API Test Project ${Date.now()}`,
        description: 'Automated test project',
        color:       '#FF5733',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    const project = body.data ?? body;
    expect(project.id).toBeTruthy();
    projectId = project.id;
  });

  test('WPRJ-04 — GET /workhub/projects/:id returns the project', async ({ request }) => {
    if (!projectId) test.skip();
    const res = await request.get(`${API}/workhub/projects/${projectId}`, { headers: authHeader(token) });
    expect(res.status()).toBe(200);
    const project = (await res.json()).data ?? await res.json();
    expect(project.id).toBe(projectId);
  });

  test('WPRJ-05 — PUT /workhub/projects/:id updates the project', async ({ request }) => {
    if (!projectId) test.skip();
    const res = await request.put(`${API}/workhub/projects/${projectId}`, {
      headers: authHeader(token),
      data: { name: 'Updated Project Name' },
    });
    expect(res.status()).toBe(200);
  });

  test('WPRJ-06 — worker role cannot create projects', async ({ request }) => {
    if (!workerToken) { test.skip(); return; }
    const res = await request.post(`${API}/workhub/projects`, {
      headers: authHeader(workerToken),
      data: { name: 'Worker Project Attempt', description: 'Should fail' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('WPRJ-07 — DELETE /workhub/projects/:id removes the project', async ({ request }) => {
    if (!projectId) test.skip();
    const res = await request.delete(`${API}/workhub/projects/${projectId}`, { headers: authHeader(token) });
    expect([200, 204]).toContain(res.status());
    projectId = 0;
  });
});
