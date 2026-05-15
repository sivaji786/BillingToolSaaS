# Admin — Users

**Status:** 🔶 PARTIAL  
**Score:** 8/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Admin/SAASusers.tsx`, `SAUserDetails.tsx` · `api/app/Controllers/AdminUsers.php`

---

## Overview

Super-admin management of tenant accounts. Admins can create, edit, suspend, and delete tenants; view usage metrics; export a CSV; and manually trigger plan upgrades. Last login is recorded in real time. Password resets generate a random 12-character password (no more hardcoded "password123"). Usage limit defaults are still hardcoded in PHP rather than read from the assigned plan.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 8/10 |
| Open medium | 1 |
| Open low | 1 |
| Completed items | 5 |

---

## Open Backlog

### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S3-05 | **Admin upgrade-plan endpoint is a stub.** `POST /admin/users/:id/upgrade-plan` exists in routes but `AdminUsers::upgradePlan()` (lines 213–219) returns a hardcoded success response without modifying the tenant's plan or triggering any Stripe action. | `api/app/Controllers/AdminUsers.php:213–219` | 2–3 h |

### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S3-13 | **Default usage limits hardcoded in PHP.** When a new tenant is created, the initial `invoices_limit`, `storage_limit`, and `api_limit` values are hardcoded constants in `AdminUsers.php` (lines 300–305) rather than read from the tenant's assigned plan's `limits` JSON. | `api/app/Controllers/AdminUsers.php:300–305` | 1 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Password reset hardcoded "password123" — replaced with `random_int()` generated 12-char password | 2026-05-05 | `AdminUsers.php` |
| Email fallback used fake domain — corrected to use tenant email | 2026-05-05 | `AdminUsers.php` |
| CSV export lacked usage columns — added invoices_used, storage_used, api_calls_used | 2026-05-05 | `AdminUsers.php` |
| `last_login` always returned `now()` — `Auth::login()` now writes a real timestamp | 2026-05-05 | `Auth.php`, `AdminUsers.php`, `UserModel.php` |
| `useDebounce` hook added to user search input (400 ms) | 2026-05-08 | `SAASusers.tsx` |
