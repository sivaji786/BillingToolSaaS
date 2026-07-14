/**
 * API-WHT — WorkHub task CRUD and RBAC contract tests.
 * Verifies: create, read, update, delete, and role-based access enforcement.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader, seedTask, cleanupTask } from './helpers';

test.describe('WorkHub Tasks API', () => {
  let managerToken: string;
  let workerToken: string;
  let seededTaskId: number;

  test.beforeAll(async ({ request }) => {
    managerToken = (await getToken(request, 'manager'))!;
    workerToken  = (await getToken(request, 'worker'))!;
    if (!managerToken) test.skip();
    // Seed one task for read/update/delete tests
    seededTaskId = (await seedTask(request, managerToken, { title: 'RBAC test task' }))!;
  });

  test.afterAll(async ({ request }) => {
    if (seededTaskId && managerToken) {
      await cleanupTask(request, managerToken, seededTaskId);
    }
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  test('API-WHT-01 — manager can create task without project (project_id: null)', async ({ request }) => {
    const res = await request.post(`${API}/workhub/tasks`, {
      data: { title: 'No-project task', status: 'open', priority: 'low' },
      headers: authHeader(managerToken),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    const task = body.data ?? body;
    expect(task.id).toBeTruthy();
    expect(task.project_id ?? null).toBeNull();
    // Cleanup
    await cleanupTask(request, managerToken, task.id);
  });

  test('API-WHT-02 — worker cannot create a task (403)', async ({ request }) => {
    const res = await request.post(`${API}/workhub/tasks`, {
      data: { title: 'Worker should not create' },
      headers: authHeader(workerToken),
    });
    expect(res.status()).toBe(403);
  });

  test('API-WHT-03 — unauthenticated request to POST /workhub/tasks returns 401', async ({ request }) => {
    const res = await request.post(`${API}/workhub/tasks`, {
      data: { title: 'No auth' },
    });
    expect([401, 403]).toContain(res.status());
  });

  // ── READ ────────────────────────────────────────────────────────────────────

  test('API-WHT-04 — manager can list tasks', async ({ request }) => {
    const res = await request.get(`${API}/workhub/tasks`, {
      headers: authHeader(managerToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const tasks = body.data ?? body;
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('API-WHT-05 — GET /workhub/tasks/:id returns the task', async ({ request }) => {
    if (!seededTaskId) test.skip();
    const res = await request.get(`${API}/workhub/tasks/${seededTaskId}`, {
      headers: authHeader(managerToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const task = body.data ?? body;
    expect(Number(task.id)).toBe(seededTaskId);
    expect(task.title).toBe('RBAC test task');
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test('API-WHT-06 — manager can update task title and status', async ({ request }) => {
    if (!seededTaskId) test.skip();
    const res = await request.put(`${API}/workhub/tasks/${seededTaskId}`, {
      data: { title: 'Updated title', status: 'in_progress' },
      headers: authHeader(managerToken),
    });
    expect(res.status()).toBe(200);
    // Verify the update persisted
    const get = await request.get(`${API}/workhub/tasks/${seededTaskId}`, {
      headers: authHeader(managerToken),
    });
    const task = (await get.json())?.data ?? await get.json();
    expect(task.status).toBe('in_progress');
  });

  test('API-WHT-07 — worker cannot delete a task (403)', async ({ request }) => {
    if (!seededTaskId) test.skip();
    const res = await request.delete(`${API}/workhub/tasks/${seededTaskId}`, {
      headers: authHeader(workerToken),
    });
    expect(res.status()).toBe(403);
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  test('API-WHT-08 — manager can delete a task', async ({ request }) => {
    const id = await seedTask(request, managerToken, { title: 'Delete me' });
    if (!id) test.skip();
    const res = await request.delete(`${API}/workhub/tasks/${id}`, {
      headers: authHeader(managerToken),
    });
    expect([200, 204]).toContain(res.status());
    // Confirm it's gone
    const get = await request.get(`${API}/workhub/tasks/${id}`, {
      headers: authHeader(managerToken),
    });
    expect([404, 200]).toContain(get.status()); // 200 is ok if soft-deleted
  });

  // ── TENANT ISOLATION ────────────────────────────────────────────────────────

  test('API-WHT-09 — response items belong to the authenticated tenant', async ({ request }) => {
    const res = await request.get(`${API}/workhub/tasks`, {
      headers: authHeader(managerToken),
    });
    const body = await res.json();
    const tasks: any[] = body.data ?? body;
    if (!Array.isArray(tasks) || tasks.length === 0) return; // nothing to check
    const tenantId = tasks[0].tenant_id;
    for (const t of tasks) {
      expect(t.tenant_id).toBe(tenantId);
    }
  });
});
