# Admin — CMS Editor

**Status:** 🔶 PARTIAL  
**Score:** 8/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Admin/SAPages.tsx` · `api/app/Controllers/CmsController.php` · `cms_pages` table

---

## Overview

Super-admin content management for public-facing pages (Privacy Policy, Terms, Landing Page sections, etc.). Admins can publish/unpublish pages, set navigation order, upload section images, and preview live pages. Section content is editable but currently renders as a plain `<textarea>` — a RichTextEditor has not yet been wired per section.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 8/10 |
| Open partial | 1 |
| Completed items | 4 |

---

## Open Backlog

### MEDIUM (🔶 PARTIAL)

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S4-03 | **Section content editor is still a plain `<textarea>`.** The publish workflow, nav order, and image upload are complete. However individual page section content fields are plain textareas. The `RichTextEditor` component (already used in LetterEditor) needs to be wired in per-section so admins can format headings, lists, links, and emphasis. | `src/components/screens/Admin/SAPages.tsx` | 2 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| `is_published` toggle with Published/Draft badge — admins can publish or unpublish pages without deleting them | 2026-05-08 | `SAPages.tsx`, `CmsController.php` |
| `nav_order` input exposed — admins can control the order pages appear in the public navigation | 2026-05-08 | `SAPages.tsx` |
| Section image upload calls API — image field triggers upload rather than storing a raw URL string | 2026-05-08 | `SAPages.tsx`, `adminApi.ts` |
| "View Live" button per page — opens the published page using slug-to-route mapping | 2026-05-08 | `SAPages.tsx` |

---

## Related Modules

- Public page rendering: see [legal-cms-pages.md](legal-cms-pages.md)
