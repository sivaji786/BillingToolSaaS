# Business Letter

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/LetterEditor.tsx`, `LetterList.tsx`, `LetterPreview.tsx` · `api/app/Controllers/BusinessLetterController.php`

---

## Overview

Business letters are a template variant stored in the same `invoices` table as invoices (`template_type = 'business_letter'`). They have a rich-text body, salutation, and closing instead of line items. A separate set of screens (LetterEditor, LetterList, LetterPreview) and a dedicated API endpoint (`/letters`) keep them isolated from the invoice workflow.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open items | 0 |
| Completed items | 8 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Separate LetterEditor, LetterList, LetterPreview components | 2026-04-28 | `src/components/screens/Letter*.tsx` |
| Rich-text body editor (RichTextEditor) wired in LetterEditor | 2026-04-28 | `LetterEditor.tsx` |
| Salutation and closing fields exposed in editor UI | 2026-04-28 | `LetterEditor.tsx` |
| Auto-numbering wired to `letterNumberFormat` from company profile | 2026-04-28 | `App.tsx` |
| Letter number click in list navigates to preview (not editor) | 2026-04-28 | `LetterList.tsx:341` |
| New Letter button and AI-generated letters open in preview mode | 2026-04-28 | `App.tsx` |
| Back button in preview returns to letters list | 2026-04-28 | `App.tsx` |
| AI letter body improvement: "Improve with AI" button in LetterPreview | 2026-05-08 | `LetterPreview.tsx`, `AIInvoiceController.php` |

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/letters` | List letters with filters (status, date, sort) |
| `GET` | `/letters/:id` | Get single letter + content |
| `POST` | `/letters` | Create new letter |
| `PUT` | `/letters/:id` | Update letter |
| `DELETE` | `/letters/:id` | Delete letter |

---

## DB Columns (letter-specific, in `invoices` table)

| Column | Purpose |
|--------|---------|
| `template_type` | Always `'business_letter'` for letters |
| `body` | Rich-text letter content (LONGTEXT) |
| `salutation` | Opening greeting |
| `closing` | Closing line |
