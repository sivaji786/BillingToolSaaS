# BillingTool — Backlog & TODO
**Generated:** 2026-04-28  
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

---

## 2. Open Backlog — Prioritized

### SPRINT 1 — Critical Security (fix before any production traffic)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S1-01 | 🔴 CRITICAL | **Hardcoded "password123" in admin password reset** — sets every user's password to a known string when admin resets | `api/app/Controllers/AdminUsers.php:252` | 1 h |
| S1-02 | 🔴 CRITICAL | **AI workspace search SQL injection** — Gemini returns raw WHERE clause, controller executes it unsanitized | `api/app/Controllers/WorkspaceController.php:~756` | 2 h |
| S1-03 | 🔴 CRITICAL | **OTP endpoint has no rate limiting** — POST `/auth/quick-access` can be spammed to any email indefinitely | `api/app/Controllers/QuickAccessAuth.php` | 0.5 h |
| S1-04 | 🔴 HIGH | **Quick-access draft tokens are guessable** — plain sequential strings stored; any user can iterate to fetch other users' drafts | `api/app/Controllers/QuickAccessAuth.php`, `api/app/Database/` | 1 h |
| S1-05 | 🔴 HIGH | **No rate limiting on AI endpoints** — POST `/ai/parse-invoice`, `/ai/improve-letter-body` make expensive Gemini API calls with no per-user throttle | `api/app/Controllers/AIInvoiceController.php` | 1.5 h |
| S1-06 | 🔴 HIGH | **customerApi.ts has no request interceptor** — all admin API calls pass auth headers manually; 401 errors redirect without attempting token refresh first | `src/services/customerApi.ts:46–115` | 1 h |

**Sprint 1 total: ~7 hours**

---

### SPRINT 2 — High Priority UX & Data Integrity

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S2-01 | HIGH | **Invoice duplicate does not persist** — `handleDuplicate()` adds the copy to local state only; no API call is made, refresh loses the copy | `src/components/screens/InvoiceList.tsx:231–242` | 1 h |
| S2-02 | HIGH | **Settings: logo upload is plain text input** — TemplateEditor has a working FileReader-based upload; same pattern needs porting to Settings.tsx | `src/components/screens/Settings.tsx:295` | 1 h |
| S2-03 | HIGH | **Settings: invoice/letter number format has no preview** — users type tokens ({YYYY}, {NNN}) blind with no live example of the resulting number | `src/components/screens/Settings.tsx:405–418` | 1.5 h |
| S2-04 | HIGH | **Settings: company signature upload missing** — `signatureUrl` field exists in types but is not exposed; same FileReader pattern as logo | `src/components/screens/Settings.tsx` | 1 h |
| S2-05 | HIGH | **Audit log: authenticated user ID not captured** — `logAction()` leaves the `user` field empty on every log entry | `api/app/Traits/AuditTrait.php` | 1 h |
| S2-06 | HIGH | **Template designer: drag-drop boundary constraints missing** — elements can be dragged off the A4 canvas; no min/max clamping on pointer move | `src/components/invoice/TemplateDesignLayout.tsx:90–110` | 1.5 h |
| S2-07 | HIGH | **Quick-access pending action uses localStorage** — multiple open tabs overwrite each other's post-OTP action; should use `sessionStorage` | `src/components/screens/QuickAccessInvoice.tsx` | 1 h |
| S2-08 | HIGH | **RBAC: permission checks not applied to any screen or API endpoint** — any authenticated user can access any feature regardless of role | `src/hooks/usePermission.ts`, all Controller filters | 6–8 h |
| S2-09 | MEDIUM | **Invoice sharing link missing backend** — frontend references share-by-token concept but `GET /public/invoices/:shareToken` endpoint does not exist | `api/app/Config/Routes.php`, new controller method | 2 h |
| S2-10 | MEDIUM | **Invoice: no attachment upload UI** — `invoice.attachments` array is typed but there is no file picker or upload in the editor | `src/components/screens/InvoiceEditor.tsx` | 3 h |

**Sprint 2 total: ~19 hours**

---

