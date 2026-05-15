# Template System

**Status:** ✅ DONE  
**Score:** 10/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/TemplateLibrary.tsx`, `TemplateDesignLayout.tsx` · `api/app/Controllers/TemplateController.php` · `invoices.template_id` column

---

## Overview

Visual template designer for invoice and letter layouts. Users can choose from a template library, preview live thumbnails, and customise the template using a drag-and-drop layout editor. The selected template ID is persisted on each invoice/letter record so the correct template is always used when rendering PDF output.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 10/10 |
| Open items | 0 |
| Completed items | 3 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Template library: live preview thumbnails added | 2026-04-28 | `TemplateLibrary.tsx` |
| Template designer: drag-drop boundary constraints added (elements cannot be dragged outside canvas) | 2026-05-05 | `TemplateDesignLayout.tsx` |
| Selected template persisted to DB — `template_id` column added to `invoices` table; wired in controller and model | 2026-04-28 | Migration `2026-04-28`, `InvoiceModel.php`, `InvoiceController.php` |
