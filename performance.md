# Performance Optimization Plan — BillingTool

> **Status:** Phase 1 complete. Phase 1.5 next.  
> Last updated: 2026-05-12

---

## Table of Contents

1. [Bundle & Code Splitting](#1-bundle--code-splitting)
2. [React Rendering](#2-react-rendering)
3. [State Management](#3-state-management)
4. [Data Fetching & Caching](#4-data-fetching--caching)
5. [Unused Files, Exports & Dead Code](#5-unused-files-exports--dead-code)
6. [Unused npm Packages](#6-unused-npm-packages)
7. [Unused Named Imports (within files)](#7-unused-named-imports-within-files)
8. [Unused / Potentially Dead DB Columns](#8-unused--potentially-dead-db-columns)
9. [TypeScript & Type Safety](#9-typescript--type-safety)
10. [Assets & CSS](#10-assets--css)
11. [Backend / API](#11-backend--api)
12. [Database Performance](#12-database-performance)
13. [Redundant Code Blocks & Shared Abstractions](#13-redundant-code-blocks--shared-abstractions)
14. [Execution Order](#14-execution-order)

---

## Current Bundle Snapshot (post initial optimizations)

| Chunk | Size (minified) | Gzip | Loaded |
|---|---|---|---|
| `index.js` (main) | 564 KB | 177 KB | Always |
| `vendor-pdf-tools` | 636 KB | 190 KB | On PDF export only |
| `RichTextEditor` | 391 KB | 122 KB | On editor open |
| `BarChart` | 331 KB | 88 KB | On chart screens |
| `mermaid.core` | 447 KB | 121 KB | SAWiki only |
| `treemap` | 453 KB | 107 KB | SAWiki only |
| `cytoscape.esm` | 442 KB | 141 KB | SAWiki only |
| **Total build** | **~11 MB** | — | 179 chunks |

Already done: translation files lazy-loaded (ar/de/pl), GlobalAIAssistant + TicketingWidget lazy-loaded.

---

## 1. Bundle & Code Splitting

### 1.1 — `require()` calls in render handlers (HIGH)

**File:** `src/components/screens/InvoiceList.tsx:363, 371, 379`

Using CommonJS `require()` inside click handlers bypasses tree-shaking and module caching.

```ts
// Line 363
const { downloadImportTemplate } = require('../../utils/invoice-import');
// Line 371
const { downloadJSONTemplate } = require('../../utils/invoice-import');
// Line 379
const { downloadUBLXMLTemplate } = require('../../utils/invoice-import');
```

**Fix:** Replace with dynamic `import()` inside each handler:
```ts
const handleDownloadTemplate = async () => {
  const { downloadImportTemplate } = await import('../../utils/invoice-import');
  downloadImportTemplate();
};
```

---

### 1.2 — QRCode library loaded statically (MEDIUM)

**File:** `src/components/invoice/InvoiceQRCode.tsx:7`

```ts
import QRCode from 'qrcode'; // static — loads even when QR isn't shown
```

**Fix:** Dynamic import inside the effect that renders the QR code.

---

### 1.3 — `react-rnd` installed but never used (LOW)

**File:** `package.json`

`react-rnd` appears in dependencies but has zero imports anywhere in the codebase.

**Fix:** `npm uninstall react-rnd`

---

## 2. React Rendering

### 2.1 — Unstable `Math.random()` key in invoice list (CRITICAL)

**File:** `src/components/screens/InvoiceList.tsx:664`

```tsx
<InvoiceRow key={invoice.id || Math.random()} .../>
```

`Math.random()` as fallback key causes full unmount/remount of every row on every parent re-render.

**Fix:** Use a stable fallback: `key={invoice.id ?? invoice.tempId ?? index}`

---

### 2.2 — `index` keys in mapped lists (HIGH)

**Files:**
- `src/components/invoice/PreviewModal.tsx:286`
- `src/components/invoice/ValidationPanel.tsx:69`

Index keys cause silent reordering bugs and unnecessary DOM mutations.

**Fix:** Use stable IDs from the data objects.

---

### 2.3 — Inline arrow functions in JSX (HIGH)

**File:** `src/components/screens/InvoiceEditor.tsx:308, 333–338, 405, 411`

```tsx
// Line 308
onClick={() => onLoadTemplate(template)}
// Line 333
onValueChange={(value: any) => { handleUpdateInvoice({ status: value }); ... }}
```

Each render creates new function references, invalidating memoized child props.

**Fix:** Wrap frequently-recreated handlers with `useCallback`, or extract stable named functions.

---

### 2.4 — Three redundant `useEffect` hooks in `LineItemRow` (MEDIUM)

**File:** `src/components/invoice/LineItemRow.tsx:38–48`

```ts
useEffect(() => { setQtyInput(...); }, [line.quantity]);
useEffect(() => { setPriceInput(...); }, [line.unitPrice]);
useEffect(() => { setTaxInput(...); }, [line.taxPercent]);
```

Three separate effects fire independently and each triggers its own re-render.

**Fix:** Consolidate into one `useEffect([line.quantity, line.unitPrice, line.taxPercent])`.

---

### 2.5 — Context value objects not memoized (HIGH)

**Files:**
- `src/contexts/LanguageContext.tsx:37`
- `src/contexts/InlineCmsContext.tsx:82`

```tsx
// LanguageContext — line 37
value={{ language, setLanguage: handleSetLanguage, t, isRtl }}

// InlineCmsContext — line 82
value={{ editMode, setEditMode, patchField, isSavingField }}
```

Every parent re-render creates a new object, causing ALL context consumers to re-render even when values are unchanged.

**Fix:** Wrap each `value` with `useMemo`:
```tsx
const ctxValue = useMemo(
  () => ({ language, setLanguage: handleSetLanguage, t, isRtl }),
  [language, handleSetLanguage, t, isRtl]
);
```

---

### 2.6 — Recharts SVG gradient defs recreated on every render (MEDIUM)

**File:** `src/components/screens/Dashboard.tsx:301–307`

```tsx
<defs>
  <linearGradient id="colorGradient" ...>  {/* recreated every render */}
```

**Fix:** Extract into a memoized `<GradientDefs />` component or move outside the JSX return.

---

### 2.7 — Dashboard recent invoice rows not memoized (LOW)

**File:** `src/components/screens/Dashboard.tsx:429–464`

`recentInvoices.map()` creates new closures every render. Every stats update re-renders all rows.

**Fix:** Extract into a `React.memo` row component.

---

## 3. State Management

### 3.1 — App.tsx is a 1,225-line god component (CRITICAL)

**File:** `src/App.tsx:1–1225`

The root component combines:
- Hash-based routing (lines 200–253)
- Auth state + legacy token migration (lines 131–170)
- 12 `useState` hooks for unrelated concerns (lines 97–129)
- 4 `useQuery` data-fetching hooks (lines 272–296)
- 9 business-logic handler functions (lines 300–722)
- All screen rendering (lines 724–1099)

**Fix plan:**
1. Extract `useHashRouter()` custom hook — move routing logic from lines 200–253
2. Extract `useAuthCheck()` custom hook — move auth initialization from lines 131–170
3. Extract `useInvoiceHandlers()` custom hook — move CRUD handlers from lines 300–722
4. Split render into `<AuthenticatedApp />`, `<AdminApp />`, `<PublicApp />` sub-components

---

### 3.2 — Zustand consumers not using selectors (HIGH)

**Files:**
- `src/App.tsx:96` — `const { isAuthenticated, user, login, logout } = useAuthStore()`
- `src/components/screens/Admin/AdminLayout.tsx:17` — `const { adminUser } = useAdminStore()`
- `src/components/ProtectedRoute.tsx:11` — `const { isAuthenticated, user } = useAuthStore()`

Subscribing to the whole store re-renders the component on any store field change, even unrelated ones.

**Fix:** Use field selectors:
```ts
const isAuthenticated = useAuthStore(s => s.isAuthenticated);
const user = useAuthStore(s => s.user);
```

---

### 3.3 — `adminStore` mixes unrelated concerns (MEDIUM)

**File:** `src/stores/adminStore.ts:7–16`

Single store holds: auth state, UI sidebar state, theme, and hydration tracking. A sidebar collapse triggers re-renders in all auth-consuming components.

**Fix:** Split into:
- `useAdminAuthStore` — auth + token
- `useAdminUIStore` — theme + sidebarCollapsed

---

### 3.4 — `authStore` persists oversized objects to localStorage (MEDIUM)

**File:** `src/stores/authStore.ts:78–86`

Entire `user` and `tenant` objects (including API keys) are serialized to localStorage on every store update.

**Fix:** Persist only `{ token, isAuthenticated }`. Fetch user/tenant from `/auth/me` on load — the call is already implemented in `authService.me()`.

**Security note:** `tenant.gemini_api_key` and `tenant.openai_api_key` (lines 22–23 of the Tenant type) are being persisted to localStorage. Do not persist these fields.

---

### 3.5 — `sessionStorage` used for CMS edit mode sync (MEDIUM)

**File:** `src/contexts/InlineCmsContext.tsx:41–46`

```ts
if (sessionStorage.getItem('cms_edit_mode') === '1') {
  sessionStorage.removeItem('cms_edit_mode');
  setEditModeState(true);
}
```

Using sessionStorage as a cross-page state signal is fragile and hard to debug.

**Fix:** Use a small Zustand store (persisted to sessionStorage via Zustand persist middleware) or a URL param.

---

## 4. Data Fetching & Caching

### 4.1 — Manual `useEffect` + axios calls bypassing React Query (CRITICAL)

These components fetch data outside React Query — no caching, no deduplication, re-fetches on every mount:

| File | Line | Fetches |
|---|---|---|
| `src/components/screens/InvoiceList.tsx` | 117–135 | All invoices |
| `src/components/screens/LetterList.tsx` | 53–70 | All letters |
| `src/components/screens/Settings.tsx` | 89–98 | Company types |
| `src/components/screens/InvoicePreview.tsx` | 103+ | All buyers |
| `src/components/screens/InvoiceEditor.tsx` | 71–81 | All buyers (duplicate of above) |
| `src/components/screens/PackageComparison.tsx` | ~160+ | Plans + package services + CMS nav |
| `src/components/screens/TermsAndConditions.tsx` | 22–35 | CMS page content |
| `src/components/screens/AIHistory.tsx` | 36–51 | AI history |

**Fix:** Migrate each to `useQuery` with appropriate `queryKey` and `staleTime`.

---

### 4.2 — Raw `fetch()` call without auth interceptor (CRITICAL)

**File:** `src/components/screens/QuickAccessInvoice.tsx:132`

Uses the browser's native `fetch()` directly, bypassing the configured axios instance. The auth token is not injected and errors bypass the global interceptor.

**Fix:** Replace with the `api` axios instance from `src/services/api.ts`.

---

### 4.3 — 24 `useQuery` calls without explicit `staleTime` (HIGH)

All rely on the global 5-minute default. Some data is practically static; some is real-time.

**Recommended `staleTime` values by query key:**

| Query key | Recommended staleTime | Reason |
|---|---|---|
| `['templates']` | 30 min | Rarely changes |
| `['profile']` | 30 min | Rarely changes |
| `['admin-settings']` | 60 min | Virtually static |
| `['admin-staff']` | 60 min | Rarely changes |
| `['billing/plans']` | 60 min | Rarely changes |
| `['cms-pages']` | 60 min | Static per session |
| `['invoices']` | 2 min | Frequently modified |
| `['audit-logs']` | 5 min | Global default fine |
| `['admin-tickets']` | 1 min | Near real-time |
| `['usage-metrics', period]` | 10 min | Expensive aggregation |

Files missing explicit staleTime: `src/App.tsx:272–296`, `src/components/screens/Admin/SAbilling.tsx:31–45`, `src/components/screens/Admin/SAdashboard.tsx:16–20`, `src/components/screens/Buyers.tsx:178–181`, and 20 more across Admin screens.

---

### 4.4 — No optimistic updates on mutations (MEDIUM)

All mutations use `queryClient.invalidateQueries()` — two round trips (mutation + re-fetch) with visible flicker.

**Files:**
- `src/components/screens/Buyers.tsx:183–211` (create, update, delete)
- `src/components/screens/Admin/SAPackageServices.tsx:37–75`
- `src/components/screens/Admin/SAPages.tsx:91–113`
- `src/components/screens/Admin/SAASusers.tsx:39–62`
- `src/components/screens/Admin/SAUserDetails.tsx:65–89`

**Fix:** Use `queryClient.setQueryData()` on success to update cache directly; invalidate only on error.

---

### 4.5 — React Query cache not cleared on logout (MEDIUM)

**File:** `src/services/api.ts:30–44`

The 401 interceptor calls `useAuthStore.getState().clearAuth()` but does not clear the React Query cache. User A's invoices, buyers, and templates remain in memory when user B logs in.

**Fix:** Call `queryClient.clear()` inside the logout/clearAuth flow.

---

### 4.6 — Invoice query key not scoped to user (LOW)

**File:** `src/App.tsx:272`

```ts
queryKey: ['invoices']  // no user scope
```

If two users log in sequentially in the same tab, the second user briefly sees the first user's cached data.

**Fix:** `queryKey: ['invoices', user?.id]`

---

## 5. Unused Files, Exports & Dead Code

### 5.1 — Files with zero imports anywhere (delete)

| File | Lines | Reason |
|---|---|---|
| `src/utils/invoice-pdf-html.ts` | 241 | Zero imports; superseded by `invoice-pdf.ts` |
| `src/services/authApi.ts` | 64 | Zero imports; superseded by `api.ts` + `authStore` |
| `src/components/layouts/CustomerLayout.tsx` | ~80 | Never imported anywhere |

### 5.2 — Files to verify then delete

| File | Lines | Concern |
|---|---|---|
| `src/components/ProtectedRoute.tsx` | 41 | Not imported in `App.tsx`; verify no lazy dynamic import exists |
| `src/components/screens/Admin/AdminLayout.tsx` | 110 | Superseded by `src/components/admin/AdminLayout.tsx` |
| `src/widget-loader.tsx` | unknown | Exports `initTicketingWidget` — never imported in src/; may be a standalone embed entry point, clarify intent |
| `src/components/ThemeBuilder.tsx` | unknown | Exported `ThemeBuilder` component never imported anywhere |

### 5.3 — Exported symbols never imported by any other file

These are exported but have zero import sites across the entire codebase:

| Symbol | File |
|---|---|
| `ThemeBuilder` | `src/components/ThemeBuilder.tsx` |
| `CustomerInvoices` | `src/components/screens/Customer/Invoices.tsx` |
| `CustomerDashboard` | `src/components/screens/Customer/Dashboard.tsx` |
| `ImageWithFallback` | `src/components/figma/ImageWithFallback.tsx` |
| `CustomerLayout` | `src/components/layouts/CustomerLayout.tsx` |
| `generateEPCQRCodeData` | `src/utils/qr-code-generator.ts` |
| `generateSwissQRCodeData` | `src/utils/qr-code-generator.ts` |
| `generateGiroCodeData` | `src/utils/qr-code-generator.ts` |
| `validateIBAN` | `src/utils/qr-code-generator.ts` |
| `formatIBAN` | `src/utils/qr-code-generator.ts` |
| `PLATFORM_DEFAULT_TEMPLATE` | `src/utils/invoice-templates-defaults.ts` |
| `PLATFORM_LETTER_TEMPLATE` | `src/utils/invoice-templates-defaults.ts` |
| `calculateLineAmounts` | `src/utils/invoice-calculations.ts` |
| `getTaxCategoryLabel` | `src/utils/invoice-calculations.ts` |
| `getUnitCodeLabel` | `src/utils/invoice-calculations.ts` |
| `ChartConfig` | `src/components/ui/chart.tsx` |
| `DashboardData` | `src/services/customerApi.ts` |
| `ImportFormat` | `src/utils/invoice-import.ts` |
| `ImportResult` | `src/utils/invoice-import.ts` |
| `generateImportTemplate` | `src/utils/invoice-import.ts` |
| `generateJSONTemplate` | `src/utils/invoice-import.ts` |
| `generateUBLXMLTemplate` | `src/utils/invoice-import.ts` |
| `initTicketingWidget` | `src/widget-loader.tsx` |
| `PackageSystemService` (type) | `src/types/admin.ts` |
| `UsageStats` (type) | `src/types/admin.ts` |
| `ActivityItem` (type) | `src/types/admin.ts` |
| `MetricDataPoint` (type) | `src/types/admin.ts` |
| `ChartData` (type) | `src/types/admin.ts` |
| `ChartDataset` (type) | `src/types/admin.ts` |

> **Action:** Remove or `export type` mark-only where not needed at runtime. Delete whole files where every export is unused (e.g. `qr-code-generator.ts` if none of these functions are actually called).

### 5.4 — Duplicate code to consolidate

| Duplicate pair | Keep | Remove |
|---|---|---|
| `src/lib/utils.ts` vs `src/components/ui/utils.ts` | `src/lib/utils.ts` | `src/components/ui/utils.ts` |
| `src/components/layout/` vs `src/components/layouts/` dirs | `src/components/layout/` | `src/components/layouts/` |

### 5.5 — Console.log statements to remove (16 debug logs)

`console.error` calls are legitimate error handling — leave those. Remove only `console.log`:

| File | Lines |
|---|---|
| `src/App.tsx` | 139, 155, 165, 202, 206, 215, 218, 221, 236, 251 |
| `src/components/GlobalAIAssistant.tsx` | 55, 58, 61, 87 |
| `src/components/screens/Login.tsx` | 65 |
| `src/components/screens/InvoicePreview.tsx` | 281 |

### 5.6 — Stale comment blocks (dead documentation)

| File | Lines | Content |
|---|---|---|
| `src/App.tsx` | 77–78, 89 | `// Button removed as unused`, `// hasPermissionSync removed` — notes about already-removed code |
| `src/components/layout/AppSidebar.tsx` | 39 | `// Button import removed` |
| `src/components/screens/InvoiceList.tsx` | 141–144 | Multi-line comment about client-side filtering that was abandoned |
| `src/services/api.ts` | 78 | `// Broad clear is removed to avoid cross-portal logout` |

---

## 6. Unused npm Packages

The following packages are in `package.json` but have **zero imports** in `src/`:

### 6.1 — Runtime dependencies to remove

| Package | Version | Finding |
|---|---|---|
| `react-rnd` | ^10.5.2 | Not imported anywhere in `src/` |
| `@google/generative-ai` | ^0.24.1 | Not imported anywhere in `src/` — AI calls go through the backend, not the frontend |

**Fix:** `npm uninstall react-rnd @google/generative-ai`

### 6.2 — Dev dependencies (false positives — keep these)

These were flagged because the search only covered `src/` — they're correctly used in config files:

| Package | Used in |
|---|---|
| `@vitejs/plugin-react-swc` | `vite.config.ts` |
| `tailwindcss` | `tailwind.config.js` |
| `@tailwindcss/typography` | `tailwind.config.js` |
| `tailwindcss-animate` | `tailwind.config.js` |
| `autoprefixer` | `postcss.config.js` |
| `postcss` | `postcss.config.js` |
| `@types/node`, `@types/react`, `@types/react-dom` | TypeScript ambient types |

---

## 7. Unused Named Imports (within files)

These are symbols imported at the top of a file but never used in that file's body. Each is a minor bundle waste and a linting error.

| File | Unused imports |
|---|---|
| `src/components/layout/AppSidebar.tsx` | `useLanguage` |
| `src/components/screens/Admin/CompanyTypeList.tsx` | `useLanguage` |
| `src/components/screens/Admin/RoleForm.tsx` | `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `companyTypeService` |
| `src/components/screens/Admin/SAsettings.tsx` | `Activity`, `Database`, `Mail`, `RefreshCw` (lucide icons) |
| `src/components/screens/Buyers.tsx` | `Badge`, `CheckCircle2` |
| `src/components/screens/Dashboard.tsx` | `CheckCircle`, `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `Label`, `formatDate`, `importInvoices` |
| `src/components/screens/InvoiceList.tsx` | `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `DialogFooter`, `Search` |

> **Action:** Run `npx eslint --rule '{"no-unused-vars": "error"}' src/` to catch all instances, then remove them. Consider adding the ESLint `no-unused-vars` rule to prevent recurrence.

---

## 8. Unused / Potentially Dead DB Columns

These fields are defined in the TypeScript `Invoice` type (`src/types/invoice.ts`) but have **zero usages** anywhere in the frontend codebase — no component reads or writes them. They likely have matching columns in the database that are never populated.

| Field | Type | Zero usages outside type definition |
|---|---|---|
| `signatureDate` | `string?` | Invoice type line ~99 — never read in any component |
| `billingPeriodStart` | `string?` | Invoice type — never rendered or submitted |
| `billingPeriodEnd` | `string?` | Invoice type — never rendered or submitted |
| `documentCurrencyCode` | `string?` | Invoice type — never set or displayed |
| `taxCurrencyCode` | `string?` | Invoice type — never set or displayed |
| `gln` | `string?` | Party type (seller/buyer GLN) — defined but never shown in any form or preview |

> **Verify with backend:** Confirm these columns exist in the `invoices` / `parties` tables and are never populated. If confirmed unused, remove from:
> 1. The TypeScript `Invoice` / `Party` types
> 2. The backend model and API response
> 3. The database schema (with a migration)

**Note:** `allowanceTotalAmount`, `chargeTotalAmount`, `prepaidAmount`, and `invoiceTypeCode` have some usages (4–9 each) in calculations — keep those.

---

## 9. TypeScript & Type Safety

### 9.1 — 113 `any` instances across codebase (MEDIUM)

Top offenders:

| File | Count | Where |
|---|---|---|
| `src/services/api.ts` | 11 | buyer, letter, template service params |
| `src/components/screens/Workspace.tsx` | 4 | Sorting logic, error types |
| `src/services/customerApi.ts` | 4 | Tenant, subscription, plan |
| `src/services/adminApi.ts` | 3+ | Admin payloads |

**Fix plan:**
1. Define typed interfaces for all service request/response payloads
2. Replace `catch (error: any)` with `catch (error: unknown)` + type narrowing
3. Type event handlers properly (`React.ChangeEvent<HTMLInputElement>` etc.)

---

## 10. Assets & CSS

### 10.1 — Images without `width`/`height` cause CLS (MEDIUM)

**File:** `src/components/figma/ImageWithFallback.tsx:25`

```tsx
<img src={src} alt={alt} className={className} />  {/* no width/height */}
```

Causes Cumulative Layout Shift — images push content down as they load.

**Fix:** Always pass `width` and `height` props, or set `aspect-ratio` via CSS.

---

### 10.2 — Dynamic Tailwind class strings defeat purging (LOW)

**Files:**
- `src/components/screens/Workspace.tsx:489, 498, 510, 524`
- `src/components/screens/QuickAccessInvoice.tsx:308, 316, 324`
- `src/components/screens/Billing.tsx:119`

Template literals like `` `text-${x ? 'purple' : 'gray'}-400` `` are invisible to Tailwind's static analyzer. These classes may be purged in production.

**Fix:** Use full class names inside `cn()`/`clsx()` conditionals:
```ts
cn(condition ? 'text-purple-400' : 'text-gray-400')
```

---

## 11. Backend / API

> Based on observed API call patterns from the frontend. Verify against backend source before acting.

### 11.1 — No pagination on list endpoints (HIGH)

`invoiceService.getAll()`, `buyerService.getAll()`, `letterService.getAll()` return unbounded lists. A tenant with thousands of records downloads everything on every load.

**Fix:** Add `limit` + `offset` (or cursor-based pagination) to all list endpoints. The frontend already passes `search`, `status`, `dateFilter`, `sort` — extend with `page` and `pageSize`.

---

### 11.2 — `/auth/me` called on every page load (MEDIUM)

**File:** `src/App.tsx:236–258`

`authService.me()` is called on every authenticated load as a blocking request before any screen renders.

**Fix options:**
1. Cache the `/auth/me` response in React Query with `staleTime: 10 * 60 * 1000`
2. Trust the JWT expiry on the client; only call `/auth/me` on 401

---

### 11.3 — No HTTP caching headers on static-ish endpoints (MEDIUM)

Billing plans, company types, CMS pages, and package services are fetched on every navigation. These rarely change.

**Fix:** Add `Cache-Control: max-age=300, stale-while-revalidate=60` to read-only, infrequently-changing endpoints. Add `ETag` support so unchanged responses return 304.

---

### 11.4 — Audit log endpoint returns all records (LOW)

**File:** `src/services/api.ts:229–233`

```ts
api.get<AuditLogEntry[]>('/audit-logs')  // no limit
```

Audit logs grow indefinitely. Unbounded fetch slows as volume increases.

**Fix:** Add `limit`, `offset`, and `dateFrom`/`dateTo` params. Frontend `ActivityLog` screen should paginate or virtualise.

---

### 11.5 — No response compression (MEDIUM)

Large JSON payloads (invoice lists with line items, audit logs) appear without compression. Expected 60–80% transfer-size reduction with gzip/brotli enabled at the nginx or application level.

---

## 12. Database Performance

> Inferred from API patterns and CodeIgniter/MySQL deployment. Verify actual schema indexes before applying.

### 12.1 — Missing indexes on filter columns (CRITICAL)

Invoice and buyer lists support `status`, `dateFilter`, `templateType`, and `sort` filters. Without indexes on these columns every filter runs a full table scan.

**Suggested indexes:**
```sql
-- invoices table
CREATE INDEX idx_invoices_tenant_status ON invoices (tenant_id, status);
CREATE INDEX idx_invoices_tenant_date   ON invoices (tenant_id, created_at DESC);
CREATE INDEX idx_invoices_template_type ON invoices (tenant_id, template_type);

-- buyers table
CREATE INDEX idx_buyers_tenant ON buyers (tenant_id);

-- audit_logs table
CREATE INDEX idx_audit_logs_tenant_date ON audit_logs (tenant_id, created_at DESC);
```

---

### 12.2 — Audit logs have no archiving strategy (HIGH)

Audit log tables grow without bound. Queries slow down proportionally as volume increases.

**Fix:**
- Archive records older than 12 months to a separate `audit_logs_archive` table
- Or use MySQL 8 table partitioning by month

---

### 12.3 — Full-text search on invoice/buyer lists (MEDIUM)

The `search` param likely maps to `LIKE '%term%'` queries which cannot use B-tree indexes — full table scan on every search keystroke.

**Fix:** Add `FULLTEXT` index on searchable columns (invoice number, buyer name, notes), or restrict to prefix match `LIKE 'term%'` which can use a regular index.

---

### 12.4 — N+1 query risk on invoice list with line items (MEDIUM)

If the invoice list endpoint fetches each invoice's line items in a loop rather than a JOIN, a page of 50 invoices triggers 51 queries.

**Fix:** Use eager loading (JOIN or subquery) for the list endpoint. Return line items only on the single-invoice detail endpoint.

---

### 12.5 — AI history table without TTL or max-rows limit (LOW)

**File:** `src/services/api.ts:460–463`

AI search history accumulates indefinitely per tenant/user.

**Fix:** Retain only the last N records per user (e.g., 100) via a DELETE + LIMIT query on insert, or a nightly cleanup job.

---

## 13. Redundant Code Blocks & Shared Abstractions

The same logic is copy-pasted across many screens. Extracting these into shared hooks and components removes ~1,100 lines and makes every future change a single-place edit.

---

### 13.1 — Repeated `useEffect`+fetch pattern (HIGH)

12 components manually implement async data loading with `useState`+`useEffect` instead of using React Query — repeating the same try/catch/finally/loading-state structure.

| File | Data Fetched | Lines |
|---|---|---|
| `src/components/screens/AIHistory.tsx` | AI query history | 36–52 |
| `src/components/screens/LetterList.tsx` | Letters | 53–72 |
| `src/components/screens/InvoiceList.tsx` | Invoices | 117–140 |
| `src/components/screens/Settings.tsx` | Company types | 89–99 |
| `src/components/screens/Admin/UserForm.tsx` | Users / roles / types | 24–55 |
| `src/components/screens/Admin/RoleForm.tsx` | Roles / rights | 22–48 |
| `src/components/screens/Admin/CompanyTypeList.tsx` | Company types | 24–38 |
| `src/components/screens/PrivacyPolicy.tsx` | CMS page content | similar |
| `src/components/screens/TermsAndConditions.tsx` | CMS page content | similar |
| `src/components/screens/CookiePolicy.tsx` | CMS page content | similar |
| `src/components/screens/Impressum.tsx` | CMS page content | similar |
| `src/components/screens/Signup.tsx` | Plans / countries | 158–170 |

**Repeated block per file (~15–20 lines):**
```typescript
const [data, setData] = useState([]);
const [isLoading, setIsLoading] = useState(true);
useEffect(() => {
  const load = async () => {
    setIsLoading(true);
    try { setData(await service.getAll()); }
    catch { toast.error(t('common.error')); }
    finally { setIsLoading(false); }
  };
  load();
}, []);
```

**Fix:** Migrate the 8 screens from §4.1 to `useQuery`. The 4 identical CMS pages (`PrivacyPolicy`, `TermsAndConditions`, `CookiePolicy`, `Impressum`) share an identical fetch that becomes a single `useCmsPage(slug)` hook.

---

### 13.2 — Repeated pagination logic (HIGH)

8 components independently implement `currentPage` / `itemsPerPage` / `Math.ceil` / `.slice` — ~15 lines each.

| File | Lines |
|---|---|
| `src/components/screens/InvoiceList.tsx` | ~103, 143–148 |
| `src/components/screens/LetterList.tsx` | ~49, 126–130 |
| `src/components/screens/AIHistory.tsx` | ~33, 77–81 |
| `src/components/screens/Buyers.tsx` | ~200–250 |
| `src/components/screens/Admin/SATickets.tsx` | ~37, 87–91 |
| `src/components/screens/Admin/SAPackageServices.tsx` | ~27–29 |

**Repeated block:**
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(10);
const totalPages = Math.ceil(data.length / itemsPerPage);
const paginatedData = data.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);
```

**Fix:** Extract `usePagination<T>(data: T[], defaultPageSize = 10)` returning `{ currentPage, totalPages, paginatedData, setCurrentPage }`. One file, used in 8 places.

---

### 13.3 — Repeated sort state + handler (HIGH)

5 components independently implement column sort state, direction toggle, and array sort — ~30 lines each.

| File | Variables | Lines |
|---|---|---|
| `src/components/screens/AIHistory.tsx` | `sortColumn`, `sortDirection` | ~29–95 |
| `src/components/screens/Admin/SATickets.tsx` | `sortColumn`, `sortDirection` | ~35–100 |
| `src/components/screens/Admin/SAPackageServices.tsx` | `sortConfig` object | ~27–119 |
| `src/components/screens/InvoiceList.tsx` | `sortBy` enum | ~101 |
| `src/components/screens/LetterList.tsx` | `sortOption` enum | ~47 |

**Fix:** Extract `useSorting<T>(data: T[])` returning `{ sorted, sortColumn, sortDirection, handleSort }`.

---

### 13.4 — Repeated row-selection with `Set<string>` (MEDIUM)

5 components independently implement select-all / toggle-one using `Set<string>` — ~20 lines each.

| File | Lines |
|---|---|
| `src/components/screens/InvoiceList.tsx` | ~102, 150–167 |
| `src/components/screens/LetterList.tsx` | ~48, 86–101 |
| `src/components/screens/Admin/SATickets.tsx` | ~39, 121–141 |

**Repeated block:**
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const toggleAll = () =>
  setSelectedIds(s => s.size === page.length ? new Set() : new Set(page.map(d => d.id)));
const toggleOne = (id: string) => {
  const next = new Set(selectedIds);
  next.has(id) ? next.delete(id) : next.add(id);
  setSelectedIds(next);
};
```

**Fix:** Extract `useSelection(ids: string[])` returning `{ selectedIds, toggleOne, toggleAll, clearAll, isAllSelected }`.

---

### 13.5 — Repeated form submit pattern (MEDIUM)

8+ form handlers repeat the same try/catch/toast/setIsLoading shell — ~15–20 lines each.

| File | Handler | Lines |
|---|---|---|
| `src/components/screens/Admin/UserForm.tsx` | `handleSave` | 57–78 |
| `src/components/screens/Admin/RoleForm.tsx` | `handleSave` | 50–68 |
| `src/components/screens/Admin/CompanyTypeList.tsx` | `handleSubmit` | 52–67 |
| `src/components/screens/Signup.tsx` | `handleSignup` | multiple |
| `src/components/screens/ResetPassword.tsx` | `handleReset` | try/catch blocks |

**Repeated pattern:**
```typescript
const handleSave = async () => {
  setIsLoading(true);
  try {
    editingId ? await service.update(editingId, data) : await service.create(data);
    toast.success(t('saved'));
    onBack();
  } catch (err: any) {
    toast.error(err?.response?.data?.message || t('common.error'));
  } finally { setIsLoading(false); }
};
```

**Fix:** `useFormSubmit` hook that wraps create/update, manages loading state and toast, exposes `submit(asyncFn)`.

---

### 13.6 — Repeated search input block (MEDIUM)

13 screens render an almost identical debounced search input with a magnifier icon — ~8–12 lines each.

**Affected files:** `InvoiceList`, `LetterList`, `SATickets`, `SAASusers`, `SAbilling`, `AIHistory`, `Buyers`, `TemplateLibrary` and 5 more Admin screens.

**Fix:** Extract `<SearchBar value={q} onChange={setQ} placeholder="..." />` component. The surrounding filter dropdowns vary per screen and stay inline; only the shared search input wrapper is extracted.

---

### 13.7 — Identical table empty-state + loading row (LOW)

Every data table repeats the same conditional for loading spinner and "no results" row — ~10 lines per table.

**Affected files:** All 17 files with a `<Table>` component (InvoiceList, LetterList, Buyers, AIHistory, all Admin list screens).

**Repeated block:**
```tsx
{isLoading ? (
  <TableRow><TableCell colSpan={n} className="text-center py-8">
    <Loader2 className="animate-spin mx-auto" />
  </TableCell></TableRow>
) : data.length === 0 ? (
  <TableRow><TableCell colSpan={n} className="text-center py-4 text-muted-foreground">
    {emptyMessage}
  </TableCell></TableRow>
) : null}
```

**Fix:** Extract `<TableEmptyState colSpan={n} isLoading={bool} emptyMessage={string} />`.

---

### 13.8 — Delete confirmation dialog repeated 12× (LOW)

12 screens render the same AlertDialog ("Are you sure? This cannot be undone.") with Cancel + Confirm. Each is ~15 lines of JSX.

**Affected files:** `RoleList`, `CompanyTypeList`, `LetterList`, `InvoiceList`, `Buyers`, `SATickets`, `SAASusers`, `SAPackageServices`, `SAPages`, `SAUserDetails`, `UserList`, `SAPackageForm`.

**Fix:** Extract `<ConfirmDeleteDialog open={bool} onConfirm={fn} onCancel={fn} itemName={string} isLoading={bool} />`.

---

### 13.9 — Axios interceptor duplicated across 3 service files (MEDIUM)

Auth token injection and 401-redirect logic are copy-pasted in three files:

| File | Lines |
|---|---|
| `src/services/api.ts` | 30–65 |
| `src/services/adminApi.ts` | 49–60 |
| `src/services/customerApi.ts` | similar |

**Fix:** Extract `createApiClient(baseURL, onUnauthorized)` factory in `src/services/apiFactory.ts`. All three service files call the factory instead of reimplementing the interceptor.

---

### Shared Abstraction Summary

| To create | Type | Used by | Est. lines saved |
|---|---|---|---|
| `usePagination<T>` | Hook | 8 files | ~120 |
| `useSorting<T>` | Hook | 5 files | ~150 |
| `useSelection` | Hook | 5 files | ~100 |
| `useFormSubmit` | Hook | 8+ files | ~160 |
| `useCmsPage(slug)` | Hook | 4 CMS pages | ~80 |
| `<SearchBar>` | Component | 13 files | ~104 |
| `<TableEmptyState>` | Component | 17 files | ~170 |
| `<ConfirmDeleteDialog>` | Component | 12 files | ~180 |
| `createApiClient` | Utility factory | 3 service files | ~90 |
| **Total** | | **~75 files** | **~1,154 lines** |

---

## 14. Execution Order

Work through these phases in sequence — each phase is low-risk and prepares the codebase for the next.

### Phase 1 — Dead Code & Package Cleanup (zero risk, start here)

**Unused files (delete):**
1. Delete `src/utils/invoice-pdf-html.ts` (241 lines, zero imports)
2. Delete `src/services/authApi.ts` (64 lines, zero imports)
3. Delete `src/components/layouts/CustomerLayout.tsx` (never imported)
4. Verify then delete `src/components/ProtectedRoute.tsx`
5. Verify then delete `src/components/screens/Admin/AdminLayout.tsx`
6. Verify intent of `src/widget-loader.tsx` then delete or document

**Unused npm packages:**
7. `npm uninstall react-rnd @google/generative-ai`

**Unused named imports (within files):**
8. Remove unused imports from `Dashboard.tsx`, `InvoiceList.tsx`, `Buyers.tsx`, `RoleForm.tsx`, `SAsettings.tsx`, `AppSidebar.tsx`, `CompanyTypeList.tsx` (§7)

**Unused exports:**
9. Remove or delete `ThemeBuilder`, `CustomerInvoices`, `CustomerDashboard`, `ImageWithFallback` components (§5.3)
10. Remove unused exports from `qr-code-generator.ts`, `invoice-calculations.ts`, `invoice-import.ts`, `types/admin.ts` (§5.3)

**Duplicate consolidation:**
11. Consolidate `src/lib/utils.ts` + `src/components/ui/utils.ts` → keep `src/lib/utils.ts`
12. Remove `src/components/layouts/` directory (consolidate into `src/components/layout/`)

**Console.log cleanup:**
13. Remove all 16 `console.log` calls (§5.5)

**Stale comments:**
14. Remove dead comment blocks in `App.tsx`, `AppSidebar.tsx`, `InvoiceList.tsx`, `api.ts` (§5.6)

---

### Phase 1.5 — Shared Abstractions (low risk, high leverage)

Create shared hooks and components before touching the screens — screens become simple to refactor once these exist.

**Hooks (create in `src/hooks/`):**
15. Create `usePagination<T>(data, pageSize)` — replaces 8 manual implementations (§13.2)
16. Create `useSorting<T>(data)` — replaces 5 sort blocks (§13.3)
17. Create `useSelection(ids)` — replaces 5 Set-based selection blocks (§13.4)
18. Create `useCmsPage(slug)` — unifies 4 identical CMS page fetches (§13.1)
19. Create `useFormSubmit` — wraps try/catch/toast/loading for 8+ forms (§13.5)

**Components (create in `src/components/ui/`):**
20. Create `<SearchBar>` — replaces debounced search input in 13 screens (§13.6)
21. Create `<TableEmptyState>` — replaces loading/empty row in 17 tables (§13.7)
22. Create `<ConfirmDeleteDialog>` — replaces 12 inline AlertDialog blocks (§13.8)

**Service factory:**
23. Create `src/services/apiFactory.ts` — eliminates interceptor duplication across 3 service files (§13.9)

**Apply to screens:**
24. Replace pagination blocks in `InvoiceList`, `LetterList`, `AIHistory`, `Buyers`, `SATickets`, `SAPackageServices`
25. Replace sort blocks in `AIHistory`, `SATickets`, `SAPackageServices`
26. Replace selection blocks in `InvoiceList`, `LetterList`, `SATickets`
27. Apply `<SearchBar>` to all 13 affected screens
28. Apply `<TableEmptyState>` to all 17 table screens
29. Apply `<ConfirmDeleteDialog>` to all 12 delete dialogs

---

### Phase 2 — Critical Rendering Bug Fixes
30. Fix `Math.random()` key → `InvoiceList.tsx:664`
31. Fix `key={index}` → `PreviewModal.tsx:286` and `ValidationPanel.tsx:69`
32. Replace raw `fetch()` with axios → `QuickAccessInvoice.tsx:132`

---

### Phase 3 — Data Fetching Migration (biggest UX impact)
33. Migrate 8 manual `useEffect`+fetch patterns to `useQuery` (§4.1)
34. Add `queryClient.clear()` on logout (§4.5)
35. Add per-query `staleTime` overrides to 24 queries (§4.3 table)
36. Add user ID to invoice query key (§4.6)

---

### Phase 4 — React Rendering Optimizations
37. Memoize `LanguageContext` value with `useMemo` (§2.5)
38. Memoize `InlineCmsContext` value with `useMemo` (§2.5)
39. Consolidate 3 `useEffect` hooks in `LineItemRow.tsx` (§2.4)
40. Replace `require()` with dynamic `import()` in `InvoiceList.tsx` (§1.1)
41. Replace static QRCode import with dynamic import (§1.2)
42. Fix inline arrow functions in `InvoiceEditor.tsx` (§2.3)

---

### Phase 5 — State Management Refactor (architectural)
43. Add Zustand selectors to `App.tsx`, `AdminLayout` (§3.2)
44. Split `adminStore` into auth + UI stores (§3.3)
45. Reduce `authStore` persistence scope to token only (§3.4)
46. Replace `sessionStorage` CMS pattern with Zustand persist (§3.5)
47. Extract `useHashRouter()` from `App.tsx` (§3.1)
48. Extract `useAuthCheck()` from `App.tsx` (§3.1)
49. Extract `useInvoiceHandlers()` from `App.tsx` (§3.1)

---

### Phase 6 — Type Safety
50. Define typed interfaces for service payloads in `api.ts` (§9.1)
51. Fix `any` in `customerApi.ts` and `adminApi.ts` (§9.1)
52. Type event handlers across components (§9.1)

---

### Phase 7 — Backend & Database
53. Verify and remove unused DB columns: `signature_date`, `billing_period_start`, `billing_period_end`, `document_currency_code`, `tax_currency_code`, `gln` (§8)
54. Add pagination to `/invoices`, `/buyers`, `/letters` endpoints (§11.1)
55. Add indexes on `tenant_id + status`, `tenant_id + created_at` (§12.1)
56. Enable gzip/brotli on API server (§11.5)
57. Add `Cache-Control` headers to static-ish endpoints (§11.3)
58. Cache or trust-JWT-expiry the `/auth/me` call (§11.2)
59. Add FULLTEXT or prefix-optimized search (§12.3)
60. Add archiving/TTL to audit logs and AI history (§12.2, §12.5)

---

## Summary Count

| Category | Items Found |
|---|---|
| Unused files (delete) | 7 |
| Unused npm packages | 2 (`react-rnd`, `@google/generative-ai`) |
| Unused named imports within files | 34+ |
| Unused exported symbols | 29 |
| Dead comment blocks | 5 |
| `console.log` debug calls | 16 |
| Potentially unused DB columns | 6 |
| Data fetching bypassing React Query | 9 |
| React rendering issues | 7 |
| State management issues | 5 |
| Backend/DB performance gaps | 10 |
| Redundant code blocks (copy-pasted patterns) | 9 patterns across ~75 files |
| Shared abstractions to create | 9 hooks/components (~1,154 lines saved) |
| **Total items** | **~149** |

---

*Generated: 2026-05-12 | Scope: frontend src/, inferred backend/DB*
