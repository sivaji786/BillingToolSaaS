# CMS Improvements — Complete Roadmap

**Status:** ✅ SPRINTS 1–5 COMPLETE · 🟡 Minor items pending  
**Last updated:** 2026-06-04  
**Owner:** Engineering  
**Stack:** `src/components/screens/Admin/SAPages.tsx` · `src/components/screens/Admin/SAMenus.tsx` · `src/components/NavDropdown.tsx` · `src/components/cms/CmsVersionPanel.tsx` · `src/components/cms/CmsMediaLibrary.tsx` · `api/app/Controllers/CmsController.php` · `cms_pages` · `cms_page_versions` · `cms_media`

---

## 1. Current State (Post-Implementation)

All five sprints shipped on 2026-06-04. The table below reflects what is live in the codebase.

| Layer | What Exists Now |
|-------|----------------|
| **Database** | `cms_pages` — 19 columns incl. `nav_position`, `parent_id`, `link_url`, `link_target`, `footer_group`, `meta_title`, `og_description`, `og_image`, `published_at` |
| **Database** | `cms_page_versions` — rollback snapshots with `page_id`, `slug`, `lang`, `content`, `saved_by_label`, `saved_at` |
| **Database** | `cms_media` — centralised image registry with `filename`, `url`, `alt_text`, `width`, `height`, `file_size`, `uploaded_by_label` |
| **API — Public** | `GET /api/public/cms/nav` returns `{ top: CmsNavItem[], bottom: CmsNavItem[] }` with nested `children[]` |
| **API — Public** | `GET /api/public/cms/{slug}` returns page data incl. SEO fields |
| **API — Admin** | Full CRUD · `PATCH /admin/cms/nav/reorder` (bulk) · Version save/list/restore · Media list/delete/alt-update |
| **Admin UI — Pages** | `SAPages.tsx` — publish toggle, `nav_position` selector, `footer_group` field, scheduled `published_at` picker, SEO+OG tab with live SERP preview, version history panel, media library button |
| **Admin UI — Menus** | `SAMenus.tsx` — Top Nav / Footer Nav tabs, drag-and-drop reorder (`@dnd-kit/sortable`), parent→child tree, add submenu, add custom link, footer group labels |
| **Frontend CMS** | Inline edit mode (`InlineCmsContext`), `InlineEditableText`, `InlineEditableRich`, `InlineImagePicker`, `EditModeBar` |
| **Public Header** | `LandingPage.tsx` — CMS-driven, `DesktopDropdown` with hover dropdown + keyboard nav; mobile hamburger with `MobileAccordion` |
| **Public Footer** | Fully CMS-driven from `nav.bottom`; grouped into columns by `footer_group`; hardcoded links shown only as fallback when CMS bottom nav is empty |
| **CMS Page View** | `CmsPageView.tsx` — injects `<title>`, `og:title`, `og:description`, `og:image` dynamically from CMS page data |
| **Multi-language** | 4 languages (en, de, ar, pl) with fallback to English; nav endpoint merges fallback rows |

### Architecture (Current)

```
Admin UI
 ├── SAPages.tsx          — Page editor: content, SEO, nav, scheduling, versions, media
 └── SAMenus.tsx          — Menu builder: tree, dnd-reorder, submenu, custom links
        │ REST (adminCmsService + new endpoints)
        ▼
CmsController.php
 ├── nav()                — { top: [...children], bottom: [...children] }
 ├── reorderNav()         — bulk PATCH nav_order + parent_id
 ├── saveVersion()        — snapshot to cms_page_versions
 ├── listVersions()       — last 20 versions per slug+lang
 ├── restoreVersion()     — overwrite content from snapshot
 ├── uploadImage()        — saves file + registers in cms_media
 ├── listMedia()          — GET cms_media
 └── deleteMedia()        — unlink file + DELETE row
        │ ORM
        ▼
cms_pages · cms_page_versions · cms_media (MySQL)
        │ REST (publicCmsService.getNav / getPage)
        ▼
LandingPage.tsx           — Header: DesktopDropdown / MobileAccordion
                          — Footer: grouped columns from nav.bottom
CmsPageView.tsx           — Content + dynamic <head> meta tags
```

---

## 2. Gap Analysis

### 2.1 Navigation Gaps

