# RBAC — Backlog & Open Items

**Last updated:** 2026-07-02  
**Related doc:** [rbac.md](rbac.md)

---

## Status Overview

| # | Area | Status | Detail |
|---|---|---|---|
| 1 | Backend RBAC enforcement | ✅ Complete | All modules gated; super-admin bypass uses role flag |
| 2 | WorkHub RBAC | ✅ Complete | 13 rights, 5 roles seeded; all routes gated |
| 3 | Workspace RBAC | ✅ Complete | 5 rights; all endpoints gated |
| 4 | Company-types CRUD isolation | ✅ Fixed | Mutations moved to SA admin (`/admin/company-types`); tenant portal read-only |
| 5 | User listing cross-tenant leak | ✅ Fixed | `UserController::index()` now filters by `$request->tenantId` (2026-07-01) |
| 6 | WorkHub plan gating | ✅ Complete | `workhub_enabled` in `plans.limits`; embedded at login via `enrichTenant()` |
| 7 | Frontend `usePermission` hook | ✅ Fixed | `user.rights[]` now returned from backend; hook uses Zustand selector (2026-07-02) |
| 8 | Rights returned in `/auth/me` | ✅ Fixed | `GET /auth/me` and `POST /auth/login` both embed `rights[]` in user object (2026-07-02) |
| 9 | UI-level permission gating | ✅ Fixed | `usePermission` now fully reactive via Zustand; `hasPermissionSync` checks `rights[]` (2026-07-02) |
| 10 | Admin `/workhub/*` routes | ✅ Fixed | `AdminWorkHub` verifies SA JWT via `AdminAuth::getAuthenticatedUser()` on every method (2026-07-02) |
| 11 | WorkHub settings write gate | ✅ Fixed | `PUT /workhub/settings` now requires `workhub.admin.manage` (2026-07-02) |
| 12 | Company type deletion safety | ✅ Fixed | `CompanyTypeController::delete()` checks `roles` and `company_profiles` dependencies; returns 409 if found (2026-07-02) |

---

## Closed Items (implementation notes)

### Gap #7–9 — Frontend permission gating

**Problem:** `user.rights` was not populated from the backend, so `usePermission()` always returned `false` for non-admin users.

**Implemented (2026-07-02):**
- `Auth.php::login()` — added `$user['rights'] = $this->userModel->getRights($user['id'])` before returning
- `Auth.php::me()` — same addition; rights are embedded directly in the user object so `authService.me()` spreads them into the store automatically
- `authStore.ts` — added `rights?: string[]` to the `User` interface
- `usePermission.ts` — rewrote to use `useAuthStore(state => state.user)` selector; now fully reactive to in-tab store changes; removed `useState`/`useEffect`/storage-event boilerplate

---

### Gap #10 — SA Admin WorkHub route protection

**Problem:** `/admin/workhub/*` routes were protected only by `auth` (JWT presence), not by SA admin identity.

**Implemented (2026-07-02):**
- Added `requireSaAdmin()` private helper to `AdminWorkHub.php` that calls `AdminAuth::getAuthenticatedUser()` and returns a `403` response if the caller is not a verified SA admin
- Called at the top of `complianceReport()`, `toggleTenant()`, and `overrideQuota()`

---

### Gap #11 — WorkHub settings write gate

**Problem:** `PUT /workhub/settings` was gated with `workhub.task.view`, allowing any WorkHub user to overwrite billing defaults.

**Implemented (2026-07-02):**
- `Routes.php` — split workhub settings into two route groups:
  - `GET /workhub/settings` → `rbac:workhub.task.view` (all WorkHub users)
  - `PUT /workhub/settings` → `rbac:workhub.admin.manage` (manager/admin only)

---

### Gap #12 — Company type deletion safety

**Problem:** `CompanyTypeController::delete()` did not check for dependent roles or company profiles before deleting, leaving dangling `company_type_id` references.

**Implemented (2026-07-02):**
- Added pre-deletion checks against `roles` and `company_profiles` tables
- Returns `409 Conflict` with a human-readable count message if dependencies exist
- Deletion only proceeds when both checks pass
