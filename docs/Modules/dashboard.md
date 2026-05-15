# Dashboard

**Status:** 🔶 PARTIAL  
**Score:** 8/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Dashboard.tsx` · `api/app/Controllers/DashboardController.php`

---

## Overview

Main tenant landing page showing invoice totals, revenue charts (Recharts), recent invoice list, status breakdown, and quick-action buttons. Uses real data from the database. Filtering is currently limited to preset time ranges — custom date range and buyer-level drill-down are not yet available.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 8/10 |
| Open low | 4 |
| Completed items | 0 (dashboard was always functional; gaps are missing features) |

---

## Open Backlog

### LOW

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S4-16 | **No custom date range picker.** Dashboard time-range selector only offers preset options (last 7/30/90 days, this month, etc.). Users cannot select arbitrary from–to dates. | `src/components/screens/Dashboard.tsx` | 2 h |
| S4-17 | **No buyer-level analytics.** No way to drill into revenue per buyer, invoice count per buyer, or average invoice value by buyer. | `src/components/screens/Dashboard.tsx`, `InvoiceController.php` | 3 h |
| P5B-03 | **Memoize Recharts gradient defs.** `<linearGradient id="colorGradient">` is recreated on every render inside the chart component, causing unnecessary SVG DOM churn. Wrap in `useMemo`. | `src/components/screens/Dashboard.tsx:301–307` | 0.5 h |
| P5B-04 | **Extract recent-invoice row as `React.memo` component.** `recentInvoices.map()` creates new closures on every stats update, re-rendering all rows unnecessarily. | `src/components/screens/Dashboard.tsx:429–464` | 0.5 h |
