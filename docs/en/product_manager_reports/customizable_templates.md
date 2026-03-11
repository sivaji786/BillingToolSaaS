# Customizable Templates Module Report
**Project:** BillingTool SaaS
**Date:** 2026-01-26
**Auditor:** Antigravity AI
**Status:** ✅ Production Ready

---

## 1. Executive Summary
The **Customizable Templates** module is a high-impact feature that allows tenants to design bespoke invoice layouts through a visual, drag-and-drop interface. It bridges the gap between rigid standard exports and professional, branded documentation, ensuring e-invoicing compliance (UBL 2.1) without sacrificing visual identity.

## 2. Core Capabilities

### 2.1 Visual Design Layout Engine
- **Canvas-based Interface:** A specialized React component (`TemplateDesignLayout.tsx`) providing a pixel-perfect preview of the invoice.
- **Element Library:** Drag-and-drop support for 13+ critical components:
    - Business IDs (Logo, Header, Title)
    - Party Data (Seller, Buyer)
    - Functional Blocks (Items Table, Tax Summary, Totals)
    - Compliance Blocks (Digital Signature, QR Code, Footer)
- **Advanced Tools:**
    - **Grid Snapping:** Ensures professional alignment.
    - **Property Inspector:** Granular control over (X, Y) coordinates and (W, H) dimensions.
    - **Zoom Controls:** Precise editing for detailed layouts.

### 2.2 Template Management
- **Persistence:** Layouts are serialized as JSON and stored in the `invoice_templates.layout_json` column.
- **Tenant Isolation:** Every template is strictly scoped to a `tenant_id` via the `TenantScope` trait in the backend.
- **Defaults System:** Ability to set default currencies, tax categories, and payment terms per template.

## 3. Technical Implementation

### Backend Architecture
- **Controller:** `InvoiceTemplateController.php` handles JSON-to-Database mapping.
- **Model:** `InvoiceTemplateModel.php` (Extends `BaseModel`).
- **Data Segregation:** Fail-closed security ensures a tenant cannot access or modify templates owned by another organization.

### Frontend Innovation
- **Native Tailwind Integration:** The layout engine leverages Tailwind for its responsive property inspector.
- **Subdomain-Aware Branding:** Templates automatically pull tenant-specific branding (logos) when loaded in the editor.

## 4. Current Status & Roadmap

| Feature | Status | Implementation Detail |
| :--- | :--- | :--- |
| **Visual Canvas** | ✅ Stable | React-based drag/drop logic. |
| **JSON Storage** | ✅ Stable | `layout_json` column in MySQL. |
| **Tenant Scoping** | ✅ Stable | Global `TenantScope` integration. |
| **Logo Integration** | ✅ Beta | Supports dynamic URL injection from Company Profile. |
| **ZUGFeRD Integration** | 🟡 Research | Mapping visual blocks to Hybrid-PDF standards. |

## 5. Risks & Limitations
- **Risk:** Complex layouts might break on extremely narrow mobile screens if not designed with responsiveness in mind.
- **Conflict:** Concurrent editing of the same template by two admins (Resolved via "Last-Write-Wins", but needs a lock mechanism).

---
**Conclusion:** This module is one of the project's most technically sophisticated areas and provides significant business value by reducing the need for custom CSS/HTML development for tenants.