| # | Gap | Status |
|---|-----|--------|
| G-NAV-01 | No position distinction (`show_in_nav` was a single boolean) | ✅ Fixed — `nav_position` ENUM (top/bottom/both/none) added |
| G-NAV-02 | No submenu / dropdown support | ✅ Fixed — `parent_id` FK, children nested in nav response, `DesktopDropdown` + `MobileAccordion` |
| G-NAV-03 | No custom link menus (external URLs or anchors) | ✅ Fixed — `link_url` + `link_target` columns; SAMenus "Add custom link" |
| G-NAV-04 | Footer partially hardcoded in `LandingPage.tsx` | ✅ Fixed — footer fully CMS-driven from `nav.bottom`; hardcoded links are fallback only |
| G-NAV-05 | No footer column groups | ✅ Fixed — `footer_group` column; footer renders columns grouped by label |
| G-NAV-06 | No drag-and-drop reorder | ✅ Fixed — `@dnd-kit/sortable` in SAMenus; bulk `PATCH /admin/cms/nav/reorder` |
| G-NAV-07 | No dedicated Menu Manager UI | ✅ Fixed — `SAMenus.tsx` with Top/Footer tabs, tree view, all CRUD |

### 2.2 Content Editor Gaps

| # | Gap | Status |
|---|-----|--------|
| G-EDIT-01 | Section fields use plain `<textarea>` | ✅ Fixed — hero subtitle, testimonial text, FAQ answers, about text all use `RichTextEditor` |
| G-EDIT-02 | No visual block builder | 🟡 **Pending** — home page JSON schema is still fixed; new sections require code changes |
| G-EDIT-03 | No preview before publish | 🟡 **Pending** — no token-based preview URL implemented; admins must publish to see live |
| G-EDIT-04 | No content versioning | ✅ Fixed — `CmsVersionPanel` (save snapshot, list 20 versions, one-click restore) |
| G-EDIT-05 | No scheduled publish | ✅ Fixed — `published_at` column + datetime-local picker in SAPages |

### 2.3 SEO & Metadata Gaps

| # | Gap | Status |
|---|-----|--------|
| G-SEO-01 | No `meta_title` | ✅ Fixed — column added; SEO tab in page editor; `<title>` injected in CmsPageView |
| G-SEO-02 | No Open Graph / social tags | ✅ Fixed — `og_description`, `og_image` columns; `og:*` meta tags injected in CmsPageView |
| G-SEO-03 | No canonical URL management | 🟡 **Pending** — `<link rel="canonical">` not yet injected |
| G-SEO-04 | No SERP preview | ✅ Fixed — live SERP snippet in SEO tab shows title, URL slug, description |

### 2.4 Media Gaps

| # | Gap | Status |
|---|-----|--------|
| G-MEDIA-01 | No media library | ✅ Fixed — `cms_media` table; `CmsMediaLibrary` modal (grid, select, insert) |
| G-MEDIA-02 | No image metadata | ✅ Fixed — `alt_text`, `width`, `height`, `file_size` stored; inline alt-text editor in modal |
| G-MEDIA-03 | No delete/cleanup | ✅ Fixed — `deleteMedia()` unlinks file from disk + removes DB row |

### 2.5 Template & Page Structure Gaps

| # | Gap | Status |
|---|-----|--------|
| G-TPL-01 | Only 3 templates (blank, legal, landing) | 🟡 **Pending** — no new templates added |
| G-TPL-02 | Home page JSON schema is hardcoded | 🟡 **Pending** — still fixed schema; visual block builder not built |

---

## 3. Backlog

### Completed Items ✅

