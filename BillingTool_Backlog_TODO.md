# BillingTool — Backlog & TODO
**Generated:** 2026-04-28  
**Last updated:** 2026-05-08 — CMS publish workflow, frontend performance optimisations, Telegram ticket notifications  
**Based on:** BillingTool_Complete_Analysis.docx (2026-04-23) + codebase audit (2026-04-28)  
**Stack:** React 18 + TypeScript (Vite) / CodeIgniter 4 (PHP 8.1) / MySQL

---

## Legend
| Symbol | Meaning |
|--------|---------|
| ✅ DONE | Fully implemented and working |
| 🔶 PARTIAL | Scaffolding exists; feature incomplete |
| ❌ OPEN | Not started or gap confirmed open |
| 🔴 CRITICAL | Security vulnerability or data integrity risk |
| 🆕 NEW | Discovered or fixed after 2026-04-23 analysis |

---

## 1. What Has Been Completed (since 2026-04-23 analysis)

These gaps were identified in the original analysis and have since been resolved.

| # | Item | Files Changed |
|---|------|---------------|
| ✅ | Business Letter: separate LetterEditor, LetterList, LetterPreview components | `src/components/screens/Letter*.tsx` |
| ✅ | Business Letter: rich-text body editor (RichTextEditor) wired in LetterEditor | `LetterEditor.tsx` |
| ✅ | Business Letter: salutation and closing fields exposed in editor UI | `LetterEditor.tsx` |
| ✅ | Business Letter: auto-numbering wired to `letterNumberFormat` from company profile | `App.tsx` |
| ✅ | Business Letter: letter number click in list navigates to preview (not editor) | `LetterList.tsx:341` |
| ✅ | Business Letter: New Letter button and AI-generated letters open in preview mode | `App.tsx` |
| ✅ | Business Letter: Back button in preview returns to letters list | `App.tsx` |
| ✅ 🆕 | Invoice/Letter: selected template now persisted to DB (`template_id` column) | `Migration 2026-04-28`, `InvoiceModel.php`, `InvoiceController.php` |
| ✅ 🆕 | Business Letter PDF: header/footer text fully rendered (replaced html2canvas with native jsPDF text) | `letter-pdf.ts` |
| ✅ 🆕 | Business Letter PDF: removed decorative separator lines (title divider, footer line, signature overline) | `letter-pdf.ts` |
| ✅ | Workspace: added to sidebar navigation | `AppSidebar.tsx` |
| ✅ | Legal pages: Privacy Policy, Terms, Cookie Policy, Impressum added | `src/components/screens/` |
| ✅ | Multilingual documentation system and SAWiki improvements | `SAWiki.tsx`, `AdminWiki.php` |
| ✅ | Support tickets: priority enum choices corrected to match backend validation | `SATickets.tsx` |
| ✅ | AI letter body improvement: "Improve with AI" button in LetterPreview | `LetterPreview.tsx`, `AIInvoiceController.php` |
| ✅ | Global AI Assistant: letter generation flow (salutation, body, closing, recipient) | `GlobalAIAssistant.tsx` |
| ✅ 🆕 | CMS: `is_published` toggle + Published/Draft badge in SAPages UI; backend `updatePage()` now writes `is_published` | `SAPages.tsx`, `CmsController.php` |
| ✅ 🆕 | CMS: `nav_order` number input exposed in Page Configuration card; backend saves it | `SAPages.tsx`, `CmsController.php` |
| ✅ 🆕 | CMS: About page image upload now calls `uploadCmsImage()` API and stores server URL (was storing raw base64) | `SAPages.tsx`, `adminApi.ts` |
| ✅ 🆕 | CMS: "View Live" button for each page using slug → route mapping | `SAPages.tsx` |
| ✅ 🆕 | Frontend perf: `useDebounce` hook (400 ms) applied to search inputs in InvoiceList, SAASusers, SAbilling — eliminates per-keystroke API calls | `src/hooks/useDebounce.ts`, `InvoiceList.tsx`, `SAASusers.tsx`, `SAbilling.tsx` |
| ✅ 🆕 | Frontend perf: `staleTime: 30 min` applied to static catalog queries (package-services, packages list) | `SApackages.tsx`, `SAPackageServices.tsx`, `SAPackageForm.tsx` |
| ✅ 🆕 | Frontend perf: Vite `manualChunks` splits 4.1 MB vendor bundle into separately-cached chunks (react-core, radix, react-query, state, vendor-pdf-tools, vendor-charts, vendor-editor, vendor-ai) | `vite.config.ts` |
| ✅ 🆕 | Telegram ticket notifications: `TelegramService` sends HTML messages to configured channel on ticket create, update, and bulk-update | `api/app/Services/TelegramService.php`, `TicketController.php` |
| ✅ 🆕 | Telegram admin UI: Bot Token (masked), Chat ID, Enable toggle, and Test button in Admin → Settings | `SAsettings.tsx`, `AdminSettings.php`, `adminApi.ts`, `Routes.php` |
| ✅ 🆕 | Telegram migration: `telegram_bot_token`, `telegram_chat_id`, `telegram_enabled` columns added to `platform_company_details` | migration `2026-05-08-000001` |

