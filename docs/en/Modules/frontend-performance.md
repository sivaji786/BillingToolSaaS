# Frontend Performance

**Status:** 🔶 PARTIAL  
**Score:** 7/10  
**Last updated:** 2026-05-15  
**Stack:** `src/App.tsx` · `src/stores/` · `src/components/screens/` · `src/services/` · `vite.config.ts`

---

## Overview

Frontend performance optimisation covering bundle splitting, React rendering efficiency, React Query data fetching, Zustand store design, and TypeScript type safety. Phases 1–7 partially applied (2026-05-13). Remaining items below.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 7/10 |
| Open high | 3 |
| Open medium | 9 |
| Open low | 9 |
| Completed phases | 1, 1.5, 2, 3, 4, 5 (partial), 6 (partial), 7 |

---

## Open Backlog

### 5A — App Architecture (highest impact)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5A-01 | HIGH | **Extract `useHashRouter()` from App.tsx.** Hash-based routing logic is inline across lines 98–253 of a 1,233-line file. Extract into `src/hooks/useHashRouter.ts`. | `src/App.tsx` | 1 h |
| P5A-02 | HIGH | **Extract `useAuthCheck()` from App.tsx.** Auth initialisation + legacy token migration + URL token handling (lines 131–195) is embedded in `AppContent`. Extract into `src/hooks/useAuthCheck.ts`. | `src/App.tsx` | 1 h |
| P5A-03 | HIGH | **Extract `useInvoiceHandlers()` from App.tsx.** ~9 business-logic handler functions (save, load, duplicate, delete, share, status change) are inline in `AppContent` (lines ~300–722). Extract into `src/hooks/useInvoiceHandlers.ts`. | `src/App.tsx` | 2–3 h |
| P5A-04 | MEDIUM | **Split `adminStore` into auth + UI stores.** Single store mixes `isAuthenticated`/`adminUser`/`token` with `theme`/`sidebarCollapsed`. Sidebar collapse triggers re-renders in auth-consuming components. Split into `adminAuthStore.ts` + `adminUIStore.ts`. | `src/stores/adminStore.ts` | 1.5 h |
| P5A-05 | MEDIUM | **Replace sessionStorage CMS edit-mode signal with Zustand.** `InlineCmsContext.tsx:43` reads `sessionStorage.getItem('cms_edit_mode')` on mount — fragile cross-page state. Replace with a tiny Zustand store persisted to sessionStorage. | `src/contexts/InlineCmsContext.tsx` | 1 h |

### 5B — React Rendering (medium impact)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5B-01 | MEDIUM | **Wrap `InvoiceEditor` handlers with `useCallback`.** Inline arrow functions on lines 308, 333, 405, 411 create new references on every render, invalidating memoized child props. | `src/components/screens/InvoiceEditor.tsx` | 1 h |
| P5B-02 | MEDIUM | **Fix dynamic Tailwind class strings.** Template literals like `` `text-${x}-400` `` are invisible to Tailwind's purger and may vanish in production builds. Replace with full class name lookups. | `Workspace.tsx:489,510,524`; `QuickAccessInvoice.tsx:306,314,322`; `Billing.tsx:119` | 1 h |
| P5B-03 | LOW | **Memoize Recharts gradient defs in Dashboard.** `<linearGradient>` recreated on every render inside the chart. Wrap in `useMemo`. | `src/components/screens/Dashboard.tsx:301–307` | 0.5 h |
| P5B-04 | LOW | **Extract Dashboard recent-invoice row as `React.memo`.** `recentInvoices.map()` creates new closures on every stats update. | `src/components/screens/Dashboard.tsx:429–464` | 0.5 h |