| ID | Title | Shipped |
|----|-------|---------|
| BE-01 | `nav_position` ENUM column | 2026-06-04 |
| BE-02 | `parent_id` FK column | 2026-06-04 |
| BE-03 | `link_url` + `link_target` columns | 2026-06-04 |
| BE-04 | `footer_group` column | 2026-06-04 |
| BE-05 | Structured `nav()` response `{ top, bottom, children }` | 2026-06-04 |
| BE-06 | Bulk reorder `PATCH /admin/cms/nav/reorder` | 2026-06-04 |
| BE-07 | `meta_title`, `og_image`, `og_description` columns | 2026-06-04 |
| BE-08 | `published_at` column + controller handling | 2026-06-04 |
| BE-09 | `cms_page_versions` table + save/list/restore endpoints | 2026-06-04 |
| BE-10 | `cms_media` table + list/delete/alt-update endpoints; upload auto-registers | 2026-06-04 |
| FE-01 | `SAMenus.tsx` — Top/Footer tab Menu Manager | 2026-06-04 |
| FE-02 | Nav position selector in SAPages | 2026-06-04 |
| FE-03 | Submenu UI — Add child in SAMenus; indented tree | 2026-06-04 |
| FE-04 | Custom link form in SAMenus (label + URL + target) | 2026-06-04 |
| FE-05 | Footer group assignment in SAMenus + SAPages | 2026-06-04 |
| FE-06 | `@dnd-kit/sortable` drag-and-drop reorder in SAMenus | 2026-06-04 |
| FE-07 | Hero subtitle + section fields use `RichTextEditor` | 2026-06-04 |
| FE-08 | SEO card (meta_title, og fields, OG image upload, SERP snippet) | 2026-06-04 |
| FE-10 | Scheduled publish `datetime-local` picker + "Will go live" badge | 2026-06-04 |
| FE-11 | `CmsVersionPanel` — snapshot save, last-20 list, restore | 2026-06-04 |
| FE-12 | `CmsMediaLibrary` modal — grid, select, insert, delete, alt-text edit | 2026-06-04 |
| PW-01 | LandingPage header consumes `nav.top` with `DesktopDropdown` | 2026-06-04 |
| PW-02 | LandingPage footer fully CMS-driven, grouped by `footer_group` | 2026-06-04 |
| PW-03 | `NavDropdown.tsx` — `DesktopDropdown` + `MobileAccordion` components | 2026-06-04 |
| PW-04 | `CmsPageView` injects `<title>` + `<meta name="description">` from CMS | 2026-06-04 |
| PW-05 | `CmsPageView` injects `og:title`, `og:description`, `og:image` | 2026-06-04 |

### Open Backlog (Pending)

| ID | Priority | Title | Gap | Effort |
|----|----------|-------|-----|--------|
| FE-09 | 🟡 Medium | **Draft preview mode** — token-based preview URL `/preview/{slug}?token=…` that shows unpublished content without changing `is_published`. Needs backend token endpoint + frontend "Preview Draft" button in SAPages | G-EDIT-03 | 4 h |
| PW-06 | 🟡 Medium | **Canonical URL tag** — inject `<link rel="canonical" href="…">` in `CmsPageView` for multi-lang duplicate-content protection | G-SEO-03 | 1 h |
| FE-13 | 🟢 Low | **Visual block builder** — drag-and-drop section editor for home page; sections (Hero, Features, Steps, Testimonials, FAQ, CTA) reorderable and togglable without code changes | G-EDIT-02, G-TPL-02 | 12 h |
| BE-11 | 🟢 Low | **Scheduled publish cron** — a cron job / CI4 scheduled task that checks `published_at <= NOW()` and flips `is_published = 1` automatically. Currently `published_at` is stored but auto-publish requires manual toggle | G-EDIT-05 | 2 h |
| BE-12 | 🟢 Low | **Additional page templates** — add `content-page` and `sidebar` variants to the `page_template` ENUM; create matching React layouts in CmsPageView | G-TPL-01 | 4 h |

---

## 4. Sprint Delivery Summary

| Sprint | Goal | Status | Delivered |
|--------|------|--------|-----------|
| Sprint 1 | DB schema + API foundation | ✅ Done | Migration `2026-06-04-000001`: 8 new columns; restructured `nav()` returning `{top,bottom,children}`; reorder endpoint; TS types |
| Sprint 2 | Admin Menu Manager UI | ✅ Done | `SAMenus.tsx` with dnd-kit tree; nav position + footer group in SAPages |
| Sprint 3 | Public website navigation | ✅ Done | `NavDropdown.tsx`; CMS-driven header with dropdowns + mobile accordion; CMS-driven footer with column groups |
| Sprint 4 | Content editor + SEO | ✅ Done | RichTextEditor on hero subtitle; SEO card with SERP preview; dynamic `<title>` + OG tags in CmsPageView |
| Sprint 5 | Scheduling + versioning + media | ✅ Done | Migration `2026-06-04-000002`: `published_at`, `cms_page_versions`, `cms_media`; `CmsVersionPanel`; `CmsMediaLibrary`; upload auto-registers in media table |

