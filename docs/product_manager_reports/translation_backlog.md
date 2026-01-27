# Translation Backlog Report (Priority: DE/AR)
**Project:** BillingTool SaaS
**Date:** 2026-01-26
**Baseline:** English (`en.ts` + Hardcoded Strings)

---

## 1. Quantitative Analysis (Total Surface Area)

| Category | Keys | Word Count (Est.) | Status |
| :--- | :--- | :--- | :--- |
| **Existing (en.ts)** | 594 | 1,723 | ✅ Standardized |
| **Technical Debt (Hardcoded)**| ~550 | **1,624** | ❌ Untranslated |
| **Total Baseline** | **~1,144** | **3,347** | - |

## 2. Implementation Status & Backlog

### Priority: German (de) & Arabic (ar)

| Language | Category | Word Count | Coverage | Effort |
| :--- | :--- | :--- | :--- | :--- |
| **German (de)** | Existing Gaps | 142 | 96% | 🟢 Low |
| **German (de)** | Hardcoded Debt | 1,624 | 0% | 🔴 High |
| **Arabic (ar)** | Existing Gaps | 142 | 96% | 🟢 Low |
| **Arabic (ar)** | Hardcoded Debt | 1,624 | 0% | 🔴 High |
| **Total Backlog** | - | **3,532** | - | - |

## 3. Qualitative Breakdown of Technical Debt

The **1,624 hardcoded words** are predominantly located in the following "Localization Deserts":

1.  **SaaS Admin Portal (100% Untranslated)**:
    - Files: `src/components/admin/*`
    - Content: Revenue metrics, user management labels, system logs.
2.  **SaaS Subscription Layer (90% Untranslated)**:
    - Files: `src/components/screens/Billing.tsx`, `Signup.tsx`
    - Content: Plan descriptions, checkout process, usage meters.
3.  **UI Core Utilities**:
    - Files: `src/components/ui/*`
    - Content: Accessibility labels (`aria-label`), pagination help text.

## 4. Risks & Recommendations

> [!CAUTION]
> **Technical Risk**: The SaaS Admin Portal currently exposes English-only text to all users regardless of language preference. This impacts professional credibility in the DACH (Germany/Austria/Switzerland) and Middle East markets.

### Remediation Roadmap:
1.  **Phase 1 (Immediate)**: Extract SaaS Admin strings into `admin` namespace in `en.ts`.
2.  **Phase 2 (Parity)**: Update `de.ts` and `ar.ts` with newly extracted keys.
3.  **Phase 3 (Cleanup)**: Audit shadow DOM elements and ARIA labels for hardcoded "human" text.

---
**Total Project Backlog (Realistic):** ~3,532 words
