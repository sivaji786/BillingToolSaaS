# BillingTool — Backlog & TODO
**Generated:** 2026-04-28  
**Last updated:** 2026-05-13 — Full performance optimisation pass (Phases 1–7), DB indexes, server-side pagination, JWT startup skip, audit log TTL  
**Based on:** BillingTool_Complete_Analysis.docx (2026-04-23) + codebase audit (2026-04-28) + performance.md (2026-05-12)  
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
| ⚡ PERF | Performance / code-quality item |

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
| ✅ 🆕 | Business Letter PDF: removed decorative separator lines | `letter-pdf.ts` |
| ✅ | Workspace: added to sidebar navigation | `AppSidebar.tsx` |
| ✅ | Legal pages: Privacy Policy, Terms, Cookie Policy, Impressum added | `src/components/screens/` |
| ✅ | Multilingual documentation system and SAWiki improvements | `SAWiki.tsx`, `AdminWiki.php` |
| ✅ | Support tickets: priority enum choices corrected | `SATickets.tsx` |
| ✅ | AI letter body improvement: "Improve with AI" button in LetterPreview | `LetterPreview.tsx`, `AIInvoiceController.php` |
| ✅ | Global AI Assistant: letter generation flow | `GlobalAIAssistant.tsx` |
| ✅ 🆕 | CMS: `is_published` toggle + Published/Draft badge; `nav_order` input exposed; image upload calls API | `SAPages.tsx`, `CmsController.php` |
| ✅ 🆕 | CMS: "View Live" button per page using slug → route mapping | `SAPages.tsx` |
| ✅ 🆕 | Frontend perf: `useDebounce` hook (400 ms) on search inputs in InvoiceList, SAASusers, SAbilling | `src/hooks/useDebounce.ts`, 3 screen files |
| ✅ 🆕 | Frontend perf: `staleTime: 30 min` on static catalog queries | `SApackages.tsx`, `SAPackageServices.tsx`, `SAPackageForm.tsx` |
| ✅ 🆕 | Frontend perf: Vite `manualChunks` splits 4.1 MB vendor bundle into separately-cached chunks | `vite.config.ts` |
| ✅ 🆕 | Telegram ticket notifications module (TelegramService + admin UI + migration) | `TelegramService.php`, `TicketController.php`, `SAsettings.tsx`, migration `2026-05-08-000001` |
| ✅ 🆕 ⚡ | **Perf Phase 1**: Dead code removed — deleted `invoice-pdf-html.ts` (241 lines), `authApi.ts` (64 lines), `CustomerLayout.tsx`; uninstalled `react-rnd` and `@google/generative-ai`; removed 34+ unused named imports, 16 console.logs, 5 stale comment blocks | Multiple files |
| ✅ 🆕 ⚡ | **Perf Phase 1.5**: Shared hooks created — `usePagination<T>`, `useSorting<T>`, `useSelection`, `useCmsPage(slug)`, `useFormSubmit`; shared UI components — `<SearchBar>`, `<TableEmptyState>`, `<ConfirmDeleteDialog>`; applied across 10+ screens | `src/hooks/`, `src/components/ui/` |
| ✅ 🆕 ⚡ | **Perf Phase 2**: Rendering bug fixes — `Math.random()` key replaced in InvoiceList; `key={index}` fixed in PreviewModal + ValidationPanel; raw `fetch()` replaced with `api` axios instance in QuickAccessInvoice | `InvoiceList.tsx`, `PreviewModal.tsx`, `ValidationPanel.tsx`, `QuickAccessInvoice.tsx` |
| ✅ 🆕 ⚡ | **Perf Phase 3**: React Query staleTime overrides on all queries (invoices 2 min, templates/profile 30 min, admin-settings 60 min, admin-tickets 1 min, audit-logs 5 min); user-scoped invoice query key; `queryClient.clear()` on logout/clearAuth | `App.tsx`, `authStore.ts`, `QueryProvider.tsx` |
| ✅ 🆕 ⚡ | **Perf Phase 4**: LanguageContext + InlineCmsContext values wrapped in `useMemo`; `t()` and `handleSetLanguage` wrapped in `useCallback`; LineItemRow 3×useEffect consolidated to 1; QRCode static import → dynamic import; invoice-import `require()` calls → `async import()` | `LanguageContext.tsx`, `InlineCmsContext.tsx`, `LineItemRow.tsx`, `InvoiceQRCode.tsx`, `InvoiceList.tsx` |
| ✅ 🆕 ⚡ | **Perf Phase 5** (partial): Zustand field selectors applied to `App.tsx`, `AdminLayout.tsx`, `AdminSidebar.tsx`, `SAsettings.tsx`; `gemini_api_key` and `openai_api_key` excluded from authStore localStorage persist | `App.tsx`, `adminStore.ts`, `authStore.ts` |
| ✅ 🆕 ⚡ | **Perf Phase 6** (partial): `catch (error: unknown)` + `getErrorMessage()` utility applied across all screen files; typed interfaces (`Right`, `Role`, `UserRecord`) added to `invoice.ts`; `invoiceService`, `buyerService`, `companyTypeService`, `roleService`, `rightService`, `userService` payload types tightened in `api.ts` | `utils/config.ts`, `types/invoice.ts`, `services/api.ts`, `Signup.tsx`, `ResetPassword.tsx`, `SALogin.tsx`, `UserForm.tsx` |
| ✅ 🆕 ⚡ | **Perf Phase 7**: DB composite indexes — `(tenant_id, status)`, `(tenant_id, issue_date)` on invoices; `(tenant_id, deleted_at)` on buyers; `(tenant_id, timestamp)` on audit_logs; `(tenant_id, created_at)` on aiquery_history; FULLTEXT on invoice_number + buyer_name + seller_name | MySQL — confirmed via SHOW INDEX |
| ✅ 🆕 ⚡ | **Perf Phase 7**: Server-side pagination added to `InvoiceController`, `BusinessLetterController`, `BuyerController` (backward-compatible: `?page=N&pageSize=N` returns `{ data, total, page, pageSize }`; no `page` param returns array as before) | `InvoiceController.php`, `BusinessLetterController.php`, `BuyerController.php` |
| ✅ 🆕 ⚡ | **Perf Phase 7**: `Cache-Control` headers added — `public, max-age=3600` on CompanyTypeController, AdminPackages, AdminPackageServices; `public, max-age=300` on CMS nav endpoint | PHP controllers |
| ✅ 🆕 ⚡ | **Perf Phase 7**: JWT startup skip — `isJwtValid()` helper in `utils/config.ts`; `checkAuth` skips `/auth/me` round-trip when JWT is valid and store is already hydrated | `utils/config.ts`, `App.tsx` |
| ✅ 🆕 ⚡ | **Perf Phase 7**: Audit log TTL — `cleanup:logs` CI4 command deletes audit_logs > 12 months; trims aiquery_history to ≤ 100 rows per user; `api/cron.sh` wired for daily cron | `api/app/Commands/CleanupLogs.php`, `api/cron.sh` |