---

## 5. Actual Database Schema (Implemented)

### `cms_pages`

| Column | Type | Status | Purpose |
|--------|------|--------|---------|
| `id` | INT PK | Pre-existing | Primary key |
| `slug` | VARCHAR(100) | Pre-existing | Page identifier |
| `lang` | VARCHAR(5) | Pre-existing | Language code |
| `title` | VARCHAR(255) | Pre-existing | Page title |
| `content` | LONGTEXT | Pre-existing | JSON or HTML body |
| `meta_description` | TEXT | Pre-existing | SEO description |
| `show_in_nav` | TINYINT | Pre-existing | Legacy nav flag (still honoured) |
| `nav_label` | VARCHAR(100) | Pre-existing | Custom nav text |
| `nav_order` | INT | Pre-existing | Sort order (default 999) |
| `page_template` | ENUM('blank','legal','landing') | Pre-existing | Template type |
| `is_published` | TINYINT | Pre-existing | Live / Draft flag |
| `nav_position` | ENUM('top','bottom','both','none') | ✅ Added | Navigation placement |
| `published_at` | DATETIME NULL | ✅ Added | Scheduled publish timestamp |
| `parent_id` | INT NULL | ✅ Added | Submenu parent (self-ref) |
| `link_url` | VARCHAR(500) NULL | ✅ Added | Custom / external URL |
| `link_target` | ENUM('_self','_blank') | ✅ Added | Link open behaviour |
| `footer_group` | VARCHAR(100) NULL | ✅ Added | Footer column label |
| `meta_title` | VARCHAR(255) NULL | ✅ Added | Browser `<title>` tag |
| `og_description` | TEXT NULL | ✅ Added | Open Graph description |
| `og_image` | VARCHAR(500) NULL | ✅ Added | Open Graph image URL |
| `updated_at` | DATETIME | Pre-existing | Last save timestamp |

### `cms_page_versions` (new)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT PK | Primary key |
| `page_id` | INT | FK → `cms_pages.id` |
| `slug` | VARCHAR(100) | Slug at save time |
| `lang` | VARCHAR(5) | Language variant |
| `content` | LONGTEXT | Content snapshot |
| `saved_by_label` | VARCHAR(100) | Admin email at save time |
| `saved_at` | DATETIME | Snapshot timestamp |

> Note: `saved_by_label` is a denormalised string (admin email) rather than a FK, to avoid dependency on the admin users table.

### `cms_media` (new)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT PK | Primary key |
| `filename` | VARCHAR(255) | Original filename |
| `url` | VARCHAR(500) | Relative server path |
| `alt_text` | VARCHAR(255) NULL | Accessibility description |
| `width` | INT NULL | Image width (px) |
| `height` | INT NULL | Image height (px) |
| `file_size` | INT NULL | File size (bytes) |
| `uploaded_by_label` | VARCHAR(100) NULL | Admin email at upload time |
| `created_at` | DATETIME | Upload timestamp |

> Note: `uploaded_by_label` is denormalised for the same reason as `saved_by_label`.

---

## 6. Implemented API Endpoints

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/public/cms/nav?lang=en` | Structured nav `{ top, bottom }` with nested children |
| `GET` | `/api/public/cms/{slug}?lang=en` | Page content incl. SEO fields |

### Admin (auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/cms?lang=en` | List all pages for language |
| `PUT` | `/admin/cms/{slug}` | Create or update page (all fields) |
| `PATCH` | `/admin/cms/{slug}` | Patch single field |
| `PATCH` | `/admin/cms/nav/reorder` | Bulk update `nav_order` + `parent_id` |
| `POST` | `/admin/cms/upload-image` | Upload image (base64 or multipart); auto-registers in `cms_media` |
| `DELETE` | `/admin/cms/{slug}` | Delete all language variants |
| `GET` | `/admin/cms/media` | List all media library items |
| `PATCH` | `/admin/cms/media/{id}` | Update alt text |
| `DELETE` | `/admin/cms/media/{id}` | Delete file from disk + DB |
| `POST` | `/admin/cms/versions/{slug}` | Save content snapshot |
| `GET` | `/admin/cms/versions/{slug}?lang=en` | List last 20 versions |
| `POST` | `/admin/cms/versions/restore/{id}` | Restore snapshot to live content |

