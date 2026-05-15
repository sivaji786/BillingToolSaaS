# Legal / CMS Pages

**Status:** ✅ DONE  
**Score:** 8/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/CmsPageView.tsx` · `api/app/Controllers/CmsController.php` · `cms_pages` table

---

## Overview

Static and CMS-managed public pages including Privacy Policy, Terms of Service, Cookie Policy, and Impressum (legal notice). Content is stored in the database and served via a public CMS endpoint. Admins can publish/unpublish pages, set navigation order, and upload section images from the admin CMS editor. The nav menu is cached with a 5-minute `Cache-Control` header.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 8/10 |
| Open items | 0 (remaining gap is in Admin CMS Editor — see `admin-cms-editor.md`) |
| Completed items | 4 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Privacy Policy, Terms of Service, Cookie Policy, Impressum pages added | 2026-04-28 | `src/components/screens/` |
| Multilingual documentation system and SAWiki improvements | 2026-05-08 | `SAWiki.tsx`, `AdminWiki.php` |
| `Cache-Control: public, max-age=300` on CMS nav endpoint | 2026-05-13 | `CmsController.php` |
| `useCmsPage(slug)` shared hook for fetching page content | 2026-05-13 | `src/hooks/useCmsPage.ts` |

---

## Related Modules

- Admin-side editing: see [admin-cms-editor.md](admin-cms-editor.md)
- Admin wiki: see [admin-wiki.md](admin-wiki.md)
