# Quick Access Portal

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/QuickAccessInvoice.tsx` · `api/app/Controllers/QuickAccessAuth.php`

---

## Overview

Password-less portal allowing customers to access their invoices via a one-time OTP sent to their email. On successful OTP verification, the customer can view, download, and pay invoices without creating a full account. Previously used sequential, guessable draft tokens — now uses cryptographically random tokens stored in the database.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open items | 0 |
| Completed items | 4 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| OTP endpoint had no rate limiting — added 3 attempts/15 min per email + 10 attempts/15 min per IP | 2026-05-05 | `QuickAccessAuth.php` |
| Draft tokens were short/sequential (guessable) — replaced with cryptographically random tokens stored in DB | 2026-05-05 | `QuickAccessAuth.php`, migration `2026-05-05-000001` |
| `qa_pending_action` stored in `localStorage` (persisted across sessions) — switched to `sessionStorage` | 2026-05-05 | 4 screen files |
| Raw `fetch()` calls replaced with `api` Axios instance (consistent interceptors + error handling) | 2026-05-13 | `QuickAccessInvoice.tsx` |

---

## Security Notes

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| SEC-03 | OTP endpoint had no rate limiting — email spam vector | 🔴 HIGH | ✅ FIXED 2026-05-05 |
| SEC-04 | Draft tokens short/sequential — guessable by enumeration | 🔴 HIGH | ✅ FIXED 2026-05-05 |
