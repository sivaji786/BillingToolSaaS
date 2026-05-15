# Letter PDF

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/utils/letter-pdf.ts`

---

## Overview

Client-side PDF generation for business letters. Uses native jsPDF text rendering. Header and footer text are rendered directly as jsPDF text elements (not via html2canvas) to ensure correct output at all page sizes.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open items | 0 |
| Completed items | 2 |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Header/footer text cut off — replaced html2canvas with native jsPDF text rendering | 2026-04-28 | `letter-pdf.ts` |
| Decorative separator lines removed from PDF output | 2026-04-28 | `letter-pdf.ts` |