---

## 2. Open Backlog — Prioritized

### SPRINT 1 — Critical Security (fix before any production traffic)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| ~~S1-01~~ | ✅ DONE | ~~**Hardcoded "password123" in admin password reset**~~ → generates cryptographically random 12-char password, returned as `temp_password` in response | `api/app/Controllers/AdminUsers.php:252` | 1 h |
| ~~S1-02~~ | ✅ DONE | ~~**AI workspace search SQL injection**~~ → `validateAiWhereClause()` allowlists only file-metadata columns; rejects any DML/DDL/dangerous functions; applied to both fresh AI output and cached history | `api/app/Controllers/WorkspaceController.php` | 2 h |
| ~~S1-03~~ | ✅ DONE | ~~**OTP endpoint has no rate limiting**~~ → CodeIgniter Throttler enforces max 3 OTPs per email per 15 min + max 10 per IP per 15 min | `api/app/Controllers/QuickAccessAuth.php` | 0.5 h |
| ~~S1-04~~ | ✅ DONE | ~~**Quick-access draft tokens are guessable**~~ → OTP no longer stored in `quick_access_sessions`; `client_ip` added; migration drops `otp` column | `api/app/Controllers/QuickAccessAuth.php`, `migration 2026-05-05-000001` | 1 h |
| ~~S1-05~~ | ✅ DONE | ~~**No rate limiting on AI endpoints**~~ → `checkAiRateLimit()` uses CodeIgniter Throttler at 20 calls/hour per user; applied to `parseInvoice()` and `improveLetterBody()` | `api/app/Controllers/AIInvoiceController.php` | 1.5 h |
| ~~S1-06~~ | ✅ DONE | ~~**customerApi.ts has no request interceptor**~~ → Axios request interceptor reads token from `useAuthStore`; 401 response interceptor calls `logout()` | `src/services/customerApi.ts` | 1 h |

**Sprint 1 total: ~7 hours — ✅ ALL DONE (2026-05-05)**

---

