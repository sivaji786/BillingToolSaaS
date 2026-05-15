# Authentication

**Status:** 🔶 PARTIAL  
**Score:** 8/10  
**Last updated:** 2026-05-15  
**Stack:** `api/app/Controllers/Auth.php` · `src/stores/authStore.ts` · `src/utils/config.ts`

---

## Overview

JWT-based authentication for tenant users. On login, `Auth.php` validates credentials, writes a real `last_login` timestamp, and issues a signed HS256 JWT. The frontend stores the token in Zustand (`authStore`), which persists to localStorage. On app load, `isJwtValid()` skips the `/auth/me` round-trip when the token is still valid and the store is already hydrated. Two-factor authentication (TOTP) is not yet implemented — a single correct password gives full access.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 8/10 |
| Open high | 1 (2FA) |
| Open low/partial | 1 (localStorage scope) |
| Completed items | 5 |

---

## Open Backlog

### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S4-01 | **Two-factor authentication (TOTP) missing.** `Auth.php` issues a JWT immediately after password validation with no second factor. No `totp_secret` column exists on the `users` table. Users are fully authenticated with a single credential, making stolen passwords sufficient for account takeover. Requires: `totp_secret` migration, TOTP verification step in `Auth::login()`, QR-code setup flow in frontend. | `api/app/Controllers/Auth.php`, `users` table migration, frontend login screen | 5–6 h |

### LOW / PARTIAL

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| P5D-04 | **`authStore` persists full `user` and `tenant` objects to localStorage.** Every profile update re-serialises the entire object to localStorage, expanding the surface area for token theft to include all profile data. Fix: persist only `{ token, isAuthenticated }` and re-hydrate from `/auth/me` on startup (the round-trip is already JWT-skipped when valid). | `src/stores/authStore.ts` | 1 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| `last_login` always returned `now()` — `Auth::login()` now writes a real timestamp | 2026-05-05 | `Auth.php`, `AdminUsers.php`, `UserModel.php` |
| `customerApi.ts` had no 401-retry Axios interceptor — added | 2026-05-05 | `src/services/customerApi.ts` |
| `gemini_api_key` and `openai_api_key` excluded from `authStore` localStorage persist | 2026-05-13 | `src/stores/authStore.ts` |
| React Query cache cleared on logout and `clearAuth()` — prevents user A data leaking to user B | 2026-05-13 | `src/stores/authStore.ts`, `QueryProvider.tsx` |
| JWT startup skip: `isJwtValid()` helper avoids `/auth/me` round-trip when token is valid and store is hydrated | 2026-05-13 | `src/utils/config.ts`, `App.tsx` |

---

## Security Notes

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| SEC-11 | Two-factor auth missing — single credential gives full access | HIGH | ❌ OPEN (S4-01) |
| SEC-09 | `gemini_api_key` / `openai_api_key` persisted to localStorage | MEDIUM | ✅ FIXED 2026-05-13 |
| SEC-10 | React Query cache not cleared on logout | MEDIUM | ✅ FIXED 2026-05-13 |
| SEC-12 | `authStore` persists full user/tenant objects to localStorage | LOW | 🔶 PARTIAL (API keys excluded; full objects still persist) — see P5D-04 |

---

## JWT Configuration

| Field | Value |
|-------|-------|
| Algorithm | HS256 |
| Secret | `JWT_SECRET` env var |
| Issued by | `Auth::login()` |
| Validated by | `RbacFilter`, `InvoiceController` (JWT fallback) |
| Frontend skip | `isJwtValid()` in `utils/config.ts` |
