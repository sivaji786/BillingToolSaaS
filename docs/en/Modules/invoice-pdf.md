# Invoice PDF

**Status:** ✅ DONE  
**Score:** 9/10  
**Last updated:** 2026-05-15  
**Stack:** `src/utils/invoice-pdf.ts`, `src/utils/invoice-export.ts`

---

## Overview

Client-side PDF generation for invoices. PDFs are generated entirely in the browser using jsPDF — no server roundtrip. Exports are triggered from InvoicePreview or directly from the InvoiceList row action menu. UBL-XML (EN 16931 compliant), JSON, and CSV exports use the same export utility.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 9/10 |
| Open items | 0 |
| Completed items | 3 |

---

## Export Formats Supported

| Format | Generator | Standard |
|--------|-----------|----------|
| PDF | `generateInvoicePDF(invoice)` | Print-ready layout |
| UBL-XML | `generateUBLXML(invoice)` | EN 16931 / UBL 2.1 |
| JSON | Direct object serialisation | — |
| CSV | Line items to spreadsheet | — |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Client-side PDF generation working end-to-end | 2026-04-23 | `invoice-pdf.ts` |
| Bulk export — each invoice downloads as separate file | 2026-04-28 | `invoice-export.ts` |
| Dead code removed: `invoice-pdf-html.ts` (241 lines, html2canvas approach) deleted | 2026-05-12 | — |
