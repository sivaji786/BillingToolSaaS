# Invoice Sharing

**Status:** ✅ DONE  
**Score:** 10/10  
**Last updated:** 2026-05-15  
**Stack:** `api/app/Controllers/InvoiceController.php` · `src/components/screens/SharedInvoiceView.tsx` · `src/components/screens/InvoiceList.tsx` · `src/App.tsx` · `Routes.php`

---

## Overview

Public invoice sharing via a unique token link. Any tenant user can generate a shareable URL for an invoice; the link is accessible without authentication. Intended for sending invoices to buyers who do not have accounts.

**Share flow:**
1. User clicks Share → `POST /invoices/:id/share`
2. Backend returns existing token (idempotent); only issues a new one when none exists or `?force=1` is passed
3. Returns `{ shareUrl, token }` — frontend copies URL to clipboard
4. Buyer opens `/#/shared/:token` — the app renders `SharedInvoiceView` without requiring login
5. Buyer reads the invoice and can download a PDF

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 10/10 |
| Open items | 0 |
| Completed items | 4 |

---

## Completed Items

| ID | Item | Fixed | Files |
|----|------|-------|-------|
| — | Share link backend missing — no endpoint, no token storage | 2026-05-06 | `InvoiceController.php`, `Routes.php`, migration `2026-05-06-000001` |
| S6-06 | Token overwrite — `generateShareToken()` always issued a fresh token, silently breaking distributed buyer links | 2026-05-15 | `InvoiceController.php:generateShareToken()` |
| IS-01 | **No frontend viewer for `/#/shared/:token`** — hash router had no `shared/` handler; buyers landing on share links saw the landing page | 2026-05-15 | `src/components/screens/SharedInvoiceView.tsx` (new), `src/App.tsx` |
| IS-02 | **`SharedInvoiceView` missing** — no public-facing read-only invoice page with PDF download | 2026-05-15 | `src/components/screens/SharedInvoiceView.tsx` (new) |

---

## Security Notes

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| SEC-14 | Token overwrite silently breaks distributed buyer links | LOW | ✅ FIXED 2026-05-15 (S6-06) |

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/invoices/:id/share` | JWT required | Return existing token (idempotent) or generate new one |
| `POST` | `/invoices/:id/share?force=1` | JWT required | Force-regenerate token (invalidates previous links) |
| `GET` | `/api/public/invoices/:token` | None | Public invoice data by token |

---

## Frontend Route

`/#/shared/:token` → `SharedInvoiceView` component (no auth required).

`SharedInvoiceView` features:
- Loads invoice via `invoiceService.getByShareToken(token)`
- Seller / buyer contact blocks
- Line-items table with per-line amounts
- Subtotal / tax / total summary (reads real DB sub-totals — fixed by S6-10)
- PDF download via `generateInvoicePDF`
- Graceful error state for invalid / expired tokens
- "Powered by BillingTool" CTA linking to signup