### SPRINT 3 — Billing, Subscriptions & Admin Data Accuracy

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S3-01 | HIGH | **Stripe webhook integration — payment history is empty stub** — `GET /billing/payment-history` returns `[]`; requires webhook listener + `billing_invoices` table | `api/app/Controllers/Billing.php:158–163`, `Webhooks.php` (skeleton exists) | 5–6 h |
| S3-02 | HIGH | **Stripe price IDs are hardcoded mock values** — `'price_pro_monthly'`, `'price_starter_monthly'` must come from `plans.stripe_price_id` column | `api/app/Controllers/Billing.php:134` | 2 h |
| S3-03 | HIGH | **No plan limit enforcement** — `plans.limits` JSON and `tenant_usage` table exist but no controller checks limits before allowing resource creation | All create endpoints in `InvoiceController`, `WorkspaceController`, `BuyerController` | 4–5 h |
| S3-04 | MEDIUM | **No plan downgrade or cancellation** — only upgrade flow exists; no endpoint for downgrade or subscription cancel | `api/app/Controllers/Billing.php`, `src/components/screens/Billing.tsx` | 2 h |
| S3-05 | MEDIUM | **Admin: admin-upgrade-plan endpoint is a stub** — `AdminUsers.php:213–219` returns a placeholder response | `api/app/Controllers/AdminUsers.php:213–219` | 2–3 h |
| S3-06 | MEDIUM | **Admin billing: invoice-by-ID returns hardcoded mock** | `api/app/Controllers/AdminBilling.php:104–124` | 1 h |
| S3-07 | MEDIUM | **Admin billing: PDF download returns mock content** — `/admin/billing/invoices/:id/pdf` streams a static placeholder | `api/app/Controllers/AdminBilling.php:130–139` | 3 h |
| S3-08 | MEDIUM | **Admin analytics: export CSV is hardcoded mock** | `api/app/Controllers/AdminAnalytics.php:466–482` | 1.5 h |
| S3-09 | MEDIUM | **Admin analytics: session count uses `rand()` filler** — random numbers shown as real session data | `api/app/Controllers/AdminAnalytics.php:~381` | 2 h |
| S3-10 | MEDIUM | **Admin analytics: bandwidth metric is disk size, not transfer** — sums `workspace_files.size` instead of tracking actual download bytes | `api/app/Controllers/AdminAnalytics.php`, `WorkspaceController.php` | 3 h |
| S3-11 | MEDIUM | **Admin analytics: churn rate formula is wrong** | `api/app/Controllers/AdminAnalytics.php:~68` | 1 h |
| S3-12 | MEDIUM | **Admin users: last login always returns `now()`** — `date('Y-m-d\TH:i:s\Z')` used as placeholder | `api/app/Controllers/AdminUsers.php:83, 140` | 1.5 h |
| S3-13 | LOW | **Admin users: default usage limits hardcoded in PHP** — should read from the tenant's plan limits | `api/app/Controllers/AdminUsers.php:300–305` | 1 h |
| S3-14 | LOW | **Admin users: email fallback uses fake domain** — placeholder `user@example.com` style emails emitted | `api/app/Controllers/AdminUsers.php:77, 134` | 0.5 h |
| S3-15 | LOW | **Admin users: CSV export lacks usage columns** — only 6 basic columns; storage and API call data not included | `api/app/Controllers/AdminUsers.php:271–283` | 1 h |
| S3-16 | LOW | **Admin packages: currency hardcoded to EUR** | `api/app/Controllers/AdminPackages.php:~40` | 1 h |
| S3-17 | LOW | **Admin packages: features JSON has no schema validation** — stale service references silently skipped by `syncLimitsFromFeatures()` | `api/app/Controllers/AdminPackages.php` | 1.5 h |
| S3-18 | LOW | **Admin packages: no plan retirement workflow** — deactivated plans still show in subscriber accounts with no notification or migration path | `api/app/Controllers/AdminPackages.php`, email service | 3 h |

**Sprint 3 total: ~41 hours**

---

