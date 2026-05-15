# BillingTool — Module Backlog Index

**Generated:** 2026-05-15  
**Source:** `BillingTool_Backlog_TODO_15-05-2026.md`  
**Stack:** React 18 + TypeScript (Vite) / CodeIgniter 4 (PHP 8.1) / MySQL

Each file below is a self-contained backlog for one module. Open the file for full item details, completed history, and relevant file paths.

---

## Module Status Overview

| Module | File | Status | Score | Open Items |
|--------|------|--------|-------|-----------|
| Invoice CRUD | [invoice-crud.md](invoice-crud.md) | 🔶 PARTIAL | 5/10 | 🔴 3 critical, 2 high, 2 medium, 1 low |
| Invoice Sharing | [invoice-sharing.md](invoice-sharing.md) | 🔶 PARTIAL | 7/10 | 1 high |
| Business Letter | [business-letter.md](business-letter.md) | ✅ DONE | 9/10 | — |
| Invoice PDF | [invoice-pdf.md](invoice-pdf.md) | ✅ DONE | 9/10 | — |
| Letter PDF | [letter-pdf.md](letter-pdf.md) | ✅ DONE | 9/10 | — |
| Template System | [template-system.md](template-system.md) | ✅ DONE | 10/10 | — |
| Buyer Management | [buyer-management.md](buyer-management.md) | 🔶 PARTIAL | 8/10 | 1 medium |
| Dashboard | [dashboard.md](dashboard.md) | 🔶 PARTIAL | 8/10 | 4 low |
| Multi-language | [multi-language.md](multi-language.md) | ✅ DONE | 9/10 | — |
| Legal / CMS Pages | [legal-cms-pages.md](legal-cms-pages.md) | ✅ DONE | 8/10 | — |
| Activity / Audit Log | [audit-log.md](audit-log.md) | 🔶 PARTIAL | 7/10 | 1 critical (cross-ref), 2 low |
| Company Settings | [company-settings.md](company-settings.md) | ✅ DONE | 10/10 | — |
| Workspace / File Mgr | [workspace.md](workspace.md) | ✅ DONE | 9/10 | 1 low |
| Customer Billing | [customer-billing.md](customer-billing.md) | 🔶 PARTIAL | 7/10 | 1 high, 2 medium |
| Authentication | [authentication.md](authentication.md) | 🔶 PARTIAL | 8/10 | 1 high, 1 low |
| Quick Access Portal | [quick-access-portal.md](quick-access-portal.md) | ✅ DONE | 9/10 | — |
| Admin — Packages | [admin-packages.md](admin-packages.md) | 🔶 PARTIAL | 7/10 | 2 low |
| Admin — Users | [admin-users.md](admin-users.md) | 🔶 PARTIAL | 8/10 | 1 medium, 1 low |
| Admin — Billing | [admin-billing.md](admin-billing.md) | 🔶 PARTIAL | 4/10 | 2 medium |
| Admin — Analytics | [admin-analytics.md](admin-analytics.md) | ✅ DONE | 9/10 | — |
| Admin — System Settings | [admin-system-settings.md](admin-system-settings.md) | ✅ DONE | 10/10 | — |
| Admin — Support Tickets | [admin-support-tickets.md](admin-support-tickets.md) | ✅ DONE | 10/10 | — |
| Admin — Wiki | [admin-wiki.md](admin-wiki.md) | ✅ DONE | 9/10 | — |
| Admin — CMS Editor | [admin-cms-editor.md](admin-cms-editor.md) | 🔶 PARTIAL | 8/10 | 1 medium (partial) |
| RBAC Enforcement | [rbac.md](rbac.md) | ✅ DONE | 9/10 | — |
| AI Assistant | [ai-assistant.md](ai-assistant.md) | 🔶 PARTIAL | 9/10 | 1 low |
| Stripe Webhooks | [stripe-webhooks.md](stripe-webhooks.md) | 🔶 PARTIAL | 4/10 | 1 high |
| Two-Factor Auth | [two-factor-auth.md](two-factor-auth.md) | ❌ OPEN | 0/10 | 1 high (not started) |
| Frontend Performance | [frontend-performance.md](frontend-performance.md) | 🔶 PARTIAL | 7/10 | 3 high, 9 medium, 9 low |
| DB / Backend Performance | [db-backend-performance.md](db-backend-performance.md) | ✅ DONE | 9/10 | 1 medium, 2 low |

---

## Priority View — All Open Items by Severity

### 🔴 Critical (fix before next deployment)

| ID | Module | Item |
|----|--------|------|
| S6-01 | Invoice CRUD | Bulk status change: UI-only, no API call — lost on refresh |
| S6-02 | Invoice CRUD | Import: parsed invoices never persisted to DB |
| S6-03 | Invoice CRUD / Audit Log | Delete: `$invoice` undefined → audit log crashes on every delete |

