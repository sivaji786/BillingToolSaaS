/**
 * Shared helpers for API contract tests.
 * These run without a browser — only the `request` Playwright fixture is used.
 */
import { APIRequestContext } from '@playwright/test';

export const API  = process.env.API_URL  ?? 'http://localhost:8080';
export const CREDS = {
  manager: { email: 'alex.rivera@nexus.ai',  password: 'password123' },
  worker:  { email: 'mark.davis@nexus.ai',   password: 'password123' },
  admin:   { email: 'admin@humpl.org',        password: 'admin123'    },
};

// Module-level token cache — one login per role per test run.
const _cache: Record<string, string | null> = {};

export async function getToken(
  request: APIRequestContext,
  role: keyof typeof CREDS
): Promise<string | null> {
  if (_cache[role] !== undefined) return _cache[role];
  const res  = await request.post(`${API}/auth/login`, { data: CREDS[role] });
  if (!res.ok()) { _cache[role] = null; return null; }
  const body = await res.json();
  const tok  = body?.data?.token ?? body?.token ?? null;
  _cache[role] = tok;
  return tok;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Create a task via API and return its id. Returns null on failure. */
export async function seedTask(
  request: APIRequestContext,
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<number | null> {
  const res = await request.post(`${API}/workhub/tasks`, {
    data: { title: 'API-test task', status: 'open', priority: 'low', ...overrides },
    headers: authHeader(token),
  });
  if (!res.ok()) return null;
  const body = await res.json();
  return body?.data?.id ?? body?.id ?? null;
}

/** Delete a task by id. Best-effort — ignores errors. */
export async function cleanupTask(
  request: APIRequestContext,
  token: string,
  id: number
): Promise<void> {
  await request.delete(`${API}/workhub/tasks/${id}`, { headers: authHeader(token) }).catch(() => {});
}

/** Stop whichever timer is currently running for the authenticated user. Best-effort. */
export async function stopActiveTimer(
  request: APIRequestContext,
  token: string
): Promise<void> {
  await request.post(`${API}/workhub/timer/stop-current`, {
    headers: authHeader(token),
  }).catch(() => {});
}
