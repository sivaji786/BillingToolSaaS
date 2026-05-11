# BillingTool — Automation Scope

**Last updated:** 2026-05-07

This document describes every automated process in the BillingTool platform — database lifecycle management, scheduled jobs, runtime hooks, audit trails, and related CLI tooling.

---

## Table of Contents

1. [Database Migrations](#1-database-migrations)
2. [Database Seeders](#2-database-seeders)
3. [CLI Commands (Spark)](#3-cli-commands-spark)
4. [Scheduled Job — Usage Check](#4-scheduled-job--usage-check)
5. [Automated Services](#5-automated-services)
6. [Runtime Hooks & Traits](#6-runtime-hooks--traits)
7. [Plan Limit Enforcement](#7-plan-limit-enforcement)
8. [Audit Logging](#8-audit-logging)
9. [Multi-Tenancy Scoping](#9-multi-tenancy-scoping)
10. [Automation-Relevant API Routes](#10-automation-relevant-api-routes)
11. [End-to-End Automation Flow](#11-end-to-end-automation-flow)

---

## 1. Database Migrations

**Location:** `api/app/Database/Migrations/`  
**Runner:** `php spark migrate` (CodeIgniter 4 built-in)  
**Total migrations:** 43

All schema changes are versioned through numbered migration files. The naming convention is `YYYY-MM-DD-NNNNNN_Description.php`. Migrations support both `up()` (apply) and `down()` (rollback).

### 1.1 Foundation & Core Infrastructure

| File | Purpose |
|------|---------|
| `2020-01-15-050000_InitialSchema.php` | Creates all base tables: plans, tenants, users, subscriptions, invoices, invoice_lines, invoice_templates, audit_logs, projects, tickets, company_settings, roles, rights, user_roles |
| `2024-01-30-131614_UpdatePlatformDetails.php` | Platform company and branding defaults |
| `2026-01-31-062503_AddPerformanceIndexes.php` | Composite indexes for high-frequency queries |

### 1.2 Multi-Tenancy & Billing

| File | Purpose |
|------|---------|
| `2026-02-02-145807_AddAiSettingsToTenants.php` | AI feature config columns per tenant |
| `2026-03-10-065424_CreateUsageNotificationsTable.php` | Deduplication table for 80%/100% threshold alerts |
| `2026-03-30-140500_CreateTenantUsageTable.php` | Tracks consumed resources per tenant per resource key |
| `2026-03-10-065500_AddIsTrailingToPlans.php` | `is_trailing` flag — marks the free default/trial plan |
| `2026-03-10-065600_AddIsPublicToPlans.php` | `is_public` flag — controls plan visibility on pricing page |
| `2026-05-06-000002_AddCurrencyToPlans.php` | Per-plan `currency` column (default EUR) |
| `2026-04-06-000000_AddInvoiceNumberFormat.php` | Custom invoice number format template per tenant |
| `2026-04-06-000001_AddInvoiceDefaultsToCompanyProfiles.php` | Default payment terms, currency, VAT per company |
| `2026-04-30-000001_AddMissingPackageFeatures.php` | Backfills missing feature/usage rows for existing plans |

### 1.3 Authentication & Access Control

| File | Purpose |
|------|---------|
| `2026-02-27-000000_CreateQuickAccessSessionsTable.php` | OTP-based quick access session table |
| `2026-02-28-142128_AddOtpColumnToQuickAccessSessions.php` | OTP code column for quick access |
| `2026-04-06-141344_CreatePasswordResetsTable.php` | Password reset token table with expiry |
| `2026-05-05-000001_SecureQuickAccessSessions.php` | Security hardening for quick access |
| `2026-05-05-000003_AddLastLoginToUsers.php` | `last_login DATETIME` column on users table |
| `2026_03_14_000000_AddWorkspaceRights.php` | RBAC rights for workspace operations |

### 1.4 Document & Content Features

| File | Purpose |
|------|---------|
| `2026-04-23-000000_AddBusinessLetterFieldsToInvoices.php` | Adds `body`, `salutation`, `closing` for business letters |
| `2026-04-27-000000_AddTemplateTypeToInvoiceTemplates.php` | `template_type` column (invoice / business_letter) |
| `2026-04-28-000000_AddTemplateIdToInvoices.php` | Links invoices to invoice_templates |
| `2026-05-06-000001_AddShareTokenToInvoices.php` | `share_token VARCHAR(64) UNIQUE` for public share links |
| `2026-05-05-000002_AddSignatureUrlToCompanyProfiles.php` | Signature image URL for digital signing |

### 1.5 CMS Pages

| File | Purpose |
|------|---------|
| `2026-04-18-000000_CreateCmsPagesTable.php` | Core CMS pages table (slug, lang, content, nav fields) |
| `2026-04-18-000001_SeedCmsContent.php` | Migration-based seeding of default page content |
| `2026-04-18-000002_SeedCmsModules.php` | CMS module/section defaults |
| `2026-04-28-000001_AddLangToCmsPages.php` | Multi-language CMS support (`lang` column) |
| `2026-04-28-000002_ExpandCmsHomeContent.php` | Extended homepage sections (FAQs, testimonials, steps) |
| `2026-04-29-000001_ExtendCmsPages.php` | `nav_order`, `page_template`, `is_published` columns |

### 1.6 Other Features

| File | Purpose |
|------|---------|
| `2026-02-16-000000_CreateBuyersTable.php` | Buyer/client CRM table |
| `2026-02-19-000001_AddFieldsToTickets.php` | Extended fields for the ticket system |
| `2026-03-09-000000_CreateTicketTrackingTable.php` | Ticket status change history |
| `2026-04-28-000004_AddTicketAssignmentAndSla.php` | SLA deadlines and assignee fields |
| `2026-03-25-110500_CreatePackageServicesTable.php` | Feature/service catalog for plans |
| `2026-03-25-060017_AddDisplayOrderToPackageServices.php` | UI display order for service list |
| `2026-02-20-000000_CreateWorkspaceFilesTable.php` | Cloud file workspace table |
| `2026-02-20-010000_CreateAiQueryHistoryTable.php` | AI query log for usage tracking |
| `2026-02-23-000000_AddFolderPathToAiQueryHistory.php` | Folder context on AI queries |
| `2026-04-28-000003_CreateDownloadLogsTable.php` | File download audit trail |

### 1.7 Running Migrations

```bash
# Apply all pending migrations
php spark migrate

# Roll back last batch
php spark migrate:rollback

# Check migration status
php spark migrate:status

# Run from admin API (requires super-admin auth)
GET /api/admin/database/migrate
GET /api/admin/database/seed
```

---

## 2. Database Seeders

**Location:** `api/app/Database/Seeds/`  
**Runner:** `php spark db:seed MainSeeder`

Seeders bootstrap all reference data and demo content. They are idempotent where possible (skip duplicates before inserting).

| Seeder | Purpose |
|--------|---------|
| **MainSeeder** | Master orchestrator — truncates 20+ tables, then calls all others in order. Creates 4 billing plans (Starter $19, Professional $49, Business $99, Enterprise $299), 12 demo tenants each with 3 users, subscriptions, and 2–5 sample invoices with line items. Runs RBAC integrity sweep to ensure every user has a `user_roles` row. |
| **PackageServiceSeeder** | Seeds 19 billable feature/service rows: 6 usage metrics (invoices, staff, storage, API calls, bandwidth, business letters) + 13 feature flags (AI invoicing, ticketing, templates, white label, designer, audit logs, CRM, workspace, RBAC, multi-language, UBL/XML, AI voice, analytics). |
| **CountrySeeder** | 250+ countries with name translations (EN, DE, AR including RTL). |
| **BuyerSeeder** | Sample client/buyer contacts for tenant 1 with address JSON and VAT IDs. |
| **TenantUsageSeeder** | Initializes `tenant_usage` records for invoices, users, storage, and API calls per tenant. |
| **SampleTemplateSeeder** | Creates default drag-and-drop invoice layout per tenant with pre-defined block positions (logo, header, seller, buyer, items, tax, payment terms). |
| **BuyerRightsSeeder** | Seeds RBAC rights for buyer module: read, create, update, delete. |
| **RemoveDuplicatesSeeder** | Cleans up duplicate `package_services` rows by type+name. Utility seeder, safe to re-run. |
| **DisplayOrderSeeder** | Assigns display order values (10–150) to package services for consistent UI ordering. |

```bash
# Run all seeders via MainSeeder
php spark db:seed MainSeeder

# Run a specific seeder
php spark db:seed PackageServiceSeeder
```

---

## 3. CLI Commands (Spark)

**Location:** `api/app/Commands/`

### `usage:check` — UsageLimitChecker

```bash
php spark usage:check
```

**Purpose:** Iterates all active tenants, evaluates resource consumption against plan limits, and dispatches threshold alert emails.

**Logic:**
1. Fetches all tenants from database
2. For each tenant, calls `UsageNotificationService::checkTenantUsage($tenantId)`
3. Service checks three resources: invoices (monthly), storage (GB), API calls
4. If usage crosses 80% or 100%, sends an email to the tenant's primary admin
5. Deduplication: skips if an alert for the same (tenant, resource, threshold, month) was already sent

**Recommended schedule:** Every 6–12 hours via external cron.

---

### `cleanup:tenants` — TenantCleanup

```bash
php spark cleanup:tenants
```

**Purpose:** Removes all tenants except IDs 1 and 2 (platform + first demo tenant). Used in development and CI to reset test data.

**Deletes from:** users, subscriptions, invoices, audit_logs, company_settings, api_keys, package_usage_tracking.

> **Warning:** Destructive. Do not run against production without explicit confirmation.

---

## 4. Scheduled Job — Usage Check

The `usage:check` command is designed as an **externally scheduled job**. The platform has no built-in task scheduler (no Horizon, no queue worker).

### Linux Cron (recommended)

```cron
# Run usage limit checks every 6 hours
0 */6 * * * cd /var/www/billingtool/api && php spark usage:check >> /var/log/billingtool/usage-check.log 2>&1
```

### GitHub Actions (CI / cloud deployment)

```yaml
on:
  schedule:
    - cron: '0 */6 * * *'

jobs:
  usage-check:
    runs-on: ubuntu-latest
    steps:
      - name: Run usage check
        run: php spark usage:check
        working-directory: api/
```

### Systemd Timer (alternative to cron)

```ini
# /etc/systemd/system/billingtool-usage.timer
[Unit]
Description=BillingTool Usage Check

[Timer]
OnBootSec=10min
OnUnitActiveSec=6h

[Install]
WantedBy=timers.target
```

---

## 5. Automated Services

**Location:** `api/app/Services/`

### UsageNotificationService

The core automation service for resource limit monitoring.

**Methods:**

| Method | Description |
|--------|-------------|
| `checkAllTenants()` | Fetches all tenants; calls `checkTenantUsage()` for each |
| `checkTenantUsage($tenantId)` | Evaluates usage, sends email alerts at threshold crossings |

**Tracked Resources:**

| Resource Key | Data Source | Measurement |
|---|---|---|
| `invoices` | `invoices` table, `template_type = 'invoice'` | Count per current calendar month |
| `storage_gb` | `workspace_files.size` column | Sum in GB |
| `api_calls` | `aiquery_history` table | Total count |

**Threshold Behaviour:**

| Usage % | Action |
|---|---|
| < 80% | No action |
| 80% | Email alert: "approaching limit" |
| 100% | Email alert: "limit reached" |

**Deduplication:** The `usage_notifications` table prevents resending the same alert for the same (tenant_id, resource_type, threshold, period_start). Each alert is sent at most once per billing period per threshold.

---

## 6. Runtime Hooks & Traits

Model-level hooks fire automatically on every database operation. They implement multi-tenancy scoping, limit enforcement, and audit logging without requiring explicit calls in controllers.

**Location:** `api/app/Traits/`

### Hook Execution Order

```
HTTP Request
    │
    ▼
Controller action
    │
    ▼
Model::insert() / find() / update() / delete()
    │
    ├── beforeFind    → TenantScope (filter to current tenant)
    ├── beforeInsert  → TenantScope (inject tenant_id)
    │                → PlanLimitTrait::checkLimits (block if over limit)
    ├── beforeUpdate  → TenantScope (restrict to current tenant)
    └── beforeDelete  → TenantScope (placeholder)
```

---

## 7. Plan Limit Enforcement

**Trait:** `api/app/Traits/PlanLimitTrait.php`

### Controller-Level Check

Called explicitly in `InvoiceController::create()` and similar endpoints before any database write:

```php
if (!$this->withinPlanLimit('invoices')) {
    return $this->fail('Monthly invoices limit reached.', 429);
}
```

**Supported resources:**

| Resource Key | What is counted | Limit source |
|---|---|---|
| `invoices` | Invoices created this calendar month | `plan.limits['invoices']` |
| `letters` | Business letters created this month | `plan.limits['invoices']` |
| `buyers` | Total buyers (not monthly) | `plan.limits['users']` |

**Limit values:**
- `-1` or `0` → unlimited
- Any positive integer → hard cap
- On error (DB/plan not found) → **fail-open** (allows the operation)

### Model-Level Check (beforeInsert hook)

`UsageEnforcement` trait fires on every `Model::insert()`:

1. Resolves current tenant's plan limits from config context
2. Maps the inserting table to a limit key
3. Counts existing records for the tenant
4. Throws `RuntimeException` if at or over limit (returns HTTP 500 to client)
5. At 100% threshold, immediately calls `UsageNotificationService::checkTenantUsage()` for real-time alert

**Tables covered by model-level check:** `users`, `invoices`, `projects`, `workspace_files` (mapped to storage_gb), `aiquery_history` (mapped to api_calls).

---

## 8. Audit Logging

**Trait:** `api/app/Traits/AuditTrait.php`  
**Model:** `api/app/Models/AuditLogModel.php`  
**Table:** `audit_logs`

### What gets logged

Every invoice and ticket lifecycle event is logged automatically via `$this->logAction()` in controllers:

| Action | Trigger |
|--------|---------|
| `created` | Invoice / business letter created |
| `updated` | Invoice fields modified |
| `validated` | Invoice status → validated |
| `sent` | Invoice status → sent |
| `deleted` | Invoice deleted |
| `created` | Ticket created |
| Package `created` / `updated` / `deleted` | Admin package management |
| `admin_delete` | Admin user deletion |

### Log Record Fields

| Field | Source |
|-------|--------|
| `tenant_id` | Current tenant context |
| `action` | Descriptive string (e.g. "validated") |
| `invoice_number` | Associated document number |
| `user` | Resolved from session → JWT bearer → "System" |
| `details` | Human-readable operation summary |
| `signed` | Boolean — whether document was digitally signed |
| `timestamp` | `date('Y-m-d H:i:s')` at time of call |

### User Resolution Logic

```php
// 1. Try session
$user = session()->get('userName') ?? session()->get('userEmail');

// 2. Fallback to JWT bearer
if (!$user) {
    $token = parseBearerToken($request);
    $decoded = JWT::decode($token, $secret);
    $user = $decoded->name ?? $decoded->email;
}

// 3. Final fallback
$user = $user ?? 'System';
```

### Viewing Audit Logs

```
GET /api/audit-logs          (requires rbac: audit_logs.read)
```

---

## 9. Multi-Tenancy Scoping

**Trait:** `api/app/Traits/TenantScope.php`

All models using this trait automatically scope every query to the current tenant. This is the primary isolation mechanism in the multi-tenant architecture.

### How it works

| Hook | Action |
|------|--------|
| `beforeFind` | Appends `WHERE tenant_id = {currentTenantId}` to all SELECT queries. **Fail-closed:** if no tenant in context, the query is blocked entirely. |
| `beforeInsert` | Injects `tenant_id` into the INSERT data automatically. |
| `beforeUpdate` | Restricts UPDATE to current tenant's rows only. |

### Bypassing scope (for admin/system code)

```php
// Admin endpoints or seeders can opt out:
$model->withoutTenant()->findAll();
```

This is used by:
- Admin controller endpoints (`/api/admin/*`)
- Database seeders
- The `UsageNotificationService` when iterating all tenants

---

## 10. Automation-Relevant API Routes

### Database Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/database/migrate` | Run pending migrations |
| GET | `/api/admin/database/seed` | Execute MainSeeder |

### Billing & Plan Limits

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/billing/plans` | Retrieve available plans |
| GET | `/api/billing/package-services` | Feature/service catalog |
| GET | `/api/billing/subscription` | Current tenant subscription |
| POST | `/api/billing/upgrade` | Upgrade to higher plan |
| GET | `/api/billing/history` | Subscription history |
| POST | `/api/webhooks/stripe` | Stripe webhook (renewals, cancellations, upgrades) |

### Usage & Analytics

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/customer/usage` | Tenant usage dashboard |
| GET | `/api/admin/usage` | All-tenants usage data |
| GET | `/api/admin/usage/export` | Export usage as CSV |
| GET | `/api/admin/analytics/dashboard` | Platform dashboard metrics |
| GET | `/api/admin/analytics/tenants` | Per-tenant usage analytics |
| GET | `/api/admin/revenue` | Revenue analytics |

### Audit

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/audit-logs` | Retrieve audit log entries (requires `audit_logs.read` right) |

### Invoice Sharing (Automated Token Generation)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/invoices/{id}/share` | Generate share token, returns public URL |
| GET | `/api/public/invoices/{token}` | Fetch invoice by token (no auth required) |

### Quick Access / OTP

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/quick-access` | Send OTP to email |
| POST | `/api/auth/quick-access/verify` | Verify OTP, create session |

### System Health

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/settings/health` | DB connectivity, disk %, SMTP, Gemini key, PHP version |
| POST | `/api/admin/settings/test-email` | Send SMTP test message |

---

## 11. End-to-End Automation Flow

### A. Invoice Creation with Limit Enforcement

```
POST /api/invoices
    │
    ├── RbacFilter validates JWT / session → tenant context set
    ├── InvoiceController::create()
    │       ├── PlanLimitTrait::withinPlanLimit('invoices')
    │       │       ├── Fetch tenant plan limits (plans.limits JSON)
    │       │       ├── COUNT invoices WHERE tenant_id = X AND issue_date >= month_start
    │       │       └── Return false → HTTP 429 "Monthly limit reached"
    │       │
    │       ├── InvoiceModel::insert($data)
    │       │       ├── TenantScope::beforeInsert  → inject tenant_id
    │       │       └── UsageEnforcement::checkLimits → double-check, trigger 100% alert
    │       │
    │       └── AuditTrait::logAction('created', invoiceNumber, details)
    │               └── INSERT INTO audit_logs (tenant_id, action, user, details, ...)
    │
    └── HTTP 201 Created
```

### B. Scheduled Usage Check

```
[External Cron: every 6h]
    │
    └── php spark usage:check
            │
            └── UsageNotificationService::checkAllTenants()
                    │
                    └── For each tenant:
                            ├── Fetch plan limits (plans.limits)
                            ├── Count invoices (this month)
                            ├── Sum storage (workspace_files.size)
                            ├── Count API calls (aiquery_history)
                            │
                            ├── For each resource at 80% threshold:
                            │       ├── Check usage_notifications (already sent?)
                            │       ├── Send email: "Approaching {resource} limit"
                            │       └── Insert into usage_notifications (dedup record)
                            │
                            └── For each resource at 100% threshold:
                                    ├── Check usage_notifications (already sent?)
                                    ├── Send email: "{resource} limit reached"
                                    └── Insert into usage_notifications
```

### C. Migration Deployment

```
[Deploy event]
    │
    └── php spark migrate
            │
            ├── Read migrations/ directory
            ├── Compare to `migrations` table in DB
            ├── Execute new migration up() methods in order
            └── Record batch number in migrations table
```

### D. Stripe Webhook → Plan Change

```
POST /api/webhooks/stripe
    │
    ├── Verify Stripe-Signature header
    ├── Parse event type (customer.subscription.updated, etc.)
    ├── Resolve tenant by Stripe customer ID
    ├── Update subscriptions table (plan_id, status, period dates)
    └── Log to audit_logs (action: "plan_changed")
```

---

## Environment Variables Required for Automation

| Variable | Used By | Description |
|----------|---------|-------------|
| `JWT_SECRET` | AuditTrait, Auth | JWT signing/verification key |
| `FRONTEND_URL` | InvoiceController (share links) | Base URL for generated share links |
| `SMTP_HOST` | UsageNotificationService, Settings | SMTP server hostname |
| `SMTP_PORT` | Email service | SMTP port (default 587) |
| `SMTP_USER` | Email service | SMTP authentication user |
| `SMTP_PASS` | Email service | SMTP authentication password |
| `SMTP_FROM` | Email service | From address for automated emails |
| `GEMINI_API_KEY` | AI features, Health check | Google Gemini API key |
| `STRIPE_SECRET_KEY` | Webhooks | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | Stripe webhook signing secret |
| `database.default.*` | All DB automation | Database connection config (`hostname`, `username`, `password`, `database`) |

---

## Quick Reference — Run Order for Fresh Deployment

```bash
# 1. Apply all schema changes
php spark migrate

# 2. Seed reference data and demo content
php spark db:seed MainSeeder

# 3. Verify health
curl -H "Authorization: Bearer <token>" https://your-domain/api/admin/settings/health

# 4. Add external cron
crontab -e
# Add: 0 */6 * * * cd /var/www/billingtool/api && php spark usage:check
```
