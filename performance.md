# BillingTool — Performance Optimization

**Last updated:** 2026-05-07

This document covers every performance optimization in place across the BillingTool stack — database indexes, frontend bundle splitting, React memoization, search debouncing, server-side caching and rate limiting, image optimization, and known gaps with actionable recommendations.

> **Scope note:** Redis is not available in the production environment. All Redis references in this document are marked as not applicable. Frontend optimizations were implemented first (2026-05-07); PHP/backend optimizations are deferred.

---

## Table of Contents

1. [Database Indexes](#1-database-indexes)
2. [Database Query Patterns](#2-database-query-patterns)
3. [Database Connection Configuration](#3-database-connection-configuration)
4. [Server-Side Caching Infrastructure](#4-server-side-caching-infrastructure)
5. [AI Rate Limiting (Throttler)](#5-ai-rate-limiting-throttler)
6. [Image Optimization](#6-image-optimization)
7. [Frontend Bundle Splitting](#7-frontend-bundle-splitting)
8. [Route-Level Code Splitting](#8-route-level-code-splitting)
9. [React Memoization](#9-react-memoization)
10. [React Query — Client-Side Data Caching](#10-react-query--client-side-data-caching)
11. [API Client Configuration](#11-api-client-configuration)
12. [Multi-Tenant Query Scoping](#12-multi-tenant-query-scoping)
13. [Known Gaps & Recommendations](#13-known-gaps--recommendations)
14. [Performance Baseline — Build Output](#14-performance-baseline--build-output)

---

## 1. Database Indexes

### 1.1 Dedicated Performance Migration

**File:** `api/app/Database/Migrations/2026-01-31-062503_AddPerformanceIndexes.php`

Six explicit performance indexes created in a dedicated migration batch:

```sql
-- Audit logs: activity feed sort + invoice trail lookup
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_invoice   ON audit_logs(invoice_number);

-- Invoices: date-range filter + status filter (most-queried columns)
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_status     ON invoices(status);

-- RBAC join acceleration (FK columns get explicit indexes)
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

**Rollback:** All six are dropped cleanly in `down()`.

---

### 1.2 Indexes Across Other Migrations

Additional indexes defined inline with their feature migrations:

| Index Name | Table | Column(s) | Type | Migration File |
|---|---|---|---|---|
| `idx_invoices_share_token` | `invoices` | `share_token` | UNIQUE | `2026-05-06-000001_AddShareTokenToInvoices.php` |
| `idx_invoices_template_type` | `invoices` | `template_type` | Standard | `2026-04-23-000000_AddBusinessLetterFieldsToInvoices.php` |
| `slug_lang` | `cms_pages` | `(slug, lang)` | UNIQUE composite | `2026-04-28-000001_AddLangToCmsPages.php` |
| _(email)_ | `quick_access_sessions` | `email` | Standard | `2026-02-27-000000_CreateQuickAccessSessionsTable.php` |
| _(expires_at)_ | `quick_access_sessions` | `expires_at` | Standard | `2026-02-27-000000_CreateQuickAccessSessionsTable.php` |
| _(email)_ | `password_resets` | `email` | Standard | `2026-04-06-141344_CreatePasswordResetsTable.php` |
| _(token)_ | `password_resets` | `token` | Standard | `2026-04-06-141344_CreatePasswordResetsTable.php` |
| _(tenant_id)_ | `download_logs` | `tenant_id` | Standard | `2026-04-28-000003_CreateDownloadLogsTable.php` |
| _(created_at)_ | `download_logs` | `created_at` | Standard | `2026-04-28-000003_CreateDownloadLogsTable.php` |
| _(timestamp)_ | `audit_logs` | `timestamp` | Standard | `2020-01-15-050000_InitialSchema.php` (initial) |

---

### 1.3 Index Coverage by Query Pattern

| Query pattern | Covered by index | Notes |
|---|---|---|
| Invoice list sorted by date | ✓ `idx_invoices_issue_date` | ASC and DESC both benefit |
| Invoice list filtered by status | ✓ `idx_invoices_status` | Enum column, high selectivity |
| Invoice list by template type | ✓ `idx_invoices_template_type` | Splits invoice vs letter views |
| Share link lookup by token | ✓ `idx_invoices_share_token` (UNIQUE) | O(1) lookup |
| RBAC right check per user | ✓ `idx_user_roles_user` + `idx_user_roles_role` | 4-table join |
| Audit feed by time | ✓ `idx_audit_logs_timestamp` | Activity log |
| Audit trail by invoice | ✓ `idx_audit_logs_invoice` | Invoice detail panel |
| CMS page by slug + lang | ✓ `slug_lang` composite UNIQUE | Public page lookup |
| OTP session by email/expiry | ✓ `email`, `expires_at` | Quick access flow |
| Password reset by email/token | ✓ `email`, `token` | Reset flow |
| Download audit by tenant | ✓ `tenant_id`, `created_at` | Admin download logs |

---

## 2. Database Query Patterns

### 2.1 Invoice List — Filtering & Sorting

`api/app/Controllers/InvoiceController.php` → `index()`

The invoice list applies server-side filtering before `findAll()`:

```php
// Search: partial match across three columns
$model->groupStart()
    ->like('invoice_number', $search)
    ->orLike('buyer_name', $search)
    ->orLike('seller_name', $search)
->groupEnd();

// Status filter (uses idx_invoices_status)
$model->where('status', $status);

// Date range filter (uses idx_invoices_issue_date)
$model->where('issue_date >=', date('Y-m-d', strtotime('-30 days')));

// Template type filter (uses idx_invoices_template_type)
$model->groupStart()
    ->where('template_type', 'invoice')
    ->orWhere('template_type IS NULL', null, false)
->groupEnd();

// Sorting — 6 options all on indexed columns
$model->orderBy('issue_date', 'DESC'); // default
```

### 2.2 RBAC Join Query

`api/app/Models/UserModel.php` → `hasRight()`

A 4-table join resolves whether a user has a given right. Both FK columns are indexed:

```sql
SELECT rights.code
FROM   user_roles
JOIN   roles       ON roles.id       = user_roles.role_id
JOIN   role_rights ON role_rights.role_id = roles.id
JOIN   rights      ON rights.id      = role_rights.right_id
WHERE  user_roles.user_id = ?
  AND  rights.code        = ?
```

Indexes `idx_user_roles_user` and `idx_user_roles_role` prevent full-table scans on this hot path.

### 2.3 Admin Users — Aggregated Query with Pagination

`api/app/Controllers/AdminUsers.php`

Uses `MIN()/MAX()` aggregates, JOINs with `plans` and `users`, grouped by `tenants.id`. Supports `page` + `limit` parameters:

```php
$query = $this->db->table('tenants')
    ->select('tenants.*, MIN(users.email) AS email, MAX(users.last_login) AS last_login, plans.name AS plan_name')
    ->join('plans', 'plans.id = tenants.plan_id', 'left')
    ->join('users', 'users.tenant_id = tenants.id', 'left')
    ->groupBy('tenants.id')
    ->limit($limit, $offset);
```

**Known issue:** Per-tenant usage stats (storage, API calls) are fetched in a loop after the main query — see [Known Gaps](#13-known-gaps--recommendations).

### 2.4 Missing Pagination — Invoice & Ticket Lists

`InvoiceController::index()` and `TicketController::index()` both call `findAll()` with no `LIMIT`. This works for small datasets but will degrade as tenant data grows. Flagged as a gap in Section 13.

---

## 3. Database Connection Configuration

**File:** `api/app/Config/Database.php`

| Setting | Value | Performance Impact |
|---|---|---|
| Driver | `MySQLi` | Native PHP MySQL extension, fastest available |
| Charset | `utf8mb4` | Full Unicode support, minimal overhead vs `latin1` |
| `pConnect` | `false` | New connection per request (no persistent pool) |
| `compress` | `false` | Wire protocol compression disabled |
| `strictOn` | `false` | Lenient mode — avoids extra validation overhead |
| `numberNative` | `false` | Returns numeric columns as strings (CI4 default) |

**Connection pooling:** Not configured at the PHP level. CodeIgniter manages a singleton connection per request. For higher concurrency, a proxy like ProxySQL or PgBouncer (MySQL equivalent) can pool connections externally.

---

## 4. Server-Side Caching Infrastructure

**File:** `api/app/Config/Cache.php`

The cache layer is fully configured but **not actively used** in controllers — it's available for activation without code changes.

| Setting | Value |
|---|---|
| Primary handler | `file` (filesystem) |
| Backup handler | `dummy` (no-op fallback) |
| Default TTL | 60 seconds |
| Cache path | `api/writable/cache/` |
| Redis support | Configured but **not available in production** |
| Memcached support | Configured (handler ready, not activated) |
| Query string caching | Disabled |

### Active cache usage — AI Throttler only

The CodeIgniter Throttler (which uses the file cache backend) is active for AI endpoints. All other endpoints bypass caching entirely.

---

## 5. AI Rate Limiting (Throttler)

**File:** `api/app/Controllers/AIInvoiceController.php` — `checkRateLimit()` (line 558)

AI invoice parsing is protected by CodeIgniter's built-in Throttler:

```php
private function checkRateLimit(): bool
{
    // Uses CodeIgniter's Throttler (file/Redis cache under the hood)
    $throttler = \Config\Services::throttler();
    $key = 'ai_parse_' . (session()->get('userId') ?? $this->request->getIPAddress());

    // 20 requests per user per hour
    return $throttler->check($key, 20, HOUR);
}
```

| Parameter | Value |
|---|---|
| Limit | 20 requests |
| Window | 1 hour (`HOUR` constant = 3600 s) |
| Key | Per authenticated user ID (falls back to IP) |
| Backend | File cache (upgrades to Redis if configured) |
| Rejection | Returns `false` → controller responds HTTP 429 |

**Scope:** Applied only to AI parse endpoints. No general API rate limiting exists on other routes (flagged as a gap).

---

## 6. Image Optimization

Images uploaded through the CMS and ticket system are processed server-side via PHP's GD library.

### 6.1 CMS Images

**File:** `api/app/Controllers/CmsController.php` → `uploadImage()`

```php
imagejpeg($img, $fullPath, 90); // 90% JPEG quality
unset($img); // free GD resource (imagedestroy() deprecated in PHP 8.5+)
```

| Setting | Value | Reason |
|---|---|---|
| Output format | JPEG | Smallest format for photographic content |
| Quality | 90% | High clarity — CMS images are marketing-facing |
| Input formats | JPEG, PNG, GIF, WebP | Validated by MIME type before processing |
| Upload modes | JSON base64 + multipart file | Supports both browser and API clients |
| Storage path | `uploads/cms/{YYYY}/{MM}/` | Year/month partitioning prevents directory bloat |
| Filename | `cms_{timestamp}_{uniqid}.jpg` | Collision-resistant without UUID overhead |

### 6.2 Ticket Screenshot Images

**File:** `api/app/Controllers/TicketController.php`

```php
imagejpeg($img, $uploadPath . $fileName, 85); // 85% JPEG quality
```

| Setting | Value | Reason |
|---|---|---|
| Quality | 85% | Slightly higher compression — screenshots tolerate it |
| Storage path | `uploads/tickets/{YYYY}/{MM}/` | Same partitioned layout as CMS |

### 6.3 What is NOT optimized (gaps)

- No automatic resize/thumbnail generation — images stored at original dimensions
- No WebP output conversion despite accepting WebP input
- No CDN or object-storage integration — files served from local filesystem

---

## 7. Frontend Bundle Splitting

**File:** `vite.config.ts`

Rollup's `manualChunks` splits heavy dependencies into separate cacheable bundles. Browsers load only what the current route needs and cache chunks independently across deploys.

### 7.1 Chunk Strategy

```typescript
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('lucide-react'))      return 'vendor-icons';     // icon library
    if (id.includes('recharts'))          return 'vendor-charts';    // charting
    if (id.includes('@tiptap'))           return 'vendor-editor';    // rich text
    if (id.includes('jspdf') ||
        id.includes('html2canvas') ||
        id.includes('html-to-image'))     return 'vendor-pdf-tools'; // PDF export
    if (id.includes('@google/generative-ai')) return 'vendor-ai';   // Gemini SDK
    if (id.includes('date-fns'))          return 'vendor-dates';    // date utils
    return 'vendor';                                                  // everything else
  }
  if (id.includes('src/components/ui'))  return 'ui-kit';           // shared UI
}
```

### 7.2 Resulting Chunks (last build — 2026-05-07)

| Chunk | Size (raw) | gzip | Loaded by |
|---|---|---|---|
| `vendor-dates` | 23.62 kB | 6.64 kB | Pages using date formatting |
| `vendor-icons` | 59.60 kB | 11.46 kB | Any page with Lucide icons |
| `ui-kit` | 50.18 kB | 11.03 kB | All authenticated screens |
| `vendor-editor` | 143.07 kB | 41.71 kB | Invoice editor, CMS editor |
| `vendor-charts` | 286.41 kB | 64.79 kB | Dashboard, analytics screens |
| `index` (app shell) | 337.15 kB | 104.05 kB | All routes (initial load) |
| `vendor-pdf-tools` | 586.98 kB | 171.84 kB | Print/export only |
| `vendor` (core deps) | 4,125.52 kB | 1,218.30 kB | All routes |

**Key benefit:** `vendor-pdf-tools` (587 kB) and `vendor-charts` (286 kB) are only downloaded when those features are visited — users who never export PDFs or view analytics never pay that cost.

### 7.3 Other Build Settings

| Setting | Value | Effect |
|---|---|---|
| `build.target` | `esnext` | No legacy polyfills — smaller output for modern browsers |
| `outDir` | `build/` | Flat output directory |
| Compiler | `@vitejs/plugin-react-swc` | SWC (Rust-based) instead of Babel — faster builds |
| Alias resolution | Version-pinned aliases for all Radix + UI libs | Prevents duplicate package versions inflating bundle |
| Dev watcher | Ignores `api/`, `docs/`, `build/` | HMR only watches `src/` |

---

## 8. Route-Level Code Splitting

**File:** `src/App.tsx`

Every screen component is lazy-loaded via `React.lazy()` with a `Suspense` spinner fallback. The initial JS payload contains only the app shell and router — screen modules are fetched on first navigation.

### 8.1 All Lazy-Loaded Routes

**User-facing screens (29):**

```typescript
const Login            = lazy(() => import('./components/screens/Login'));
const Dashboard        = lazy(() => import('./components/screens/Dashboard'));
const InvoiceEditor    = lazy(() => import('./components/screens/InvoiceEditor'));
const InvoicePreview   = lazy(() => import('./components/screens/InvoicePreview'));
const InvoiceList      = lazy(() => import('./components/screens/InvoiceList'));
const TemplateLibrary  = lazy(() => import('./components/screens/TemplateLibrary'));
const TemplateEditor   = lazy(() => import('./components/invoice/TemplateEditor'));
const DesignLayoutPage = lazy(() => import('./pages/DesignLayoutPage'));
const ActivityLog      = lazy(() => import('./components/screens/ActivityLog'));
const Settings         = lazy(() => import('./components/screens/Settings'));
const Billing          = lazy(() => import('./components/screens/Billing'));
const LandingPage      = lazy(() => import('./components/screens/LandingPage'));
const QuickAccessInvoice = lazy(() => import('./components/screens/QuickAccessInvoice'));
const ResetPassword    = lazy(() => import('./components/screens/ResetPassword'));
const Impressum        = lazy(() => import('./components/screens/Impressum'));
const PrivacyPolicy    = lazy(() => import('./components/screens/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./components/screens/TermsAndConditions'));
const CookiePolicy     = lazy(() => import('./components/screens/CookiePolicy'));
const Buyers           = lazy(() => import('./components/screens/Buyers'));
const Workspace        = lazy(() => import('./components/screens/Workspace'));
const AIHistory        = lazy(() => import('./components/screens/AIHistory'));
const PackageComparison = lazy(() => import('./components/screens/PackageComparison'));
const LetterList       = lazy(() => import('./components/screens/LetterList'));
const LetterEditor     = lazy(() => import('./components/screens/LetterEditor'));
const LetterPreview    = lazy(() => import('./components/screens/LetterPreview'));
const CmsPageView      = lazy(() => import('./components/screens/CmsPageView'));
const Signup           = lazy(() => import('./components/screens/Signup'));
const AdminLayout      = lazy(() => import('./components/screens/Admin/AdminLayout'));
```

**Super-admin screens (10):**

```typescript
const SALogin          = lazy(() => import('./components/screens/Admin/SALogin'));
const SAdashboard      = lazy(() => import('./components/screens/Admin/SAdashboard'));
const SApackages       = lazy(() => import('./components/screens/Admin/SApackages'));
const SAPackageServices = lazy(() => import('./components/screens/Admin/SAPackageServices'));
const SAPackageForm    = lazy(() => import('./components/screens/Admin/SAPackageForm'));
const SAASusers        = lazy(() => import('./components/screens/Admin/SAASusers'));
const SAUserDetails    = lazy(() => import('./components/screens/Admin/SAUserDetails'));
const SAbilling        = lazy(() => import('./components/screens/Admin/SAbilling'));
const SAusage          = lazy(() => import('./components/screens/Admin/SAusage'));
const SAsettings       = lazy(() => import('./components/screens/Admin/SAsettings'));
const SAInvoiceForm    = lazy(() => import('./components/screens/Admin/SAInvoiceForm'));
const SATickets        = lazy(() => import('./components/screens/Admin/SATickets'));
const SATicketDetails  = lazy(() => import('./components/screens/Admin/SATicketDetails'));
const SAWiki           = lazy(() => import('./components/screens/Admin/SAWiki'));
const SAPages          = lazy(() => import('./components/screens/Admin/SAPages'));
```

### 8.2 Suspense Fallback

Each lazy boundary renders an animated spinner while the chunk loads:

```tsx
<Suspense fallback={
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="animate-spin" />
  </div>
}>
  {/* route component */}
</Suspense>
```

---

## 9. React Memoization

Heavy computation and stable callback references are memoized to prevent unnecessary re-renders.

### 9.1 `useMemo` — Derived Data

| File | Memoized Value | Dependency |
|---|---|---|
| `Dashboard.tsx` | `stats` — total revenue, invoice counts | `invoices` query data |
| `Dashboard.tsx` | `statusChartData` — pie chart series | `invoices` |
| `Dashboard.tsx` | `revenueChartData` — bar chart by month | `invoices` |
| `Dashboard.tsx` | `monthlyTrendData` — trend line | `invoices` |
| `InvoiceEditor.tsx` | `calculatedInvoice` — totals, tax sums | `invoice` state |
| `InvoiceEditor.tsx` | `validationErrors` — field error map | `invoice` state |
| `SAPackageServices.tsx` | `processedServices` — filtered + sorted service list | `services`, `searchTerm`, `sort` |
| `SAPackageServices.tsx` | `currentPage` — pagination reset on search | `searchTerm` |
| `SApackages.tsx` | Filtered package list | `packages`, `search` |
| `PackageComparison.tsx` | Computed plan feature matrix | `plans` query data |
| `AIHistory.tsx` | Filtered/sorted AI query list | `history`, filters |
| `QuickAccessInvoice.tsx` | Invoice totals | `invoice` state |

### 9.2 `useCallback` — Stable Event Handlers

| File | Memoized Handler | Prevents |
|---|---|---|
| `InvoiceEditor.tsx` | `handleUpdateInvoice` | Re-render of all field inputs on any change |
| `InvoiceEditor.tsx` | `handleUpdateLine` | Re-render of all line rows on any line change |
| `InvoiceEditor.tsx` | `handleDeleteLine` | Inline delete from child line component |
| `InvoiceEditor.tsx` | `handleAddLine` | New line insertion |
| `InvoiceEditor.tsx` | `handleSave` | Save button handler |
| `LetterEditor.tsx` | Equivalent set of letter field handlers | Same as invoice editor |
| `InlineEditableRich.tsx` | `handleDoubleClick`, `handleSave`, `handleCancel` | CMS inline edit flicker |
| `QuickAccessTour.tsx` | Step navigation handlers | Tour step re-renders |

---

## 9b. Search Debouncing

**File:** `src/hooks/useDebounce.ts`

A generic debounce hook prevents search inputs from firing network requests on every keystroke. Without debouncing, typing "Acme Corp" in a search box would fire 9 separate API calls.

```typescript
export function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
```

### Applied in three search inputs (400 ms delay)

**`InvoiceList.tsx`** — was firing `invoiceService.getAll()` on every character:
```typescript
const debouncedSearch = useDebounce(searchQuery, 400);
// useEffect and fetchInvoices() now depend on debouncedSearch, not searchQuery
```

**`SAASusers.tsx`** — was mutating `filters.search` on every character, changing the React Query key and triggering a new fetch:
```typescript
const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebounce(searchInput, 400);

// Reset to page 1 only after debounce settles
useEffect(() => {
    setFilters(prev => ({ ...prev, page: 1 }));
}, [debouncedSearch]);

// Only the debounced value enters the queryKey
const activeFilters = { ...filters, search: debouncedSearch || undefined };
useQuery({ queryKey: ['users', activeFilters], queryFn: () => adminUserService.getAll(activeFilters) });
```

**`SAbilling.tsx`** — identical pattern to SAASusers.

### Effect

| Typed characters | API calls before | API calls after |
|---|---|---|
| "Acme Corp" (9 chars) | 9 | 1 (fires 400 ms after last keystroke) |
| "test" then clear (8 events) | 8 | 1 (or 0 if cleared within 400 ms) |

---

## 10. React Query — Client-Side Data Caching

**File:** `src/providers/QueryProvider.tsx`

```typescript
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,   // no refetch when tab regains focus
            retry: 1,                      // one retry on failure, then error state
            staleTime: 5 * 60 * 1000,     // data stays fresh for 5 minutes
        },
    },
});
```

### What each setting means in practice

| Setting | Value | Effect |
|---|---|---|
| `staleTime` | 5 minutes | A page opened multiple times within 5 min uses the cached response — zero API calls |
| `refetchOnWindowFocus` | `false` | Switching tabs and returning does not trigger a background refetch |
| `retry` | 1 | One automatic retry on network error; fails fast after that |
| `gcTime` (default) | 5 minutes | Unused query data is garbage-collected from memory after 5 min |

### Where React Query is used

All admin and tenant screens use `useQuery` for data fetching and `useMutation` for writes:

- Invoice list, detail, create, update, delete
- Buyer list and management
- Admin: users, packages, package services, tickets, billing, usage, settings, CMS pages, wiki
- Customer: dashboard, usage metrics

### Query key strategy

Query keys are namespaced and parameterised, enabling precise invalidation:

```typescript
// Examples of query keys
['invoices']                           // all invoices for tenant
['invoice', id]                        // single invoice
['admin-cms-pages', selectedLang]      // CMS pages for a language
['admin-packages']                     // package list
['admin-users', page, search, status]  // paginated user list
```

On a successful mutation, only the affected queries are invalidated:
```typescript
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
}
```

---

## 11. API Client Configuration

**File:** `src/services/api.ts`

Axios is configured with a request interceptor for token injection and a response interceptor for centralized error handling.

### Request interceptor — JWT auto-injection

```typescript
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization  = `Bearer ${token}`;
        config.headers['X-Authorization'] = `Bearer ${token}`;
    }
    return config;
});
```

Reads the JWT from Zustand store synchronously — no async overhead on every request.

### Response interceptor — Centralized error handling

```typescript
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401 → auto-logout + redirect (except on login/public pages)
        // 403 + tenant mismatch → redirect to login
        // 429 (plan limit) → toast notification to user
        // Other errors → propagate to calling code
    }
);
```

This removes repetitive error handling from individual service functions and ensures consistent UX on auth failures and limit errors.

### Admin API — separate client

`src/services/adminApi.ts` uses a separate Axios instance pointing at `/api/admin/` with the same interceptor pattern, keeping admin and tenant API clients cleanly separated.

---

## 12. Multi-Tenant Query Scoping

**File:** `api/app/Traits/TenantScope.php`

Every model query is automatically scoped to the current tenant via `beforeFind`, `beforeInsert`, and `beforeUpdate` hooks. This prevents cross-tenant data leakage and avoids repeating `WHERE tenant_id = ?` in every controller.

```php
protected function beforeFind(array $data): array
{
    $tenantId = $this->resolveTenantId();

    if (!$tenantId) {
        // Fail-closed: no tenant context → return nothing
        $this->where('1', '0');
        return $data;
    }

    $this->where($this->table . '.tenant_id', $tenantId);
    return $data;
}
```

**Performance note:** `tenant_id` is a foreign key on every data table. While FK columns often get implicit indexes, explicitly adding `INDEX(tenant_id)` on high-volume tables (`invoices`, `audit_logs`, `workspace_files`) would speed up tenant-scoped queries — flagged in Section 13.

### Bypassing scope for system queries

Admin controllers and seeders opt out cleanly:

```php
$model->withoutTenant()->findAll(); // system-wide read
```

---

## 13. Known Gaps & Recommendations

### ✅ Implemented (2026-05-07)

**✓ Search debouncing** — `useDebounce(value, 400)` hook applied to all three search inputs that previously fired a network request on every keystroke:
- `InvoiceList.tsx` — 400 ms debounce on search query before triggering `fetchInvoices()`
- `SAASusers.tsx` — 400 ms debounce; debounced value enters `queryKey` and `queryFn`, with automatic page-reset to 1
- `SAbilling.tsx` — same pattern as SAASusers

**✓ Per-query `staleTime` on static catalog data** — plan/service catalog rarely changes; explicit invalidation fires on every mutation anyway:
- `SApackages.tsx` — packages query: `staleTime: 30 * 60 * 1000` (30 min)
- `SApackages.tsx` — package-services query: `staleTime: 30 * 60 * 1000`
- `SAPackageServices.tsx` — package-services query: `staleTime: 30 * 60 * 1000`
- `SAPackageForm.tsx` — package-services-active query: `staleTime: 30 * 60 * 1000`

**✓ Vite vendor chunk split** — broke up the 4,125 kB monolithic `vendor` bundle into separately-cacheable chunks. React core and Radix UI change very rarely between deploys, so browsers cache them across most updates:

| New chunk | Size (gzip) | Contents |
|---|---|---|
| `react-core` | 47.4 kB | react, react-dom, scheduler |
| `radix` | 32.7 kB | All @radix-ui primitives |
| `react-query` | 10.5 kB | @tanstack/react-query |
| `state` | 1.3 kB | zustand |
| `vendor` (remaining) | 1,121.7 kB | axios, clsx, vaul, cmdk, react-hook-form, etc. |

Previously all of the above was one 1,218 kB gzipped blob. Now the `react-core` + `radix` + `react-query` + `state` chunks (~92 kB gzip total) will be served from browser cache on subsequent visits unless those libraries are upgraded.

---

### P1 — High impact, deferred (backend)

**G1: Add pagination to Invoice and Ticket list endpoints**

`InvoiceController::index()` and `TicketController::index()` call `findAll()` with no `LIMIT`. A tenant with 10,000 invoices returns all of them in a single response.

```php
$page     = (int)($this->request->getGet('page')  ?? 1);
$limit    = (int)($this->request->getGet('limit') ?? 25);
$invoices = $model->paginate($limit, 'default', $page);
```

**G2: Fix N+1 query in Admin Users list**

`AdminUsers::index()` fetches usage stats per tenant in a loop. Fix: batch-fetch with a single `whereIn('tenant_id', [...])` query and group in PHP.

---

### P2 — Medium impact, deferred (backend)

**G3: Add composite indexes on `tenant_id` + hot filter columns**

Every query has `WHERE tenant_id = ?` appended automatically. Composite indexes let MySQL satisfy the tenant scope and the secondary filter in a single index scan:

```sql
CREATE INDEX idx_invoices_tenant_date   ON invoices (tenant_id, issue_date);
CREATE INDEX idx_invoices_tenant_status ON invoices (tenant_id, status);
CREATE INDEX idx_audit_logs_tenant_time ON audit_logs (tenant_id, timestamp);
CREATE INDEX idx_workspace_tenant       ON workspace_files (tenant_id);
```

**G4: Add `Cache-Control` headers to read-only API responses**

List endpoints (`/billing/plans`, `/billing/package-services`, CMS nav) return data that changes infrequently. Adding headers lets browsers and CDNs serve these without hitting the origin:

```php
return $this->response
    ->setHeader('Cache-Control', 'public, max-age=300')
    ->setJSON($data);
```

**G5: Enable nginx gzip compression**

No HTTP response compression is configured. Configuring nginx to gzip JSON responses reduces payload sizes by 60–80% for list endpoints.

---

### P3 — Lower priority / future

**G6: Add general API rate limiting** — only AI endpoints are throttled; other routes are unrestricted.

**G7: WebP output for uploaded images** — currently re-encoded as JPEG; WebP provides ~30% smaller files at equivalent quality.

**G8: Image thumbnail generation on upload** — CMS images are stored at full resolution; generating a thumbnail reduces bytes for preview use.

**G9: ETag / conditional GET** — for large infrequently-changing responses (plan list, CMS nav), ETags enable 304 Not Modified with zero body bytes.

---

## 14. Performance Baseline — Build Output

Last measured: 2026-05-07, build time **~43 seconds** (SWC compiler, development mode).

### After optimizations (current)

| Asset | Raw | Gzip | Category |
|---|---|---|---|
| `useDebounce` | 0.19 kB | 0.17 kB | Hook |
| `state` | 2.67 kB | 1.33 kB | Zustand |
| `vendor-dates` | 23.62 kB | 6.64 kB | date-fns |
| `InvoiceList` | 23.14 kB | 5.89 kB | Route chunk |
| `InvoicePreview` | 26.12 kB | 6.96 kB | Route chunk |
| `LandingPage` | 28.67 kB | 7.50 kB | Route chunk |
| `SAPages` | 29.53 kB | 7.58 kB | Route chunk |
| `DesignLayoutPage` | 32.66 kB | 8.14 kB | Route chunk |
| `InvoiceEditor` | 33.11 kB | 8.48 kB | Route chunk |
| `react-query` | 35.27 kB | 10.45 kB | @tanstack/react-query ✨ split |
| `QuickAccessInvoice` | 49.63 kB | 12.30 kB | Route chunk |
| `ui-kit` | 50.25 kB | 11.06 kB | Shared UI components |
| `vendor-icons` | 59.60 kB | 11.46 kB | Lucide React icons |
| `radix` | 116.25 kB | 32.73 kB | @radix-ui primitives ✨ split |
| `vendor-editor` | 143.11 kB | 41.73 kB | TipTap rich text |
| `react-core` | 147.28 kB | 47.43 kB | react + react-dom + scheduler ✨ split |
| `vendor-charts` | 286.41 kB | 64.81 kB | Recharts |
| `index` (app shell) | 337.83 kB | 104.22 kB | Core app bundle |
| `vendor-pdf-tools` | 587.05 kB | 171.99 kB | jsPDF + html2canvas |
| `vendor` (remaining) | 3,814.81 kB | 1,121.71 kB | axios, clsx, vaul, cmdk, etc. |

### Before vs After — vendor bundle split

| | Before | After | Saved |
|---|---|---|---|
| Monolithic `vendor` (gzip) | 1,218.3 kB | 1,121.7 kB | — |
| `react-core` separate chunk | — | 47.4 kB | cached independently |
| `radix` separate chunk | — | 32.7 kB | cached independently |
| `react-query` separate chunk | — | 10.5 kB | cached independently |
| `state` separate chunk | — | 1.3 kB | cached independently |
| **Total transferred on cold load** | **1,218.3 kB** | **1,218.1 kB** | ~same |
| **Transferred on re-visit (cached chunks)** | **1,218.3 kB** | **~1,124 kB** | **~94 kB saved** |

**Cache benefit:** On every deploy where only app code changes (not library versions), browsers skip re-downloading `react-core` (47 kB), `radix` (33 kB), `react-query` (11 kB), and `state` (1 kB) — those chunks' hashes stay the same. Only `vendor`, `index`, and the changed route chunks are re-fetched.