### 5C — Data Fetching (medium impact)

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5C-01 | MEDIUM | **Migrate `PackageComparison.tsx` to `useQuery`.** Manual `useState`+`useEffect` for 4 separate service calls with no caching. | `src/components/screens/PackageComparison.tsx` | 1 h |
| P5C-02 | MEDIUM | **Migrate `Settings.tsx` company-types fetch to `useQuery`.** `useEffect` on lines 89–98 fetches company types manually on every mount. | `src/components/screens/Settings.tsx` | 0.5 h |
| P5C-03 | MEDIUM | **Migrate `Billing.tsx` to `useQuery`.** `loadBillingData()` on mount makes 3 service calls with no caching. | `src/components/screens/Billing.tsx` | 1 h |
| P5C-04 | LOW | **Migrate remaining 12+ screens to `useQuery`.** `Dashboard.tsx`, `InvoiceEditor.tsx`, `LetterEditor.tsx`, `LetterList.tsx`, `ActivityLog.tsx`, `CmsPageView.tsx`, `LandingPage.tsx`, `Login.tsx`, `Workspace.tsx`, `QuickAccessInvoice.tsx`, `LetterPreview.tsx`, `Signup.tsx` still use manual `useState`+`useEffect`. | Various screen files | 4–6 h |
| P5C-05 | LOW | **Add optimistic updates to mutations.** All mutations use `queryClient.invalidateQueries()` causing two round-trips with visible flicker. Use `queryClient.setQueryData()` on success instead. | `Buyers.tsx`, `SAPackageServices.tsx`, `SAPages.tsx`, `SAASusers.tsx`, `SAUserDetails.tsx` | 2 h |
| P5C-06 | LOW | **Paginate audit log endpoint.** `GET /audit-logs` has no limit and grows unbounded. `ActivityLog` screen should use server-side pagination. | `src/services/api.ts`, `AuditLogController.php`, `ActivityLog.tsx` | 1.5 h |

### 5D — Type Safety

| ID | Priority | Item | File / Location | Effort |
|----|----------|------|-----------------|--------|
| P5D-01 | MEDIUM | **Type `adminApi.ts` remaining `any` payloads.** 2 occurrences: `updateSystemSettings(settings: any)` and `content: any` in `updatePage()`. | `src/services/adminApi.ts` | 0.5 h |
| P5D-02 | MEDIUM | **Type `customerApi.ts` remaining `any` payloads.** 4 occurrences: `tenant: any`, `subscription: any`, `plan: any`, `recentInvoices: any[]` in `DashboardData`. | `src/services/customerApi.ts` | 0.5 h |
| P5D-03 | LOW | **Create `apiFactory.ts` to deduplicate axios interceptors.** Auth token injection and 401-redirect are copy-pasted across `api.ts`, `adminApi.ts`, `customerApi.ts`. | `src/services/apiFactory.ts` (new) | 1.5 h |
| P5D-04 | LOW | **Reduce `authStore` localStorage persistence scope.** Full `user` and `tenant` objects serialised on every update. Persist only `{ token, isAuthenticated }` and re-hydrate from `/auth/me` on load. | `src/stores/authStore.ts` | 1 h |

---

## Completed Work (Phases 1–7)

| Phase | Key Changes |
|-------|-------------|
| **Phase 1** — Dead Code | Deleted `invoice-pdf-html.ts`, `authApi.ts`, `CustomerLayout.tsx`; uninstalled `react-rnd`, `@google/generative-ai`; removed 34+ unused imports, 16 `console.log` calls |
| **Phase 1.5** — Shared Abstractions | `usePagination<T>`, `useSorting<T>`, `useSelection`, `useCmsPage`, `useFormSubmit`; `<SearchBar>`, `<TableEmptyState>`, `<ConfirmDeleteDialog>` |
| **Phase 2** — Rendering Bugs | Fixed `Math.random()` key in InvoiceList; fixed `key={index}` in PreviewModal + ValidationPanel; replaced raw `fetch()` in QuickAccessInvoice |
| **Phase 3** — React Query | `staleTime` overrides per query type; user-scoped invoice key; `queryClient.clear()` on logout |
| **Phase 4** — Memoisation | `LanguageContext` + `InlineCmsContext` values in `useMemo`; `t()` in `useCallback`; LineItemRow 3×useEffect → 1; QRCode + invoice-import → dynamic import |
| **Phase 5** | Zustand field selectors in App.tsx, AdminLayout, AdminSidebar, SAsettings |
| **Phase 6** | `catch (error: unknown)` + `getErrorMessage()`; typed payloads in `api.ts` |
| **Vite** | `manualChunks` splits 4.1 MB vendor bundle into per-feature chunks |
