# Admin — Packages

**Status:** 🔶 PARTIAL  
**Score:** 7/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Admin/SApackages.tsx`, `SAPackageServices.tsx`, `SAPackageForm.tsx` · `api/app/Controllers/AdminPackages.php`

---

## Overview

Super-admin management of subscription plans. Admins can create, edit, and delete plans with name, price, currency, Stripe price ID, invoice/storage/API limits (stored as JSON), and a list of included features. Plans are read by `PlanLimitTrait` at runtime to enforce per-tenant quotas. No retirement workflow exists — deleting an active plan can orphan tenants.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 7/10 |
| Open low | 2 |
| Completed items | 2 |

---

## Open Backlog

### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S3-17 | **Features JSON has no schema validation.** The `features` column accepts arbitrary JSON. There is no validation of structure, required keys, or value types. A malformed features object can break plan-comparison UI or cause unexpected behaviour in `PlanLimitTrait`. | `api/app/Controllers/AdminPackages.php` | 1.5 h |
| S3-18 | **No plan retirement workflow.** When a plan is deleted or deprecated, tenants currently on that plan receive no notification. There is no grace period, migration path, or admin-initiated plan-change flow. | `AdminPackages.php`, email service | 3 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Currency hardcoded to EUR — now reads `currency` from the plan record in DB | 2026-05-06 | `AdminPackages.php`, migration `2026-05-06-000002` |
| Package/service queries given `staleTime: 30 min` via React Query | 2026-05-13 | `SApackages.tsx`, `SAPackageServices.tsx`, `SAPackageForm.tsx` |

---

## Plan Limits JSON Structure

```json
{
  "invoices": 100,
  "letters": 50,
  "buyers": 200,
  "storage_mb": 500,
  "api_calls": 1000
}
```
Read by `api/app/Traits/PlanLimitTrait.php` at invoice/letter/buyer creation time.
