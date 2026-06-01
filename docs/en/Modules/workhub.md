# WorkHub — M-08 Field-Service Work Management

**Status:** ✅ DONE  
**Score:** 10/10  
**Last updated:** 2026-05-27  
**Stack:** `src/pages/WorkHub/` · `src/components/screens/WorkHub/` · `api/app/Controllers/WorkHub/` · `api/app/Models/` · `api/app/Database/Migrations/` · `api/app/Database/Seeds/`

---

## Overview

WorkHub (Module M-08) is a field-service task management SaaS module for the SCLAN platform. It enables electricians, field technicians, planners, managers, clients, and finance staff to manage installation and maintenance tasks end-to-end — from task creation and real-time time tracking, through digital completion reports with dual signatures, to automatic invoice generation.

**Core capabilities:**
- Task CRUD with status flow (`open → in_progress → done / problem`)
- Real-time timer with break tracking (§16 ArbZG / EuGH C-55/18 compliant)
- Done reports: completion notes (AI-corrected), materials, photo evidence, customer eIDAS signature
- 6 PDF document types: Work Order, Completion Certificate, Timesheet, Project Status, Invoice, Consent Form
- AI text correction and 5-language content translation (Anthropic Claude Sonnet 4)
- Worker capacity planning (utilisation %, queue depth, free-from date)
- Batch "Also at this location" task assignment
- WebSocket real-time inbox / notifications
- Offline mode with auto-sync
- 10-year document retention (§257 HGB / §147 AO)
- GDPR, eIDAS 910/2014, BSI IT-Grundschutz compliance

**Integration scope:** Billing/Invoice module, RBAC, Packages/Plan Limits, Audit Log, Multi-language, AI Assistant, Workspace/Storage, Dashboard, Admin portals.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 10/10 |
| Open critical | 0 |
| Open high | 0 |
| Open medium | 0 |
| Open low | 0 |
| Completed items | 91/91 — Sprints 1+2+3+4+5+6+7 done |

---

## Open Backlog