---

## 2. Open Backlog — Prioritized

### SPRINT 1 — Critical Security (fix before any production traffic)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| ~~S1-01~~ | ✅ DONE | ~~Hardcoded "password123" in admin password reset~~ | `AdminUsers.php:252` | 1 h |
| ~~S1-02~~ | ✅ DONE | ~~AI workspace search SQL injection~~ | `WorkspaceController.php` | 2 h |
| ~~S1-03~~ | ✅ DONE | ~~OTP endpoint has no rate limiting~~ | `QuickAccessAuth.php` | 0.5 h |
| ~~S1-04~~ | ✅ DONE | ~~Quick-access draft tokens are guessable~~ | `QuickAccessAuth.php`, migration `2026-05-05-000001` | 1 h |
| ~~S1-05~~ | ✅ DONE | ~~No rate limiting on AI endpoints~~ | `AIInvoiceController.php` | 1.5 h |
| ~~S1-06~~ | ✅ DONE | ~~customerApi.ts has no request interceptor~~ | `src/services/customerApi.ts` | 1 h |

**Sprint 1 total: ~7 hours — ✅ ALL DONE (2026-05-05)**

---

### SPRINT 2 — High Priority UX & Data Integrity

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| ~~S2-01~~ | ✅ DONE | ~~Invoice duplicate does not persist~~ | `InvoiceList.tsx` | 1 h |
| ~~S2-02~~ | ✅ DONE | ~~Settings: logo upload is plain text input~~ | `Settings.tsx` | 1 h |
| ~~S2-03~~ | ✅ DONE | ~~Settings: invoice/letter number format has no preview~~ | `Settings.tsx` | 1.5 h |
| ~~S2-04~~ | ✅ DONE | ~~Settings: company signature upload missing~~ | `Settings.tsx`, `CompanyProfileController.php`, migration `2026-05-05-000002` | 1 h |
| ~~S2-05~~ | ✅ DONE | ~~Audit log: authenticated user ID not captured~~ | `AuditTrait.php` | 1 h |
| ~~S2-06~~ | ✅ DONE | ~~Template designer: drag-drop boundary constraints missing~~ | `TemplateDesignLayout.tsx` | — |
| ~~S2-07~~ | ✅ DONE | ~~Quick-access pending action uses localStorage~~ | 4 screen files | 1 h |
| ~~S2-08~~ | ✅ DONE | ~~RBAC: permission checks not applied~~ | `RbacFilter.php`, `UserModel.php`, `Auth.php` | 6–8 h |
| ~~S2-09~~ | ✅ DONE | ~~Invoice sharing link missing backend~~ | `InvoiceController.php`, `Routes.php`, migration `2026-05-06-000001` | 2 h |
| S2-10 | MEDIUM | **Invoice: no attachment upload UI** — `invoice.attachments` array is typed but there is no file picker or upload in the editor | `src/components/screens/InvoiceEditor.tsx` | 3 h |