### SPRINT 2 — High Priority UX & Data Integrity

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| ~~S2-01~~ | ✅ DONE | ~~**Invoice duplicate does not persist**~~ → `handleDuplicate()` now calls `invoiceService.create(copy)` and re-fetches the list | `src/components/screens/InvoiceList.tsx` | 1 h |
| ~~S2-02~~ | ✅ DONE | ~~**Settings: logo upload is plain text input**~~ → `ImageUploadField` component with FileReader converts file to base64 data URL; stored as TEXT in DB | `src/components/screens/Settings.tsx` | 1 h |
| ~~S2-03~~ | ✅ DONE | ~~**Settings: invoice/letter number format has no preview**~~ → `formatNumberPreview()` renders live example below each input using current year/month + sequence 42/7; supports `{YYYY}`, `{YY}`, `{MM}`, `{NNN…}` | `src/components/screens/Settings.tsx` | 1.5 h |
| ~~S2-04~~ | ✅ DONE | ~~**Settings: company signature upload missing**~~ → same `ImageUploadField` widget added for signature; `signatureUrl` wired end-to-end (type → model → controller → migration `2026-05-05-000002`) | `src/components/screens/Settings.tsx`, `CompanyProfileController.php`, `CompanyProfileModel.php` | 1 h |
| ~~S2-05~~ | ✅ DONE | ~~**Audit log: authenticated user ID not captured**~~ → `AuditTrait::logAction()` decodes JWT from `Authorization` header as fallback when session is empty | `api/app/Traits/AuditTrait.php` | 1 h |
| S2-06 | ~~HIGH~~ | ~~**Template designer: drag-drop boundary constraints missing**~~ — **FIXED**: `handlePointerMove` now uses element `w`/`h` + `CANVAS_W`/`CANVAS_H` constants to clamp X ∈ [0, CANVAS_W − elW] and Y ∈ [0, CANVAS_H − elH]; inspector X/Y inputs also clamp on manual entry | `src/components/invoice/TemplateDesignLayout.tsx:106–111,593–608` | ✅ Done |
| ~~S2-07~~ | ✅ DONE | ~~**Quick-access pending action uses localStorage**~~ → all `qa_pending_action` references switched to `sessionStorage` across `InlineQuickAccess.tsx`, `QuickAccessInvoice.tsx`, `App.tsx`, `Login.tsx` | `src/components/screens/` (4 files) | 1 h |
| ~~S2-08~~ | ✅ DONE | ~~**RBAC: permission checks not applied**~~ → `RbacFilter` now checks `user_roles → roles.is_super_admin = 1` (removed `users.role` shortcut); `UserModel::hasRight()` fast-path removed; `Auth::signup()` assigns super-admin role to new tenant owner | `RbacFilter.php`, `UserModel.php`, `Auth.php` | 6–8 h |
| ~~S2-09~~ | ✅ DONE | ~~**Invoice sharing link missing backend**~~ → `POST invoices/{id}/share` generates `bin2hex(random_bytes(32))` token; `GET api/public/invoices/{token}` returns full invoice+lines unauthenticated; share button in InvoiceList copies URL to clipboard | `InvoiceController.php`, `Routes.php`, `api.ts`, `InvoiceList.tsx`, migration `2026-05-06-000001` | 2 h |
| S2-10 | MEDIUM | **Invoice: no attachment upload UI** — `invoice.attachments` array is typed but there is no file picker or upload in the editor | `src/components/screens/InvoiceEditor.tsx` | 3 h |

**Sprint 2 total: ~19 hours**

---

### SPRINT 3 — Billing, Subscriptions & Admin Data Accuracy

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S3-01 | HIGH | **Stripe webhook integration — payment history is empty stub** — `GET /billing/payment-history` returns `[]`; requires webhook listener + `billing_invoices` table | `api/app/Controllers/Billing.php:158–163`, `Webhooks.php` (skeleton exists) | 5–6 h |
| ~~S3-02~~ | ✅ DONE | ~~**Stripe price IDs are hardcoded mock values**~~ → reads `plans.stripe_price_id` from DB; returns 422 if column empty; customer email uses real tenant owner address | `api/app/Controllers/Billing.php` | 2 h |
| ~~S3-03~~ | ✅ DONE | ~~**No plan limit enforcement**~~ → `PlanLimitTrait` reads `plans.limits` JSON, counts monthly invoices/letters or total buyers; `InvoiceController::create()` and `BuyerController::create()` return 429 when limit exceeded | `api/app/Traits/PlanLimitTrait.php`, `InvoiceController.php`, `BuyerController.php` | 4–5 h |
| S3-04 | MEDIUM | **No plan downgrade or cancellation** — only upgrade flow exists; no endpoint for downgrade or subscription cancel | `api/app/Controllers/Billing.php`, `src/components/screens/Billing.tsx` | 2 h |
| S3-05 | MEDIUM | **Admin: admin-upgrade-plan endpoint is a stub** — `AdminUsers.php:213–219` returns a placeholder response | `api/app/Controllers/AdminUsers.php:213–219` | 2–3 h |
| S3-06 | MEDIUM | **Admin billing: invoice-by-ID returns hardcoded mock** | `api/app/Controllers/AdminBilling.php:104–124` | 1 h |
| S3-07 | MEDIUM | **Admin billing: PDF download returns mock content** — `/admin/billing/invoices/:id/pdf` streams a static placeholder | `api/app/Controllers/AdminBilling.php:130–139` | 3 h |
| ~~S3-08~~ | ✅ DONE | **Admin analytics: export CSV is hardcoded mock** → replaced with real 12-month data (storage, API calls, download bandwidth, active users) | `AdminAnalytics.php:exportUsage()` | — |
| ~~S3-09~~ | ✅ DONE | **Admin analytics: session count uses `rand()` filler** → replaced with distinct active tenant count from `aiquery_history` + `invoices` per time window | `AdminAnalytics.php:usage()` | — |
| ~~S3-10~~ | ✅ DONE | **Admin analytics: bandwidth metric is disk size, not transfer** → `download_logs` table created; `WorkspaceController::download()` + `downloadZip()` log bytes; historical chart reads real download bytes | `WorkspaceController.php`, `AdminAnalytics.php`, migration `2026-04-28-000003` | — |
| ~~S3-11~~ | ✅ DONE | **Admin analytics: churn rate formula is wrong** → fixed to monthly churn: tenants suspended this month ÷ tenants existing at month start | `AdminAnalytics.php:dashboard()` | — |
| ~~S3-12~~ | ✅ DONE | ~~**Admin users: last login always returns `now()`**~~ → `Auth::login()` writes real timestamp to `users.last_login`; `AdminUsers` selects `MAX(users.last_login)`; `UserModel::allowedFields` includes `last_login` | `Auth.php`, `AdminUsers.php`, `UserModel.php` | 1.5 h |
| S3-13 | LOW | **Admin users: default usage limits hardcoded in PHP** — should read from the tenant's plan limits | `api/app/Controllers/AdminUsers.php:300–305` | 1 h |
| ~~S3-14~~ | ✅ DONE | ~~**Admin users: email fallback uses fake domain**~~ → both `@tech-portal.io` fallbacks replaced with `null` | `api/app/Controllers/AdminUsers.php` | 0.5 h |
| ~~S3-15~~ | ✅ DONE | ~~**Admin users: CSV export lacks usage columns**~~ → added Email, Last Login, Storage Used (GB), API Calls, Bandwidth Used (GB); proper CSV quoting via `csvCell()` | `api/app/Controllers/AdminUsers.php` | 1 h |
| ~~S3-16~~ | ✅ DONE | ~~**Admin packages: currency hardcoded to EUR**~~ → `currency` column added to `plans` table (default EUR); both `index()` and `show()` read `$plan['currency']` | `AdminPackages.php`, migration `2026-05-06-000002` | 1 h |
| S3-17 | LOW | **Admin packages: features JSON has no schema validation** — stale service references silently skipped by `syncLimitsFromFeatures()` | `api/app/Controllers/AdminPackages.php` | 1.5 h |
| S3-18 | LOW | **Admin packages: no plan retirement workflow** — deactivated plans still show in subscriber accounts with no notification or migration path | `api/app/Controllers/AdminPackages.php`, email service | 3 h |

