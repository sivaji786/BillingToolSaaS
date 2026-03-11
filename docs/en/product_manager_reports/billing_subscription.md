# Module Report: Subscription & Billing
**Status:** 🟡 In Development

## 1. Sub-Modules
- **Plan Manager:** CRUD for subscription tiers (`Starter`, `Pro`, `Enterprise`).
- **Usage Tracker:** Monitors API calls, storage, and bandwidth usage.
- **Payment Gateway:** External provider integration (Stripe).

## 2. Functionalities & Status
| Functionality | Description | Status |
| :--- | :--- | :--- |
| **Tier Definition** | Price, features, and limits metadata. Supports **Public/Private** toggles. | ✅ Stable |
| **QuickAccess Plan** | Automated assignment of a "Trailing" plan for new signups. | ✅ Stable |
| **Real-time Usage** | Dashboard widgets and enforcement of limits (Storage, API). | ✅ Stable |
| **Automated Billing** | Subscription renewal via webhooks. | 🟡 In-Progress |
| **Threshold Alerts** | Email notifications at 80%, 90%, and 100% usage. | ✅ Stable |

## 3. Technical Implementation
- **Controllers:** `App\Controllers\AdminBilling`, `App\Controllers\AdminPackages`
- **Models:** `App\Models\SubscriptionModel`, `App\Models\PlanModel`
- **Webhooks:** `App\Controllers\Webhooks` (Stripe handler)

## 4. Risks & Conflicts
- **Data Consistency:** Syncing usage metadata with real-time database state.
- **Proration:** Complexities in billing logic during mid-cycle upgrades.

## 5. Roadmap
- Integration with PayPal and local payment gateways.
- Discount codes and promotional coupon support.
