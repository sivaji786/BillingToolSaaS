# RBAC — Technical Reference

**Last updated:** 2026-07-02  
**Stack:** `RbacFilter.php` · `UnifiedAuthFilter.php` · `UserModel.php` · `Routes.php` · `authStore.ts` · `usePermission.ts`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Backend Filter Pipeline](#3-backend-filter-pipeline)
4. [Permission Check Flow](#4-permission-check-flow)
5. [Rights Catalog](#5-rights-catalog)
6. [Route-Level RBAC Mapping](#6-route-level-rbac-mapping)
7. [Company Types & Role Scoping](#7-company-types--role-scoping)
8. [WorkHub Role Definitions](#8-workhub-role-definitions)
9. [WorkHub Plan Gating](#9-workhub-plan-gating)
10. [Frontend RBAC Layer](#10-frontend-rbac-layer)
11. [Authentication & JWT](#11-authentication--jwt)
12. [Seeding & Migrations](#12-seeding--migrations)

---

## 1. Architecture Overview

RBAC is enforced at two layers — server-side (authoritative) and frontend (UI convenience only).

```
HTTP Request
    │
    ▼
UnifiedAuthFilter          ← always runs (global before filter)
    │  • Decodes JWT
    │  • Resolves tenant_id
    │  • Injects $request->userId, $request->tenantId
    │
    ▼
RbacFilter                 ← runs on protected route groups only
    │  • Reads required right from filter argument  (e.g. "invoices.read")
    │  • Checks super_admin shortcut  → pass
    │  • Calls UserModel::hasRight($userId, $rightCode)
    │  • 403 if false
    │
    ▼
Controller                 ← applies tenant_id scope to all queries
```

**Key design decisions:**

| Decision | Rationale |
|---|---|
| Rights NOT in JWT | JWT stays small; rights checked per-request via DB query |
| Super-admin bypass at filter level | `roles.is_super_admin = 1` skips all RBAC — not a hardcoded user check |
| Legacy `users.role = 'admin'` fallback | Backward compat for rows created before the role table existed |
| Flat role hierarchy | No role inheritance; rights assigned directly to roles |
| Multi-tenant isolation handled by UnifiedAuthFilter | Prevents cross-tenant access before RBAC even runs |
| WorkHub access via plan_features | `workhub_enabled` flag lives in `plans.limits` JSON, embedded in tenant at login via `enrichTenant()` |
| User listing scoped by tenant | `UserController::index()` filters by `$request->tenantId` — cross-tenant users never exposed |

---

## 2. Database Schema

### Core Tables

```sql
-- System/platform roles (tenant_id NULL) and tenant-specific roles
CREATE TABLE roles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    company_type_id INT NULL,            -- scoped to company type (NULL = global)
    tenant_id       INT NULL,            -- scoped to tenant (NULL = platform role)
    name            VARCHAR(100) NOT NULL,
    department      VARCHAR(100) NULL,   -- e.g. "WorkHub", "Finance"
    description     TEXT NULL,
    is_super_admin  TINYINT(1) DEFAULT 0 -- 1 = bypasses all permission checks
);

-- Atomic permission units
CREATE TABLE rights (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    module      VARCHAR(50) NOT NULL,   -- e.g. "invoices", "workhub"
    action      VARCHAR(50) NOT NULL,   -- e.g. "read", "task.view"
    code        VARCHAR(100) UNIQUE NOT NULL,  -- e.g. "invoices.read"
    description TEXT NULL
);

-- Role → Rights (many-to-many)
CREATE TABLE role_rights (
    role_id  INT NOT NULL,
    right_id INT NOT NULL,
    FOREIGN KEY (role_id)  REFERENCES roles(id)  ON DELETE CASCADE,
    FOREIGN KEY (right_id) REFERENCES rights(id) ON DELETE CASCADE
);

-- User → Roles (many-to-many)
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- WorkHub plan quotas (one row per tenant)
CREATE TABLE workhub_settings (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       INT NOT NULL UNIQUE,
    default_hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    currency        VARCHAR(10) DEFAULT 'EUR',
    tax_percent     DECIMAL(5,2) DEFAULT 19.00,
    pdf_language    VARCHAR(10) DEFAULT 'en'
);
```

### users table (relevant columns)

```sql
ALTER TABLE users ADD COLUMN role ENUM('admin','user','owner') DEFAULT 'user';
-- Legacy column — checked as fallback only; RBAC tables are canonical

ALTER TABLE users ADD COLUMN tenant_id INT;
-- All user queries MUST filter by tenant_id (enforced in UserController since 2026-07-01)
```

### Entity Relationship

```
users ─── user_roles ─── roles ─── role_rights ─── rights
  │                        │
  │  (legacy fallback)     └── is_super_admin
  └── role ENUM('admin','user','owner')

plans ──── limits (JSON) ──── workhub_enabled, workhub_workers, …
  │
  └── tenants ──── enrichTenant() ──── tenant.plan_features (frontend)
```

---

## 3. Backend Filter Pipeline

### UnifiedAuthFilter (`api/app/Filters/UnifiedAuthFilter.php`)

Runs globally on every request **before** RBAC.

1. Short-circuits for public routes (login, signup, forgot-password, health, SSO, public portals)
2. Extracts Bearer token from `Authorization` or `X-Authorization` header
3. Decodes & validates JWT via `JWTHelper::validateToken()`
4. Resolves tenant: `JWT.tenant_id` → `JWT.tid` → subdomain → UUID path segment
5. Enforces tenant match — rejects with `403` if workspace mismatch
6. Injects into request object:
   - `$request->userId`
   - `$request->tenantId`
   - `$request->tenant` (full tenant row)
7. Bridges JWT data to session for legacy code compatibility

### RbacFilter (`api/app/Filters/RbacFilter.php`)

Runs on route groups that declare `'rbac:some.right'`.

```php
public function before(RequestInterface $request, $arguments = null)
{
    // 1. Extract userId (prefers injected, falls back to session, then re-decodes JWT)
    $userId = $request->userId ?? session()->get('user_id') ?? jwtDecode($token)['user_id'];

    // 2. Super-admin shortcut
    if ($userModel->isSuperAdmin($userId)) return;   // pass

    // 3. No arguments = auth-only check, no right required
    if (empty($arguments)) return;

    // 4. Check specific right
    $right = $arguments[0];  // e.g. "invoices.read"
    if (! $userModel->hasRight($userId, $right)) {
        return $this->response->setStatusCode(403, 'Forbidden');
    }
}
```

### Filter Aliases (`api/app/Config/Filters.php`)

```php
$aliases = [
    'auth'         => UnifiedAuthFilter::class,
    'rbac'         => RbacFilter::class,
    'cors'         => CorsFilter::class,
    'sso_ratelimit'=> SsoRateLimitFilter::class,
    'wh_ratelimit' => WhRateLimitFilter::class,
];

// Applied globally to every request
$globals = [
    'before' => ['cors', 'auth'],
];
```

Route groups then add `rbac` with a right argument:

```php
$routes->group('invoices', ['filter' => ['auth', 'rbac:invoices.read']], function ($routes) {
    $routes->get('/', 'InvoiceController::index');
});
```

---

## 4. Permission Check Flow

### `UserModel::hasRight($userId, $rightCode)` — Step-by-Step

```sql
-- Step 1: Is user a super-admin?
SELECT 1 FROM user_roles
JOIN roles ON roles.id = user_roles.role_id
WHERE user_roles.user_id = ? AND roles.is_super_admin = 1
LIMIT 1;
-- → if found: return TRUE (skip all further checks)

-- Step 2: Legacy admin fallback
SELECT 1 FROM users WHERE id = ? AND role = 'admin' LIMIT 1;
-- → if found: return TRUE

-- Step 3: Specific right lookup
SELECT COUNT(*) FROM user_roles
JOIN roles      ON roles.id      = user_roles.role_id
JOIN role_rights ON role_rights.role_id = roles.id
JOIN rights     ON rights.id     = role_rights.right_id
WHERE user_roles.user_id = ? AND rights.code = ?;
-- → return TRUE if count > 0
```

### `UserModel::getRights($userId)` — For Bulk Fetching

```
→ Super-admin or legacy admin → return ['*']
→ Otherwise → return array of right codes assigned via user_roles chain
```

Used when returning all permissions for a user (e.g., building frontend state).

---

## 5. Rights Catalog

### Core Modules

| Module | Right Code | Description |
|---|---|---|
| **invoices** | `invoices.read` | View invoices list and detail |
| | `invoices.create` | Create new invoices |
| | `invoices.update` | Edit existing invoices |
| | `invoices.delete` | Delete invoices |
| **letters** | `invoices.read` | View business letters (reuses invoice right) |
| | `invoices.create` | Create business letters |
| | `invoices.update` | Edit business letters |
| | `invoices.delete` | Delete business letters |
| **buyers** | `buyers.read` | View buyers directory |
| | `buyers.create` | Add new buyers |
| | `buyers.update` | Edit buyer details |
| | `buyers.delete` | Remove buyers |
| **company_profiles** | `company_profiles.read` | View company/tenant profile + Settings page |
| | `company_profiles.update` | Update company settings |
| **audit_logs** | `audit_logs.read` | View audit trail |
| **users** | `users.manage` | Create/edit/assign-roles for users (tenant-scoped) |
| **roles** | `roles.manage` | Create/edit/delete roles and assign rights |
| **workspace** | `workspace.read` | View files, download |
| | `workspace.create` | Upload files, create directories, extract archives |
| | `workspace.update` | Rename files/folders |
| | `workspace.delete` | Delete files/folders |
| | `workspace.ai` | AI-powered file search |

### WorkHub Module

| Right Code | Description |
|---|---|
| `workhub.task.view` | View tasks; also gates workers list, projects, customers, inbox, settings, kanban, timesheet |
| `workhub.task.create` | Create new tasks |
| `workhub.task.edit` | Edit task details and correct time entries |
| `workhub.task.delete` | Delete tasks |
| `workhub.task.assign` | Assign tasks to workers |
| `workhub.timer.start` | Start/pause/stop time tracking |
| `workhub.completion.submit` | Submit task completion; upload task files; sign off timesheet |
| `workhub.completion.approve` | Approve submitted completions |
| `workhub.project.manage` | Create/edit/archive projects and customers |
| `workhub.reports.view` | View time/completion reports |
| `workhub.reports.export` | Export/print reports (PDF/CSV) |
| `workhub.billing.view` | View billing data linked to tasks |
| `workhub.admin.manage` | WorkHub admin settings |

---

## 6. Route-Level RBAC Mapping

### Invoices Module

| Method | Endpoint | Required Right |
|---|---|---|
| GET | `/invoices` | `invoices.read` |
| GET | `/invoices/:id` | `invoices.read` |
| POST | `/invoices` | `invoices.create` |
| PUT | `/invoices/:id` | `invoices.update` |
| DELETE | `/invoices/:id` | `invoices.delete` |
| POST | `/invoices/:id/share` | `invoices.read` |

### Business Letters Module

| Method | Endpoint | Required Right |
|---|---|---|
| GET | `/letters` | `invoices.read` |
| GET | `/letters/:id` | `invoices.read` |
| POST | `/letters` | `invoices.create` |
| PUT | `/letters/:id` | `invoices.update` |
| DELETE | `/letters/:id` | `invoices.delete` |

> Letters reuse invoice rights — no separate `letters.*` right codes exist.

### Buyers Module

| Method | Endpoint | Required Right |
|---|---|---|
| GET | `/buyers` | `buyers.read` |
| GET | `/buyers/export` | `buyers.read` |
| GET | `/buyers/:id` | `buyers.read` |
| POST | `/buyers` | `buyers.create` |
| POST | `/buyers/import` | `buyers.create` |
| PUT | `/buyers/:id` | `buyers.update` |
| DELETE | `/buyers/:id` | `buyers.delete` |

### Company Profile & Settings

| Method | Endpoint | Required Right |
|---|---|---|
| GET | `/company-profiles` | `company_profiles.read` |
| PUT | `/company-profiles/:id` | `company_profiles.update` |
| GET | `/company-types` | `auth` only (read-only for all tenants) |
| GET | `/invoice-templates` | `company_profiles.read` |
| POST/PUT/DELETE | `/invoice-templates` | `company_profiles.update` |
| GET | `/settings/sso` | `auth` only |
| PUT | `/settings/sso` | `auth` only |

> `company-types` CRUD (create/update/delete) is exclusively under `/admin/company-types` (SA auth). Tenants have read-only access.

### Workspace Module

| Method | Endpoint | Required Right |
|---|---|---|
| GET | `/workspace` | `workspace.read` |
| GET | `/workspace/download` | `workspace.read` |
| POST | `/workspace/open` | `workspace.read` |
| GET | `/workspace/download-zip` | `workspace.read` |
| POST | `/workspace/upload` | `workspace.create` |
| POST | `/workspace/mkdir` | `workspace.create` |
| POST | `/workspace/extract` | `workspace.create` |
| PUT | `/workspace/rename` | `workspace.update` |
| DELETE | `/workspace/delete` | `workspace.delete` |
| POST | `/workspace/ai` | `workspace.ai` |

### WorkHub Module

| Method | Endpoint | Required Right |
|---|---|---|
| GET | `/workhub/tasks` | `workhub.task.view` |
| GET | `/workhub/tasks/:id` | `workhub.task.view` |
| POST | `/workhub/tasks` | `workhub.task.create` |
| PUT | `/workhub/tasks/:id` | `workhub.task.edit` |
| DELETE | `/workhub/tasks/:id` | `workhub.task.delete` |
| GET | `/workhub/workers` | `workhub.task.view` |
| POST/PATCH/DELETE | `/workhub/workers` | `workhub.task.view` |
| GET | `/workhub/profile` | `auth` only |
| PATCH | `/workhub/profile` | `auth` only |
| GET | `/workhub/projects` | `workhub.task.view` |
| POST/PUT/DELETE | `/workhub/projects` | `workhub.project.manage` |
| GET | `/workhub/customers` | `workhub.task.view` |
| POST/PUT/DELETE | `/workhub/customers` | `workhub.project.manage` |
| GET | `/workhub/kanban` | `workhub.task.view` |
| GET | `/workhub/capacity` | `workhub.task.view` |
| GET | `/workhub/finance/summary` | `workhub.task.view` |
| GET | `/workhub/inbox/messages` | `workhub.task.view` |
| POST/PUT | `/workhub/inbox/messages` | `workhub.task.view` |
| GET | `/workhub/settings` | `workhub.task.view` |
| PUT | `/workhub/settings` | `workhub.task.view` |
| GET | `/workhub/timesheet` | `workhub.task.view` |
| GET | `/workhub/timesheet/export` | `workhub.reports.export` |
| POST | `/workhub/timesheet/signoff` | `workhub.completion.submit` |
| POST | `/workhub/tasks/:id/timer/start` | `workhub.timer.start` |
| POST | `/workhub/tasks/:id/timer/pause` | `workhub.timer.start` |
| POST | `/workhub/tasks/:id/timer/stop` | `workhub.timer.start` |
| POST | `/workhub/timer/stop-current` | `workhub.timer.start` |
| GET | `/workhub/timer/active` | `workhub.timer.start` |
| POST | `/workhub/tasks/:id/completion` | `workhub.completion.submit` |
| POST | `/workhub/completions/:id/customer-signature` | `workhub.completion.submit` |
| POST | `/workhub/files/upload` | `workhub.completion.submit` |
| GET | `/workhub/tasks/:id/documents` | `workhub.task.view` |
| GET | `/workhub/print/:type/:id` | `workhub.reports.export` |
| POST | `/workhub/ai/correct` | `workhub.task.view` (+ AI rate limit) |
| POST | `/workhub/ai/translate` | `workhub.task.view` (+ AI rate limit) |
| GET | `/workhub/time-entries` | `workhub.task.view` |
| PUT | `/workhub/time-entries/:id/correct` | `workhub.task.edit` |
| GET | `/workhub/my-data` | `auth` only (GDPR export) |
| POST | `/workhub/sync` | `auth` only |

### Admin / RBAC Management (Tenant)

| Method | Endpoint | Required Right |
|---|---|---|
| GET/POST/PUT/DELETE | `/roles` | `roles.manage` |
| GET | `/rights` | `roles.manage` |
| GET/POST/PUT | `/users` | `users.manage` (tenant-scoped by `$request->tenantId`) |

### SA Admin Routes (`/admin/*`)

All SA admin routes are guarded by the SA session filter (separate auth from tenant JWT). Tenant RBAC does not apply.

| Method | Endpoint | Notes |
|---|---|---|
| GET/POST/PUT/DELETE | `/admin/company-types` | Full CRUD; tenant portal has read-only access via `/company-types` |
| GET | `/admin/users` | Cross-tenant user listing |
| ANY | `/admin/workhub/*` | WorkHub compliance report, quota overrides |

> **Note:** The WorkHub tenant-toggle endpoint (`PUT /admin/workhub/tenants/:id/toggle`) was removed from the UI in 2026-07. WorkHub access is now exclusively controlled by plan-level `workhub_enabled` flag.

### Auth Endpoints (Public — No Filter)

| Method | Endpoint |
|---|---|
| POST | `/auth/login` |
| POST | `/auth/signup` (via `/onboarding/signup`) |
| POST | `/auth/forgot-password` |
| POST | `/auth/reset-password` |
| GET/POST | `/auth/sso/*` (OAuth flow) |

### Auth Endpoints (Auth-Only — No RBAC)

| Method | Endpoint |
|---|---|
| GET | `/auth/me` |
| POST | `/auth/logout` |
| POST | `/auth/refresh` |
| GET | `/auth/sso/identities` |
| DELETE | `/auth/sso/:provider/unlink` |

---

## 7. Company Types & Role Scoping

### What Are Company Types?

Company types categorise the kind of organisation a tenant represents (e.g. "Creative Agency", "Media", "Construction", "Retail"). The selection drives which **roles** and **permission templates** are relevant to that tenant.

Company types are **platform-global** — they are not owned by any single tenant. Adding or renaming a type affects every tenant that uses it.

### Data Model

```sql
CREATE TABLE company_types (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE   -- e.g. "Creative Agency"
);
```

The tenant's chosen type is stored on their company profile:

```sql
-- company_profiles table
company_type_id INT NULL   -- FK → company_types.id
```

Roles are optionally scoped to a company type:

```sql
-- roles table
company_type_id INT NULL   -- NULL = global role, not type-specific
```

### Who Manages Company Types?

| Actor | Capability | Route |
|---|---|---|
| **SA Admin** | Full CRUD (create, rename, delete) | `GET/POST/PUT/DELETE /admin/company-types` |
| **Tenant** | Read-only list | `GET /company-types` |

The SA admin manages types via the **SA Admin Portal → Company Types** page (`SACompanyTypes.tsx`). Tenants can only view the list — they cannot create or modify types. Tenants select their type in **Settings → Company Profile**.

`CompanyTypeController` is the single controller serving both paths:
- Mutations are registered inside the `/admin` group (SA auth filter)
- The tenant `GET /company-types` route is `auth`-only (no RBAC right required)

The response is cached for 1 hour (`Cache-Control: public, max-age=3600`).

### How Company Type Flows Into Role Management

```
Tenant sets company type
    └── Settings → Company Profile → companyTypeId saved to company_profiles
            │
            ▼
    Settings → Roles & Permissions tab
            │  RoleList receives companyTypeId from editedProfile
            │  → API: GET /roles?company_type_id={id}
            │  → shows only roles scoped to that type
            └── RoleList is in "controlled" mode: dropdown hidden, auto-filtered
```

**Frontend controlled mode** (`RoleList.tsx`):

```typescript
// When companyTypeId prop is provided and non-null, the local dropdown is hidden
// and the list is always filtered to that type
const controlled = initialCompanyTypeId != null
    && initialCompanyTypeId !== 'null'
    && initialCompanyTypeId !== 'undefined';
```

When accessed from the standalone Admin panel (legacy path), `companyTypeId` is `null` and the dropdown is shown for manual selection.

### Roles Scoped vs. Global

| `roles.company_type_id` | Meaning |
|---|---|
| `NULL` | Platform-global role — applies regardless of company type |
| `1` (e.g. Creative Agency) | Visible and assignable only within that company type context |

When a role is created in **Settings → Roles & Permissions**, it is automatically associated with the tenant's current `company_type_id`. This ensures roles don't bleed across organisation types.

### WorkHub Roles Are Seeded Per Company Type

`WorkHubRightsSeeder` creates the five standard WorkHub roles (Worker, Planner, Manager, Client, Finance) **once per company type** in the `roles` table:

```php
// For each company type in the database:
foreach ($companyTypes as $ct) {
    foreach (WH_ROLES as $roleName => $rights) {
        // Skip if already exists for this company_type
        if (!roleExists($roleName, $ct->id)) {
            insertRole($roleName, company_type_id: $ct->id);
        }
    }
}
// Fallback: if no company types exist yet, roles are created with company_type_id = NULL
```

This means:
- A "Creative Agency" tenant sees WorkHub roles tagged `company_type_id = 1`
- A "Media" tenant sees the same role names but tagged `company_type_id = 2`
- Adding a new company type via SA Admin does **not** automatically seed WorkHub roles for it — `WorkHubRightsSeeder` must be re-run

---

## 8. WorkHub Role Definitions

Six predefined WorkHub roles exist: five standard + one "Auto" (inherits from system role). Each standard role is a flat set of rights seeded per company type by `WorkHubRightsSeeder`.

`wh_role` is stored on the `wh_workers` record and is **separate from the RBAC system roles**. It is set per-worker in WorkHub Settings (Team tab → WorkHub section).

| Right | Worker | Planner | Manager | Client | Finance |
|---|:---:|:---:|:---:|:---:|:---:|
| `workhub.task.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `workhub.task.create` | | ✅ | ✅ | | |
| `workhub.task.edit` | | ✅ | ✅ | | |
| `workhub.task.delete` | | | ✅ | | |
| `workhub.task.assign` | | ✅ | ✅ | | |
| `workhub.timer.start` | ✅ | ✅ | ✅ | | |
| `workhub.completion.submit` | ✅ | ✅ | ✅ | | |
| `workhub.completion.approve` | | | ✅ | | |
| `workhub.project.manage` | | ✅ | ✅ | | |
| `workhub.reports.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `workhub.reports.export` | | ✅ | ✅ | | ✅ |
| `workhub.billing.view` | | | ✅ | | ✅ |
| `workhub.admin.manage` | | | ✅ | | |

**UI visibility rules based on `wh_role`:**
- `seesAllTasks = is_admin || role ∈ {planner, manager, finance}` — controls Kanban vs. TaskList view
- `canEdit` — task editing available to all with `seesAllTasks`
- WorkHub Settings (workers + billing config) visible to `seesAllTasks` users in the tenant Settings → Team tab

**Signup-created tenants** receive a super-admin role automatically (`is_super_admin = 1`) — they bypass all RBAC checks and get full WorkHub access.

---

## 9. WorkHub Plan Gating

WorkHub access is gated at the **plan level**, not per-tenant toggle. The `plans.limits` JSON column holds WorkHub quotas. On every login and token refresh, `Auth::enrichTenant()` embeds `plan_features` into the tenant object returned to the frontend.

### Plan Limits Schema (`plans.limits` JSON)

```json
{
  "workhub_enabled": true,
  "workhub_workers": 5,
  "workhub_tasks_per_month": 100,
  "workhub_ai_calls_per_month": 0,
  "workhub_storage_mb": 500
}
```

`-1` means unlimited.

### Current Plan Tiers (seeded by `WorkHubPackagesSeeder`)

| Plan | Workers | Tasks/month | AI calls | Storage |
|---|---|---|---|---|
| Starter | 5 | 100 | 0 | 500 MB |
| Professional | 25 | 1000 | 500 | 5 GB |
| Enterprise | unlimited | unlimited | 5000 | 50 GB |

### Frontend Gate (`WorkHubGate.tsx`)

```typescript
const plan = tenant?.plan_features ?? {};
const enabled = Boolean(plan['workhub_enabled']);
// If !enabled → renders upgrade prompt, blocks WorkHub UI
```

The `WorkHub` sidebar item shows a "Pro" badge and is disabled when `!workhubEnabled`.

### Settings Visibility

WorkHub settings (Workers + Billing Configuration) are shown as a section inside **Settings → Team tab**. Visibility requires:
- `workhubEnabled` = `tenant.plan_features.workhub_enabled === true`
- `seesWhSettings` = `workhubEnabled && (whProfile.is_admin || whProfile.role ∈ {planner, manager, finance})`

---

## 10. Frontend RBAC Layer

### authStore (`src/stores/authStore.ts`)

```typescript
interface User {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role: string;           // legacy: 'admin' | 'user' | 'owner'
    is_super_admin?: boolean;
    // NOTE: rights[] is NOT part of this interface (see Known Gaps)
}

interface Tenant {
    id: string;
    plan_features: {
        workhub_enabled: boolean;
        workhub_workers: number;
        workhub_tasks_per_month: number;
        workhub_ai_calls_per_month: number;
        workhub_storage_mb: number;
        [key: string]: unknown;
    };
}
```

The store persists to `localStorage` under key `'auth-storage'`. Sensitive tenant API keys are stripped before persisting.

### usePermission Hook (`src/hooks/usePermission.ts`)

```typescript
export const usePermission = (requiredRight: string): boolean => {
    const user = useAuthStore.getState().user;
    const rights = (user as any).rights || [];
    return rights.includes('*') || rights.includes(requiredRight);
};

export const hasPermissionSync = (requiredRight: string): boolean => {
    const user = useAuthStore.getState().user;
    const rights = (user as any).rights || [];
    return user?.role === 'admin'
        || rights.includes('*')
        || rights.includes(requiredRight);
};
```

The backend 403 response is the authoritative enforcement gate. `usePermission()` is designed for progressive UI gating (hiding buttons, disabling fields) but requires `user.rights` to be populated — see [rbac_backlog.md](rbac_backlog.md) for the pending implementation.

### Settings Page — Tab Visibility

Tabs in `Settings.tsx` are gated as follows:

| Tab | Condition |
|---|---|
| Company Profile | Always visible |
| Invoice Defaults | Always visible (includes bank account section) |
| SSO & SAML | Always visible; enterprise SSO config section requires `isAdmin` |
| Roles & Permissions | `isAdmin` only |
| Team | `isAdmin \|\| seesWhSettings`; Users section requires `isAdmin`; WorkHub section requires `seesWhSettings` |

### How Auth Flow Populates the Store

```
POST /auth/login
    → returns { token, user: { id, email, name, role, is_super_admin }, tenant: { …, plan_features } }
    → authStore.login(token, user, tenant)
    → stored in localStorage

On app load:
    GET /auth/me
    → returns merged user + tenant (with plan_features via enrichTenant())
    → no rights array returned
    → authStore updated
```

---

## 11. Authentication & JWT

### Token Payload

```json
{
    "iat": 1234567890,
    "exp": 1234657290,
    "user_id": 123,
    "uid": 123,
    "tenant_id": 456,
    "tid": 456,
    "email": "user@example.com",
    "name": "John Doe",
    "type": "customer"
}
```

Rights and `plan_features` are **not** included in the JWT — they are resolved via database on each request (`plan_features` attached to the tenant response, not the token itself).

### Token Transmission

Clients send the token in the `Authorization` header:

```
Authorization: Bearer <jwt>
```

The `X-Authorization` header is also accepted as a fallback.

---

## 12. Seeding & Migrations

### Migrations (chronological)

| File | What it creates |
|---|---|
| `2020-01-15-050000_InitialSchema.php` | `roles`, `rights`, `role_rights`, `user_roles` tables with FK constraints |
| `2026-01-31-062503_AddPerformanceIndexes.php` | Query indexes on all RBAC tables |
| `2026_03_14_000000_AddWorkspaceRights.php` | 5 workspace rights: `workspace.read/create/update/delete/ai` |
| `2026-05-27-000012_CreateWorkhubSettingsTable.php` | `workhub_settings` table (one row per tenant, billing defaults) |

### Seeders

**MainSeeder** (`seedRbac()`) inserts the base rights set:

```
invoices.read/create/update/delete
buyers.read/create/update/delete
company_profiles.read/update
audit_logs.read
users.manage
roles.manage
workspace.read/create/update/delete/ai
```

**WorkHubRightsSeeder** inserts:
- 13 WorkHub rights
- 5 WorkHub roles per company type (Worker, Planner, Manager, Client, Finance)
- Assigns all 13 WorkHub rights to any existing super-admin roles

**WorkHubPackagesSeeder** updates `plans.limits` JSON to include WorkHub quotas (Starter / Professional / Enterprise tiers).