### HIGH

| ID | Module | Item |
|----|--------|------|
| S4-01 | Auth / 2FA | Two-factor authentication (TOTP) not implemented |
| S3-01 | Customer Billing / Stripe | Stripe webhook listener has no event handling — payment history always empty |
| S6-04 | Invoice CRUD | Custom date range filter broken end-to-end |
| S6-05 | Invoice CRUD | `overdue` status unreachable — no transition rule, no scheduler |
| S6-06 | Invoice Sharing | Share link regeneration silently invalidates all previous links |
| P5A-01 | Frontend Perf | Extract `useHashRouter()` from App.tsx |
| P5A-02 | Frontend Perf | Extract `useAuthCheck()` from App.tsx |
| P5A-03 | Frontend Perf | Extract `useInvoiceHandlers()` from App.tsx |

### MEDIUM

| ID | Module | Item |
|----|--------|------|
| S2-10 | Invoice CRUD | No attachment upload UI |
| S3-04 | Customer Billing | No plan downgrade or cancellation flow |
| S3-05 | Admin Users | Admin upgrade-plan endpoint is a stub |
| S3-06 | Admin Billing | Invoice-by-ID returns hardcoded mock |
| S3-07 | Admin Billing | PDF download returns mock content |
| S4-03 | Admin CMS | Section content still a plain textarea (partial) |
| S6-07 | Invoice CRUD | Duplicate fails on second copy — UNIQUE constraint |
| S6-08 | Invoice CRUD | `X` icon not imported — runtime crash on date range UI |
| S6-09 | Buyer Management | `syncBuyer` never updates existing buyer records |
| P5A-04 | Frontend Perf | Split `adminStore` into auth + UI stores |
| P5A-05 | Frontend Perf | Replace sessionStorage CMS edit-mode with Zustand |
| P5B-01 | Frontend Perf | Wrap InvoiceEditor handlers with `useCallback` |
| P5B-02 | Frontend Perf | Fix dynamic Tailwind class strings |
| P5C-01 | Frontend Perf | Migrate `PackageComparison.tsx` to `useQuery` |
| P5C-02 | Frontend Perf | Migrate `Settings.tsx` company-types to `useQuery` |
| P5C-03 | Frontend Perf | Migrate `Billing.tsx` to `useQuery` |
| P5D-01 | Frontend Perf | Type `adminApi.ts` remaining `any` payloads |
| P5D-02 | Frontend Perf | Type `customerApi.ts` remaining `any` payloads |
| P5E-01 | DB/Backend Perf | Enable gzip/brotli on API server |

### LOW

| ID | Module | Item |
|----|--------|------|
| S3-13 | Admin Users | Default usage limits hardcoded in PHP |
| S3-17 | Admin Packages | Features JSON has no schema validation |
| S3-18 | Admin Packages | No plan retirement workflow |
| S4-13 | Invoice CRUD | Signature capture UI missing |
| S4-15 | Workspace | Content indexing failures are silent |
| S4-16 | Dashboard | No custom date range picker |
| S4-17 | Dashboard | No buyer-level analytics |
| S4-18 | Audit Log | No field-level diff capture |
| S6-10 | Invoice CRUD | List API returns 0 for all monetary sub-totals |
| P5B-03 | Frontend Perf | Memoize Recharts gradient defs |
| P5B-04 | Frontend Perf | Extract Dashboard recent-invoice row as React.memo |
| P5C-04 | Frontend Perf | Migrate 12+ remaining screens to `useQuery` |
| P5C-05 | Frontend Perf | Add optimistic updates to mutations |
| P5C-06 | Frontend Perf | Paginate audit log endpoint |
| P5D-03 | Frontend Perf | Create `apiFactory.ts` to deduplicate axios interceptors |
| P5D-04 | Frontend Perf | Reduce `authStore` localStorage persistence scope |
| P5E-02 | DB/Backend Perf | Add ETag support to static-ish endpoints |
| P5E-03 | DB/Backend Perf | Verify and remove unused DB columns |
| — | AI Assistant | Surface actionable error for missing AI API key |

---

## Effort Summary

| Category | Est. Remaining |
|----------|---------------|
| Invoice lifecycle (Sprint 6) | ~10 h |
| Billing & Stripe | ~9 h |
| Security (2FA) | ~6 h |
| Admin stubs | ~7 h |
| Frontend performance | ~21 h |
| DB/backend performance | ~3 h |
| Polish & low-priority | ~9 h |
| **Total** | **~65 h** |

---

*Last updated: 2026-05-15*
