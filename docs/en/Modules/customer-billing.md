# Customer Billing

**Status:** 🔶 PARTIAL  
**Score:** 7/10  
**Last updated:** 2026-05-15  
**Stack:** `src/components/screens/Billing.tsx` · `api/app/Controllers/Billing.php` · Stripe API

---

## Overview

Tenant subscription and billing management. Displays the current plan, usage meters (invoices, storage, API calls), plan comparison, upgrade flow via Stripe Checkout, and payment history. Plan limits are enforced at the API layer via `PlanLimitTrait`. Stripe price IDs are read from the `plans` table in the DB. Payment history is a stub pending webhook integration.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 7/10 |
| Open high | 1 |
| Open medium | 2 |
| Completed items | 3 |

---

## Open Backlog

### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S3-01 | **Stripe webhook integration — payment history is an empty stub.** `GET /billing/payment-history` returns `[]`. Requires a webhook listener endpoint that processes `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` events from Stripe and persists them to a `billing_invoices` table. A skeleton `Webhooks.php` exists but has no logic. | `api/app/Controllers/Billing.php:158–163`, `Webhooks.php` | 5–6 h |

### MEDIUM

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S3-04 | **No plan downgrade or cancellation flow.** Only the upgrade path (Stripe Checkout redirect) is implemented. Tenants cannot downgrade to a lower plan or cancel their subscription from the UI or API. | `api/app/Controllers/Billing.php`, `src/components/screens/Billing.tsx` | 2 h |
| P5C-03 | **Migrate `Billing.tsx` to `useQuery`.** `loadBillingData()` on mount calls `billingService.getSubscription()`, `getHistory()`, and `getPlans()` in a manual `useEffect` with no caching or stale-time. Should use `useQuery` with appropriate `staleTime`. | `src/components/screens/Billing.tsx` | 1 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Stripe price IDs hardcoded to mock values — now reads `plans.stripe_price_id` from DB | 2026-05-05 | `Billing.php` |
| Plan limit enforcement — `PlanLimitTrait` reads `plans.limits` JSON; returns 429 with upgrade prompt when quota exceeded | 2026-05-05 | `PlanLimitTrait.php`, `InvoiceController.php`, `BuyerController.php` |
| Usage meters (invoices used/limit, storage, API calls) display correct values from DB | 2026-04-28 | `Billing.tsx`, `Billing.php` |

---

## Related Modules

- Stripe webhook backend: see [stripe-webhooks.md](stripe-webhooks.md)
- Admin billing admin view: see [admin-billing.md](admin-billing.md)
