# Company Settings

**Status:** ✅ DONE  
**Score:** 10/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Settings.tsx` · `api/app/Controllers/CompanyProfileController.php` · `company_profiles` table

---

## Overview

Tenant company profile management: business name, address, VAT ID, contact details, invoice/letter number format with live preview, logo upload, and company signature upload. All settings are used to pre-populate the seller section of new invoices and letters, and to render the company header in PDF exports.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 10/10 |
| Open items | 0 |
| Completed items | 4 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Logo upload: replaced plain text URL input with `ImageUploadField` widget (file picker → base64 → API) | 2026-05-05 | `Settings.tsx`, `CompanyProfileController.php` |
| Invoice/letter number format: live preview panel showing generated number as user types format string | 2026-05-05 | `Settings.tsx` |
| Company signature upload: `ImageUploadField` for signature image; `signatureUrl` stored in DB and exposed in PDF | 2026-05-05 | `Settings.tsx`, `CompanyProfileController.php`, migration `2026-05-05-000002` |
| Company types fetch migrated to `useQuery` with `staleTime: 30 min` | 2026-05-13 | `Settings.tsx` |
