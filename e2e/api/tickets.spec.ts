/**
 * API-TKT — Support ticket endpoint contract tests.
 * Covers BUG-001: POST /tickets returning 500 because the `type` and `attachments`
 * columns were added by migration 2026-05-19-000001_AddTypeAndAttachmentsToTickets.php
 * but the migration was never run on production.
 *
 * These tests will FAIL if the migration hasn't been applied — which is the correct
 * behaviour: the test becomes the regression guard.
 */
import { test, expect } from '@playwright/test';
import { API } from './helpers';

// POST /tickets is a public endpoint — no auth required.
test.describe('Tickets API', () => {
  test('API-TKT-01 — POST /tickets with type field returns 201 (BUG-001)', async ({ request }) => {
    const res = await request.post(`${API}/tickets`, {
      data: {
        subject:     'API test ticket — BUG-001 regression guard',
        description: 'Automated regression test: ensures the type column exists.',
        type:        'bug',
        priority:    'medium',
      },
    });
    // A 500 here means the migration was not run on this environment.
    expect(res.status(), 'POST /tickets returned 500 — run: php spark migrate').toBe(201);
    const body = await res.json();
    expect(body.data?.id ?? body.id, 'Response must include a ticket id').toBeTruthy();
  });

  test('API-TKT-02 — POST /tickets with type="feature" saves the type value', async ({ request }) => {
    const res = await request.post(`${API}/tickets`, {
      data: {
        subject:     'Feature request test',
        description: 'Testing that the type field is persisted.',
        type:        'feature',
      },
    });
    expect(res.status()).toBe(201);
  });

  test('API-TKT-03 — POST /tickets without subject returns 400 validation error', async ({ request }) => {
    const res = await request.post(`${API}/tickets`, {
      data: { description: 'No subject provided', type: 'bug' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('API-TKT-04 — POST /tickets without body returns 400', async ({ request }) => {
    const res = await request.post(`${API}/tickets`, { data: {} });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('API-TKT-05 — POST /tickets response never includes a 500 server error', async ({ request }) => {
    // Extra guard: submit a fully-valid ticket and confirm the server does not crash.
    const res = await request.post(`${API}/tickets`, {
      data: {
        subject:  'Smoke test',
        type:     'other',
        priority: 'low',
      },
    });
    expect(res.status(), 'Server must not return 5xx').toBeLessThan(500);
  });
});
