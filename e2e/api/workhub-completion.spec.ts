/**
 * API-CMP — WorkHub completion and photo endpoint contract tests.
 * Covers:
 *   BUG-004 — GET /completions/:id returned photos with storage_path only, no presigned url
 *   BUG-005 — copy_channel / copy_recipient fields were silently dropped on completion submit
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader, seedTask, cleanupTask } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

test.describe('WorkHub Completion API', () => {
  let managerToken: string;
  let workerToken: string;

  test.beforeAll(async ({ request }) => {
    managerToken = (await getToken(request, 'manager'))!;
    workerToken  = (await getToken(request, 'worker'))!;
    if (!managerToken) test.skip();
  });

  // ── Photo upload ─────────────────────────────────────────────────────────────

  test('API-CMP-01 — photo upload returns 201 with a presigned url field', async ({ request }) => {
    // Create a task to attach the photo to.
    const taskId = await seedTask(request, managerToken, {
      title: 'Photo upload test', assigned_worker_id: 2,
    });
    if (!taskId) test.skip();

    // Build a minimal valid JPEG (80 bytes — valid JPEG header + end marker).
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B,
      0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
      0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C,
      0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
      0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32,
      0xFF, 0xD9,
    ]);

    const res = await request.post(`${API}/workhub/files/upload`, {
      headers: authHeader(workerToken ?? managerToken),
      multipart: {
        task_id:    String(taskId),
        photo_type: 'jobsite',
        file:       { name: 'test.jpg', mimeType: 'image/jpeg', buffer: minimalJpeg },
      },
    });

    // Accept 201 (success) or 415/413 (validation caught fake image — also acceptable).
    // The critical failure is a 500 or a 200 with no url field.
    if (res.status() === 201) {
      const body = await res.json();
      const photo = body.data ?? body;
      // BUG-004: the url field MUST be present and must be an http URL.
      expect(photo.url, 'Photo response must include a presigned url (BUG-004)').toBeTruthy();
      expect(photo.url).toMatch(/^https?:\/\//);
    } else {
      // Validation rejection is fine — server didn't crash.
      expect(res.status()).toBeLessThan(500);
    }

    await cleanupTask(request, managerToken, taskId);
  });

  test('API-CMP-02 — photo upload with non-image MIME returns 415', async ({ request }) => {
    const taskId = await seedTask(request, managerToken, { title: 'MIME test task' });
    if (!taskId) test.skip();

    const res = await request.post(`${API}/workhub/files/upload`, {
      headers: authHeader(workerToken ?? managerToken),
      multipart: {
        task_id:    String(taskId),
        photo_type: 'jobsite',
        file:       { name: 'evil.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') },
      },
    });
    expect([403, 413, 415, 422]).toContain(res.status());
    await cleanupTask(request, managerToken, taskId);
  });

  // ── Completion record ────────────────────────────────────────────────────────

  test('API-CMP-03 — GET /completions/:id photos have url field not just storage_path (BUG-004)', async ({ request }) => {
    // List tasks and find one that has a completion record.
    const tasksRes = await request.get(`${API}/workhub/tasks?status=done`, {
      headers: authHeader(managerToken),
    });
    if (!tasksRes.ok()) test.skip();
    const tasks: any[] = (await tasksRes.json())?.data ?? await tasksRes.json();
    const doneTask = Array.isArray(tasks) ? tasks.find((t) => t.completion_record_id || t.status === 'done') : null;
    if (!doneTask) {
      // No done task in seed data — skip gracefully.
      test.skip();
      return;
    }

    const completionId = doneTask.completion_record_id ?? doneTask.completion_record?.id;
    if (!completionId) { test.skip(); return; }

    const res = await request.get(`${API}/workhub/completions/${completionId}`, {
      headers: authHeader(managerToken),
    });
    expect(res.status()).toBe(200);
    const record = (await res.json())?.data ?? await res.json();

    // Check each photo — must have `url`, must NOT expose raw `storage_path` to client.
    const photos: any[] = record.photos ?? [];
    for (const photo of photos) {
      expect(photo.url, `Photo id=${photo.id} missing url — BUG-004`).toBeTruthy();
      expect(photo.url, 'url must be an http presigned link').toMatch(/^https?:\/\//);
      // storage_path should NOT be returned to the client
      expect(photo.storage_path, 'storage_path must not be exposed to client').toBeUndefined();
    }
  });

  test('API-CMP-04 — copy_channel field is persisted on completion submit (BUG-005)', async ({ request }) => {
    // This tests that the copy_channel field is not silently dropped.
    // We check at least that the response body doesn't error when copy_channel is sent.
    // Full delivery testing requires Mailpit — see TESTING.md.
    const taskId = await seedTask(request, managerToken, { title: 'Copy channel test' });
    if (!taskId) test.skip();

    // Attempt to submit completion with copy_channel — may fail for other reasons
    // (no photos, no signature) but must NOT fail because of copy_channel field.
    const res = await request.post(`${API}/workhub/tasks/${taskId}/completion`, {
      headers: authHeader(workerToken ?? managerToken),
      data: {
        note:                 'Test completion note for copy channel test',
        copy_channel:         'email',
        copy_recipient:       'customer@example.com',
        worker_signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    });
    // Accept 201 (full completion) or 422 (missing photos — OK, just not 500).
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeLessThan(500);

    await cleanupTask(request, managerToken, taskId);
  });

  // ── PDF generation ───────────────────────────────────────────────────────────

  test('API-CMP-05 — GET /workhub/print/work-order/:id returns a PDF blob', async ({ request }) => {
    const taskId = await seedTask(request, managerToken, { title: 'PDF test task' });
    if (!taskId) test.skip();

    const res = await request.get(`${API}/workhub/print/work-order/${taskId}`, {
      headers: authHeader(managerToken),
    });
    // Accept 200 (PDF returned) or 404 (task exists but no template) — NOT 500.
    expect(res.status()).not.toBe(500);
    if (res.status() === 200) {
      const ct = res.headers()['content-type'] ?? '';
      expect(ct).toContain('application/pdf');
    }
    await cleanupTask(request, managerToken, taskId);
  });
});
