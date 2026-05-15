# Stripe Webhooks

**Status:** 🔶 PARTIAL  
**Score:** 4/10  
**Last updated:** 2026-05-15  
**Stack:** `api/app/Controllers/Webhooks.php` · `api/app/Controllers/Billing.php`

---

## Overview

Stripe webhook listener that processes subscription and payment lifecycle events and persists them to a local `billing_invoices` table. A skeleton `Webhooks.php` controller exists but contains no event-handling logic. Until this is implemented, `GET /billing/payment-history` returns an empty array for all tenants.

---

## Status Summary

| Metric | Value |
|--------|-------|
| Score | 4/10 |
| Open high | 1 |
| Completed items | 1 |

---

## Open Backlog

### HIGH

| ID | Item | File / Location | Effort |
|----|------|-----------------|--------|
| S3-01 | **Webhook listener has no event handling.** `Webhooks.php` skeleton exists but processes no events. Required events to handle: `invoice.paid` (record payment), `invoice.payment_failed` (flag overdue), `customer.subscription.updated` (update tenant plan), `customer.subscription.deleted` (handle cancellation). Needs a `billing_invoices` table migration. Until complete, payment history is always empty. | `api/app/Controllers/Webhooks.php`, `Billing.php:158–163` | 5–6 h |

---

## Completed Items

| Item | Fixed | Files |
|------|-------|-------|
| Stripe price IDs were hardcoded mock values — now read from `plans.stripe_price_id` DB column | 2026-05-05 | `Billing.php` |

---

## Required Stripe Events

| Event | Action |
|-------|--------|
| `invoice.paid` | Insert row into `billing_invoices`; update tenant status to active |
| `invoice.payment_failed` | Flag tenant subscription as past_due |
| `customer.subscription.updated` | Update `tenants.plan_id` and usage limits |
| `customer.subscription.deleted` | Mark subscription cancelled; restrict access |

---

## Related Modules

- Customer-facing billing UI: see [customer-billing.md](customer-billing.md)
- Admin billing view: see [admin-billing.md](admin-billing.md)
