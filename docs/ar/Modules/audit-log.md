# Activity / Audit Log

**Status:** 🔶 PARTIAL  
**Score:** 7/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/ActivityLog.tsx` · `api/app/Controllers/AuditLogController.php` · `api/app/Traits/AuditTrait.php` · `audit_logs` table

---

## Overview

Tenant-scoped audit trail recording create, update, validated, sent, and delete actions on invoices and letters. Each log entry captures the action type, invoice number, acting user (extracted from JWT), timestamp, and a signed flag. A TTL cleanup command purges entries older than 12 months. The frontend `ActivityLog` screen displays all entries in a flat list with no server-side pagination.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 7/10 |
| Open critical | 1 (cross-ref — delete audit crash is in InvoiceController) |
| Open low | 2 |
| Completed items | 3 |

---

## Open Backlog

### 🔴 Critical (cross-reference)

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S6-03 | **Delete audit log crashes: `$invoice` undefined in `InvoiceController::delete()`.** The `find()` result is not stored; line 320 reads `$invoice['invoice_number']` which is undefined. Every delete succeeds in the DB but produces no audit entry. Fix lives in `InvoiceController.php`, not `AuditTrait.php`. | `api/app/Controllers/InvoiceController.php:307–324` | 0.5 h |

### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S4-18 | **No field-level diff capture.** Audit entries record that an invoice was updated but not which fields changed or what the previous values were. Requires storing a before/after snapshot (JSON diff) on each update log entry. | `api/app/Traits/AuditTrait.php` | 2 h |
| P5C-06 | **Audit log endpoint has no pagination.** `GET /audit-logs` returns all rows for the tenant with no limit. On high-volume tenants the payload grows unbounded. `ActivityLog` screen should use server-side pagination matching the pattern established for invoices. | `src/services/api.ts`, `api/app/Controllers/AuditLogController.php`, `src/components/screens/ActivityLog.tsx` | 1.5 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Authenticated user ID not captured — `AuditTrait` now extracts user name from JWT when session is empty | 2026-05-05 | `AuditTrait.php` |
| TTL cleanup: `cleanup:logs` CI4 command deletes `audit_logs` rows older than 12 months; daily cron via `api/cron.sh` | 2026-05-13 | `api/app/Commands/CleanupLogs.php`, `api/cron.sh` |
| DB index: `(tenant_id, timestamp)` on `audit_logs` table | 2026-05-13 | MySQL migration |

---

## Key DB Table

| Column | Notes |
|--------|-------|
| `id` | PK |
| `tenant_id` | Tenant scope |
| `action` | `created` \| `updated` \| `validated` \| `sent` \| `deleted` |
| `invoice_number` | Reference |
| `user` | Acting user name (from JWT) |
| `details` | Free-text description |
| `signed` | Boolean flag |
| `timestamp` | Event time |

---

## Logged Actions

| Trigger | Action recorded |
|---------|----------------|
| Invoice created | `created` |
| Invoice saved (no status change) | `updated` |
| Status changed to `validated` | `validated` |
| Status changed to `sent` | `sent` |
| Invoice deleted | `deleted` *(currently broken — S6-03)* |
