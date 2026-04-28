# Requirement: Template Types and Business Letter Module

We are introducing a new "Business Letter" module to our system, complementing the existing "Invoice" module. Both modules will share common infrastructure for template management and document generation.

## Objective
Enable users to create, edit, and design "Business Letters" using the existing template library, layout editor, and document preview/export systems.

## Template Types
1. **Invoice**: Existing document type with specific e-invoicing elements (EN 16931 compliant).
2. **Business Letter**: New document type for formal correspondence.

## Element Requirements

### Invoice Template Elements
- header, logo, dates, title, buyer, seller, item list, tax summary, totals, payment information/notes, signature, giro/qr code, footer.

### Business Letter Template Elements
- header, logo, title, to (recipient), description (letter body), signature, qr code, footer.

## Technical Implementation Steps

### 1. Update Core Types (`src/types/invoice.ts`)
- Define `TemplateType = 'invoice' | 'business_letter'`.
- Add `templateType: TemplateType` to `InvoiceTemplate` and `Invoice` interfaces (consider renaming interfaces to `DocumentTemplate` and `Document` for generic usage).
- Update `TemplateLayoutElement['type']` to include `'to'` and `'description'`.

### 2. Update Default Layouts (`src/utils/invoice-templates-defaults.ts`)
- Define `DEFAULT_LETTER_LAYOUT` with positions for business letter elements.
- Add sample `PLATFORM_TEMPLATES` for Business Letters.

### 3. Enhance Template Layout Editor (`src/components/invoice/TemplateDesignLayout.tsx`)
- Update rendering logic to handle the new `'to'` and `'description'` element types.
- **'to'**: Similar to 'buyer' but labeled for general recipients.
- **'description'**: A large text area for the body of the letter, supporting multiline content.
- Filter the **Element Library** (Left Sidebar) based on the current template's `templateType`.

### 4. Update Template Library (`src/components/screens/TemplateLibrary.tsx`)
- Add a toggle or tabs to switch between "Invoice" and "Business Letter" templates.
- Update template cards to display the template type.

### 5. Create Business Letter Screen (`src/components/screens/BusinessLetter.tsx`)
- Implement a screen for creating and editing business letters, similar to `InvoiceEditor.tsx`.
- Form fields: Recipient (To), Date, Subject (Title), and Content (Description).
- Re-use the `PartyCard` for the "To" address section.

### 6. Document Preview and Export
- Update `InvoicePreview.tsx` (rename to `DocumentPreview.tsx`) to support both document types.
- Ensure the PDF generation logic handles the different layouts and elements correctly.

### 7. Routing and Navigation
- Update `App.tsx` and `AppSidebar.tsx` to include "Business Letters" in the main navigation.
- Add routes for `#business-letters`, `#business-letters/new`, and `#business-letters/edit/:id`.

## UI/UX Considerations
- Ensure the transition between Invoice and Business Letter design modes is seamless.
- Maintain consistent aesthetics across both modules using the existing design system (Indigo/Slate palette).
- Use the recently implemented "Element Content" inspector feature to allow fine-tuning of letter content.