**Sprint 2 total: ~19 hours**

---

### SPRINT 3 — Billing, Subscriptions & Admin Data Accuracy

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S3-01 | HIGH | **Stripe webhook integration — payment history is empty stub** — `GET /billing/payment-history` returns `[]`; requires webhook listener + `billing_invoices` table | `api/app/Controllers/Billing.php:158–163`, `Webhooks.php` (skeleton exists) | 5–6 h |
| ~~S3-02~~ | ✅ DONE | ~~Stripe price IDs are hardcoded mock values~~ | `Billing.php` | 2 h |
| ~~S3-03~~ | ✅ DONE | ~~No plan limit enforcement~~ | `PlanLimitTrait.php`, `InvoiceController.php`, `BuyerController.php` | 4–5 h |
| S3-04 | MEDIUM | **No plan downgrade or cancellation** — only upgrade flow exists; no endpoint for downgrade or subscription cancel | `api/app/Controllers/Billing.php`, `src/components/screens/Billing.tsx` | 2 h |
| S3-05 | MEDIUM | **Admin: admin-upgrade-plan endpoint is a stub** | `api/app/Controllers/AdminUsers.php:213–219` | 2–3 h |
| S3-06 | MEDIUM | **Admin billing: invoice-by-ID returns hardcoded mock** | `api/app/Controllers/AdminBilling.php:104–124` | 1 h |
| S3-07 | MEDIUM | **Admin billing: PDF download returns mock content** | `api/app/Controllers/AdminBilling.php:130–139` | 3 h |
| ~~S3-08~~ | ✅ DONE | ~~Admin analytics: export CSV is hardcoded mock~~ | `AdminAnalytics.php` | — |
| ~~S3-09~~ | ✅ DONE | ~~Admin analytics: session count uses `rand()` filler~~ | `AdminAnalytics.php` | — |
| ~~S3-10~~ | ✅ DONE | ~~Admin analytics: bandwidth metric is disk size, not transfer~~ | `WorkspaceController.php`, `AdminAnalytics.php`, migration `2026-04-28-000003` | — |
| ~~S3-11~~ | ✅ DONE | ~~Admin analytics: churn rate formula is wrong~~ | `AdminAnalytics.php` | — |
| ~~S3-12~~ | ✅ DONE | ~~Admin users: last login always returns `now()`~~ | `Auth.php`, `AdminUsers.php`, `UserModel.php` | 1.5 h |
| S3-13 | LOW | **Admin users: default usage limits hardcoded in PHP** — should read from the tenant's plan limits | `api/app/Controllers/AdminUsers.php:300–305` | 1 h |
| ~~S3-14~~ | ✅ DONE | ~~Admin users: email fallback uses fake domain~~ | `AdminUsers.php` | 0.5 h |
| ~~S3-15~~ | ✅ DONE | ~~Admin users: CSV export lacks usage columns~~ | `AdminUsers.php` | 1 h |
| ~~S3-16~~ | ✅ DONE | ~~Admin packages: currency hardcoded to EUR~~ | `AdminPackages.php`, migration `2026-05-06-000002` | 1 h |
| S3-17 | LOW | **Admin packages: features JSON has no schema validation** | `api/app/Controllers/AdminPackages.php` | 1.5 h |
| S3-18 | LOW | **Admin packages: no plan retirement workflow** | `AdminPackages.php`, email service | 3 h |

**Sprint 3 total: ~41 hours**

---

