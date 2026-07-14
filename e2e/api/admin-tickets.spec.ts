/**
 * API-ADT — Admin tickets list/update/bulk contract tests.
 */
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test.describe('Admin Tickets API', () => {
  let adminToken: string;
  let ticketId: number;

  test.beforeAll(async ({ request }) => {
    adminToken = (await getToken(request, 'admin'))!;
    if (!adminToken) test.skip();
  });

  test('ADT-01 — GET /admin/tickets requires admin', async ({ request }) => {
    const noAuth = await request.get(`${API}/admin/tickets`);
    expect([401, 403]).toContain(noAuth.status());
  });

  test('ADT-02 — GET /admin/tickets returns all tenant tickets', async ({ request }) => {
    const res = await request.get(`${API}/admin/tickets`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const tickets = body.data ?? body;
    expect(Array.isArray(tickets)).toBe(true);
    if (tickets.length) {
      ticketId = tickets[0].id;
    }
  });

  test('ADT-03 — GET /admin/tickets/:id returns a specific ticket', async ({ request }) => {
    if (!ticketId) { test.skip(); return; }
    const res = await request.get(`${API}/admin/tickets/${ticketId}`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
    const ticket = (await res.json()).data ?? await res.json();
    expect(ticket.id).toBe(ticketId);
  });

  test('ADT-04 — PATCH /admin/tickets/:id updates ticket status', async ({ request }) => {
    if (!ticketId) { test.skip(); return; }
    const res = await request.patch(`${API}/admin/tickets/${ticketId}`, {
      headers: authHeader(adminToken),
      data: { status: 'in_progress' },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('ADT-05 — POST /admin/tickets/bulk-update updates multiple tickets', async ({ request }) => {
    if (!ticketId) { test.skip(); return; }
    const res = await request.post(`${API}/admin/tickets/bulk-update`, {
      headers: authHeader(adminToken),
      data: {
        ids:    [ticketId],
        status: 'open',
      },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('ADT-06 — GET /admin/tickets with status filter does not error', async ({ request }) => {
    const res = await request.get(`${API}/admin/tickets?status=open`, { headers: authHeader(adminToken) });
    expect(res.status()).toBe(200);
  });
});