**Sprint 3 total: ~41 hours**

---

### SPRINT 4 — Medium Polish & Missing Features

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S4-01 | MEDIUM | **Two-factor authentication (TOTP)** — `Auth.php` issues JWT immediately after password; no TOTP step; no `totp_secret` column | `api/app/Controllers/Auth.php`, users migration | 5–6 h |
| ~~S4-02~~ | ✅ DONE | ~~**Admin wiki: edit capability missing**~~ → `AdminWiki::write()` + `PUT wiki/write` route; SAWiki.tsx has Edit/Save/Cancel buttons; monospace textarea replaces viewer; path-traversal + `.md`-only guards | `AdminWiki.php`, `Routes.php`, `adminApi.ts`, `SAWiki.tsx` | 3–4 h |
| S4-03 | 🔶 PARTIAL | **Admin CMS editor: RichTextEditor per section** — publish workflow ✅ done (2026-05-08: is_published toggle, nav_order, View Live, image upload via API); RichTextEditor for section content still plain textarea | `src/components/screens/Admin/SAPages.tsx` | 2 h |
| S4-04 | ~~MEDIUM~~ | ~~**Template library: no live preview thumbnail**~~ — **FIXED**: `TemplateMiniPreview` now renders actual `template.layout` elements as coloured SVG blocks (per-type fill + accent colours, label line + content lines scaled to element height); falls back to generic static SVG when no layout is defined | `src/components/screens/TemplateLibrary.tsx:20–100` | ✅ Done |
| ~~S4-05~~ | ✅ DONE | ~~**Admin system settings: no email test button**~~ → `POST settings/test-email` + `testEmail()` in controller; SAsettings has recipient input + button | `AdminSettings.php`, `Routes.php`, `adminApi.ts`, `SAsettings.tsx` | 1.5 h |
| ~~S4-06~~ | ✅ DONE | ~~**Admin system settings: no system health check**~~ → `GET settings/health` checks DB, disk %, SMTP host, Gemini key, PHP version; SAsettings shows per-check status icons + overall badge | `AdminSettings.php`, `Routes.php`, `adminApi.ts`, `SAsettings.tsx` | 2 h |
| S4-07 | ~~MEDIUM~~ | ~~**Tickets: no email notification**~~ — **FIXED**: `create()` emails all super admins; `update()` emails submitter (if `user_id` set) when a comment is added; assignment emails the newly assigned admin | `TicketController.php` | ✅ Done |
| S4-08 | ~~MEDIUM~~ | ~~**Tickets: no assignment to specific admin user**~~ — **FIXED**: `assigned_to` column added (migration `2026-04-28-000004`); `update()` tracks assignment changes + emails assignee; SATicketDetails has assignee dropdown; SATickets shows assignee column | `TicketController.php`, `SATickets.tsx`, `SATicketDetails.tsx` | ✅ Done |
| S4-09 | ~~MEDIUM~~ | ~~**Tickets: no SLA / response time tracking**~~ — **FIXED**: `first_response_at` auto-stamped on first admin comment; `resolved_at` auto-stamped on status → resolved/closed; SATicketDetails shows "First Response" and "Resolution Time" cards with human-readable durations | `TicketController.php`, `SATicketDetails.tsx` | ✅ Done |
| S4-10 | ~~MEDIUM~~ | ~~**Tickets: no bulk close/resolve action**~~ — **FIXED**: `POST /admin/tickets/bulk-update` endpoint; SATickets has per-row checkboxes + select-all + floating bulk action bar with "Mark Resolved" / "Mark Closed" / "Clear" buttons | `TicketController.php`, `SATickets.tsx` | ✅ Done |
| ~~S4-11~~ | ✅ DONE | ~~**Invoice: status transition not enforced in backend**~~ → `update()` reads current status from DB and validates against allowlist; returns 422 on illegal transitions | `api/app/Controllers/InvoiceController.php` | 1.5 h |
| ~~S4-12~~ | ✅ DONE | ~~**Invoice: fields remain editable after "sent" status**~~ → `isLocked` flag for `sent/paid/cancelled`; amber read-only banner; `<fieldset disabled>` wraps entire editor grid; Save button disabled | `src/components/screens/InvoiceEditor.tsx` | 1 h |
| S4-13 | LOW | **Invoice: signature capture UI missing** — `invoice.signed` field exists in DB and type but no signature widget | `src/components/screens/InvoiceEditor.tsx` or `InvoicePreview.tsx` | 3 h |
| ~~S4-14~~ | ✅ DONE | ~~**Workspace: temp ZIP files not cleaned up**~~ → `register_shutdown_function` in `downloadZip()` deletes the ZIP on script exit; startup scan also purges any ZIPs older than 1 hour | `api/app/Controllers/WorkspaceController.php` | 0.5 h |
| S4-15 | LOW | **Workspace: content indexing failures are silent** — `ContentExtractor::extract()` failures caught and discarded; non-indexed files appear searchable but return no results | `api/app/Controllers/WorkspaceController.php:~419–421` | 1 h |
| S4-16 | LOW | **Dashboard: no custom date range picker** — charts always show fixed last-6-months window | `src/components/screens/Dashboard.tsx` | 2 h |
| S4-17 | LOW | **Dashboard: no buyer-level analytics** — revenue per buyer, top buyers by invoice value | `src/components/screens/Dashboard.tsx`, `InvoiceController.php` | 3 h |
| S4-18 | LOW | **Audit log: no field-level diff capture** — logAction() records event type but not which fields changed or old/new values | `api/app/Traits/AuditTrait.php` | 2 h |

