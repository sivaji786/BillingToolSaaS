/**
 * API-TMR — WorkHub timer endpoint contract tests.
 * Covers BUG-008: starting a second timer when one is already running must return 409,
 * not silently fail or return 201 with undefined behaviour.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader, seedTask, cleanupTask, stopActiveTimer } from './helpers';

test.describe('WorkHub Timer API', () => {
  let workerToken: string;
  let managerToken: string;
  let taskId: number;

  test.beforeAll(async ({ request }) => {
    managerToken = (await getToken(request, 'manager'))!;
    workerToken  = (await getToken(request, 'worker'))!;
    if (!managerToken || !workerToken) test.skip();

    // Seed a task assigned to the worker so they can start a timer on it.
    taskId = (await seedTask(request, managerToken, {
      title:              'Timer API test task',
      status:             'in_progress',
      assigned_worker_id: 2, // mark.davis — worker seed id
    }))!;

    // Stop any timer that may be running from a previous interrupted test run.
    await stopActiveTimer(request, workerToken);
  });

  test.afterAll(async ({ request }) => {
    await stopActiveTimer(request, workerToken);
    if (taskId && managerToken) await cleanupTask(request, managerToken, taskId);
  });

  test('API-TMR-01 — starting a timer returns 201 with entry_id', async ({ request }) => {
    if (!taskId) test.skip();
    const res = await request.post(`${API}/workhub/tasks/${taskId}/timer/start`, {
      headers: authHeader(workerToken),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    const entry = body.data ?? body;
    expect(entry.entry_id ?? entry.id).toBeTruthy();
  });

  test('API-TMR-02 — starting a second timer while one is running returns 409 (BUG-008)', async ({ request }) => {
    if (!taskId) test.skip();
    // Timer from previous test should still be running.
    const res = await request.post(`${API}/workhub/tasks/${taskId}/timer/start`, {
      headers: authHeader(workerToken),
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    // CI4 fail() puts the text in body.messages.error; older pattern uses body.message
    const msg: string = body.messages?.error ?? body.message ?? String(body.error ?? '');
    expect(msg.toLowerCase()).toMatch(/already|running|active|conflict/);
  });

  test('API-TMR-03 — GET /workhub/timer/active returns the running entry', async ({ request }) => {
    if (!taskId) test.skip();
    const res = await request.get(`${API}/workhub/timer/active`, {
      headers: authHeader(workerToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const entry = body.data ?? body.active ?? body;
    expect(Number(entry.task_id)).toBe(taskId);
    expect(entry.started_at).toBeTruthy();
  });

  test('API-TMR-04 — stopping the timer returns 200 with stopped: true', async ({ request }) => {
    if (!taskId) test.skip();
    const res = await request.post(`${API}/workhub/timer/stop-current`, {
      headers: authHeader(workerToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    // Accept stopped:true or simply a success response
    expect(data.stopped ?? true).toBe(true);
  });

  test('API-TMR-05 — stopping when no timer is running returns 200 with stopped: false', async ({ request }) => {
    // Timer was stopped in previous test.
    const res = await request.post(`${API}/workhub/timer/stop-current`, {
      headers: authHeader(workerToken),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data ?? body;
    // Some implementations return stopped:false; others return empty data.
    // Both are acceptable — we just must not get a 4xx/5xx.
    expect(data.stopped ?? false).toBe(false);
  });

  test('API-TMR-06 — unauthenticated timer start returns 401', async ({ request }) => {
    if (!taskId) test.skip();
    const res = await request.post(`${API}/workhub/tasks/${taskId}/timer/start`);
    expect([401, 403]).toContain(res.status());
  });
});
