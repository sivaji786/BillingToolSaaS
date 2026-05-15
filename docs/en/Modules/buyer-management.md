# Buyer Management

**Status:** 🔶 PARTIAL  
**Score:** 8/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Buyers.tsx` · `api/app/Controllers/BuyerController.php` · `api/app/Models/BuyerModel.php` · `buyers` table

---

## Overview

Buyer directory stores contact, address, and VAT information for invoice recipients. Buyers are auto-synced from invoices on save (`syncBuyer()`). Users can also manage buyers directly. Buyer records are tenant-scoped and subject to plan limits.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 8/10 |
| Open medium | 1 |
| Completed items | 2 |

---

## Open Backlog

### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S6-09 | **`syncBuyer` never updates an existing buyer's information.** When an invoice is saved with a buyer whose name already exists in the directory, the `if (!$existing)` guard skips the upsert entirely. Address, VAT ID, and contact details are never refreshed. Over time the buyer directory becomes stale relative to what is on the invoices. Fix: add an `else { $buyerModel->update($existing['id'], [...]) }` branch to keep directory in sync. | `api/app/Controllers/InvoiceController.php:414–437` | 0.5 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Plan limit enforcement — `BuyerController` checks `withinPlanLimit('buyers')` before insert; returns 429 when over limit | 2026-05-05 | `BuyerController.php`, `PlanLimitTrait.php` |
| DB index: `(tenant_id, deleted_at)` on `buyers` table | 2026-05-13 | MySQL migration |

---

## Key DB Table

| Column | Notes |
|--------|-------|
| `id` | PK |
| `tenant_id` | Multi-tenancy scope |
| `name` | Matched by `syncBuyer()` |
| `vat_id` | VAT identification number |
| `legal_organization_id` | Optional LEI |
| `address_json` | `{street, city, postalCode, country}` |
| `contact_json` | `{email, phone}` |
| `deleted_at` | Soft delete |
