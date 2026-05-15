# Admin — Analytics

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Admin/SAAnalytics.tsx` · `api/app/Controllers/AdminAnalytics.php`

---

## Overview

Super-admin analytics dashboard showing MRR, ARR, active tenant count, churn rate, bandwidth usage, and session metrics. All metrics now use real data. Previously contained multiple `rand()` fillers, a wrong churn formula, a mock CSV export, and bandwidth measured as disk size rather than actual transfer.

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
| CSV export was hardcoded mock — replaced with real data export | 2026-04-28 | `AdminAnalytics.php` |
| Session count used `rand()` filler — replaced with real session tracking | 2026-04-28 | `AdminAnalytics.php` |
| Bandwidth metric was disk size, not transfer — added real bandwidth tracking via `workspace_bandwidth` column | 2026-04-28 | `WorkspaceController.php`, `AdminAnalytics.php`, migration `2026-04-28-000003` |
| Churn rate formula was incorrect — fixed to `(lost_tenants / start_of_period_tenants) × 100` | 2026-04-28 | `AdminAnalytics.php` |