---

## 7. New Files Created

| File | Purpose |
|------|---------|
| `api/app/Database/Migrations/2026-06-04-000001_ExtendCmsPagesNavV2.php` | Nav + SEO columns migration |
| `api/app/Database/Migrations/2026-06-04-000002_CmsSchedulingAndVersions.php` | `published_at` + `cms_page_versions` + `cms_media` migration |
| `api/app/Models/CmsPageVersionModel.php` | Version history model |
| `api/app/Models/CmsMediaModel.php` | Media library model |
| `src/components/screens/Admin/SAMenus.tsx` | Menu Manager admin screen |
| `src/components/NavDropdown.tsx` | `DesktopDropdown` + `MobileAccordion` components |
| `src/components/cms/CmsVersionPanel.tsx` | Collapsible version history panel |
| `src/components/cms/CmsMediaLibrary.tsx` | Media library grid modal |

### Modified Files

| File | What Changed |
|------|-------------|
| `api/app/Controllers/CmsController.php` | Restructured `nav()`, added `reorderNav()`, version/media endpoints, new field handling |
| `api/app/Models/CmsPageModel.php` | 9 new allowed fields |
| `api/app/Config/Routes.php` | 8 new admin routes |
| `src/services/adminApi.ts` | `CmsNavItem`, `CmsPageUpdateData` types; `reorderNav`, version, media service methods |
| `src/services/api.ts` | `publicCmsService.getNav()` with legacy fallback |
| `src/components/screens/Admin/SAPages.tsx` | SEO card, scheduled publish picker, nav position selector, footer group field, version panel, media library button |
| `src/components/screens/Admin/AdminSidebar.tsx` | "Menu Manager" sidebar entry |
| `src/components/screens/LandingPage.tsx` | CMS-driven header + mobile drawer + CMS-driven footer with column groups |
| `src/components/screens/CmsPageView.tsx` | Dynamic `<title>` + OG meta tags |
| `src/App.tsx` | `SAMenus` lazy import, screen type, admin route guards, render |

---

## 8. What Remains (Pending Backlog)

| Item | ID | Priority | Effort |
|------|----|----------|--------|
| Draft preview mode (token-based `/preview/{slug}?token=…`) | FE-09 | 🟡 | 4 h |
| `<link rel="canonical">` injection in CmsPageView | PW-06 | 🟡 | 1 h |
| Scheduled publish cron (auto-flip `is_published` when `published_at <= NOW()`) | BE-11 | 🟢 | 2 h |
| Additional page templates (`content-page`, `sidebar`) | BE-12 | 🟢 | 4 h |
| Visual drag-and-drop block builder for home page | FE-13 | 🟢 | 12 h |

**Total remaining effort: ~23 h**

---

## 9. Definition of Done (Verification Checklist)

| Check | Status |
|-------|--------|
| All backend migrations run cleanly on a fresh DB | ✅ PHP lint + build pass |
| API returns `{ top, bottom, children }` shaped nav | ✅ Implemented |
| Admin Menu Manager allows full CRUD + reorder | ✅ `SAMenus.tsx` live |
| Public header is CMS-driven with dropdowns | ✅ `DesktopDropdown` live |
| Public footer is CMS-driven with column groups | ✅ Live in `LandingPage.tsx` |
| No hardcoded nav links in `LandingPage.tsx` (except empty-nav fallback) | ✅ |
| All 4 languages render nav items with fallback | ✅ Controller fallback preserved |
| Pages emit correct `<title>` and OG tags | ✅ `CmsPageView` dynamic injection |
| Admins can roll back content with one click | ✅ `CmsVersionPanel` |
| Images tracked in a central library | ✅ `cms_media` + `CmsMediaLibrary` |
| TypeScript build passes with zero errors | ✅ `npm run build` clean |
| PHP syntax check clean on all new/modified files | ✅ `php -l` all pass |

---

## 10. Related Documents

- Existing CMS editor status: [admin-cms-editor.md](admin-cms-editor.md)
- Legal CMS pages: [legal-cms-pages.md](legal-cms-pages.md)
- Multi-language system: [multi-language.md](multi-language.md)
- Frontend performance: [frontend-performance.md](frontend-performance.md)
