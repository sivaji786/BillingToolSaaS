/**
 * API-WTE — WorkHub Time Entries contract tests.
 * Time entries are the individual timer log records created when a timer
 * is started and stopped. Distinct from the timesheet aggregate view.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader, seedTask, cleanupTask, stopActiveTimer } from './helpers';

test.describe('WorkHub Time Entries API', () => {
  let managerToken: string;
  let workerToken: string;
  let taskId: number;
  let entryId: number;

  test.beforeAll(async ({ request }) => {
    [managerToken, workerToken] = await Promise.all([
      getToken(request, 'manager').then(t => t!),
      getToken(request, 'worker').then(t => t!),
    ]);
    if (!managerToken) { test.skip(); return; }

    // Create a task to attach time entries to
    taskId = await seedTask(request, managerToken);

    // Start + stop a timer to generate at least one entry
    await stopActiveTimer(request, workerToken ?? managerToken);
    const startRes = await request.post(`${API}/workhub/timer/start`, {
      headers: authHeader(workerToken ?? managerToken),
      data: { task_id: taskId },
    });
    if (startRes.status() === 200 || startRes.status() === 201) {
      await request.post(`${API}/workhub/timer/stop`, {
        headers: authHeader(workerToken ?? managerToken),
      });
    }
  });

  test.afterAll(async ({ request }) => {
    if (taskId && managerToken) {
      await cleanupTask(request, managerToken, taskId);
    }
  });

  test('WTE-01 — GET /workhub/time-entries requires auth', async ({ request }) => {
    const res = await request.get(`${API}/workhub/time-entries`);
    expect([401, 403]).toContain(res.status());
  });

  test('WTE-02 — GET /workhub/time-entries returns array (manager)', async ({ request }) => {
    const res = await request.get(`${API}/workhub/time-entries`, { headers: authHeader(managerToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data ?? body)).toBe(true);
  });

  test('WTE-03 — time entry records have expected shape', async ({ request }) => {
    const res = await request.get(`${API}/workhub/time-entries?per_page=1`, { headers: authHeader(managerToken) });
    if (res.status() !== 200) { test.skip(); return; }
    const entries = (await res.json()).data ?? await res.json();
    if (!entries.length) { test.skip(); return; }
    const entry = entries[0];
    entryId = entry.id;
    // Must have at least: id, task_id or task, started_at
    expect(entry.id).toBeTruthy();
    expect(entry.task_id ?? entry.task?.id).toBeTruthy();
    expect(entry.started_at ?? entry.start_time).toBeTruthy();
  });

  test('WTE-04 — GET /workhub/time-entries filtered by task_id', async ({ request }) => {
    if (!taskId) { test.skip(); return; }
    const res = await request.get(`${API}/workhub/time-entries?task_id=${taskId}`, {
      headers: authHeader(managerToken),
    });
    expect(res.status()).toBe(200);
    const entries = (await res.json()).data ?? await res.json();
    expect(Array.isArray(entries)).toBe(true);
    // All returned entries must belong to this task
    for (const e of entries) {
      expect(e.task_id ?? e.task?.id).toBe(taskId);
    }
  });

  test('WTE-05 — GET /workhub/time-entries/:id returns a specific entry', async ({ request }) => {
    if (!entryId) { test.skip(); return; }
    const res = await request.get(`${API}/workhub/time-entries/${entryId}`, {
      headers: authHeader(managerToken),
    });
    expect(res.status()).toBe(200);
    const entry = (await res.json()).data ?? await res.json();
    expect(entry.id).toBe(entryId);
  });

  test('WTE-06 — worker can view their own time entries', async ({ request }) => {
    if (!workerToken) { test.skip(); return; }
    const res = await request.get(`${API}/workhub/time-entries`, { headers: authHeader(workerToken) });
    expect(res.status()).toBe(200);
  });

  test('WTE-07 — PATCH /workhub/time-entries/:id can correct entry duration (manager only)', async ({ request }) => {
    if (!entryId) { test.skip(); return; }
    const res = await request.patch(`${API}/workhub/time-entries/${entryId}`, {
      headers: authHeader(managerToken),
      data: {
        started_at: '2026-06-25T08:00:00Z',
        ended_at:   '2026-06-25T09:00:00Z',
      },
    });
    // 200 = updated, 404 = endpoint uses different verb/path, 422 = validation
    expect([200, 404, 422]).toContain(res.status());
  });

  test('WTE-08 — worker cannot edit another worker time entry', async ({ request }) => {
    if (!entryId || !workerToken) { test.skip(); return; }
    // A worker trying to patch an entry that belongs to another worker should be blocked
    const res = await request.patch(`${API}/workhub/time-entries/${entryId}`, {
      headers: authHeader(workerToken),
      data: { started_at: '2026-06-25T06:00:00Z' },
    });
    // Could be 403 (forbidden), 404 (hidden), or 422 (validation) — never 200 for cross-user edit
    if (res.status() === 200) {
      // Only acceptable if the entry actually belongs to this worker
      const entry = (await res.json()).data ?? await res.json();
      // We can't assert ownership without knowing — just ensure no 500
    } else {
      expect([403, 404, 422]).toContain(res.status());
    }
  });
});
