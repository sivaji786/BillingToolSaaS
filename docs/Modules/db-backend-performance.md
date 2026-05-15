# DB / Backend Performance

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** MySQL · `api/app/Controllers/` · `api/app/Commands/CleanupLogs.php` · `api/cron.sh` · nginx/Apache config

---

## Overview

Database indexing, server-side pagination, HTTP caching headers, JWT startup skip, and audit log TTL cleanup. All Phase 7 items applied 2026-05-13. Remaining gaps are server-side configuration (gzip/brotli) and optional ETag support.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open medium | 1 |
| Open low | 2 |
| Completed items | 7 |

---

## Open Backlog

### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| P5E-01 | **Enable gzip/brotli on API server.** Large JSON payloads (invoice lists, audit logs) are served uncompressed. Enabling gzip/brotli in the web server config is expected to reduce transfer size by 60–80%. This is a deployment server configuration change, not a code change. | nginx or Apache config on deployment server | 0.5 h |

### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| P5E-02 | **Add ETag support to static-ish endpoints.** `Cache-Control` headers already added (2026-05-13). Adding `ETag` allows unchanged responses to return `304 Not Modified`, saving bandwidth on repeated requests for company types, packages, and CMS nav. | `CompanyTypeController.php`, `AdminPackages.php`, `CmsController.php` | 1 h |
| P5E-03 | **Verify and remove unused DB columns.** `billing_period_start`, `billing_period_end`, `document_currency_code`, `tax_currency_code`, `gln` exist in the TypeScript type (`invoice.ts`) but have zero usages in frontend or backend code. Note: `signature_date` IS used by `mapInvoiceData()` — keep it. | `src/types/invoice.ts`, `InvoiceModel.php`, DB migration | 1–2 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| DB index: `(tenant_id, status)` on `invoices` | 2026-05-13 | MySQL migration |
| DB index: `(tenant_id, issue_date)` on `invoices` | 2026-05-13 | MySQL migration |
| DB FULLTEXT index: `invoice_number`, `buyer_name`, `seller_name` on `invoices` | 2026-05-13 | MySQL migration |
| DB index: `(tenant_id, deleted_at)` on `buyers` | 2026-05-13 | MySQL migration |
| DB index: `(tenant_id, timestamp)` on `audit_logs` | 2026-05-13 | MySQL migration |
| DB index: `(tenant_id, created_at)` on `aiquery_history` | 2026-05-13 | MySQL migration |
| Server-side pagination on `InvoiceController`, `BusinessLetterController`, `BuyerController` — `?page=N&pageSize=N` returns `{ data, total, page, pageSize }`; backward-compatible (no `page` param returns full array) | 2026-05-13 | All three controllers |
| `Cache-Control: public, max-age=3600` on company types, packages, package services | 2026-05-13 | PHP controllers |
| `Cache-Control: public, max-age=300` on CMS nav endpoint | 2026-05-13 | `CmsController.php` |
| JWT startup skip — `isJwtValid()` skips `/auth/me` round-trip when token valid + store hydrated | 2026-05-13 | `utils/config.ts`, `App.tsx` |
| Audit log TTL — `cleanup:logs` command deletes `audit_logs` > 12 months; trims `aiquery_history` to ≤ 100 rows per user; `api/cron.sh` for daily scheduling | 2026-05-13 | `CleanupLogs.php`, `cron.sh` |