### SPRINT 4 — Medium Polish & Missing Features

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S4-01 | HIGH | **Two-factor authentication (TOTP)** — `Auth.php` issues JWT immediately after password; no TOTP step; no `totp_secret` column | `api/app/Controllers/Auth.php`, users migration | 5–6 h |
| ~~S4-02~~ | ✅ DONE | ~~Admin wiki: edit capability missing~~ | `AdminWiki.php`, `SAWiki.tsx` | 3–4 h |
| S4-03 | 🔶 PARTIAL | **Admin CMS editor: RichTextEditor per section** — publish workflow done; section content still plain textarea | `src/components/screens/Admin/SAPages.tsx` | 2 h |
| ~~S4-04~~ | ✅ DONE | ~~Template library: no live preview thumbnail~~ | `TemplateLibrary.tsx` | — |
| ~~S4-05~~ | ✅ DONE | ~~Admin system settings: no email test button~~ | `AdminSettings.php`, `SAsettings.tsx` | 1.5 h |
| ~~S4-06~~ | ✅ DONE | ~~Admin system settings: no system health check~~ | `AdminSettings.php`, `SAsettings.tsx` | 2 h |
| ~~S4-07~~ | ✅ DONE | ~~Tickets: no email notification~~ | `TicketController.php` | — |
| ~~S4-08~~ | ✅ DONE | ~~Tickets: no assignment to specific admin user~~ | `TicketController.php`, `SATickets.tsx`, `SATicketDetails.tsx` | — |
| ~~S4-09~~ | ✅ DONE | ~~Tickets: no SLA / response time tracking~~ | `TicketController.php`, `SATicketDetails.tsx` | — |
| ~~S4-10~~ | ✅ DONE | ~~Tickets: no bulk close/resolve action~~ | `TicketController.php`, `SATickets.tsx` | — |
| ~~S4-11~~ | ✅ DONE | ~~Invoice: status transition not enforced in backend~~ | `InvoiceController.php` | 1.5 h |
| ~~S4-12~~ | ✅ DONE | ~~Invoice: fields remain editable after "sent" status~~ | `InvoiceEditor.tsx` | 1 h |
| S4-13 | LOW | **Invoice: signature capture UI missing** — `invoice.signed` field exists in DB and type but no signature widget | `src/components/screens/InvoiceEditor.tsx` or `InvoicePreview.tsx` | 3 h |
| ~~S4-14~~ | ✅ DONE | ~~Workspace: temp ZIP files not cleaned up~~ | `WorkspaceController.php` | 0.5 h |
| S4-15 | LOW | **Workspace: content indexing failures are silent** | `api/app/Controllers/WorkspaceController.php:~419–421` | 1 h |
| S4-16 | LOW | **Dashboard: no custom date range picker** | `src/components/screens/Dashboard.tsx` | 2 h |
| S4-17 | LOW | **Dashboard: no buyer-level analytics** | `src/components/screens/Dashboard.tsx`, `InvoiceController.php` | 3 h |
| S4-18 | LOW | **Audit log: no field-level diff capture** | `api/app/Traits/AuditTrait.php` | 2 h |

**Sprint 4 total: ~41 hours**

---

### SPRINT 5 — Performance & Code Quality ⚡ (NEW — added 2026-05-13)

Items from the `performance.md` audit. Phases 1–7 partially applied; remaining items below.

#### 5A — App Architecture (highest impact)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5A-01 | HIGH | **Extract `useHashRouter()` from App.tsx** — hash-based routing is inline (lines 98–253 of a 1,233-line file); extract into `src/hooks/useHashRouter.ts` | `src/App.tsx` | 1 h |
| P5A-02 | HIGH | **Extract `useAuthCheck()` from App.tsx** — auth initialization + legacy token migration + URL token handling (lines 131–195) embedded in AppContent; extract into `src/hooks/useAuthCheck.ts` | `src/App.tsx` | 1 h |
| P5A-03 | HIGH | **Extract `useInvoiceHandlers()` from App.tsx** — ~9 business-logic handler functions (save, load, duplicate, delete, share link, status change, etc.) inline in AppContent (lines ~300–722); extract into `src/hooks/useInvoiceHandlers.ts` | `src/App.tsx` | 2–3 h |
| P5A-04 | MEDIUM | **Split `adminStore` into auth + UI stores** — single store mixes `isAuthenticated`/`adminUser`/`token` with `theme`/`sidebarCollapsed`; sidebar collapse re-renders auth-consuming components | `src/stores/adminStore.ts` → `adminAuthStore.ts` + `adminUIStore.ts` | 1.5 h |
| P5A-05 | MEDIUM | **Replace sessionStorage CMS edit-mode signal with Zustand** — `InlineCmsContext.tsx:43` reads `sessionStorage.getItem('cms_edit_mode')` on mount; fragile cross-page state; replace with a tiny Zustand store persisted to sessionStorage | `src/contexts/InlineCmsContext.tsx` | 1 h |

