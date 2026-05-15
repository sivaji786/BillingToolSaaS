# Admin — Billing

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Admin/SAbilling.tsx` · `api/app/Controllers/AdminBilling.php`

---

## Overview

Super-admin view of all tenant billing records: subscription status, invoice history, and PDF downloads of invoices. Subscription data is read from the `subscriptions` table joined with `tenants`, `plans`, and `users`. PDF generation is handled client-side via `generateInvoicePDF`; the backend `/invoices/:id/pdf` endpoint serves a real HTML receipt as a server-side fallback.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open medium | 0 |
| Still open (other sprints) | 2 (S3-01 Stripe webhooks, S3-04 plan downgrade/cancel) |
| Completed items (Sprint 6) | 2 |

---

## Open Backlog

### From other sprints

| ID | Priority | Item | Location | Effort |
|----|----------|------|----------|--------|
| S3-01 | HIGH | **Stripe webhook integration** — `payment-history` returns `[]`; webhook listener for `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` not implemented | `api/app/Controllers/Billing.php:158–163`, `Webhooks.php` | 5–6 h |
| S3-04 | MEDIUM | **No plan downgrade or cancellation flow** — only upgrade path (Stripe Checkout) is implemented | `Billing.php`, `Billing.tsx` | 2 h |

---

## Completed Items

| ID | Item | Fixed | Files |
|----|------|-------|-------|
| S3-06 | **Invoice-by-ID returned hardcoded mock** — `show()` now queries `subscriptions JOIN tenants JOIN plans JOIN users` and returns real data | 2026-05-15 | `AdminBilling.php:show()` |
| S3-07 | **PDF download returned mock content** — `downloadPdf()` now fetches real subscription data and returns a structured HTML receipt; client-side PDF generation in `SAbilling.tsx` uses the same data from the list endpoint | 2026-05-15 | `AdminBilling.php:downloadPdf()` |

---

## Architecture Notes

| # | Detail |
|---|--------|
| 1 | `index()`, `show()`, and `downloadPdf()` all use shared helpers `fetchSubscription()` and `formatSubscriptionAsInvoice()` to avoid duplication |
| 2 | `index()` runs `countAllResults()` before joining `users` to prevent inflated row counts from multi-user tenants; the users join is added after the count for the data query only |
| 3 | Client-side PDF generation (`generateInvoicePDF` in `SAbilling.tsx`) is the primary PDF path — it uses data already loaded in the invoice list, maps it to the `FullInvoice` type, and includes seller details from admin settings |
| 4 | Backend `downloadPdf()` returns `text/html` (a printable invoice receipt) since no PHP PDF library is installed; it is a server-side fallback, not the primary path |

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/invoices` | Super-admin JWT | Paginated subscription list with filters |
| `GET` | `/api/admin/invoices/:id` | Super-admin JWT | Real subscription record by ID |
| `GET` | `/api/admin/invoices/:id/pdf` | Super-admin JWT | HTML invoice receipt for the subscription |
| `POST` | `/api/admin/invoices` | Super-admin JWT | Create manual subscription record |
| `GET` | `/api/admin/revenue` | Super-admin JWT | Revenue stats and 6-month chart data |