### SPRINT 4 — Medium Polish & Missing Features

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| S4-01 | MEDIUM | **Two-factor authentication (TOTP)** — `Auth.php` issues JWT immediately after password; no TOTP step; no `totp_secret` column | `api/app/Controllers/Auth.php`, users migration | 5–6 h |
| S4-02 | MEDIUM | **Admin wiki: edit capability missing** — only GET routes in Routes.php; SAWiki.tsx has no edit state, textarea, or save button; PUT endpoint missing | `api/app/Config/Routes.php:271–272`, `AdminWiki.php`, `SAWiki.tsx` | 3–4 h |
| S4-03 | MEDIUM | **Admin CMS editor: RichTextEditor per section + publish workflow** — content stored as JSON sections but editor likely plain textarea; no draft/publish toggle | `src/components/screens/Admin/SAPages.tsx`, `CmsController.php` | 3 h |
| S4-04 | MEDIUM | **Template library: no live preview thumbnail** — cards show name + description only; no miniature render of template layout | `src/components/screens/TemplateLibrary.tsx` | 3–4 h |
| S4-05 | MEDIUM | **Admin system settings: no email test button** — SMTP config can be saved but never verified with a test send | `src/components/screens/Admin/SAsettings.tsx`, `AdminSettings.php` | 1.5 h |
| S4-06 | MEDIUM | **Admin system settings: no system health check** — no endpoint to verify DB connectivity, disk space, mail, and Gemini API key presence | `api/app/Controllers/AdminSettings.php` | 2 h |
| S4-07 | MEDIUM | **Tickets: no email notification on creation or reply** | `api/app/Controllers/TicketController.php` | 2 h |
| S4-08 | MEDIUM | **Tickets: no assignment to specific admin user** | `api/app/Controllers/TicketController.php`, `SATickets.tsx` | 2 h |
| S4-09 | MEDIUM | **Tickets: no SLA / response time tracking** | `api/app/Controllers/TicketController.php`, `SATicketDetails.tsx` | 3 h |
| S4-10 | MEDIUM | **Tickets: no bulk close/resolve action** | `src/components/screens/Admin/SATickets.tsx` | 1 h |
| S4-11 | LOW | **Invoice: status transition not enforced in backend** — any status → any status allowed; frontend enforces order but API does not | `api/app/Controllers/InvoiceController.php` | 1.5 h |
| S4-12 | LOW | **Invoice: fields remain editable after "sent" status** — no locking mechanism prevents editing a sent invoice | `src/components/screens/InvoiceEditor.tsx` | 1 h |
| S4-13 | LOW | **Invoice: signature capture UI missing** — `invoice.signed` field exists in DB and type but no signature widget | `src/components/screens/InvoiceEditor.tsx` or `InvoicePreview.tsx` | 3 h |
| S4-14 | LOW | **Workspace: temp ZIP files not cleaned up** — `downloadZip()` creates temp files and relies on PHP GC; accumulates on disk | `api/app/Controllers/WorkspaceController.php:~631` | 0.5 h |
| S4-15 | LOW | **Workspace: content indexing failures are silent** — `ContentExtractor::extract()` failures caught and discarded; non-indexed files appear searchable but return no results | `api/app/Controllers/WorkspaceController.php:~419–421` | 1 h |
| S4-16 | LOW | **Dashboard: no custom date range picker** — charts always show fixed last-6-months window | `src/components/screens/Dashboard.tsx` | 2 h |
| S4-17 | LOW | **Dashboard: no buyer-level analytics** — revenue per buyer, top buyers by invoice value | `src/components/screens/Dashboard.tsx`, `InvoiceController.php` | 3 h |
| S4-18 | LOW | **Audit log: no field-level diff capture** — logAction() records event type but not which fields changed or old/new values | `api/app/Traits/AuditTrait.php` | 2 h |

**Sprint 4 total: ~41 hours**

---

## 3. Master Module Status Table