> **Epic 1 complete** — All 12 WH-001–WH-012 DB & foundation items delivered in Sprint 1. See [Completed Items](#completed-items).

> **Epics 2–5 complete** — All 16 WH-013–WH-028 backend API items delivered in Sprint 2. See [Completed Items](#completed-items).

> **Epics 9–12 complete** — All 15 WH-036–WH-050 frontend UI items delivered in Sprint 3. See [Completed Items](#completed-items).

> **Epics 16–18 complete** — All 12 WH-059–WH-070 billing integration, SA admin, and package items delivered in Sprint 4. See [Completed Items](#completed-items).

> **Epics 13–15, 19–21 complete** — All 14 WH-051–WH-058 + WH-071–WH-076 capacity/inbox/PDF/audit/offline items delivered in Sprint 5. See [Completed Items](#completed-items).

> **Epics 22–24 complete** — All 11 WH-077–WH-087 testing, security hardening, compliance, and documentation items delivered in Sprint 6. See [Completed Items](#completed-items).

> **Epics 6–8 complete** — All 7 WH-029–WH-035 file upload, print/PDF, workers, projects, customers, WebSocket, and inbox items delivered in Sprint 7. See [Completed Items](#completed-items).

---

### EPIC 6 — Backend API — File Upload & PDF Generation

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-029 | **`POST /api/workhub/files/upload` — photo upload.** Accepts JPEG/PNG/HEIC, max 10 MB per file. Validates MIME type (not just extension). Stores to S3/R2 at `workhub/{tenant_id}/{task_id}/{uuid}.jpg`. Creates `workhub_task_photos` row. Checks `workhub_storage_mb` plan limit. Returns `photo_id` and signed URL. | `api/app/Controllers/WorkHub/FileController.php` | 2.5 h |
| WH-030 | **`GET /api/workhub/print/{type}/{id}` — generate PDF.** Types: `work-order`, `completion-certificate`, `timesheet`, `project-status`, `invoice`, `consent-form`. Validates type and ID. Generates PDF using existing PDF library + WorkHub-specific templates. Records PDF generation in audit log. Checks `workhub_pdf_exports` plan limit. Returns PDF binary or signed download URL. | `api/app/Controllers/WorkHub/PrintController.php` | 5 h |

---

### EPIC 7 — Backend API — Workers, Projects, Customers

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-031 | **`GET /api/workhub/workers` — list workers with capacity.** Returns all active workers for tenant with computed fields: `utilisation_pct` (logged_hours this week / capacity_hours_per_week × 100), `queue_depth` (count of assigned open/in_progress tasks), `free_from_date` (estimated date current queue clears). Colours: ≤70% green, ≤90% amber, >90% red. | `api/app/Controllers/WorkHub/WorkerController.php` | 3 h |
| WH-032 | **`GET/POST/PUT/DELETE /api/workhub/projects` — project CRUD.** Full CRUD with tenant isolation. `GET` returns projects with: task count by status, progress %, customer name, colour_accent. Requires `workhub.project.manage` right for write operations. | `api/app/Controllers/WorkHub/ProjectController.php` | 2.5 h |
| WH-033 | **`GET/POST/PUT/DELETE /api/workhub/customers` — customer CRUD.** Full CRUD with tenant isolation. Customers are WorkHub-specific (field-service recipients). Link to existing `clients` if `client_id` provided — do NOT merge tables. | `api/app/Controllers/WorkHub/CustomerController.php` | 2 h |

---

### EPIC 8 — WebSocket / Real-Time Events

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-034 | **Implement WebSocket event broadcasting for WorkHub events.** Use existing WebSocket infrastructure (or add Pusher/Soketi channel `workhub.{tenant_id}.{user_id}`). Events to broadcast: `task.updated`, `task.assigned`, `task.completed`, `timer.started`, `timer.stopped`, `translation.ready`, `inbox.message`. Payload must include `tenant_id`, `task_id`, `event_type`, `data`, `timestamp`. | `api/app/Services/WorkHubWebSocketService.php` | 4 h |
| WH-035 | **Implement inbox message creation and delivery.** `POST /api/workhub/inbox/messages` — create message. `GET /api/workhub/inbox/messages` — list for current user (unread first). `PUT /api/workhub/inbox/messages/{id}/read` — mark read. `GET /api/workhub/inbox/unread-count` — badge counter. Push via WebSocket `inbox.message` event. | `api/app/Controllers/WorkHub/InboxController.php` | 3 h |

---

### EPIC 9 — Frontend — Layout & Navigation

#### CRITICAL

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-036 | **Create WorkHub module entry point and routing.** Add `/workhub` route group to `App.tsx`. Guard with `workhub.task.view` right check — redirect to upgrade page if WorkHub not in tenant plan. Mobile bottom-nav tabs: Tasks, Timer, Reports, Inbox, Profile. Desktop: 3-panel layout (project tree left, task list center, detail panel right). | `src/App.tsx`, `src/pages/WorkHub/WorkHubLayout.tsx` | 3 h |
| WH-037 | **Create WorkHub module guard / plan-gate component.** `<WorkHubGate>` component: checks `tenant.plan.workhub_enabled`. If false, renders upgrade CTA instead of WorkHub UI. Shows remaining quota counters (tasks this month, AI calls, storage). Used as wrapper for all WorkHub pages. | `src/components/screens/WorkHub/WorkHubGate.tsx` | 2 h |

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-038 | **Mobile bottom navigation bar for WorkHub.** Tabs: Tasks (with open-task badge), Timer (active indicator dot), Reports, Inbox (unread badge), Profile. Persists between WorkHub sub-pages. Uses Radix UI primitives consistent with existing nav. | `src/components/screens/WorkHub/WorkHubMobileNav.tsx` | 2 h |
| WH-039 | **Desktop 3-panel layout component.** Left panel (240px): project tree with colour accents, collapsed to icon rail on ≤1024px. Center panel: task list with filter bar (status chips, priority filter, worker filter, search). Right panel (400px): task detail drawer, slides in on task click. Responsive breakpoints: stack to single column on mobile. | `src/components/screens/WorkHub/WorkHubDesktopLayout.tsx` | 4 h |

---

### EPIC 10 — Frontend — Task Management UI

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-040 | **Task list view with filter chips.** Displays tasks with: status badge (colour-coded), priority indicator, worker avatar, project colour bar, `logged_hours / est_hours` progress, location tag. Filter chips: All / Open / In Progress / Done / Problem. Sort: by due date, priority, logged time. Pagination (20 per page). | `src/components/screens/WorkHub/TaskList.tsx` | 4 h |
| WH-041 | **Task detail panel.** Shows full task info: description, status controls, assigned worker card (capacity chip), project link, location tag, time entries timeline, material entries list, photos grid, completion record (if done). Action buttons: Start Timer, Open Done Report, Edit, Reassign. | `src/components/screens/WorkHub/TaskDetail.tsx` | 4 h |
| WH-042 | **New task creation modal — 2-step flow.** Step 1: title, project, description, priority, est_hours, location_tag, due_date. Step 2: Worker Capacity Cards — shows all workers with utilisation %, queue depth, colour (green/amber/red), free-from date. Select worker from capacity card. Submit creates task and sends inbox notification. | `src/components/screens/WorkHub/NewTaskModal.tsx` | 4 h |
| WH-043 | **"Also at this location" batch task panel.** When a worker is viewing a task with `location_tag`, show collapsible panel: "X other tasks at this location". Lists those tasks with one-tap "Take this too" to self-assign. Batch start all open tasks at location. | `src/components/screens/WorkHub/BatchLocationPanel.tsx` | 2.5 h |

---

### EPIC 11 — Frontend — Timer UI

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-044 | **Timer control widget.** States: Idle (Start button), Running (elapsed HH:MM:SS + Pause + Stop), Break (break elapsed + Resume). Persists timer state in Zustand store with `localStorage` backup for page refresh. Shows §16 ArbZG break reminder toast when work reaches 6h without break. Prominent on mobile (full-width card). | `src/components/screens/WorkHub/TimerWidget.tsx`, `src/stores/workhubTimerStore.ts` | 4 h |
| WH-045 | **Timer floating indicator.** When timer is running and user navigates away within WorkHub, show persistent floating pip (bottom-right on desktop, top of screen on mobile) with elapsed time and quick Stop button. Uses Portal rendering. | `src/components/screens/WorkHub/TimerPip.tsx` | 2 h |

---

### EPIC 12 — Frontend — Done Report / Completion Modal

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-046 | **Done report multi-step modal.** Steps: (1) Completion note with AI correction button, (2) Materials entry table, (3) Photo upload (jobsite + identity), (4) Worker signature pad, (5) GDPR consent + customer signature pad, (6) Summary & submit. Progress stepper at top. Can save draft and resume. | `src/components/screens/WorkHub/DoneReportModal.tsx` | 6 h |
| WH-047 | **AI text correction UI within completion note field.** "Correct with AI" button: calls `/api/workhub/ai/correct`. Shows diff view (red = removed, green = added inline). "Accept all", "Reject all", and per-change accept/reject controls. Shows original vs corrected side by side. Loading skeleton during API call. | `src/components/screens/WorkHub/AICorrectField.tsx` | 3 h |
| WH-048 | **Material entry table in done report.** Add/edit/remove rows: material_name, quantity, unit (dropdown: pcs, m, kg, h, …), unit_price, total_price (auto-calculated). Running total at bottom. Catalogue reference field (optional). Data feeds `workhub_material_entries` and eventually invoice line items. | `src/components/screens/WorkHub/MaterialsTable.tsx` | 3 h |
| WH-049 | **Photo capture/upload grid.** Jobsite photos (max 10) + identity photo (max 1). Camera capture via `getUserMedia` on mobile. File upload fallback. Shows upload progress. Thumbnails with remove button. Identity photo section: captured once, reusable via stored identity_photo for that worker profile. | `src/components/screens/WorkHub/PhotoUploadGrid.tsx` | 3 h |
| WH-050 | **Digital signature pad.** Uses canvas-based signature pad (or `react-signature-canvas`). Shows signer name field. "Clear" and "Done" buttons. Validates non-blank signature (pixel density check). Exports as base64 SVG. Shows eIDAS-compliant legal notice: "By signing you confirm…". Two instances: worker signature (mandatory) + customer signature (mandatory for billable tasks). | `src/components/screens/WorkHub/SignaturePad.tsx` | 3 h |

---

### EPIC 13 — Frontend — Capacity Planning, Inbox, Profile

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-051 | **Worker capacity card grid.** Displayed in: (a) new task assignment step, (b) Manager's worker overview tab. Each card: worker avatar, name, role, utilisation % progress bar (colour-coded), queue depth count, free-from date chip. Click card to view that worker's task queue. | `src/components/screens/WorkHub/CapacityCard.tsx` | 2.5 h |
| WH-052 | **Inbox / notifications screen.** Lists messages: sender avatar, subject, task link, body preview, timestamp. Unread items bold. Mark all read button. Filter: All / Unread / From Planner / From Client / System. Click message → slide open detail with task deep-link. Real-time via WebSocket `inbox.message` event. | `src/pages/WorkHub/WorkHubInbox.tsx` | 3 h |
| WH-053 | **Worker profile screen.** Sections: personal info (read-only from users table), WorkHub capacity tile (hours/week, skills tags), language preferences (UI language selector from existing i18n, export language for PDFs), identity photo status (captured / not captured). Edit capacity and language settings via PATCH. | `src/pages/WorkHub/WorkHubProfile.tsx` | 2.5 h |
| WH-054 | **Timesheet view.** Weekly calendar grid: rows = days, columns = tasks. Shows net work hours per cell. Weekly and monthly totals. Colour cells by day status (complete/incomplete/future). Download PDF timesheet button (calls `/print/timesheet/{id}`). Worker sign-off button (requires worker e-signature). | `src/pages/WorkHub/WorkHubTimesheet.tsx` | 3 h |

---

### EPIC 14 — Frontend — AI Translation

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-055 | **Content translation toggle for task descriptions and completion notes.** Language selector chip in task detail and completion record view. On language change: calls `/api/workhub/ai/translate` if translation not cached. Shows skeleton placeholder while loading. "Show original" toggle. Stores last-used language in worker profile. | `src/components/screens/WorkHub/TranslationToggle.tsx` | 3 h |
| WH-056 | **Extend existing multi-language system for WorkHub UI strings.** Add WorkHub-specific translation keys to existing `src/translations/` files for all 5 languages (EN, DE, PL, FR, IT). Key namespace: `workhub.*`. Polish and Italian are new languages — add base translation files if not present. | `src/translations/en.ts`, `de.ts`, `pl.ts`, `fr.ts`, `it.ts` | 4 h |

---

### EPIC 15 — Frontend — PDF Documents

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-057 | **PDF templates for 6 WorkHub document types.** Design server-rendered HTML/CSS templates (consumed by backend PDF generator): (1) Work Order — task details, worker, location, est hours; (2) Completion Certificate — with signatures, materials table, photos grid, GDPR notice; (3) Timesheet — weekly breakdown, legal disclaimer; (4) Project Status — project overview, tasks by status, progress; (5) Invoice — materials + labor, line items (feeds Billing module format); (6) Consent Form — GDPR Art. 6 printable form. All include tenant branding (logo, company details). | `api/app/Views/workhub/pdf/work_order.php`, `completion_certificate.php`, `timesheet.php`, `project_status.php`, `invoice.php`, `consent_form.php` | 8 h |
| WH-058 | **Documents tab in task detail.** Lists all generated PDFs for a task. Download buttons for each type. Generate-on-demand buttons for types not yet generated. Shows generation timestamp and file size. Requires `workhub.reports.export` right. | `src/components/screens/WorkHub/TaskDocumentsTab.tsx` | 2 h |

---

### EPIC 16 — Billing / Invoice Integration

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-059 | **Auto-generate invoice from WorkHub completion record.** On `customer-signature` submitted (WH-025): create draft invoice in existing `invoices` table with `source = 'workhub'`, `source_ref_id = completion_record_id`. Map `workhub_material_entries` rows to `invoice_items`. Add labor line item: `logged_hours × hourly_rate`. Pull hourly_rate from WorkHub worker profile or tenant-level setting. | `api/app/Services/WorkHubBillingService.php`, `api/app/Models/InvoiceModel.php` | 4 h |
| WH-060 | **Link WorkHub invoices in tenant billing view.** In existing Invoice CRUD screen, add `source` badge ("WorkHub") on auto-generated invoices. Add filter: "Show WorkHub invoices". Clicking a WorkHub invoice shows the linked completion record ID and task ID as breadcrumb. | `src/components/screens/Billing/InvoiceList.tsx` | 2 h |
| WH-061 | **WorkHub hourly rate configuration.** Tenant admin settings page: set default hourly rate for WorkHub labor. Optional per-worker override in worker profile. Used by WH-059 for labor line items. | `src/pages/WorkHub/WorkHubSettings.tsx`, `api/app/Controllers/WorkHub/SettingsController.php` | 2 h |

---

### EPIC 17 — SA Admin Portal — WorkHub Management

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-062 | **SA Admin — WorkHub module toggle per tenant.** In existing Admin Users / Tenant management page: add "WorkHub" toggle switch. When enabled: activates module for that tenant, initialises default WorkHub rights for existing users. When disabled: WorkHub routes return 403, no data deleted. Shows current WorkHub usage stats (tasks, workers, storage). | `src/components/screens/Admin/SAUsers.tsx`, `api/app/Controllers/AdminTenants.php` | 3 h |
| WH-063 | **SA Admin — WorkHub quota override per tenant.** In tenant detail panel: form to override WorkHub plan limits for a specific tenant (e.g. custom worker count, extra AI calls). Saves to new `tenant_plan_overrides` table or extends existing tenant settings JSON. Takes precedence over package defaults in `PlanLimitTrait`. | `api/app/Controllers/AdminTenants.php`, `api/app/Models/TenantModel.php` | 2.5 h |
| WH-064 | **SA Admin — WorkHub usage analytics panel.** New section in Admin Analytics: WorkHub tab. Metrics: tasks created per day (bar chart), completion rate %, AI calls consumed (vs plan limit), PDF exports, storage used per tenant, signature events per day. Uses existing Recharts components. Data from `workhub_tasks`, `workhub_time_entries`, `ai_query_history`. | `src/components/screens/Admin/SAAnalytics.tsx`, `api/app/Controllers/AdminAnalytics.php` | 4 h |
| WH-065 | **SA Admin — WorkHub audit log filter.** Extend existing Audit Log admin screen: add filter `module = workhub`. WorkHub audit events: task CRUD, timer start/stop, completion submitted, signature captured, invoice generated, AI call, PDF generated, file uploaded, plan limit hit. All include `tenant_id`, `user_id`, `task_id` correlation fields. | `src/components/screens/Admin/SAAuditLog.tsx`, `api/app/Controllers/AuditLogController.php` | 2 h |
| WH-066 | **SA Admin — WorkHub compliance report.** Admin-only endpoint `GET /api/admin/workhub/compliance-report?tenant_id=X`. Returns: task count with dual-signature (GDPR-complete), tasks missing customer signature, time entries without break (§16 ArbZG flags), document retention status. For regulatory audit purposes. | `api/app/Controllers/AdminWorkHub.php` | 3 h |

---

### EPIC 18 — Packages — WorkHub Tier Definition

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-067 | **Define WorkHub package tiers in Admin Packages.** Add 3 WorkHub add-on tiers to existing package management: **WorkHub Starter** (`workhub_workers: 5, workhub_tasks_per_month: 100, workhub_storage_mb: 500, workhub_ai_calls_per_month: 0, workhub_pdf_exports: 50, workhub_enabled: true`); **WorkHub Pro** (`workers: 25, tasks: 1000, storage_mb: 5000, ai_calls: 500, pdf_exports: unlimited`); **WorkHub Enterprise** (`workers: unlimited, tasks: unlimited, storage_mb: 50000, ai_calls: 5000, pdf_exports: unlimited`). Document JSON schema in admin-packages.md. | `api/app/Database/Seeds/WorkHubPackagesSeeder.php`, `docs/en/Modules/admin-packages.md` | 2 h |
| WH-068 | **Plan limit enforcement for WorkHub in `PlanLimitTrait`.** Add enforcement methods: `checkWorkhubWorkerLimit()` called on worker profile create; `checkWorkhubTaskLimit()` called on task create (monthly count); `checkWorkhubStorageLimit($bytes)` called on file upload; `checkWorkhubAiCallLimit()` called on AI correct/translate; `checkWorkhubPdfLimit()` called on PDF generate. All return 402 with `plan_limit_hit` error code on breach. | `api/app/Traits/PlanLimitTrait.php` | 3 h |
| WH-069 | **WorkHub usage tracking.** Extend existing `tenant_usage` table (or create `workhub_usage_monthly` table): track monthly counts of tasks, AI calls, PDF exports, storage bytes per tenant. Increment on create via model events. Reset counters at billing cycle start (use existing subscription reset logic). Feed SA analytics dashboard. | `api/app/Models/WorkHub/WorkHubUsageModel.php`, `api/app/Traits/UsageEnforcement.php` | 2.5 h |
| WH-070 | **WorkHub upgrade prompt UI.** When plan limit hit (402 response): show upgrade modal with current vs next tier comparison table. "Upgrade Plan" CTA links to existing Subscription/Billing page. Quota meters on WorkHub sidebar: tasks remaining this month, storage used, AI calls remaining. | `src/components/screens/WorkHub/UpgradePrompt.tsx`, `src/components/screens/WorkHub/QuotaMeters.tsx` | 2.5 h |

---

### EPIC 19 — Audit Log Integration

#### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-071 | **Extend `AuditTrait` for WorkHub events.** Add `workhub` module prefix to existing audit log actions. Required event types: `workhub.task.created`, `workhub.task.updated`, `workhub.task.deleted`, `workhub.task.status_changed`, `workhub.timer.started`, `workhub.timer.stopped`, `workhub.completion.submitted`, `workhub.signature.worker_signed`, `workhub.signature.customer_signed`, `workhub.invoice.generated`, `workhub.ai.correct`, `workhub.ai.translate`, `workhub.pdf.generated`, `workhub.file.uploaded`, `workhub.plan_limit.hit`. Each log entry must include: `tenant_id`, `user_id`, `task_id` (where applicable), `old_values`, `new_values`, `ip_address`. | `api/app/Traits/AuditTrait.php`, `api/app/Models/AuditLogModel.php` | 2.5 h |
| WH-072 | **Retention enforcement for WorkHub audit records.** Completion records, signatures, and time entries for billable tasks must be retained for 10 years (§257 HGB / §147 AO). Add retention policy guard: `DELETE` blocked on `workhub_completion_records` and `workhub_time_entries` if `created_at < NOW() - 10 years` condition not met. Implement `WorkHubRetentionCommand` CLI command to flag records approaching expiry. | `api/app/Commands/WorkHubRetentionCommand.php`, `api/app/Models/WorkHub/CompletionRecordModel.php` | 3 h |

---

### EPIC 20 — Dashboard Integration

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-073 | **WorkHub summary widget for tenant dashboard.** Add widget to existing Dashboard page (if WorkHub enabled on plan): shows — open tasks count, tasks in progress, tasks completed this week, average completion rate, active timer indicator. Widget is dismissible. Links to WorkHub module. Uses React Query with 60s refetch interval. | `src/components/screens/Dashboard/WorkHubDashboardWidget.tsx` | 2.5 h |
| WH-074 | **WorkHub quick-action launcher.** Add WorkHub to the existing FloatingDock / Quick Access launcher: "New Task", "Start Timer", "Open Inbox". Visible on all pages when WorkHub is enabled. Requires `workhub.task.create` right for "New Task". | `src/components/FloatingDock.tsx` | 1.5 h |

---

### EPIC 21 — Offline Mode

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-075 | **Offline detection banner.** Detects `navigator.onLine` + periodic API ping. Shows non-intrusive orange banner: "Offline — changes will sync when reconnected." Hides on reconnect. Used across all WorkHub pages. | `src/components/screens/WorkHub/OfflineBanner.tsx` | 1 h |
| WH-076 | **Offline task cache via Service Worker / localStorage.** Cache: last 50 tasks for current worker, active timer state, draft completion note (before submit). On reconnect: sync timer state to server, retry failed API calls from queue. Show sync indicator. Out-of-scope: full offline CRUD — only read cache + timer persistence. | `src/stores/workhubOfflineStore.ts`, `public/sw-workhub.js` | 4 h |

---

### EPIC 22 — Testing & QA

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-077 | **PHPUnit tests for WorkHub controllers.** Test cases: task CRUD with tenant isolation, timer start/stop/pause state machine, completion record creation with validation, plan limit enforcement (test all 5 limit types), RBAC right checks per endpoint, audit log entry creation, billing invoice auto-generation trigger. | `api/tests/app/Controllers/WorkHub/` | 6 h |
| WH-078 | **WorkHub TAP / Jest test suite (30 automated tests per requirements).** Test coverage: task list render, filter chips, timer states and transitions, done report modal steps, AI correction diff view, signature pad validation, capacity card colours, batch-location panel, inbox unread count, offline banner display, PDF download triggers, plan gate redirect. | `src/tests/WorkHub/` | 8 h |
| WH-079 | **E2E golden path: task creation → timer → done report → invoice.** Playwright/Cypress test: (1) create task with worker capacity card assignment, (2) start timer, add break, stop timer, (3) open done report: fill note, AI correct, add material, upload photo, draw worker signature, input customer signature, submit, (4) verify completion record saved, (5) verify draft invoice created with correct line items, (6) download completion certificate PDF. | `tests/e2e/workhub-golden-path.spec.ts` | 5 h |

---

### EPIC 23 — Security & Compliance

#### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-080 | **CORS and rate limiting for WorkHub AI endpoints.** `/api/workhub/ai/*` endpoints: rate limit 60 req/min per tenant JWT, 10 req/min per user. Return `429 Too Many Requests` with `Retry-After` header. Prevents AI credit abuse. Validate Anthropic API key is stored server-side only (never exposed to client). | `api/app/Filters/WorkHubRateLimitFilter.php` | 2 h |
| WH-081 | **S3 signed URL expiry for WorkHub photos.** All photo URLs returned by API must be pre-signed with 15-minute expiry. Never expose raw S3 bucket URLs. Photo paths must include `tenant_id` prefix to prevent cross-tenant path traversal. Validate MIME type server-side on upload (libmagic / finfo). | `api/app/Services/WorkHubStorageService.php` | 2 h |
| WH-082 | **GDPR data subject rights for WorkHub data.** Extend existing tenant data export to include WorkHub records: tasks, time entries, completion records, signatures, photos (as ZIP). Extend data deletion flow: anonymise `worker_id`, `customer_name`, `customer_signature_data` on user deletion request, preserve aggregate records for §257 HGB retention period. | `api/app/Services/GdprExportService.php`, `api/app/Services/GdprDeletionService.php` | 3 h |
| WH-083 | **eIDAS signature metadata storage.** On customer signature capture: store `signed_ip`, `signed_user_agent`, `signed_at` (UTC), `consent_text_version` (hash of displayed consent text). This constitutes Simple Electronic Signature metadata per eIDAS 910/2014. Do NOT store biometric data. Include in completion certificate PDF as "Signature Evidence" section. | `api/app/Controllers/WorkHub/CompletionController.php`, PDF template | 2 h |

---

### EPIC 24 — Documentation

#### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-084 | **Update `docs/en/Modules/README.md` with WorkHub entry.** Add WorkHub row to module status table: Module, Status, Score, Priority, Stack. | `docs/en/Modules/README.md` | 0.5 h |
| WH-085 | **Create WorkHub API reference doc.** List all endpoints with method, path, auth, request schema, response schema, plan limit notes. Follow pattern of existing `docs/developer/` files. | `docs/developer/workhub_api.md` | 3 h |
| WH-086 | **Create WorkHub compliance doc.** Summarise legal requirements and how each is met: §16 ArbZG → time_entries table + break enforcement, eIDAS → signature metadata, GDPR → consent form + data rights, §257 HGB → 10-year retention guard, BSI IT-Grundschutz → security controls checklist. | `docs/en/Modules/workhub-compliance.md` | 2 h |
| WH-087 | **Help content for WorkHub (tenant-facing).** Add WorkHub section to existing help/wiki pages: getting started for each role, timer how-to, done report walkthrough, PDF export guide, offline mode note. Matches structure of `WorkHub_Help_requirements.md`. | `docs/en/Modules/workhub-help.md` | 3 h |

---

### EPIC 25 — Module Event Bus (Phase 2 — Post-MVP)

#### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| WH-088 | **Event bus integration: PC-13 Fault → WorkHub task auto-create.** When PC-13 anomaly detection fires `fault.detected` event: auto-create WorkHub task with `pfe_ref_type = 'pc13'`, `pfe_ref_id = anomaly_id`, `priority = urgent`, assign to available worker. Requires event bus adapter (WebSocket + async queue). S1 scenario from Module Interactions requirements. | `api/app/Services/WorkHubEventBusService.php` | 5 h |
| WH-089 | **Event bus integration: completion → PC-13 close-fault feedback.** On WorkHub task with `pfe_ref_type = 'pc13'` being dual-signed: publish `fault.resolved` event back to PC-13 with `task_id`, `completion_record_id`, `resolved_at`. | `api/app/Services/WorkHubEventBusService.php` | 2 h |
| WH-090 | **Event bus integration: WorkHub completion → billing auto-invoice line.** On `task.completed` with dual-signature: publish `billing.line_item.create` event. Billing module subscribes and creates invoice line item. Async — completion does NOT wait for billing confirmation. Use fire-and-confirm pattern with correlation ID in audit log. | `api/app/Services/WorkHubBillingService.php` | 3 h |
| WH-091 | **Avatar role change → WorkHub verification task.** S4 scenario: when SCLAN Avatar system fires `role.change_requested`, auto-create WorkHub verification task assigned to Manager. On completion, publish `role.change_verified` event. | `api/app/Services/WorkHubEventBusService.php` | 3 h |

---

## Completed Items

### Sprint 7 — Epics 6–8: Files, Print, Workers, Projects, Customers, WebSocket, Inbox (2026-05-27)

| Item | Done | Files |
|------|------|-------|
| WH-029 File upload (photo, MIME validation, S3) | 2026-05-27 | `api/app/Controllers/WorkHub/FileController.php` — `POST /workhub/files/upload`, identity-photo replacement, storage plan-limit check, presigned URL return |
| WH-030 PDF generation (6 document types) | 2026-05-27 | `api/app/Controllers/WorkHub/PrintController.php` — `GET /workhub/print/{type}/{id}`, dompdf (HTML fallback), plan-limit check, audit log |
| WH-031 Workers list + profile endpoints | 2026-05-27 | `api/app/Controllers/WorkHub/WorkerController.php` — `GET /workers`, `GET /workers/{id}`, `GET /profile` (auto-create), `PATCH /profile` (capacity, skills, language) |
| WH-032 Project CRUD with task stats | 2026-05-27 | `api/app/Controllers/WorkHub/ProjectController.php` — full CRUD, progress %, tasks_by_status, customer_name; delete blocked on open tasks |
| WH-033 Customer CRUD with tenant isolation | 2026-05-27 | `api/app/Controllers/WorkHub/CustomerController.php` — full CRUD, optional `client_id` FK to billing clients; delete blocked on active projects |
| WH-034 WebSocket event broadcasting | 2026-05-27 | `api/app/Services/WorkHubWebSocketService.php` — Pusher SDK → raw HTTP → DB fallback; named methods for all 8 event types |
| WH-035 Inbox CRUD + WebSocket push | 2026-05-27 | `api/app/Controllers/WorkHub/InboxController.php` — list (unread first), create+broadcast, mark-read, mark-all-read, unread-count |
| Epics 6–8 routes | 2026-05-27 | `api/app/Config/Routes.php` — 15 new route groups covering files, print, workers, projects, customers, inbox |
| dompdf dependency | 2026-05-27 | `api/composer.json` — `"dompdf/dompdf": "^2.0"` added; run `cd api && composer update` |

---

### Sprint 6 — Testing, Security, Compliance, Documentation (2026-05-27)

| Item | Done | Files |
|------|------|-------|
| WH-077 PHPUnit tests for WorkHub controllers | 2026-05-27 | `api/tests/app/Controllers/WorkHub/TaskControllerTest.php`, `TimerControllerTest.php`, `CompletionControllerTest.php`, `PlanLimitEnforcementTest.php` |
| WH-078 Vitest Jest test suite (30 tests) | 2026-05-27 | `vitest.config.ts`, `src/tests/setup.ts`, `src/tests/WorkHub/TaskList.test.tsx`, `TimerWidget.test.tsx`, `WorkHubComponents.test.tsx`, `offlineStore.test.ts`; `package.json` (vitest + @testing-library/react + msw + jsdom) |
| WH-079 E2E golden path Playwright test | 2026-05-27 | `tests/e2e/workhub-golden-path.spec.ts` — 6-step: task create → timer → done report → completion verify → invoice verify → PDF download |
| WH-080 Rate limiting for AI endpoints | 2026-05-27 | `api/app/Filters/WorkHubRateLimitFilter.php` — 60/min tenant, 10/min user, 429+Retry-After; `api/app/Config/Filters.php` (alias registered); `api/app/Config/Routes.php` (`wh_ratelimit` added to AI routes) |
| WH-081 S3 signed URL service | 2026-05-27 | `api/app/Services/WorkHubStorageService.php` — MIME validation via finfo, 15-min presign, tenant-scoped paths, dev fallback |
| WH-082 GDPR data subject rights | 2026-05-27 | `api/app/Services/GdprExportService.php` (Art. 15 ZIP export), `api/app/Services/GdprDeletionService.php` (Art. 17 erasure with §257 HGB exception) |
| WH-083 eIDAS consent text hash | 2026-05-27 | `api/app/Controllers/WorkHub/CompletionController.php` — `consent_text_version` now stores SHA-256 of displayed consent text when `consent_text` field provided |
| WH-084 README.md WorkHub entry | — | Already updated in Sprint 5 |
| WH-085 WorkHub API reference doc | 2026-05-27 | `docs/developer/workhub_api.md` — all endpoints, request/response schemas, plan limit codes, error table |
| WH-086 WorkHub compliance doc | 2026-05-27 | `docs/en/Modules/workhub-compliance.md` — §16 ArbZG, eIDAS, GDPR, §257 HGB, BSI IT-Grundschutz checklist |
| WH-087 WorkHub help content | 2026-05-27 | `docs/en/Modules/workhub-help.md` — per-role getting started, timer how-to, done report walkthrough, PDF export, offline mode, compliance notes |

---

### Sprint 5 — Capacity, Inbox, PDFs, Audit, Offline (2026-05-27)

| Item | Done | Files |
|------|------|-------|
| WH-051 Worker capacity card grid | 2026-05-27 | `src/components/screens/WorkHub/CapacityCard.tsx` — `CapacityCard` + `CapacityGrid` components |
| WH-052 Inbox / notifications screen | 2026-05-27 | `src/pages/WorkHub/WorkHubInbox.tsx` — filter chips, mark read, message detail panel |
| WH-053 Worker profile screen | 2026-05-27 | `src/pages/WorkHub/WorkHubProfile.tsx` — capacity hours, skills, language prefs, identity photo status |
| WH-054 Timesheet weekly calendar view | 2026-05-27 | `src/pages/WorkHub/WorkHubTimesheet.tsx` — week nav, daily grid, §16 ArbZG flags, PDF download |
| WH-055 Translation toggle | 2026-05-27 | `src/components/screens/WorkHub/TranslationToggle.tsx` — language selector, skeleton, show-original toggle |
| WH-056 WorkHub i18n strings (5 languages) | 2026-05-27 | `src/translations/en.ts`, `de.ts`, `pl.ts` (workhub.* appended); `src/translations/fr.ts`, `it.ts` (new); `src/utils/i18n.ts` (Language type + loaders) |
| WH-057 6 PDF templates | 2026-05-27 | `api/app/Views/workhub/pdf/work_order.php`, `completion_certificate.php`, `timesheet.php`, `project_status.php`, `invoice.php`, `consent_form.php` |
| WH-058 Task documents tab | 2026-05-27 | `src/components/screens/WorkHub/TaskDocumentsTab.tsx` — 6 doc types, generate/download/re-generate |
| WH-071 Extend AuditTrait for WorkHub events | 2026-05-27 | `api/app/Traits/AuditTrait.php` — `logWorkhubEvent()` with tenant/user/task/IP/old-new values |
| WH-072 WorkHub retention command | 2026-05-27 | `api/app/Commands/WorkHubRetentionCommand.php` — flags approaching-expiry records, blocks premature deletion |
| WH-073 WorkHub dashboard widget | 2026-05-27 | `src/components/screens/Dashboard/WorkHubDashboardWidget.tsx` — stat tiles, active timer indicator |
| WH-075 Offline detection banner | 2026-05-27 | `src/components/screens/WorkHub/OfflineBanner.tsx` — navigator.onLine + API ping, reconnect confirmation |
| WH-076 Offline store + service worker | 2026-05-27 | `src/stores/workhubOfflineStore.ts` (task cache, timer, draft notes, request queue), `public/sw-workhub.js` (NetworkFirst, push notifications) |
| Sprint 5 wiring | 2026-05-27 | `src/pages/WorkHub/WorkHubLayout.tsx` — Inbox/Timesheet/Profile wired into tabs + OfflineBanner mounted |
| Sprint 5 API services | 2026-05-27 | `src/services/workhubApi.ts` — `printService` (generate, listForTask) + `profileService` (get, update) |

---

### Sprint 4 — Billing Integration + SA Admin + Packages (2026-05-27)

| Item | Done | Files |
|------|------|-------|
| WH-059 Auto-generate invoice from completion record | 2026-05-27 | `api/app/Services/WorkHubBillingService.php`, `api/app/Models/InvoiceModel.php` (source fields), `api/app/Database/Migrations/2026-05-27-000012_CreateWorkhubSettingsTable.php` |
| WH-060 WorkHub source badge + filter in InvoiceList | 2026-05-27 | `src/components/screens/InvoiceList.tsx` |
| WH-061 WorkHub hourly rate configuration | 2026-05-27 | `src/pages/WorkHub/WorkHubSettings.tsx`, `api/app/Controllers/WorkHub/SettingsController.php`, `src/services/workhubApi.ts` (settingsService) |
| WH-062 SA Admin WorkHub module toggle per tenant | 2026-05-27 | `src/components/screens/Admin/SAASusers.tsx`, `src/services/adminApi.ts` (toggleWorkhub), `api/app/Controllers/AdminWorkHub.php::toggleTenant()` |
| WH-063 SA Admin WorkHub quota override per tenant | 2026-05-27 | `api/app/Controllers/AdminWorkHub.php::overrideQuota()` |
| WH-064 SA Admin WorkHub usage analytics panel | 2026-05-27 | `src/components/screens/Admin/SAusage.tsx` (WorkHub section) |
| WH-065 SA Admin WorkHub audit log filter | 2026-05-27 | `api/app/Controllers/AuditLogController.php` (?module= filter) |
| WH-066 SA Admin WorkHub compliance report | 2026-05-27 | `api/app/Controllers/AdminWorkHub.php::complianceReport()` |
| WH-067 WorkHub package tiers seeder | 2026-05-27 | `api/app/Database/Seeds/WorkHubPackagesSeeder.php` — Starter/Pro/Enterprise |
| WH-068 Plan limit enforcement methods | 2026-05-27 | `api/app/Traits/PlanLimitTrait.php` — checkWorkhub*() returning 402 error arrays |
| WH-069 WorkHub usage tracking | 2026-05-27 | `api/app/Models/WorkHub/WorkHubUsageModel.php`, `api/app/Traits/UsageEnforcement.php` (increment methods) |
| WH-070 WorkHub upgrade prompt + quota meters | 2026-05-27 | `src/components/screens/WorkHub/UpgradePrompt.tsx`, `src/components/screens/WorkHub/QuotaMeters.tsx` |
| WH-074 WorkHub quick-action FloatingDock launcher | 2026-05-27 | `src/components/screens/WorkHub/WorkHubQuickActions.tsx` |
| Sprint 4 routes | 2026-05-27 | `api/app/Config/Routes.php` — settings + admin workhub routes |

---

### Sprint 1 — DB & Multi-Tenant Foundation (2026-05-27)

| Item | Fixed | Files |
|------|-------|-------|
| WH-001 `workhub_tasks` migration | 2026-05-27 | `Migrations/2026-05-27-000004_CreateWorkhubTasksTable.php`, `Models/WorkhubTaskModel.php` |
| WH-002 `workhub_time_entries` migration | 2026-05-27 | `Migrations/2026-05-27-000005_CreateWorkhubTimeEntriesTable.php`, `Models/WorkhubTimeEntryModel.php` |
| WH-003 `workhub_completion_records` migration | 2026-05-27 | `Migrations/2026-05-27-000006_CreateWorkhubCompletionRecordsTable.php`, `Models/WorkhubCompletionRecordModel.php` |
| WH-004 `workhub_projects` migration | 2026-05-27 | `Migrations/2026-05-27-000002_CreateWorkhubProjectsTable.php`, `Models/WorkhubProjectModel.php` |
| WH-005 `workhub_customers` migration | 2026-05-27 | `Migrations/2026-05-27-000001_CreateWorkhubCustomersTable.php`, `Models/WorkhubCustomerModel.php` |
| WH-006 `workhub_workers` migration | 2026-05-27 | `Migrations/2026-05-27-000003_CreateWorkhubWorkersTable.php`, `Models/WorkhubWorkerModel.php` |
| WH-007 `workhub_task_photos` migration | 2026-05-27 | `Migrations/2026-05-27-000008_CreateWorkhubTaskPhotosTable.php`, `Models/WorkhubTaskPhotoModel.php` |
| WH-008 `workhub_material_entries` migration | 2026-05-27 | `Migrations/2026-05-27-000007_CreateWorkhubMaterialEntriesTable.php`, `Models/WorkhubMaterialEntryModel.php` |
| WH-009 `workhub_inbox_messages` migration | 2026-05-27 | `Migrations/2026-05-27-000009_CreateWorkhubInboxMessagesTable.php`, `Models/WorkhubInboxMessageModel.php` |
| WH-010 `workhub_translation_cache` migration | 2026-05-27 | `Migrations/2026-05-27-000010_CreateWorkhubTranslationCacheTable.php`, `Models/WorkhubTranslationCacheModel.php` |
| WH-011 Extend `PlanLimitTrait` for WorkHub quotas | 2026-05-27 | `Traits/PlanLimitTrait.php` — added `isWorkhubEnabled()`, `withinWorkhubWorkerLimit()`, `withinWorkhubTaskMonthlyLimit()`, `withinWorkhubStorageLimit()`, `withinWorkhubAiCallLimit()`, `withinWorkhubPdfLimit()` |
| WH-012 WorkHub RBAC rights seed | 2026-05-27 | `Seeds/WorkHubRightsSeeder.php` — 13 rights, 5 WorkHub roles, Admin role assignment |

### Sprint 3 — Frontend UI (Epics 9–12) (2026-05-27)

| Item | Done | Files |
|------|------|-------|
| WH-036 WorkHub module entry point and routing | 2026-05-27 | `src/App.tsx` (Screen type + lazy import + route), `src/pages/WorkHub/WorkHubLayout.tsx` |
| WH-037 `<WorkHubGate>` plan-gate + quota meters | 2026-05-27 | `src/components/screens/WorkHub/WorkHubGate.tsx` |
| WH-038 Mobile bottom navigation bar | 2026-05-27 | `src/components/screens/WorkHub/WorkHubMobileNav.tsx` |
| WH-039 Desktop 3-panel layout | 2026-05-27 | `src/components/screens/WorkHub/WorkHubDesktopLayout.tsx` |
| WH-040 Task list with filter chips | 2026-05-27 | `src/components/screens/WorkHub/TaskList.tsx` |
| WH-041 Task detail panel | 2026-05-27 | `src/components/screens/WorkHub/TaskDetail.tsx` |
| WH-042 New task 2-step modal with capacity cards | 2026-05-27 | `src/components/screens/WorkHub/NewTaskModal.tsx` |
| WH-043 Batch location panel | 2026-05-27 | `src/components/screens/WorkHub/BatchLocationPanel.tsx` |
| WH-044 Timer widget + Zustand store | 2026-05-27 | `src/components/screens/WorkHub/TimerWidget.tsx`, `src/stores/workhubTimerStore.ts` |
| WH-045 Timer floating pip (Portal) | 2026-05-27 | `src/components/screens/WorkHub/TimerPip.tsx` |
| WH-046 Done report 6-step modal | 2026-05-27 | `src/components/screens/WorkHub/DoneReportModal.tsx` |
| WH-047 AI text correction UI with diff view | 2026-05-27 | `src/components/screens/WorkHub/AICorrectField.tsx` |
| WH-048 Materials entry table | 2026-05-27 | `src/components/screens/WorkHub/MaterialsTable.tsx` |
| WH-049 Photo capture/upload grid | 2026-05-27 | `src/components/screens/WorkHub/PhotoUploadGrid.tsx` |
| WH-050 Canvas signature pad (eIDAS-compliant) | 2026-05-27 | `src/components/screens/WorkHub/SignaturePad.tsx` |
| Sprint 3 API service | 2026-05-27 | `src/services/workhubApi.ts` — all WorkHub API calls typed |

---

### Sprint 2 — Backend API (Epics 2–5) (2026-05-27)

| Item | Done | Files |
|------|------|-------|
| WH-013 `GET /workhub/tasks` — list with filters + pagination | 2026-05-27 | `Controllers/WorkHub/TaskController.php::index()` |
| WH-014 `POST /workhub/tasks` — create with plan-limit check + inbox notify | 2026-05-27 | `Controllers/WorkHub/TaskController.php::create()` |
| WH-015 `PUT /workhub/tasks/:id` — update with state-machine validation | 2026-05-27 | `Controllers/WorkHub/TaskController.php::update()` |
| WH-016 `DELETE /workhub/tasks/:id` — soft delete, blocks dual-signed (409) | 2026-05-27 | `Controllers/WorkHub/TaskController.php::delete()` |
| WH-017 `GET /workhub/tasks/:id` — full detail: times, completion, materials, photos | 2026-05-27 | `Controllers/WorkHub/TaskController.php::show()` |
| WH-018 `GET /workhub/tasks/batch-location` — tasks by location_tag | 2026-05-27 | `Controllers/WorkHub/TaskController.php::batchLocation()` |
| WH-019 `POST /workhub/tasks/:id/timer/start` — create work entry, auto in_progress | 2026-05-27 | `Controllers/WorkHub/TimerController.php::start()` |
| WH-020 `POST /workhub/tasks/:id/timer/pause` — end work entry, start break entry + §16 ArbZG warning | 2026-05-27 | `Controllers/WorkHub/TimerController.php::pause()` |
| WH-021 `POST /workhub/tasks/:id/timer/stop` — end entry, recalculate logged_hours, §16 ArbZG compliance check | 2026-05-27 | `Controllers/WorkHub/TimerController.php::stop()` |
| WH-022 `GET /workhub/timesheet` — daily breakdown by week or month, overtime flag | 2026-05-27 | `Controllers/WorkHub/TimesheetController.php::index()` |
| WH-023 `GET /workhub/timesheet/export` — plan-limit check + data payload (PDF render: WH-030) | 2026-05-27 | `Controllers/WorkHub/TimesheetController.php::export()` |
| WH-024 `POST /workhub/tasks/:id/completion` — done report: note, materials, signature, GDPR, auto task→done | 2026-05-27 | `Controllers/WorkHub/CompletionController.php::submit()` |
| WH-025 `POST /workhub/completions/:id/customer-signature` — eIDAS metadata, dual-sign flag | 2026-05-27 | `Controllers/WorkHub/CompletionController.php::customerSignature()` |
| WH-026 `GET /workhub/completions/:id` — full record with photos, materials, dual-sign status | 2026-05-27 | `Controllers/WorkHub/CompletionController.php::show()` |
| WH-027 `POST /workhub/ai/correct` — Gemini grammar correction, diff array, plan-limit + throttle | 2026-05-27 | `Controllers/WorkHub/AIController.php::correct()` |
| WH-028 `POST /workhub/ai/translate` — translation cache check → Gemini → cache store, 5 languages | 2026-05-27 | `Controllers/WorkHub/AIController.php::translate()` |
| Sprint 2 migration | 2026-05-27 | `Migrations/2026-05-27-000011_AddSourceToAiqueryHistory.php` — adds `source` column for AI call tracking |
| Sprint 2 routes | 2026-05-27 | `Config/Routes.php` — 7 route groups covering all 16 WorkHub API endpoints |

---

## Architecture Notes

### Tenant Isolation

All WorkHub tables carry a `tenant_id` FK. The existing `TenantScope` trait must be applied to all WorkHub models. S3/R2 storage paths must be prefixed `workhub/{tenant_id}/`. WebSocket channels scoped to `workhub.{tenant_id}.{user_id}`.

### Database Schema (11 tables)

| Table | Purpose |
|-------|---------|
| `workhub_tasks` | Task master with status, priority, PFE ref |
| `workhub_time_entries` | Timer records (§16 ArbZG, EuGH C-55/18) |
| `workhub_completion_records` | Done report: note, signatures, GDPR |
| `workhub_material_entries` | Materials for billing line items |
| `workhub_task_photos` | Jobsite + identity photos (S3 paths) |
| `workhub_projects` | Project containers with colour accents |
| `workhub_customers` | Field-service recipients |
| `workhub_workers` | Worker profiles linked to `users` |
| `workhub_inbox_messages` | In-app notifications |
| `workhub_translation_cache` | AI translation cache (7-day TTL) |
| `workhub_usage_monthly` | Quota tracking per tenant per month |

### Plan Limits JSON Extension

```json
{
  "workhub_enabled": true,
  "workhub_workers": 25,
  "workhub_tasks_per_month": 1000,
  "workhub_storage_mb": 5000,
  "workhub_ai_calls_per_month": 500,
  "workhub_pdf_exports": -1
}
```

`-1` = unlimited. Read by `PlanLimitTrait::checkWorkhub*()` methods.

### WorkHub RBAC Rights

```
workhub.task.view           — Worker, Planner, Manager, Client (own project), Finance
workhub.task.create         — Planner, Manager
workhub.task.edit           — Planner, Manager
workhub.task.delete         — Manager
workhub.task.assign         — Planner, Manager
workhub.timer.start         — Worker
workhub.completion.submit   — Worker
workhub.completion.approve  — Manager
workhub.project.manage      — Manager
workhub.reports.view        — Manager, Finance, Client (own)
workhub.reports.export      — Manager, Finance
workhub.admin.manage        — SA Admin only
workhub.billing.view        — Finance, Manager
```

### Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workhub/tasks` | List tasks (filters: status, worker, project, priority) |
| POST | `/api/workhub/tasks` | Create task |
| GET/PUT/DELETE | `/api/workhub/tasks/{id}` | Task detail / update / delete |
| GET | `/api/workhub/tasks/batch-location` | Tasks at same location |
| POST | `/api/workhub/tasks/{id}/timer/start` | Start work timer |
| POST | `/api/workhub/tasks/{id}/timer/pause` | Start break |
| POST | `/api/workhub/tasks/{id}/timer/stop` | Stop timer |
| GET | `/api/workhub/timesheet` | Worker timesheet |
| GET | `/api/workhub/timesheet/export` | Export timesheet PDF |
| POST | `/api/workhub/tasks/{id}/completion` | Submit done report |
| POST | `/api/workhub/completions/{id}/customer-signature` | Capture customer signature |
| GET | `/api/workhub/completions/{id}` | Get completion record |
| POST | `/api/workhub/ai/correct` | AI grammar correction |
| POST | `/api/workhub/ai/translate` | Content translation |
| POST | `/api/workhub/files/upload` | Photo upload |
| GET | `/api/workhub/print/{type}/{id}` | PDF generation |
| GET | `/api/workhub/workers` | Workers with capacity data |
| GET/POST/PUT/DELETE | `/api/workhub/projects` | Project CRUD |
| GET/POST/PUT/DELETE | `/api/workhub/customers` | Customer CRUD |
| GET/PUT | `/api/workhub/inbox/messages` | Inbox CRUD |
| GET | `/api/workhub/inbox/unread-count` | Badge counter |

### WebSocket Events

| Event | Trigger | Audience |
|-------|---------|---------|
| `task.updated` | Task status/assignment change | All tenant workers |
| `task.assigned` | Worker assigned to task | Assigned worker |
| `task.completed` | Dual-signature complete | Planner, Manager, Finance |
| `timer.started` | Timer start | Manager (visibility) |
| `timer.stopped` | Timer stop | Manager, Finance |
| `translation.ready` | AI translation complete | Requesting user |
| `inbox.message` | New inbox message | Recipient user |

### Compliance Matrix

| Requirement | Implementation |
|-------------|---------------|
| §16 ArbZG + EuGH C-55/18 | `workhub_time_entries` with break tracking, break reminder at 6h |
| eIDAS 910/2014 | Signature metadata (IP, UA, timestamp, consent text hash) |
| GDPR Art. 6(1)(b) | Consent form PDF, gdpr_consent_given field, data rights hooks |
| §257 HGB / §147 AO | Retention guard blocking deletion of billable records for 10 years |
| BSI IT-Grundschutz | TLS 1.2+, JWT auth, rate limiting, signed S3 URLs, input validation |

---

## Effort Summary

| Epic | Items | Estimated Effort |
|------|-------|-----------------|
| Epic 1 — DB & Multi-Tenant Foundation | 12 | ~22 h |
| Epic 2–8 — Backend API | 22 | ~57 h |
| Epic 9–15 — Frontend UI | 23 | ~68 h |
| Epic 16 — Billing Integration | 3 | ~8 h |
| Epic 17 — SA Admin Portal | 5 | ~14.5 h |
| Epic 18 — Packages & Plan Limits | 4 | ~10 h |
| Epic 19 — Audit Log | 2 | ~5.5 h |
| Epic 20 — Dashboard | 2 | ~4 h |
| Epic 21 — Offline Mode | 2 | ~5 h |
| Epic 22 — Testing & QA | 3 | ~19 h |
| Epic 23 — Security & Compliance | 4 | ~9 h |
| Epic 24 — Documentation | 4 | ~8.5 h |
| Epic 25 — Event Bus (Phase 2) | 4 | ~13 h |
| **Total** | **91 items** | **~243 h** |

### Recommended Implementation Order

1. **Sprint 1** — Epic 1 (DB migrations + RBAC seeds + plan limits schema) — unblocks everything
2. **Sprint 2** — Epic 2–5 (Core task, timer, completion, AI backend APIs)
3. **Sprint 3** — Epic 9–12 (Frontend layout, task management, timer UI, done report)
4. **Sprint 4** — Epic 16 + 17 + 18 (Billing integration + SA admin + packages)
5. **Sprint 5** — Epic 13–15 + 19–21 (Capacity, inbox, PDFs, audit, offline, dashboard)
6. **Sprint 6** — Epic 22–24 (Tests, security hardening, compliance, docs)
7. **Phase 2** — Epic 25 (Event bus integrations: PC-13, PFE, Avatar, billing events)