#### 5B — React Rendering (medium impact)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5B-01 | MEDIUM | **Wrap InvoiceEditor handlers with `useCallback`** — inline arrow functions on lines 308, 333, 405, 411 create new references on every render, invalidating memoized child props | `src/components/screens/InvoiceEditor.tsx` | 1 h |
| P5B-02 | MEDIUM | **Fix dynamic Tailwind class strings** — template literals like `` `text-${x}-400` `` are invisible to Tailwind's purger; classes may vanish in production builds | `src/components/screens/Workspace.tsx:489,510,524`; `QuickAccessInvoice.tsx:306,314,322`; `Billing.tsx:119` | 1 h |
| P5B-03 | LOW | **Memoize Recharts gradient defs in Dashboard.tsx** — `<linearGradient id="colorGradient">` recreated on every render | `src/components/screens/Dashboard.tsx:301–307` | 0.5 h |
| P5B-04 | LOW | **Extract Dashboard recent-invoice row as `React.memo` component** — `recentInvoices.map()` creates new closures on every stats update | `src/components/screens/Dashboard.tsx:429–464` | 0.5 h |

#### 5C — Data Fetching (medium impact)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5C-01 | MEDIUM | **Migrate `PackageComparison.tsx` to `useQuery`** — currently uses manual useState+useEffect for billingService + publicCmsService + adminPackageService + adminPackageServicesService calls | `src/components/screens/PackageComparison.tsx` | 1 h |
| P5C-02 | MEDIUM | **Migrate `Settings.tsx` company-types fetch to `useQuery`** — `useEffect` on lines 89–98 fetches company types manually on every mount | `src/components/screens/Settings.tsx` | 0.5 h |
| P5C-03 | MEDIUM | **Migrate `Billing.tsx` to `useQuery`** — `loadBillingData()` on mount calls `billingService.getSubscription()`, `getHistory()`, `getPlans()` with no caching | `src/components/screens/Billing.tsx` | 1 h |
| P5C-04 | LOW | **Migrate remaining 12+ screens to `useQuery`** — `Dashboard.tsx`, `InvoiceEditor.tsx`, `LetterEditor.tsx`, `LetterList.tsx`, `ActivityLog.tsx`, `CmsPageView.tsx`, `LandingPage.tsx`, `Login.tsx`, `Workspace.tsx`, `QuickAccessInvoice.tsx`, `LetterPreview.tsx`, `Signup.tsx` still use manual useState+useEffect | Various `src/components/screens/` files | 4–6 h |
| P5C-05 | LOW | **Add optimistic updates to mutations** — all mutations use `queryClient.invalidateQueries()` (two round-trips with flicker); use `queryClient.setQueryData()` on success | `Buyers.tsx`, `SAPackageServices.tsx`, `SAPages.tsx`, `SAASusers.tsx`, `SAUserDetails.tsx` | 2 h |
| P5C-06 | LOW | **Paginate audit log endpoint** — `GET /audit-logs` has no limit; grows unbounded; `ActivityLog` screen should use server-side pagination | `src/services/api.ts`, `api/app/Controllers/AuditLogController.php`, `src/components/screens/ActivityLog.tsx` | 1.5 h |

#### 5D — Type Safety

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5D-01 | MEDIUM | **Type `adminApi.ts` payloads** — 2 remaining `any`: `updateSystemSettings(settings: any)` and `content: any` in `updatePage()` | `src/services/adminApi.ts` | 0.5 h |
| P5D-02 | MEDIUM | **Type `customerApi.ts` payloads** — 4 remaining `any`: `tenant: any`, `subscription: any`, `plan: any`, `recentInvoices: any[]` in `DashboardData` | `src/services/customerApi.ts` | 0.5 h |
| P5D-03 | LOW | **Create `apiFactory.ts` to deduplicate axios interceptors** — auth token injection and 401-redirect are copy-pasted across `api.ts`, `adminApi.ts`, `customerApi.ts` | `src/services/apiFactory.ts` (new file) | 1.5 h |
| P5D-04 | LOW | **Reduce `authStore` localStorage persistence scope** — full `user` and `tenant` objects serialized on every update; persist only `{ token, isAuthenticated }` and re-hydrate from `/auth/me` on load (call already JWT-skipped when valid) | `src/stores/authStore.ts` | 1 h |

#### 5E — Backend & Server

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5E-01 | MEDIUM | **Enable gzip/brotli on API server** — large JSON payloads (invoice lists, audit logs) served uncompressed; expected 60–80% transfer-size reduction | nginx/Apache config on deployment server | 0.5 h |
| P5E-02 | LOW | **Add ETag support to static-ish endpoints** — `Cache-Control` headers added (2026-05-13); add `ETag` so unchanged responses return 304 and save bandwidth | `CompanyTypeController.php`, `AdminPackages.php`, `CmsController.php` | 1 h |
| P5E-03 | LOW | **Verify and remove unused DB columns** — `billing_period_start`, `billing_period_end`, `document_currency_code`, `tax_currency_code`, `gln` in TypeScript type but zero usages in frontend or backend (note: `signature_date` IS used by `mapInvoiceData()` — keep that one) | `src/types/invoice.ts`, `InvoiceModel.php`, DB migration | 1–2 h |