**Sprint 4 total: ~41 hours**

---

## 3. Master Module Status Table

| Module | Status | Score | Critical Gaps |
|--------|--------|-------|---------------|
| Invoice CRUD | ✅ DONE | 10/10 | Fixed 2026-05-06 (status transition guard, field locking, share link) |
| Business Letter | ✅ DONE | 9/10 | None remaining |
| Invoice PDF | ✅ DONE | 9/10 | — |
| Letter PDF | ✅ DONE | 9/10 | Fixed 2026-04-28 (header/footer text, lines) |
| Template persistence | ✅ 🆕 DONE | 10/10 | Fixed 2026-04-28 (template_id column added) |
| Buyer Management | ✅ DONE | 10/10 | Fixed 2026-05-05 (plan limit enforcement added) |
| Dashboard | 🔶 PARTIAL | 8/10 | No custom date range, no buyer analytics |
| Multi-language | ✅ DONE | 9/10 | — |
| Legal / CMS Pages | ✅ DONE | 8/10 | — |
| Activity / Audit Log | 🔶 PARTIAL | 8/10 | Fixed 2026-05-05 (user extracted from JWT); no field diffs |
| Template System | ✅ DONE | 10/10 | Fixed 2026-04-28 (drag-drop boundary clamping per element W/H, live SVG preview thumbnails) |
| Company Settings | ✅ DONE | 10/10 | Fixed 2026-05-06 (number format live preview) |
| Workspace / File Mgr | ✅ DONE | 9/10 | Fixed 2026-05-05 (SQL injection validation, stale ZIP purge) |
| Customer Billing | 🔶 PARTIAL | 7/10 | Fixed 2026-05-05 (plan limits enforced, real Stripe price IDs); payment history still stub |
| Authentication | 🔶 PARTIAL | 8/10 | Fixed 2026-05-05 (random temp password, real last_login); 🔴 No 2FA |
| Quick Access Portal | ✅ DONE | 9/10 | Fixed 2026-05-05 (OTP rate limit, OTP not stored, sessionStorage) |
| Admin — Packages | 🔶 PARTIAL | 7/10 | Fixed 2026-05-06 (currency from DB); no retirement workflow |
| Admin — Users | 🔶 PARTIAL | 8/10 | Fixed 2026-05-06 (no fake email, real CSV with usage columns) |
| Admin — Billing | 🔶 PARTIAL | 4/10 | Invoice ID mock, PDF mock, revenue approx |
| Admin — Analytics | ✅ DONE | 9/10 | Fixed 2026-04-28 (real CSV, real sessions, real bandwidth, correct churn) |
| Admin — System Settings | ✅ DONE | 10/10 | Fixed 2026-05-08 (Telegram notifications card: token masking, test button, enable toggle) |
| Admin — Support Tickets | ✅ DONE | 10/10 | Fixed 2026-05-08 (Telegram channel notifications on create/update/bulk-update) |
| Admin — Wiki | ✅ DONE | 9/10 | Fixed 2026-05-06 (edit + save capability) |
| Admin — CMS Editor | 🔶 PARTIAL | 8/10 | Fixed 2026-05-08 (is_published toggle, nav_order, image upload via API, View Live link); RichTextEditor still plain textarea |
| RBAC Enforcement | ✅ DONE | 9/10 | Fixed 2026-05-05 (filter uses user_roles table, signup assigns role, hasRight bypass removed) |
| AI Assistant | 🔶 PARTIAL | 9/10 | Fixed 2026-05-05 (20 req/hr throttle); silent key failures remain |
| Stripe Webhooks | 🔶 PARTIAL | 4/10 | Skeleton `Webhooks.php` exists; payment history still stub |
| Two-Factor Auth | ❌ OPEN | 0/10 | Not started |
| Invoice Sharing | ✅ DONE | 10/10 | Fixed 2026-05-06 (share token endpoint, public view, clipboard copy) |

