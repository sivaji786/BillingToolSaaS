# BillingTool — Testing Guide

Complete reference for running, understanding, and extending the automated test suite.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Test Database](#test-database)
4. [Single-Command Runner](#single-command-runner)
5. [Test Layers](#test-layers)
6. [Coverage Analysis](#coverage-analysis)
7. [Test Accounts & Sample Data](#test-accounts--sample-data)
8. [Running Specific Suites](#running-specific-suites)
9. [Viewing Results](#viewing-results)
10. [AI Failure Analysis](#ai-failure-analysis)
11. [Visual Regression](#visual-regression)
12. [Email Tests (Mailpit)](#email-tests-mailpit)
13. [CI/CD Pipelines](#cicd-pipelines)
14. [Adding New Tests](#adding-new-tests)
15. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Step 1 — first time only: create the test database and seed all data (~90s)
npm run test:setup

# Step 2 — run everything with one command
npm run test:dev
```

That's it. The runner starts Docker, seeds the DB, boots both servers, runs all test layers, and prints a summary.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18 | `node --version` |
| PHP | ≥ 8.1 | `php --version` |
| Docker | any | `docker --version` |
| MySQL client | any | `mysql --version` |
| Composer | ≥ 2 | `composer --version` |

Install frontend and backend dependencies once:

```bash
npm ci
cd api && composer install
```

Install Playwright browsers if not already present:

```bash
npx playwright install chromium --with-deps
```

---

## Test Database

The test suite runs against a **dedicated, isolated database** — your development database is never touched.

| Setting | Test DB | Dev DB |
|---------|---------|--------|
| Database | `billingtool_test` | `billing_tool` |
| Host | `127.0.0.1` | `localhost` |
| Port | **3307** (Docker) | 3306 |
| User | `root` | `root` |
| Config file | `api/.env.testing` | `api/.env` |

The test DB runs in Docker (`billingtool_mysql_test` container). `run-tests.sh` temporarily swaps `api/.env` → `api/.env.testing` when booting the PHP server, then restores it automatically — even on crash.

### Inspect the test DB directly

```bash
mysql -h 127.0.0.1 -P 3307 -u root -proot billingtool_test
```

GUI tools (TablePlus, DBeaver): connect with host `127.0.0.1`, port `3307`.

### Reset the test DB

```bash
npm run test:dev:reset       # wipe containers, re-migrate, re-seed, run tests
npm run test:setup           # re-migrate + re-seed without running tests
```

---

## Single-Command Runner

`run-tests.sh` orchestrates everything from one entry point.

### npm scripts

| Command | What it runs |
|---------|-------------|
| `npm run test:setup` | Docker + migrate + seed only (no tests) |
| `npm run test:dev` | Full suite: TypeScript → PHPUnit → Vitest → all Playwright projects |
| `npm run test:dev:api` | API contract tests only (~2 min) |
| `npm run test:dev:unit` | TypeScript check + Vitest only (~30 s) |
| `npm run test:dev:e2e` | All Playwright browser suites |
| `npm run test:dev:headed` | E2E with browser visible |
| `npm run test:dev:reset` | Wipe + re-seed DB, then full suite |

### Direct script flags

```bash
bash run-tests.sh                    # full suite
bash run-tests.sh --suite workhub   # one Playwright project
bash run-tests.sh --suite billing
bash run-tests.sh --suite a11y
bash run-tests.sh --skip-db          # skip DB setup (use existing test DB)
bash run-tests.sh --headed           # show browser during E2E
bash run-tests.sh --report           # auto-open HTML report after run
```

### What the runner does step by step

```
 1. docker compose up       → MySQL:3307 + Mailpit:1025
 2. Wait for MySQL ready    → up to 60s
 3. Swap api/.env           → api/.env.testing (restored on exit)
 4. php spark migrate       → apply any pending migrations
 5. php spark db:seed x6    → MainSeeder → BuyerSeeder → WorkHubRightsSeeder
                               → WorkHubPackagesSeeder → WorkHubTestSeeder
                               → FullModuleTestSeeder
 6. PHP server :8080        → API in test mode
 7. Vite dev :3000          → frontend
 8. TypeScript check
 9. PHPUnit                 → backend lifecycle + security tests
10. Vitest                  → frontend unit + i18n + component tests
11. Playwright api          → 35+ API contract tests
12. Playwright smoke        → navigation + auth UI flows
13. Playwright billing      → invoice editor E2E
14. Playwright workhub      → field service E2E
15. Playwright a11y         → WCAG 2.0 AA checks
16. Playwright visual       → screenshot regression
17. Print summary           → coloured pass/fail per suite
18. Restore api/.env        → dev environment untouched
19. Stop PHP + Vite         → clean shutdown
```

---

## Test Layers

### Layer 1 — TypeScript Check

Catches type errors before any test runs. Fails fast if the build is broken.

### Layer 2 — PHPUnit (`api/tests/`)

Backend unit and integration tests.

| File | What it tests |
|------|--------------|
| `LifecycleTest.php` | Tenant creation → invoice → subscription lifecycle |
| `TenantSecurityTest.php` | Cross-tenant data isolation |

```bash
cd api && php vendor/bin/phpunit --testdox
```

### Layer 3 — Vitest (`src/tests/`)

Frontend unit tests. No servers needed.

```
src/tests/
├── setup.ts
├── WorkHub/
│   ├── offlineStore.test.ts
│   ├── TaskList.test.tsx
│   ├── TimerWidget.test.tsx
│   └── WorkHubComponents.test.tsx
├── components/
│   └── TaskDocumentsTab.test.tsx
└── i18n/
    └── coverage.test.ts        ← all EN keys must exist in DE/FR/AR/PL/IT
```

```bash
npm test                        # one run
npm run test:watch              # watch mode
npm run test:coverage           # with coverage report
```

### Layer 4 — Playwright API Contracts (`e2e/api/`)

HTTP-only tests — no browser, fastest E2E layer (~2 min).

| Spec file | Module | Key tests |
|-----------|--------|-----------|
| `auth.spec.ts` | Auth | Login, wrong password, `/auth/me`, forgot-password enumeration safety |
| `tickets.spec.ts` | Tickets | **BUG-001**: POST 500 if `type` migration not run |
| `onboarding.spec.ts` | Onboarding | Signup, duplicate email, weak password, subdomain availability |
| `invoices.spec.ts` | Invoices | CRUD, tenant isolation, share links |
| `letters.spec.ts` | Business Letters | CRUD |
| `buyers.spec.ts` | Buyers (CRM) | CRUD + export |
| `workspace.spec.ts` | Workspace | list, mkdir, upload, rename, delete |
| `billing.spec.ts` | Billing | Plans, subscription, history, upgrade |
| `roles.spec.ts` | RBAC | Roles + rights, worker blocked from manager routes |
| `audit-logs.spec.ts` | Audit | Log shape, RBAC enforcement |
| `customer-portal.spec.ts` | Portal | Dashboard, invoices, subscription, profile |
| `workhub-tasks.spec.ts` | WorkHub | Task CRUD, worker cannot delete |
| `workhub-timer.spec.ts` | WorkHub | Start/stop, conflict detection (BUG-008) |
| `workhub-workers.spec.ts` | WorkHub | Worker list/detail/role |
| `workhub-projects.spec.ts` | WorkHub | Project CRUD + RBAC |
| `workhub-completion.spec.ts` | WorkHub | Photos have `url` not `storage_path` (BUG-004) |
| `workhub-timesheet.spec.ts` | WorkHub | Timesheet list/export/signoff |
| `workhub-inbox.spec.ts` | WorkHub | Messages + unread count |
| `workhub-ai.spec.ts` | WorkHub | AI correct/translate endpoints |
| `workhub-aggregate.spec.ts` | WorkHub | Kanban, capacity, finance summary |
| `workhub-gdpr.spec.ts` | WorkHub | GDPR data export |
| `admin-users.spec.ts` | Admin | Suspend/activate/reset-password |
| `admin-packages.spec.ts` | Admin | Packages CRUD |
| `admin-analytics.spec.ts` | Admin | Dashboard, tenant breakdown, usage |
| `admin-tickets.spec.ts` | Admin | All-tenant ticket list/update |
| `admin-wiki.spec.ts` | Admin | Wiki articles CRUD |
| `admin-cms.spec.ts` | Admin | CMS pages + media |
| `admin-settings.spec.ts` | Admin | Settings GET, health check, test-email |

```bash
npm run test:dev:api
npx playwright test --project=api e2e/api/invoices.spec.ts   # single file
npx playwright test --project=api -g "BUG-001"               # by name
```

### Layer 5 — Smoke Tests (`e2e/smoke/`)

Browser tests for navigation and auth UI.

```
e2e/smoke/
├── navigation.spec.ts      → LND-01..03, NAV-01..02, footer links
├── auth-flows.spec.ts      → AUTH-01..05 (login, wrong password, forgot-password)
└── tenant-screens.spec.ts  → TEN-01..06 (TenantHome, settings, WorkHub link)
```

### Layer 6 — WorkHub E2E (`e2e/workhub/`)

Full browser tests for the field service module.

```
e2e/workhub/
├── helpers.ts
├── 01-task-management.spec.ts
├── 02-timer.spec.ts
├── 03-kanban.spec.ts
├── 04-rbac.spec.ts
└── 05-completion-inbox-settings.spec.ts
```

### Layer 7 — Billing E2E (`e2e/billing/`)

Invoice editor full flow.

```
INV-01 — invoice list loads
INV-02 — "New Invoice" opens editor
INV-03 — line item can be added
INV-04 — existing invoice opens correctly
INV-05 — share link triggers no 500 errors
```

### Layer 8 — Accessibility (`e2e/a11y/`)

WCAG 2.0 AA checks via axe-core.

```
A11Y-01 — landing page: no critical/serious violations
A11Y-02 — all images have alt text
A11Y-03 — all inputs have labels
A11Y-04 — login form: no critical violations
A11Y-05 — WorkHub kanban: no critical violations
A11Y-06 — WorkHub: keyboard reachability
A11Y-07 — invoice list: no critical violations
```

### Layer 9 — Visual Regression (`e2e/visual/`)

Screenshot diffs against committed baselines. Fails if pixel change > 0.2%.

---

## Coverage Analysis

Current status as of July 2026. Covers all test layers together.

### Suite Totals

| Suite | Pass | Skip | Fail | Notes |
|-------|------|------|------|-------|
| TypeScript check | — | — | — | Blocks the pipeline on type errors |
| PHPUnit | varies | — | 0 | Backend lifecycle + cross-tenant isolation |
| Vitest | 42 | 0 | 0 | Unit, i18n key parity, component smoke |
| Playwright:api | 144 | 62 | 0 | HTTP-only contract tests (~2 min) |
| Playwright:smoke | 17 | 4 | 0 | Navigation + auth UI flows |
| Playwright:billing | 5 | 0 | 0 | Invoice editor full flow |
| Playwright:workhub | varies | — | 0 | WorkHub field service E2E |
| Playwright:a11y | 7 | 0 | 0 | WCAG 2.0 AA via axe-core |
| Playwright:visual | varies | — | 0 | Screenshot regression |

Skips in `api` are intentional: optional/advanced endpoints (SSO, 2FA, webhooks) that return `404` when not implemented — the test skips rather than fails so the suite stays green as features land.

---

### Role Coverage

| Role | Test account | API contracts | Browser E2E | Verdict |
|------|-------------|---------------|-------------|---------|
| Tenant manager | `alex.rivera@nexus.ai` | Full (all contract specs) | Billing, WorkHub, smoke, a11y | ✅ Well covered |
| WorkHub worker | `mark.davis@nexus.ai` | WorkHub RBAC, timer, timesheet | WorkHub worker flow | ✅ Core covered |
| Platform admin | `admin@humpl.org` | admin-users, admin-packages, admin-analytics, admin-tickets, admin-wiki, admin-cms, admin-settings | None | ⚠️ API only — no browser E2E |
| Customer / portal client | _(derived token in customer-portal.spec)_ | customer-portal dashboard/invoices/subscription | None | ⚠️ API only |
| Super-admin | None | None | None | ❌ Not tested |
| Finance role | None | None | None | ❌ Not tested |
| Planner role | None | None | None | ❌ Not tested |
| Unauthenticated | — | Auth-required 401/403 checks in every spec | Landing page, login smoke | ✅ Covered |

**Cross-role negative tests** (manager calling worker-only routes, worker calling manager-only routes) are covered in `roles.spec.ts` and individual WorkHub specs but are not systematically applied to every module.

---

### API Endpoint Coverage (~65%)

The backend exposes ~234 distinct routes. The current contract tests cover approximately 152.

#### Covered

| Module | Spec file | What is tested |
|--------|-----------|---------------|
| Auth | `auth.spec.ts` | Login, wrong password, `/auth/me`, forgot-password enumeration safety |
| Onboarding | `onboarding.spec.ts` | Signup, duplicate email, weak password, subdomain availability |
| Invoices | `invoices.spec.ts` | CRUD, tenant isolation, share links |
| Business Letters | `letters.spec.ts` | CRUD |
| Buyers | `buyers.spec.ts` | CRUD, CSV export |
| Workspace | `workspace.spec.ts` | List, mkdir, upload, rename, delete |
| Billing / Subscriptions | `billing.spec.ts` | Plans, subscription, history, upgrade |
| RBAC | `roles.spec.ts` | Role list/create/assign, worker blocked from manager routes |
| Audit Logs | `audit-logs.spec.ts` | Log shape, RBAC enforcement |
| Customer Portal | `customer-portal.spec.ts` | Dashboard, invoices, subscription, profile |
| Tickets | `tickets.spec.ts` | Create, list, **BUG-001** type migration guard |
| WorkHub Tasks | `workhub-tasks.spec.ts` | CRUD, worker cannot delete |
| WorkHub Timer | `workhub-timer.spec.ts` | Start/stop, conflict detection (BUG-008) |
| WorkHub Workers | `workhub-workers.spec.ts` | List, detail, role |
| WorkHub Projects | `workhub-projects.spec.ts` | CRUD, RBAC |
| WorkHub Completion | `workhub-completion.spec.ts` | Photo URLs (BUG-004) |
| WorkHub Timesheet | `workhub-timesheet.spec.ts` | List, date filter, export, sign-off (EuGH C-55/18) |
| WorkHub Inbox | `workhub-inbox.spec.ts` | Messages, unread count |
| WorkHub AI | `workhub-ai.spec.ts` | Correct/translate endpoints |
| WorkHub Aggregate | `workhub-aggregate.spec.ts` | Kanban summary, capacity, finance summary |
| WorkHub GDPR | `workhub-gdpr.spec.ts` | Worker data export |
| Admin Users | `admin-users.spec.ts` | Suspend/activate/reset-password |
| Admin Packages | `admin-packages.spec.ts` | CRUD |
| Admin Analytics | `admin-analytics.spec.ts` | Dashboard, tenant breakdown, usage |
| Admin Tickets | `admin-tickets.spec.ts` | All-tenant list/update |
| Admin Wiki | `admin-wiki.spec.ts` | CRUD |
| Admin CMS | `admin-cms.spec.ts` | Pages + media |
| Admin Settings | `admin-settings.spec.ts` | GET settings, health check, test-email |

#### Not Covered (Gaps)

| Gap | Route pattern | Priority |
|-----|--------------|----------|
| Company types CRUD | `GET/POST/PUT/DELETE /company-types` | High |
| Invoice PDF export | `GET /invoices/:id/pdf` | High |
| Letter PDF export | `GET /letters/:id/pdf` | High |
| Webhook management | `GET/POST/DELETE /webhooks/*` | Medium |
| GDPR tenant-level export | `GET /gdpr/export` (full tenant, not just worker) | Medium |
| Quick-access auth | `POST /auth/quick-access/*` | Medium |
| 2FA endpoints | `POST /auth/totp/*` | Medium |
| SSO / SAML federation | `GET/POST /auth/sso/*` | Low |
| Template clone/preview | `POST /invoice-templates/:id/clone` | Low |
| Notification preferences | `GET/PUT /notifications/preferences` | Low |

---

### UI Screen Coverage (~50%)

The application renders ~42 distinct screens. The current browser E2E + smoke tests exercise approximately 21.

#### Covered

| Screen | Test(s) | Layer |
|--------|---------|-------|
| LandingPage | `LND-01..03`, `A11Y-01..03` | Smoke + A11y |
| Login | `AUTH-01..05`, `A11Y-04` | Smoke + A11y |
| TenantHome (dashboard) | `TEN-01..06` | Smoke |
| Invoice List | `INV-01`, `INV-04`, `INV-05`, `A11Y-07` | Billing + A11y |
| Invoice Editor | `INV-02`, `INV-03` | Billing |
| WorkHub KanbanBoard | `E2E-WH-*`, `A11Y-05`, `A11Y-06` | WorkHub + A11y |
| WorkHub TaskDetail | WorkHub E2E task edit/complete flows | WorkHub |
| WorkHub TimerWidget | `E2E-WH-TMR-*` | WorkHub |
| WorkHub Settings | Completion/inbox/settings spec | WorkHub |
| Navigation (sidebar) | `NAV-01..02`, sidebar a11y | Smoke + A11y |

#### Not Covered (Gaps)

| Screen | File | Priority |
|--------|------|----------|
| BusinessLetters list | `src/components/screens/LetterList.tsx` | High |
| Buyers (CRM) list/detail | `src/components/screens/Buyers*.tsx` | High |
| Workspace file manager | `src/components/screens/Workspace*.tsx` | High |
| Admin panel (browser) | `src/components/screens/Admin*.tsx` | High |
| Templates editor | `src/components/screens/Templates*.tsx` | Medium |
| Billing / Subscription screen | `src/components/screens/BillingScreen.tsx` | Medium |
| Settings screen | `src/components/screens/Settings*.tsx` | Medium |
| Activity / Audit log screen | `src/components/screens/Activity*.tsx` | Medium |
| ResetPassword full flow | `src/components/screens/ResetPassword.tsx` | Medium |
| Register / Onboarding wizard | `src/components/screens/Onboarding*.tsx` | Medium |
| TicketingWidget | `src/components/screens/TicketingWidget.tsx` | Medium |
| AIHistory | `src/components/screens/AIHistory*.tsx` | Low |
| DesignLayoutPage | `src/components/screens/DesignLayoutPage.tsx` | Low |
| CmsPageView | `src/components/screens/CmsPageView.tsx` | Low |
| Legal pages content | `src/components/screens/Legal*.tsx` | Low |

---

### Business Flow Coverage (~60%)

| Flow | Covered by | Status |
|------|-----------|--------|
| User login → access app | Smoke `AUTH-01`, billing `injectAuth` | ✅ |
| Forgot password → email → reset | API `auth.spec` (enumeration only), smoke `AUTH-05` | ⚠️ No end-to-end click-through |
| Tenant onboarding (signup → verify) | `onboarding.spec.ts` | ✅ API level |
| Invoice lifecycle (create → line items → send → list) | `INV-01..05`, `invoices.spec.ts` | ✅ |
| Business letter CRUD | `letters.spec.ts` | ⚠️ API only |
| Buyer (CRM) CRUD + export | `buyers.spec.ts` | ⚠️ API only |
| WorkHub task management (create/assign/move/complete) | `01-task-management.spec.ts`, `workhub-tasks.spec.ts` | ✅ |
| WorkHub timer (start/stop/conflict) | `02-timer.spec.ts`, `workhub-timer.spec.ts` | ✅ |
| WorkHub RBAC (manager vs worker) | `04-rbac.spec.ts`, `roles.spec.ts` | ✅ |
| WorkHub kanban drag/status transition | `03-kanban.spec.ts` | ✅ |
| WorkHub timesheet view/export/signoff | `workhub-timesheet.spec.ts` | ✅ |
| WorkHub inbox messaging | `workhub-inbox.spec.ts` | ⚠️ API only |
| WorkHub AI correction/translation | `workhub-ai.spec.ts` | ⚠️ API only |
| Subscription upgrade/downgrade | `billing.spec.ts` | ⚠️ API only |
| Cross-tenant data isolation | PHPUnit `TenantSecurityTest.php` | ✅ |
| Admin suspend/activate user | `admin-users.spec.ts` | ⚠️ API only |
| Admin CMS publish/unpublish | `admin-cms.spec.ts` | ⚠️ API only |
| i18n key parity (EN/DE/FR/AR/PL/IT) | Vitest `i18n/coverage.test.ts` | ✅ |
| Offline store sync | Vitest `offlineStore.test.ts` | ⚠️ Unit only — no real offline E2E |
| Document signing workflow | None | ❌ |
| Payment upgrade full E2E (Stripe) | None | ❌ |
| SSO / SAML federation | None | ❌ |
| Webhook ingestion | None | ❌ |
| GDPR full tenant data export | None | ❌ |

---

### Recommended Additions

#### Priority: High — add before next release

| Test ID | What to add | File to create | Why |
|---------|-------------|---------------|-----|
| `API-CTY-01..04` | Company types CRUD (GET/POST/PUT/DELETE `/company-types`) | `e2e/api/company-types.spec.ts` | Widely used in invoice editor; zero coverage |
| `API-PDF-01..02` | Invoice + letter PDF export returns `application/pdf` with non-zero body | `e2e/api/pdf-export.spec.ts` | Core deliverable feature; untested |
| `E2E-LTR-01..03` | Letter list loads, new letter creates, existing letter opens | `e2e/billing/letter-editor.spec.ts` | Mirror of billing E2E for letters |
| `E2E-ADM-01..04` | Admin panel: user list renders, suspend/activate, wiki edit, CMS page toggle | `e2e/smoke/admin-screens.spec.ts` | Admin has zero browser coverage |
| `ADM-FIN-01` | Add finance-role test account; verify finance-only routes return 403 to manager | seed + `e2e/api/roles.spec.ts` | Finance role exists in RBAC but is untested |

#### Priority: Medium — add in next sprint

| Test ID | What to add | File to create | Why |
|---------|-------------|---------------|-----|
| `E2E-BYR-01..03` | Buyer list loads, add buyer, export CSV download | `e2e/billing/buyers.spec.ts` | CRM feature has zero browser coverage |
| `E2E-WS-01..02` | Workspace: folder tree renders, file upload visible in list | `e2e/smoke/workspace.spec.ts` | File manager has zero browser coverage |
| `E2E-SET-01..02` | Settings screen: loads, profile save shows toast | `e2e/smoke/settings.spec.ts` | Every tenant user visits settings |
| `AUTH-E2E-06` | Reset password full flow: receive email → click link → set new password | `e2e/smoke/auth-flows.spec.ts` | Currently only API-level enumeration test |
| `API-WH-01` | Planner role: add seeded planner user, verify planner-only routes | seed + `e2e/api/workhub-tasks.spec.ts` | Planner exists in WorkHub RBAC but untested |
| `API-QAA-01..03` | Quick-access auth token create/use/revoke | `e2e/api/quick-access-auth.spec.ts` | Used by mobile/kiosk clients |
| `A11Y-08` | Buyers screen a11y: no critical violations | `e2e/a11y/accessibility.spec.ts` | Extend existing a11y suite |
| `A11Y-09` | Admin panel a11y: no critical violations (authenticated admin) | `e2e/a11y/accessibility.spec.ts` | Admin has zero a11y coverage |
| `VIS-02..04` | Add visual baselines for Invoice Editor, WorkHub Kanban, TenantHome | `e2e/visual/` | Only landing page has a baseline today |

#### Priority: Low — nice to have

| Test ID | What to add | Why |
|---------|-------------|-----|
| `API-HOOK-01..03` | Webhook CRUD (register/list/delete) | Webhook infrastructure present but untested |
| `API-GDPR-01` | Full tenant GDPR export: 200 + JSON with user + invoice data | Compliance requirement |
| `API-2FA-01..03` | TOTP enroll/verify/disable | Security feature with no tests |
| `E2E-BILL-06` | Subscription downgrade from Professional → Starter shows confirmation modal | Prevent regressions in downgrade guard |
| `E2E-OFL-01` | Offline store: go offline → create task → come online → task syncs | True offline E2E (requires Service Worker intercept) |
| `E2E-TKT-01..02` | TicketingWidget: open widget, submit ticket, see confirmation | Zero browser coverage for ticket widget |
| `NTF-SMTP-03` | Verify WorkHub task-assignment email is delivered | Extend email notification suite |

---

### How to Prioritise New Tests

1. **Use test IDs from the tables above** — they follow the naming convention already established.
2. **Domain constraint** — test emails must use `medianet-home.de` or `digitalks.in` domains. Internal fixture accounts (`nexus.ai`) are seeder-only and do not reflect real domain rules.
3. **Add seed data first** — any new role (finance, planner, super-admin) needs an entry in `WorkHubTestSeeder.php` or `FullModuleTestSeeder.php` before the test can log in.
4. **Keep new accounts in the test DB only** — never add test credentials to `api/.env` or any non-testing seeder.

---

## Test Accounts & Sample Data

All accounts exist only in `billingtool_test` — never in your dev database.

### User accounts

| Role | Email | Password | Tenant |
|------|-------|----------|--------|
| Platform admin | `admin@humpl.org` | `admin123` | — |
| Tenant manager | `alex.rivera@nexus.ai` | `password123` | nexus_ai |
| WorkHub worker | `mark.davis@nexus.ai` | `password123` | nexus_ai |

### Seeded data per module

| Module | What exists in `billingtool_test` |
|--------|----------------------------------|
| **Tenants** | 12 tenants across all plan tiers + `nexus` fixture |
| **Users** | 3 users per tenant (admin, manager, worker) |
| **Invoices** | `draft`, `sent`, `overdue`, `cancelled`, `paid` for nexus.ai |
| **Invoice Templates** | Default + Premium Branded for nexus.ai |
| **Business Letters** | 2 letters (`template_type='business_letter'`) |
| **Buyers (CRM)** | Acme, Globex, Cyberdyne, Initech linked to nexus.ai |
| **Tickets** | 6 tickets — all types, priorities, and statuses |
| **Audit Logs** | 10 rich entries (login, invoice events, role changes) |
| **WorkHub Workers** | alex.rivera (ID 1, manager), mark.davis (ID 2, worker) |
| **WorkHub Tasks** | 5 tasks in all statuses (open/in_progress/done/problem) |
| **WorkHub Project** | `Test Project Alpha` |
| **Workspace** | 2 folders + 1 file metadata entry |
| **Subscriptions** | 1 active subscription per tenant |
| **Admin Wiki Docs** | Markdown files in `docs/en/` + `docs/de/` |
| **Plans** | Starter, Professional, Business, Enterprise |
| **WorkHub Plans** | Starter, Standard, Professional add-on tiers |

### Seeder run order

```
MainSeeder           → 12 tenants, 36 users, plans, RBAC foundation
BuyerSeeder          → 4 buyers for nexus.ai
WorkHubRightsSeeder  → WorkHub RBAC rights and roles
WorkHubPackagesSeeder→ WorkHub add-on plan tiers
WorkHubTestSeeder    → workers (IDs 1,2) + tasks in all statuses
FullModuleTestSeeder → invoices, letters, tickets, workspace, wiki, onboarding fixture
```

---

## Running Specific Suites

```bash
# Unit only (fast, no servers needed)
npm run test:dev:unit

# API contracts only
npm run test:dev:api

# One Playwright project
bash run-tests.sh --suite smoke
bash run-tests.sh --suite billing
bash run-tests.sh --suite workhub
bash run-tests.sh --suite a11y
bash run-tests.sh --suite visual

# Single spec file
npx playwright test e2e/api/invoices.spec.ts

# Tests matching a keyword
npx playwright test -g "BUG-001"
npx playwright test -g "timer"
npx playwright test -g "invoice"

# Interactive UI mode (pick tests visually)
npx playwright test --ui

# Watch browser live during tests
bash run-tests.sh --headed
```

---

## Viewing Results

### 1. Terminal summary

```
══════════════════════════════════════════════════
  Test Results Summary
══════════════════════════════════════════════════

  ✔ TypeScript
  ✔ PHPUnit
  ✔ Vitest
  ✔ Playwright:api
  ✔ Playwright:smoke
  ✔ Playwright:billing
  ✘ Playwright:workhub
  ✔ Playwright:a11y
  ✔ Playwright:visual

  Suites: 8 passed  1 failed
  Time:   9m 14s
  DB:     billingtool_test @ 127.0.0.1:3307
  Mail:   http://localhost:8025
```

### 2. Playwright HTML report

Full breakdown with screenshots, videos, and traces for every failing test.

```bash
npm run test:e2e:report
# Opens at http://localhost:9323
```

Or auto-open after a run:

```bash
bash run-tests.sh --report
```

### 3. Per-suite log files

```
test-results/
├── TypeScript.log
├── PHPUnit.log
├── Vitest.log
├── Playwright-api.log
├── Playwright-workhub.log
├── failures.txt          ← aggregated failures for AI analysis
├── api-server.log        ← PHP server output
└── vite-server.log       ← Vite output
```

### 4. Mailpit — captured emails

All emails sent during tests appear at **http://localhost:8025**.

Useful for: forgot-password, onboarding verification, ticket notifications.

---

## AI Failure Analysis

After any failing run, `test-results/failures.txt` contains the aggregated error output from every failed suite.

```bash
# View failures
cat test-results/failures.txt

# Ask Claude to analyse and suggest fixes
cat test-results/failures.txt | claude "analyse these test failures, explain root causes and suggest fixes"

# Focus on one suite
cat test-results/Playwright-workhub.log | claude "explain why these WorkHub tests are failing"
```

---

## Visual Regression

### Create baselines (first time or after intentional design change)

```bash
npx playwright test --project=visual --update-snapshots
git add e2e/snapshots/
git commit -m "update: visual baseline after nav redesign"
```

### Check baselines (normal run)

```bash
bash run-tests.sh --suite visual
```

### View diffs on failure

```bash
npm run test:e2e:report
```

The HTML report shows **expected | actual | difference** side-by-side.

---

## Email Tests (Mailpit)

### Start Mailpit

```bash
docker compose -f docker-compose.test.yml up -d mailpit
# Web UI: http://localhost:8025
```

### Inspect captured emails via REST API

```bash
# List all
curl http://localhost:8025/api/v1/messages

# Delete all (reset between tests)
curl -X DELETE http://localhost:8025/api/v1/messages
```

### Notification tests (nightly only)

| Test | Verifies |
|------|----------|
| `NTF-SMTP-01` | Password reset email delivered within 15s |
| `NTF-SMTP-02` | Ticket creation triggers admin notification |
| `NTF-TG-01` | Ticket creation sends Telegram message |

---

## CI/CD Pipelines

| Workflow | Trigger | Runs | Blocks merge |
|----------|---------|------|-------------|
| `push-gate.yml` | Every push | TypeScript + Vitest + API contracts | Yes |
| `pr-full.yml` | Every PR | Smoke + WorkHub + Visual + Billing + A11y | No (posts report comment) |
| `nightly.yml` | 02:00 UTC | Full suite + Lighthouse + i18n audit | Sends Telegram alert |

### Required GitHub secrets

| Secret | Purpose |
|--------|---------|
| `TELEGRAM_TEST_BOT_TOKEN` | Nightly failure alerts |
| `TELEGRAM_TEST_CHAT_ID` | Telegram group ID for alerts |

---

## Adding New Tests

### New API contract test

```typescript
// e2e/api/your-module.spec.ts
import { test, expect } from '@playwright/test';
import { API, getToken, authHeader } from './helpers';

test('API-XYZ-01 — description', async ({ request }) => {
  const token = await getToken(request, 'manager');
  const res   = await request.get(`${API}/your-endpoint`, {
    headers: authHeader(token!),
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.data ?? body)).toBe(true);
});
```

### New E2E browser test

```typescript
// e2e/workhub/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsManager } from '../workhub/helpers';

test('E2E-WH-XX — feature works end to end', async ({ page }) => {
  await loginAsManager(page);
  await page.click('[data-testid="my-button"]');
  await expect(page.locator('.result')).toBeVisible();
});
```

### New unit test

```typescript
// src/tests/components/MyComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../../../components/MyComponent';

describe('MyComponent', () => {
  it('renders without errors', () => {
    render(<MyComponent />);
    expect(screen.getByRole('heading')).toBeTruthy();
  });
});
```

### New seed data

Add to `FullModuleTestSeeder.php` (cross-module) or `WorkHubTestSeeder.php` (WorkHub-specific), then re-run:

```bash
npm run test:setup
```

### Test naming convention

| Prefix | Layer |
|--------|-------|
| `API-AUTH-` | Auth API contracts |
| `API-INV-` | Invoice API |
| `API-LTR-` | Business Letters API |
| `API-BYR-` | Buyers API |
| `API-TKT-` | Tickets API |
| `API-WS-` | Workspace API |
| `API-BIL-` | Billing API |
| `API-ROL-` | Roles/RBAC API |
| `API-WHT-` | WorkHub tasks |
| `API-TMR-` | WorkHub timer |
| `API-CMP-` | WorkHub completion |
| `ONB-` | Onboarding |
| `ADU-` | Admin users |
| `ADA-` | Admin analytics |
| `ADC-` | Admin CMS |
| `ADW-` | Admin wiki |
| `LND-` | Landing page smoke |
| `AUTH-` | Auth UI flows |
| `TEN-` | Tenant screens |
| `E2E-WH-` | WorkHub browser E2E |
| `INV-` | Invoice editor E2E |
| `VIS-` | Visual regression |
| `A11Y-` | Accessibility |
| `NTF-` | Notification delivery |

---

## Troubleshooting

### `POST /tickets → 500` in tickets.spec.ts

Migration `AddTypeAndAttachmentsToTickets` has not been run.

```bash
cd api && php spark migrate
```

### `Login API failed` in E2E tests

The API server is not running or seed data is missing.

```bash
npm run test:setup     # restarts Docker + re-seeds
```

### `Could not connect to localhost:3000`

Vite didn't start. Check `test-results/vite-server.log`.

### `MySQL did not become ready after 60s`

Docker is slow. Check the container:

```bash
docker compose -f docker-compose.test.yml logs mysql_test
```

### Visual tests fail on first run

Baselines don't exist yet:

```bash
npx playwright test --project=visual --update-snapshots
git add e2e/snapshots/ && git commit -m "chore: add visual baselines"
```

### `409 Conflict` in timer tests

A timer is stuck from a previous interrupted run. Stop it:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mark.davis@nexus.ai","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

curl -X POST http://localhost:8080/workhub/timer/stop-current \
  -H "Authorization: Bearer $TOKEN"
```

### Playwright browsers not installed

```bash
npx playwright install chromium --with-deps
```

### Report is empty after `npm run test:e2e:report`

Tests were skipped. Re-run the full suite and check for server startup errors:

```bash
npm run test:dev
cat test-results/api-server.log
```