**Sprint 5 estimated total: ~29 hours**

---

## 3. Master Module Status Table

| Module | Status | Score | Critical Gaps |
|--------|--------|-------|---------------|
| Invoice CRUD | ✅ DONE | 10/10 | — |
| Business Letter | ✅ DONE | 9/10 | — |
| Invoice PDF | ✅ DONE | 9/10 | — |
| Letter PDF | ✅ DONE | 9/10 | Fixed 2026-04-28 |
| Template persistence | ✅ DONE | 10/10 | Fixed 2026-04-28 |
| Buyer Management | ✅ DONE | 10/10 | — |
| Dashboard | 🔶 PARTIAL | 8/10 | No custom date range, no buyer analytics |
| Multi-language | ✅ DONE | 9/10 | — |
| Legal / CMS Pages | ✅ DONE | 8/10 | — |
| Activity / Audit Log | 🔶 PARTIAL | 8/10 | No field diffs; no server-side pagination on frontend yet |
| Template System | ✅ DONE | 10/10 | — |
| Company Settings | ✅ DONE | 10/10 | — |
| Workspace / File Mgr | ✅ DONE | 9/10 | Silent indexing failures |
| Customer Billing | 🔶 PARTIAL | 7/10 | Payment history stub; no cancel/downgrade flow |
| Authentication | 🔶 PARTIAL | 8/10 | 🔴 No 2FA |
| Quick Access Portal | ✅ DONE | 9/10 | — |
| Admin — Packages | 🔶 PARTIAL | 7/10 | No retirement workflow; no schema validation |
| Admin — Users | 🔶 PARTIAL | 8/10 | Usage limits hardcoded |
| Admin — Billing | 🔶 PARTIAL | 4/10 | Invoice-by-ID mock, PDF mock |
| Admin — Analytics | ✅ DONE | 9/10 | — |
| Admin — System Settings | ✅ DONE | 10/10 | — |
| Admin — Support Tickets | ✅ DONE | 10/10 | — |
| Admin — Wiki | ✅ DONE | 9/10 | — |
| Admin — CMS Editor | 🔶 PARTIAL | 8/10 | Section content still plain textarea |
| RBAC Enforcement | ✅ DONE | 9/10 | — |
| AI Assistant | 🔶 PARTIAL | 9/10 | Silent key failures remain |
| Stripe Webhooks | 🔶 PARTIAL | 4/10 | Payment history still stub |
| Two-Factor Auth | ❌ OPEN | 0/10 | Not started |
| Invoice Sharing | ✅ DONE | 10/10 | — |
| **Frontend Performance** | 🔶 PARTIAL | 7/10 | App.tsx split, 15+ screens not on useQuery, dynamic Tailwind, adminStore split pending |
| **DB / Backend Performance** | ✅ DONE | 9/10 | gzip/brotli pending (server config); ETag pending |

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
| SEC-07 | customerApi.ts no 401-retry interceptor | MEDIUM | `src/services/customerApi.ts` | ✅ FIXED 2026-05-05 |
| SEC-08 | Temp ZIP files not deleted after download — disk accumulation | LOW | `WorkspaceController.php` | ✅ FIXED 2026-05-05 |
| SEC-09 | `gemini_api_key` and `openai_api_key` persisted to localStorage | MEDIUM | `src/stores/authStore.ts` | ✅ FIXED 2026-05-13 (excluded from partialize) |
| SEC-10 | React Query cache not cleared on logout — user A data visible to user B | MEDIUM | `src/stores/authStore.ts`, `QueryProvider.tsx` | ✅ FIXED 2026-05-13 (`queryClient.clear()` on logout + clearAuth) |
| SEC-11 | Two-factor auth missing — single credential gives full access | HIGH | `Auth.php` | ❌ OPEN (S4-01) |
| SEC-12 | authStore persists full `user`/`tenant` objects to localStorage — surface area for token theft includes all profile data | LOW | `src/stores/authStore.ts` | 🔶 PARTIAL (API keys excluded; full objects still persisted) — see P5D-04 |

---

## 5. Quick Wins (≤ 1 hour each)