---

## 4. Security Checklist (must resolve before production)

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| SEC-01 | Admin password reset hardcodes "password123" | 🔴 CRITICAL | `AdminUsers.php:252` | ✅ FIXED 2026-05-05 |
| SEC-02 | Gemini AI workspace search executes raw SQL from API response | 🔴 CRITICAL | `WorkspaceController.php` | ✅ FIXED 2026-05-05 |
| SEC-03 | OTP endpoint has no rate limiting — email spam vector | 🔴 HIGH | `QuickAccessAuth.php` | ✅ FIXED 2026-05-05 |
| SEC-04 | Quick-access draft tokens are short/sequential — guessable | 🔴 HIGH | `QuickAccessAuth.php` | ✅ FIXED 2026-05-05 |
| SEC-05 | AI parse/improve endpoints have no per-user rate limit | 🔴 HIGH | `AIInvoiceController.php` | ✅ FIXED 2026-05-05 |
| SEC-06 | RBAC not enforced — any tenant user can access any feature | 🔴 HIGH | `RbacFilter.php`, `UserModel.php`, `Auth.php` | ✅ FIXED 2026-05-05 |
| SEC-07 | customerApi.ts no 401-retry interceptor — stale tokens not refreshed | MEDIUM | `src/services/customerApi.ts` | ✅ FIXED 2026-05-05 |
| SEC-08 | Temp ZIP files not deleted after download — disk accumulation | LOW | `WorkspaceController.php` | ✅ FIXED 2026-05-05 |

