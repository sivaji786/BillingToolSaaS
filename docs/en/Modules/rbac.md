# RBAC — Role-Based Access Control

**Status:** ✅ Backend Complete · ⚠️ Frontend Partial  
**Score:** 8/10  
**Last updated:** 2026-07-01  
**Stack:** `api/app/Filters/RbacFilter.php` · `api/app/Filters/UnifiedAuthFilter.php` · `api/app/Models/UserModel.php` · `api/app/Config/Routes.php` · `src/hooks/usePermission.ts` · `src/stores/authStore.ts`  
**Deep Reference:** [docs/developer/rbac.md](../developer/rbac.md)

---

## Overview

Every protected API route declares a required right (e.g. `rbac:invoices.read`). The `RbacFilter` runs after `UnifiedAuthFilter` resolves the tenant and JWT, then checks the user's roles against the `role_rights` table. Super-admins (new tenant owners) bypass all checks via a DB flag (`roles.is_super_admin = 1`). The frontend layer exposes a `usePermission()` hook but it is currently non-functional for non-admin users due to rights not being returned from the API.

---

## Current Status

| Layer | Status | Notes |
|---|---|---|
| Backend enforcement (all modules) | ✅ Done | Every route group declares its required right |
| Super-admin bypass | ✅ Done | Uses `is_super_admin` role flag, not hardcoded user check |
| WorkHub RBAC (13 rights, 5 roles) | ✅ Done | Worker / Planner / Manager / Client / Finance |
| Workspace RBAC (5 rights) | ✅ Done | read / create / update / delete / ai |
| Core modules (invoices, buyers, etc.) | ✅ Done | All CRUD endpoints gated |
| Rights returned in `/auth/me` | ❌ Missing | Frontend cannot know user's rights without extra fetch |
| `usePermission()` hook | ⚠️ Partial | Works only for legacy `role='admin'`; fine-grained checks always false |
| UI-level permission gating | ⚠️ Degraded | Frontend falls back to 403 error responses from API |
| Letters module rights | ❌ Not seeded | Routes exist but no `letters.*` rights defined or gated |
| Admin WorkHub routes (`/admin/workhub/*`) | ⚠️ Auth-only | No RBAC filter applied |

---

## How It Works

### Data Model

```
users ──< user_roles >── roles ──< role_rights >── rights
                           │
                    is_super_admin = 1  →  bypasses all checks
```

A user can have multiple roles. Each role has multiple rights. The permission check walks: `user_roles → roles → role_rights → rights` and returns true if the required right code is found.

### Request Flow

```
Request → UnifiedAuthFilter (validates JWT, injects userId/tenantId)
        → RbacFilter (checks required right via UserModel::hasRight)
        → Controller
```

If `is_super_admin = 1` → passes immediately. If the right is not found → **403 Forbidden**.

### Right Code Naming Convention

```
<module>.<action>

invoices.read       invoices.create     invoices.update     invoices.delete
buyers.read         buyers.create       buyers.update       buyers.delete
company_profiles.read    company_profiles.update
audit_logs.read
users.manage
roles.manage
workspace.read      workspace.create    workspace.update    workspace.delete    workspace.ai

workhub.task.view       workhub.task.create     workhub.task.edit
workhub.task.delete     workhub.task.assign
workhub.timer.start
workhub.completion.submit   workhub.completion.approve
workhub.project.manage
workhub.reports.view    workhub.reports.export
workhub.billing.view
workhub.admin.manage
```

---

## Module Coverage

### Invoices

| Endpoint | Right |
|---|---|
| GET `/invoices` | `invoices.read` |
| POST `/invoices` | `invoices.create` |
| PUT `/invoices/:id` | `invoices.update` |
| DELETE `/invoices/:id` | `invoices.delete` |

### Buyers

| Endpoint | Right |
|---|---|
| GET `/buyers` | `buyers.read` |
| POST `/buyers` | `buyers.create` |
| PUT `/buyers/:id` | `buyers.update` |
| DELETE `/buyers/:id` | `buyers.delete` |

### Workspace

| Endpoint | Right |
|---|---|
| GET `/workspace` | `workspace.read` |
| POST `/workspace/upload` | `workspace.create` |
| PUT `/workspace/rename` | `workspace.update` |
| DELETE `/workspace/delete` | `workspace.delete` |
| POST `/workspace/ai` | `workspace.ai` |

### WorkHub

| Endpoint | Right |
|---|---|
| GET `/workhub/tasks` | `workhub.task.view` |
| POST `/workhub/tasks` | `workhub.task.create` |
| PUT `/workhub/tasks/:id` | `workhub.task.edit` |
| DELETE `/workhub/tasks/:id` | `workhub.task.delete` |
| POST `/workhub/tasks/:id/timer/start` | `workhub.timer.start` |
| POST `/workhub/tasks/:id/completion` | `workhub.completion.submit` |
| PUT `/workhub/tasks/:id/completion/approve` | `workhub.completion.approve` |
| GET `/workhub/reports` | `workhub.reports.view` |
| GET `/workhub/reports/export` | `workhub.reports.export` |
| GET `/workhub/billing` | `workhub.billing.view` |

### RBAC Management

| Endpoint | Right |
|---|---|
| ANY `/roles` | `roles.manage` |
| GET `/rights` | `roles.manage` |
| ANY `/users` | `users.manage` |

### Not Gated (Auth-Only)

- `GET /auth/me`, `POST /auth/logout`, `POST /auth/refresh`
- `GET|PUT /admin/workhub/*` — admin routes, auth-only, no right check

---

## WorkHub Predefined Roles

| Role | What they can do |
|---|---|
| **WorkHub Worker** | View tasks, start timer, submit completions, view reports |
| **WorkHub Planner** | + Create/edit/assign tasks, manage projects, export reports |
| **WorkHub Manager** | + Delete tasks, approve completions, view billing, admin settings |
| **WorkHub Client** | View tasks and reports only |
| **WorkHub Finance** | View tasks, view/export reports, view billing |

Seeded by `WorkHubRightsSeeder` per company type. New tenant owners get a super-admin role that bypasses all of these.

---

## Open Items

| # | Item | Priority |
|---|---|---|
| 1 | `GET /auth/me` should return `rights[]` array | High |
| 2 | `User` interface in `authStore.ts` should include `rights?: string[]` | High |
| 3 | Seed `letters.*` rights and gate letter routes | Medium |
| 4 | Add `rbac:workhub.admin.manage` filter to `/admin/workhub/*` routes | Medium |

### Fix for Item #1–2 (rights on frontend)

Backend — add to `Auth::me()`:
```php
$rights = $userModel->getRights($userId);
return $this->response->setJSON(['user' => $user, 'tenant' => $tenant, 'rights' => $rights]);
```

Frontend — update `authStore.ts` User interface and set rights after login/me fetch.

---

## Security Notes

| # | Issue | Severity | Status |
|---|---|---|---|
| SEC-06 | RBAC not enforced — any tenant user could access any feature | 🔴 HIGH | ✅ Fixed 2026-05-05 |
| SEC-07 | Frontend `usePermission()` does not have rights to evaluate | 🟡 MEDIUM | ❌ Open |
| SEC-08 | Admin WorkHub routes have no RBAC gate | 🟡 MEDIUM | ❌ Open |
