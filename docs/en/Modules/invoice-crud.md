# Invoice CRUD

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/InvoiceList.tsx`, `InvoiceEditor.tsx`, `InvoicePreview.tsx` · `api/app/Controllers/InvoiceController.php` · `invoice_lines` table

---

## Overview

Core invoice lifecycle: create, list, edit, duplicate, delete, import, bulk operations, and status transitions. Invoices follow a strict state machine enforced on both frontend and backend. Line items store individual product/service rows; totals are calculated client-side and stored in aggregate columns.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open critical | 0 |
| Open high | 0 |
| Open medium | 0 |
| Open low | 0 |
| Still open (other sprints) | 2 (attachment upload S2-10, signature UI S4-13) |
| Completed items (Sprint 6) | 8 |

---

## State Machine (backend-enforced)

```
draft      → draft, validated, cancelled
validated  → validated, draft, sent, cancelled
sent       → sent, paid, cancelled, overdue
overdue    → overdue, paid, cancelled
paid       → paid                           (terminal)
cancelled  → cancelled                      (terminal)
```

`sent` invoices past their `due_date` are auto-transitioned to `overdue` daily via `php spark invoices:mark-overdue` (wired into `api/cron.sh`).

---

## Open Backlog

### From other sprints

| ID | Priority | Item | Location | Effort |
|----|----------|------|----------|--------|
| S2-10 | MEDIUM | **No attachment upload UI** — `invoice.attachments` array is typed but no file picker exists in the editor | `src/components/screens/InvoiceEditor.tsx` | 3 h |
| S4-13 | LOW | **Signature capture UI missing** — `invoice.signed` and `signature_date` exist in DB and type but no signature widget | `InvoiceEditor.tsx` or `InvoicePreview.tsx` | 3 h |

---

## Completed Items

| ID | Item | Fixed | Files |
|----|------|-------|-------|
| — | Status transition not enforced in backend | 2026-05-05 | `InvoiceController.php` |
| — | Fields remain editable after "sent" status | 2026-05-05 | `InvoiceEditor.tsx` |
| — | Invoice duplicate did not persist to DB | 2026-05-05 | `InvoiceList.tsx` |
| — | Plan limit enforcement at creation (429) | 2026-05-05 | `PlanLimitTrait.php`, `InvoiceController.php` |
| — | Server-side pagination (`?page=N&pageSize=N`) | 2026-05-13 | `InvoiceController.php` |
| — | DB composite indexes on `(tenant_id, status)` and `(tenant_id, issue_date)` | 2026-05-13 | MySQL migration |
| — | FULLTEXT index on `invoice_number`, `buyer_name`, `seller_name` | 2026-05-13 | MySQL migration |
| S6-03 | Delete audit crash: `$invoice` undefined in `delete()` | 2026-05-15 | `InvoiceController.php:307` |
| S6-08 | `X` icon missing from lucide-react import — runtime crash on custom date range | 2026-05-15 | `InvoiceList.tsx:53` |
| S6-01 | Bulk status change was UI-only (no API call, terminal guards bypassed) | 2026-05-15 | `InvoiceList.tsx:180` |
| S6-02 | Imported invoices not persisted to DB (vanished on reload) | 2026-05-15 | `InvoiceList.tsx:271` |
| S6-04 | Custom date range filter broken end-to-end | 2026-05-15 | `InvoiceList.tsx:110`, `InvoiceController.php:38`, `api.ts` |
| S6-07 | Duplicate suffix `-COPY` caused UNIQUE constraint on second copy | 2026-05-15 | `InvoiceList.tsx:211` |
| S6-05 | `overdue` status unreachable — missing from transitions, no filter, no cron | 2026-05-15 | `InvoiceController.php:264`, `InvoiceList.tsx`, `MarkOverdueInvoices.php` |
| S6-10 | List API returned hardcoded `0` for all monetary sub-totals | 2026-05-15 | `InvoiceController.php:191` |

---

## Key DB Tables

| Table | Key Columns |
|-------|-------------|
| `invoices` | `id`, `tenant_id`, `invoice_number` (UNIQUE), `status` (ENUM: draft/validated/sent/overdue/paid/cancelled), `issue_date`, `due_date`, `payable_amount`, `line_extension_amount`, `tax_exclusive_amount`, `tax_inclusive_amount`, `share_token`, `template_type`, `template_id`, `created_by` |
| `invoice_lines` | `id`, `invoice_id` (FK CASCADE), `description`, `quantity`, `unit_price`, `tax_category`, `tax_percent`, `line_extension_amount` |