---

## 5. Quick Wins (≤ 1 hour each)

These items are individually small and can be batched into a single session:

| Item | Location | Time |
|------|----------|------|
| ~~Fix hardcoded "password123" → generate random temporary password~~ | ~~`AdminUsers.php:252`~~ | ✅ Done 2026-05-05 |
| ~~OTP rate limiting (max 3 requests per 10 min per email)~~ | ~~`QuickAccessAuth.php`~~ | ✅ Done 2026-05-05 |
| Admin: email fallback fake domain | `AdminUsers.php:77,134` | 0.5 h |
| Admin: CSV export add usage columns | `AdminUsers.php:271–283` | 1 h |
| Admin packages: currency from plan record instead of EUR | `AdminPackages.php:~40` | 1 h |
| ~~Workspace: delete temp ZIP in finally block~~ | ~~`WorkspaceController.php:~631`~~ | ✅ Done 2026-05-05 |
| ~~Audit log: capture authenticated user ID in logAction()~~ | ~~`AuditTrait.php`~~ | ✅ Done 2026-05-05 |
| ~~Admin tickets: bulk close/resolve action~~ | ~~`SATickets.tsx`~~ | ✅ Done 2026-04-29 |
| Invoice: add backend status transition guard | `InvoiceController.php` | 1.5 h |
| Workspace: add non-indexed file badge in UI | `Workspace.tsx`, `WorkspaceController.php:~419` | 1 h |

---

## 6. Effort Summary

| Sprint | Focus | Hours |
|--------|-------|-------|
| Sprint 1 | Critical security | ~7 h |
| Sprint 2 | High UX & data integrity | ~19 h |
| Sprint 3 | Billing, subscriptions, admin data | ~41 h |
| Sprint 4 | Medium polish & missing features | ~41 h |
| **Total** | | **~108 h** |

---

## 7. Recently Introduced Items (discovered 2026-04-28)

These items were not in the April 23 analysis — found during this session's work:

| ID | Item | Status |
|----|------|--------|
| 🆕 | `template_id` column missing from `invoices` table — template selection not persisted | ✅ FIXED — migration + model + controller |
| 🆕 | Letter PDF: header/footer text rendered via html2canvas off-screen → cut off | ✅ FIXED — native jsPDF text rendering |
| 🆕 | Letter PDF: decorative separator lines after title, footer, and signature | ✅ FIXED — lines removed |
| 🆕 | Letter list: clicking letter number navigated to editor instead of preview | ✅ FIXED — `onView` handler wired |
| 🆕 | New letter / AI-generated letter opened in editor instead of preview | ✅ FIXED — navigates to `'preview'` screen |
| 🆕 | Letter preview Back button went to editor instead of letters list | ✅ FIXED — uses `handleBackToDashboard` |

---

## 8. Fixes Applied 2026-05-05