| Module | Status | Score | Critical Gaps |
|--------|--------|-------|---------------|
| Invoice CRUD | ✅ DONE | 9/10 | Duplicate not persisted, no attachment UI |
| Business Letter | ✅ DONE | 9/10 | None remaining |
| Invoice PDF | ✅ DONE | 9/10 | — |
| Letter PDF | ✅ DONE | 9/10 | Fixed 2026-04-28 (header/footer text, lines) |
| Template persistence | ✅ 🆕 DONE | 10/10 | Fixed 2026-04-28 (template_id column added) |
| Buyer Management | ✅ DONE | 9/10 | — |
| Dashboard | 🔶 PARTIAL | 8/10 | No custom date range, no buyer analytics |
| Multi-language | ✅ DONE | 9/10 | — |
| Legal / CMS Pages | ✅ DONE | 8/10 | — |
| Activity / Audit Log | 🔶 PARTIAL | 7/10 | User ID not captured, no field diffs |
| Template System | 🔶 PARTIAL | 7/10 | Drag boundaries, no library thumbnail |
| Company Settings | 🔶 PARTIAL | 6/10 | No logo/sig upload, no number format preview |
| Workspace / File Mgr | 🔶 PARTIAL | 7/10 | 🔴 SQL injection, temp file cleanup |
| Customer Billing | 🔶 PARTIAL | 5/10 | Payment history stub, no limit enforcement |
| Authentication | 🔶 PARTIAL | 7/10 | 🔴 No 2FA, hardcoded password reset |
| Quick Access Portal | 🔶 PARTIAL | 5/10 | 🔴 No OTP rate limit, guessable tokens |
| Admin — Packages | 🔶 PARTIAL | 6/10 | EUR hardcoded, no retirement workflow |
| Admin — Users | 🔶 PARTIAL | 5/10 | Last login mock, limits hardcoded |
| Admin — Billing | 🔶 PARTIAL | 4/10 | Invoice ID mock, PDF mock, revenue approx |
| Admin — Analytics | 🔶 PARTIAL | 5/10 | CSV mock, rand() sessions, wrong churn |
| Admin — System Settings | 🔶 PARTIAL | 6/10 | No email test, no health check |
| Admin — Support Tickets | 🔶 PARTIAL | 6/10 | No email notify, no SLA, no assignment |
| Admin — Wiki | 🔶 PARTIAL | 5/10 | Edit endpoint missing entirely |
| Admin — CMS Editor | 🔶 PARTIAL | 6/10 | No RichTextEditor, no publish workflow |
| RBAC Enforcement | ❌ OPEN | 2/10 | 🔴 Infrastructure built but zero enforcement |
| AI Assistant | 🔶 PARTIAL | 7/10 | No rate limiting, silent key failures |
| Stripe Webhooks | 🔶 PARTIAL | 4/10 | Skeleton `Webhooks.php` exists; payment history still stub |
| Two-Factor Auth | ❌ OPEN | 0/10 | Not started |
| Invoice Sharing | ❌ OPEN | 0/10 | No backend endpoint |

---

## 4. Security Checklist (must resolve before production)

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| SEC-01 | Admin password reset hardcodes "password123" | 🔴 CRITICAL | `AdminUsers.php:252` | ❌ OPEN |
| SEC-02 | Gemini AI workspace search executes raw SQL from API response | 🔴 CRITICAL | `WorkspaceController.php:~756` | ❌ OPEN |
| SEC-03 | OTP endpoint has no rate limiting — email spam vector | 🔴 HIGH | `QuickAccessAuth.php` | ❌ OPEN |
| SEC-04 | Quick-access draft tokens are short/sequential — guessable | 🔴 HIGH | `QuickAccessAuth.php` | ❌ OPEN |
| SEC-05 | AI parse/improve endpoints have no per-user rate limit | 🔴 HIGH | `AIInvoiceController.php` | ❌ OPEN |
| SEC-06 | RBAC not enforced — any tenant user can access any feature | 🔴 HIGH | All controllers | ❌ OPEN |
| SEC-07 | customerApi.ts no 401-retry interceptor — stale tokens not refreshed | MEDIUM | `src/services/customerApi.ts` | ❌ OPEN |
| SEC-08 | Temp ZIP files not deleted after download — disk accumulation | LOW | `WorkspaceController.php:~631` | ❌ OPEN |

---

## 5. Quick Wins (≤ 1 hour each)

These items are individually small and can be batched into a single session:

| Item | Location | Time |
|------|----------|------|
| Fix hardcoded "password123" → generate random temporary password + email it | `AdminUsers.php:252` | 0.5 h |
| OTP rate limiting (max 3 requests per 10 min per email) | `QuickAccessAuth.php` | 0.5 h |
| Admin: email fallback fake domain | `AdminUsers.php:77,134` | 0.5 h |
| Admin: CSV export add usage columns | `AdminUsers.php:271–283` | 1 h |
| Admin packages: currency from plan record instead of EUR | `AdminPackages.php:~40` | 1 h |
| Workspace: delete temp ZIP in finally block | `WorkspaceController.php:~631` | 0.5 h |
| Audit log: capture authenticated user ID in logAction() | `AuditTrait.php` | 1 h |
| Admin tickets: bulk close/resolve action | `SATickets.tsx` | 1 h |
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