| Item | Location | Status | Time |
|------|----------|--------|------|
| ~~Fix hardcoded "password123"~~ | ~~`AdminUsers.php:252`~~ | ✅ Done | — |
| ~~OTP rate limiting~~ | ~~`QuickAccessAuth.php`~~ | ✅ Done | — |
| ~~Audit log: capture authenticated user ID~~ | ~~`AuditTrait.php`~~ | ✅ Done | — |
| ~~Admin: email fallback fake domain~~ | ~~`AdminUsers.php`~~ | ✅ Done | — |
| ~~Admin: CSV export add usage columns~~ | ~~`AdminUsers.php`~~ | ✅ Done | — |
| ~~Admin packages: currency from plan record~~ | ~~`AdminPackages.php`~~ | ✅ Done | — |
| ~~Workspace: delete temp ZIP~~ | ~~`WorkspaceController.php`~~ | ✅ Done | — |
| ~~Admin tickets: bulk close/resolve action~~ | ~~`SATickets.tsx`~~ | ✅ Done | — |
| Fix dynamic Tailwind class strings | `Workspace.tsx`, `QuickAccessInvoice.tsx`, `Billing.tsx` | ❌ OPEN | 1 h |
| Type `adminApi.ts` remaining `any` (2 occurrences) | `src/services/adminApi.ts` | ❌ OPEN | 0.5 h |
| Type `customerApi.ts` remaining `any` (4 occurrences) | `src/services/customerApi.ts` | ❌ OPEN | 0.5 h |
| Admin billing: invoice-by-ID real data | `AdminBilling.php:104–124` | ❌ OPEN | 1 h |
| Admin users: usage limits from plan JSON | `AdminUsers.php:300–305` | ❌ OPEN | 1 h |
| Enable gzip/brotli on API server | nginx/Apache config | ❌ OPEN | 0.5 h |

---

## 6. Effort Summary

| Sprint | Focus | Est. Hours | Status |
|--------|-------|------------|--------|
| Sprint 1 | Critical security | ~7 h | ✅ COMPLETE (2026-05-05) |
| Sprint 2 | High UX & data integrity | ~19 h | ✅ COMPLETE (2026-05-06) |
| Sprint 3 | Billing, subscriptions, admin data | ~41 h | 🔶 ~60% done |
| Sprint 4 | Medium polish & missing features | ~41 h | 🔶 ~70% done |
| Sprint 5 | Performance & code quality ⚡ | ~29 h | 🔶 ~55% done |
| **Total remaining** | | **~55–60 h** | |

---

## 7. Recently Introduced Items (discovered 2026-04-28)

| ID | Item | Status |
|----|------|--------|
| 🆕 | `template_id` column missing from `invoices` table | ✅ FIXED — migration + model + controller |
| 🆕 | Letter PDF: header/footer text cut off via html2canvas | ✅ FIXED — native jsPDF text |
| 🆕 | Letter PDF: decorative separator lines | ✅ FIXED — lines removed |
| 🆕 | Letter list: click navigated to editor instead of preview | ✅ FIXED |
| 🆕 | New letter / AI letter opened in editor instead of preview | ✅ FIXED |
| 🆕 | Letter preview Back button went to editor | ✅ FIXED |

---

## 8. Fixes Applied 2026-05-05

All Sprint 1 security issues and 8/10 stability/integrity issues resolved.

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| SEC-01 / S1-01 | Admin password reset: random 12-char password via `random_int()` | `AdminUsers.php` |
| SEC-02 / S1-02 | AI workspace SQL injection: `validateAiWhereClause()` allowlist | `WorkspaceController.php` |
| SEC-03 / S1-03 | OTP rate limiting: 3/15 min per email + 10/15 min per IP | `QuickAccessAuth.php` |
| SEC-04 / S1-04 | Quick-access OTP not stored in DB; `client_ip` replaces `otp` column | `QuickAccessAuth.php`, migration `2026-05-05-000001` |
| SEC-05 / S1-05 | AI throttle: 20 requests/hour per user | `AIInvoiceController.php` |
| SEC-06 / S1-06 | `customerApi.ts` Axios interceptor | `src/services/customerApi.ts` |
| Fix S2-01 | Invoice duplicate calls `invoiceService.create()` + re-fetches list | `InvoiceList.tsx` |
| Fix S2-05 | Audit log extracts user name from JWT when session is empty | `AuditTrait.php` |
| Fix S3-03 | `PlanLimitTrait` reads `plans.limits` JSON; 429 when over limit | `PlanLimitTrait.php`, `InvoiceController.php`, `BuyerController.php` |
| Fix S3-02 | Stripe subscription uses `plans.stripe_price_id` from DB | `Billing.php` |
| Fix S2-08 / SEC-06 | `RbacFilter` super-admin check via `user_roles` table; `UserModel::hasRight()` bypass removed | `RbacFilter.php`, `UserModel.php`, `Auth.php` |
| Fix S3-12 | `Auth::login()` writes real `last_login` timestamp | `Auth.php`, `AdminUsers.php`, `UserModel.php` |
| Fix S2-02+S2-04 | Settings logo + signature: `ImageUploadField` widget; `signatureUrl` added end-to-end | `Settings.tsx`, `CompanyProfileController.php`, migration `2026-05-05-000002` |
| Fix S2-07 | `qa_pending_action` switched from `localStorage` to `sessionStorage` | 4 screen files |
| Fix S4-14 | ZIP cleanup: `register_shutdown_function` + startup purge | `WorkspaceController.php` |