All Sprint 1 security issues and 8 of 10 stability/integrity issues resolved in this session.

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| SEC-01 / S1-01 | Admin password reset: random 12-char password via `random_int()`, returned as `temp_password` | `AdminUsers.php` |
| SEC-02 / S1-02 | AI workspace SQL injection: `validateAiWhereClause()` allowlist (columns + safe operators only) | `WorkspaceController.php` |
| SEC-03 / S1-03 | OTP rate limiting: 3/15 min per email + 10/15 min per IP via CI4 Throttler | `QuickAccessAuth.php` |
| SEC-04 / S1-04 | Quick-access OTP not stored in DB; `client_ip` replaces `otp` column | `QuickAccessAuth.php`, `QuickAccessSessionModel.php`, migration `2026-05-05-000001` |
| SEC-05 / S1-05 | AI endpoint throttle: 20 requests/hour per user via CI4 Throttler | `AIInvoiceController.php` |
| SEC-06 / S1-06 | `customerApi.ts` Axios interceptor injects token from store; 401 calls `logout()` | `src/services/customerApi.ts` |
| Fix #1 / S2-01 | Invoice duplicate calls `invoiceService.create()` + re-fetches list | `src/components/screens/InvoiceList.tsx` |
| Fix #2 / S2-05 | Audit log extracts user name from JWT when session is empty | `api/app/Traits/AuditTrait.php` |
| Fix #3 / S3-03 | `PlanLimitTrait` reads `plans.limits` JSON; invoice, letter, buyer create endpoints return 429 when over limit | `api/app/Traits/PlanLimitTrait.php`, `InvoiceController.php`, `BuyerController.php` |
| Fix #4 / S3-02 | Stripe subscription uses `plans.stripe_price_id` from DB; real tenant owner email | `api/app/Controllers/Billing.php` |
| Fix #5 / S3-01 | **SKIPPED** — payment history requires full Stripe webhook integration | — |
| Fix #6 / S2-08 / SEC-06 | `RbacFilter`: super-admin check via `user_roles → roles.is_super_admin = 1`; `UserModel::hasRight()` old bypass removed; `Auth::signup()` inserts `user_roles` row for tenant owner | `RbacFilter.php`, `UserModel.php`, `Auth.php` |
| Fix #7 / S3-12 | `Auth::login()` writes real `last_login` timestamp; `AdminUsers` queries real value; `UserModel::allowedFields` updated | `Auth.php`, `AdminUsers.php`, `UserModel.php` |
| Fix #8 / S2-02+S2-04 | Settings logo + signature: `ImageUploadField` widget with FileReader → base64 data URL; `signatureUrl` added end-to-end | `Settings.tsx`, `CompanyProfileController.php`, `CompanyProfileModel.php`, migration `2026-05-05-000002` |
| Fix #9 / S2-07 | `qa_pending_action` switched from `localStorage` to `sessionStorage` in 4 files | `InlineQuickAccess.tsx`, `QuickAccessInvoice.tsx`, `App.tsx`, `Login.tsx` |
| Fix #10 / S4-14 | ZIP cleanup: `register_shutdown_function` + startup purge of ZIPs older than 1 hour | `WorkspaceController.php` |

---

## 9. Fixes Applied 2026-05-08

CMS publish workflow, frontend performance optimisations, and Telegram notifications module.

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| CMS #1 | `is_published` toggle + Published/Draft badge; backend `updatePage()` writes `is_published` and `nav_order` | `SAPages.tsx`, `CmsController.php`, `adminApi.ts` |
| CMS #2 | About image upload calls `uploadCmsImage()` API instead of storing raw base64 | `SAPages.tsx` |
| CMS #3 | "View Live" button per page using slug → hash-route map | `SAPages.tsx` |
| CMS #4 | `nav_order` number input in Page Configuration; sent on save | `SAPages.tsx`, `CmsController.php` |
| Perf #1 | `useDebounce` hook (400 ms delay) on search inputs in InvoiceList, SAASusers, SAbilling | `src/hooks/useDebounce.ts`, 3 screen files |
| Perf #2 | `staleTime: 30 min` on static catalog queries (package-services, packages) | `SApackages.tsx`, `SAPackageServices.tsx`, `SAPackageForm.tsx` |
| Perf #3 | Vite `manualChunks`: vendor 4.1 MB → split into react-core (147 kB), radix (116 kB), react-query (35 kB), state (2.7 kB) + feature chunks | `vite.config.ts` |
| Telegram #1 | `TelegramService`: non-blocking cURL sender (5 s timeout); `ticketCreated()`, `ticketUpdated()`, `ticketsBulkUpdated()` message builders | `api/app/Services/TelegramService.php` |
| Telegram #2 | `TicketController`: lazy `telegram()` helper; Telegram calls added in `create()`, `update()`, `bulkUpdate()` | `api/app/Controllers/TicketController.php` |
| Telegram #3 | `AdminSettings`: token masking on `index()` (returns last 4 chars only); Telegram fields in `updateSystemSettings()`; `testTelegram()` method | `api/app/Controllers/AdminSettings.php` |
| Telegram #4 | Migration: `telegram_bot_token`, `telegram_chat_id`, `telegram_enabled` columns in `platform_company_details` | migration `2026-05-08-000001` |
| Telegram #5 | Admin UI: Telegram Notifications card in SAsettings with enable toggle, masked token input, Chat ID input, Save + Test buttons | `src/components/screens/Admin/SAsettings.tsx` |
| Telegram #6 | Route + API service: `POST admin/settings/test-telegram`; `adminSettingsService.testTelegram()` | `Routes.php`, `src/services/adminApi.ts` |
| Telegram #7 | `PlatformCompanyDetailsModel`: added 3 Telegram fields to `$allowedFields` | `api/app/Models/PlatformCompanyDetailsModel.php` |
