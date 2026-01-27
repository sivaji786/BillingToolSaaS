# Test Report: Subscription & Billing
**Scope:** Stripe Integration, Usage Tracking, Plan Logic

## 1. Functional Testing
- **Unit Testing:** 
    - `UsageTracker` calculation logic for monthly resets.
    - Status: 🟢 **Active**
- **Integration Testing:** 
    - Stripe Webhook handler (`Webhooks.php`) with mock events.
    - Status: 🟡 **In-Progress**
- **System Testing:** 
    - Full flow: Signup -> 14-day trial auto-starts -> Plan upgrade.
    - Status: 🟡 **In-Progress**
- **API Testing:** 
    - `/api/admin/usage` endpoint accuracy verification.
    - Status: ✅ **Passed**

## 2. Non-Functional Testing
- **Security Testing:** 
    - Verified that users cannot manually trigger plan-only features via API.
    - Status: ✅ **Passed**
- **Compatibility Testing:** 
    - Stripe Checkout rendering on mobile Safari.
    - Status: ✅ **Passed**

## 3. Specialized Testing
- **Localization Testing:** 
    - VAT calculation correctness for different EU countries in Stripe.
    - Status: 🟡 **In-Progress**
- **Exploratory Testing:** 
    - Rapid plan upgrades/downgrades in a single session.
    - Status: 🔴 **Issue Detected** (Proration logic needs edge-case handling)