---

## 9. Fixes Applied 2026-05-08

CMS publish workflow, frontend performance optimisations, Telegram notifications module.

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| CMS #1–4 | `is_published` toggle, `nav_order` input, image upload via API, "View Live" button | `SAPages.tsx`, `CmsController.php`, `adminApi.ts` |
| Perf #1 | `useDebounce` hook (400 ms) on search inputs | `src/hooks/useDebounce.ts`, 3 screen files |
| Perf #2 | `staleTime: 30 min` on static catalog queries | `SApackages.tsx`, `SAPackageServices.tsx`, `SAPackageForm.tsx` |
| Perf #3 | Vite `manualChunks`: vendor 4.1 MB → split into per-feature chunks | `vite.config.ts` |
| Telegram #1–7 | Full Telegram integration: service, controller hooks, admin UI, migration, test endpoint | `TelegramService.php`, `TicketController.php`, `AdminSettings.php`, `SAsettings.tsx`, `Routes.php`, `adminApi.ts`, `PlatformCompanyDetailsModel.php`, migration `2026-05-08-000001` |

---

## 10. Fixes Applied 2026-05-12–13 (Performance Phases 1–7) ⚡

Full performance optimisation pass executed per `performance.md`.

| Phase | Scope | Key Changes |
|-------|-------|-------------|
| **Phase 1** — Dead Code | Bundle, imports, exports | Deleted `invoice-pdf-html.ts`, `authApi.ts`, `CustomerLayout.tsx`; uninstalled `react-rnd`, `@google/generative-ai`; removed 34+ unused named imports, 16 `console.log` calls, 5 stale comment blocks |
| **Phase 1.5** — Shared Abstractions | Hooks + components | Created `usePagination<T>`, `useSorting<T>`, `useSelection`, `useCmsPage(slug)`, `useFormSubmit`; created `<SearchBar>`, `<TableEmptyState>`, `<ConfirmDeleteDialog>`; applied to InvoiceList, LetterList, AIHistory, Buyers, SATickets, SAPackageServices, CompanyTypeList, SAPages |
| **Phase 2** — Rendering Bugs | Keys, raw fetch | Fixed `Math.random()` fallback key in InvoiceList; fixed `key={index}` in PreviewModal + ValidationPanel; replaced raw `fetch()` with `api` axios instance in QuickAccessInvoice |
| **Phase 3** — Data Fetching | React Query | Added `staleTime` overrides to all queries (2 min → 60 min by data type); user-scoped `['invoices', user?.id]` key; `queryClient.clear()` on logout and clearAuth; exported `queryClient` singleton from `QueryProvider.tsx` |
| **Phase 4** — React Rendering | Memoization, dynamic imports | Wrapped LanguageContext + InlineCmsContext values in `useMemo`; wrapped `t()` + `setLanguage` in `useCallback`; merged 3×useEffect in LineItemRow; QRCode → dynamic import; invoice-import `require()` → `async import()` |
| **Phase 5** | Zustand selectors | Field selectors in App.tsx, AdminLayout, AdminSidebar, SAsettings; excluded `gemini_api_key`/`openai_api_key` from localStorage persist |
| **Phase 6** | Type safety | `catch (error: unknown)` + `getErrorMessage()` across all screens; typed payloads in `api.ts`; added `Right`, `Role`, `UserRecord` interfaces to `types/invoice.ts` |
| **Phase 7** — DB | Indexes | `idx_invoices_tenant_status`, `idx_invoices_tenant_date` (BTREE); `idx_invoices_fulltext` (FULLTEXT on invoice_number + buyer_name + seller_name); `idx_buyers_tenant_deleted`; `idx_audit_tenant_date`; `idx_aiquery_tenant_date` — all confirmed via SHOW INDEX |
| **Phase 7** — Backend | Pagination | Server-side `?page=N&pageSize=N` on InvoiceController, BusinessLetterController, BuyerController (backward-compatible) |
| **Phase 7** — Backend | Caching | `Cache-Control: public, max-age=3600` on company types, packages, package services; `max-age=300` on CMS nav |
| **Phase 7** — Frontend | JWT skip | `isJwtValid()` helper; `checkAuth` skips `/auth/me` when JWT valid + store hydrated |
| **Phase 7** — Backend | TTL cleanup | `cleanup:logs` CI4 command (audit_logs > 12 months deleted; aiquery_history trimmed to ≤ 100 per user); `api/cron.sh` for daily scheduling |

---

*Last updated: 2026-05-13 | Scope: frontend src/, CI4 backend api/, MySQL schema*
