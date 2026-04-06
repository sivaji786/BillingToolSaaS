# Module Report: Invoice Management
**Status:** ✅ Production Ready

## 1. Sub-Modules
- **UBL Compliance Engine:** Ensures European E-Invoicing standard compatibility (EN 16931).
- **Dynamic Editor:** Real-time calculation and validation in React.
- **PDF Core:** High-fidelity document generation (`invoice-pdf.ts`).

## 2. Functionalities & Status
| Functionality | Description | Status |
| :--- | :--- | :--- |
| **Full CRUD** | Create, Read, Update, Delete invoices and items. | ✅ Stable |
| **Status Lifecycle** | State transitions: Draft -> Sent -> Paid. | ✅ Stable |
| **PDF Export** | Premium, branded PDF downloads. | ✅ Stable |
| **Buyer Selection** | Pick existing buyers from directory inside preview. | ✅ Stable |
| **Digital Signatures** | Cryptographic signing for legal compliance. | 🟡 In-Progress |

## 3. Technical Implementation
- **Controller:** `App\Controllers\InvoiceController`
- **Models:** `App\Models\InvoiceModel`, `App\Models\InvoiceLineModel`
- **Frontend:** `src/components/screens/InvoiceEditor.tsx`

## 4. Risks & Conflicts
- **Tax Compliance:** Dynamic tax rules vary significantly by region.
- **Concurrent Edits:** Risk of overwriting data if two users edit the same invoice simultaneously.

## 5. Roadmap
- Support for recurring invoices (Subscriptions).
- Automatic email dispatch via SMTP/SendGrid.
- Automated invoice numbering sequences per tenant.
