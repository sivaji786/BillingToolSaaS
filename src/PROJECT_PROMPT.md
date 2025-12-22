# EN 16931-Compliant Invoice Builder - Project Documentation & Integration Guide

## Executive Summary

A comprehensive, production-ready invoice builder application that creates standardized European e-invoices with full UBL XML export capabilities. The application handles all aspects of invoice creation including party management (seller/buyer), line items with tax calculations, validation against EN 16931 standards, and multiple export formats (PDF, UBL XML, JSON, CSV).

**Key Features:**
- ✅ EN 16931 standard compliance with real-time validation
- ✅ Multi-format export/import (PDF, UBL XML, JSON, CSV)
- ✅ Multilingual support (EN, DE, AR with RTL, PL, FR, IT)
- ✅ Template system with customizable headers/footers/logos
- ✅ Inline editing in preview mode
- ✅ Bulk operations (import, export, status change, delete)
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Responsive design (desktop/tablet/mobile)
- ✅ Theme builder with custom color schemes
- ✅ Activity logging and analytics dashboard

---

## Technology Stack

### Core Framework
- **React 18+** with TypeScript
- **Tailwind CSS v4.0** for styling
- **CSS Custom Properties** for theming

### UI Components
- **shadcn/ui** - Pre-built accessible components
- **Lucide React** - Icon system
- **Recharts** - Data visualization for dashboard
- **Sonner** - Toast notifications

### Libraries & Utilities
- **React Hook Form 7.55.0** - Form validation and management
- **jsPDF** - PDF generation
- **Motion/React** (formerly Framer Motion) - Animations
- **date-fns** - Date manipulation

### Standards & Compliance
- **EN 16931** - European e-invoicing standard
- **UBL 2.1** - Universal Business Language XML format
- **WCAG 2.1 AA** - Web accessibility guidelines

---

## Project Architecture

### Directory Structure

```
/
├── App.tsx                          # Main application entry point
├── components/
│   ├── invoice/                     # Invoice-specific components
│   │   ├── ExportModal.tsx         # Export format selection
│   │   ├── LineItemRow.tsx         # Editable line item
│   │   ├── PartyCard.tsx           # Seller/Buyer information card
│   │   ├── PreviewModal.tsx        # Invoice preview with inline editing
│   │   ├── TaxSummaryPanel.tsx     # Tax calculations display
│   │   ├── TemplateEditor.tsx      # Template customization
│   │   ├── ValidationChip.tsx      # EN 16931 validation status
│   │   └── ValidationPanel.tsx     # Detailed validation errors/warnings
│   ├── screens/                     # Full-page views
│   │   ├── ActivityLog.tsx         # User activity tracking
│   │   ├── Dashboard.tsx           # Analytics and overview
│   │   ├── InvoiceEditor.tsx       # Invoice creation/editing
│   │   ├── InvoiceList.tsx         # Invoice management with filters
│   │   ├── InvoicePreview.tsx      # Full invoice preview
│   │   ├── Login.tsx               # Authentication
│   │   ├── Settings.tsx            # Application settings
│   │   └── TemplateLibrary.tsx     # Template management
│   ├── ui/                          # shadcn/ui components
│   ├── LanguageSwitcher.tsx        # Language selection
│   └── ThemeBuilder.tsx            # Theme customization
├── contexts/
│   └── LanguageContext.tsx         # i18n state management
├── data/
│   └── mock-data.ts                # Sample invoices and data
├── types/
│   └── invoice.ts                  # TypeScript interfaces
├── utils/
│   ├── i18n.ts                     # Internationalization
│   ├── invoice-calculations.ts     # Tax and total calculations
│   ├── invoice-export.ts           # Export functionality
│   ├── invoice-import.ts           # Import and parsing
│   ├── invoice-pdf.ts              # PDF generation
│   └── invoice-validation.ts       # EN 16931 validation
└── styles/
    └── globals.css                 # Global styles and theme tokens
```

---

## Core Data Model

### Invoice Interface (`types/invoice.ts`)

```typescript
interface Invoice {
  // Identification
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  invoiceTypeCode: string; // 380 = Commercial invoice, 381 = Credit note
  
  // Currency
  currency: string;
  
  // Parties
  seller: Party;
  buyer: Party;
  
  // Line Items
  lines: InvoiceLine[];
  
  // Calculations (auto-computed)
  lineExtensionAmount: number;      // Sum of line totals
  taxExclusiveAmount: number;       // Total before tax
  taxInclusiveAmount: number;       // Total with tax
  payableAmount: number;            // Final amount
  taxTotals: TaxTotal[];            // Tax breakdown by category
  
  // Additional Information
  note?: string;
  paymentTerms?: string;
  status: 'draft' | 'validated' | 'sent' | 'paid' | 'cancelled';
}

interface Party {
  name: string;
  vatId?: string;
  legalOrganizationId?: string;
  address: Address;
  contactEmail?: string;
  contactPhone?: string;
}

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitCode: string;              // EA, HUR, etc. (UN/ECE Rec 20)
  unitPrice: number;
  taxCategory: string;           // S = Standard, Z = Zero, E = Exempt
  taxPercent: number;
}
```

---

## Key Components & Features

### 1. Invoice Editor (`components/screens/InvoiceEditor.tsx`)
**Purpose:** Main invoice creation and editing interface

**Features:**
- Party management (seller/buyer)
- Dynamic line item addition/removal
- Real-time tax calculations
- Auto-validation against EN 16931
- Status management
- Template application
- Inline preview modal

**Integration Points:**
- Uses `invoice-calculations.ts` for totals
- Uses `invoice-validation.ts` for EN 16931 compliance
- Integrates with TemplateEditor for branding

### 2. Invoice List (`components/screens/InvoiceList.tsx`)
**Purpose:** Invoice management dashboard

**Features:**
- Search and filtering (status, date range, amount)
- Sorting options
- Bulk operations (delete, export, status change)
- Pagination
- Import functionality
- Template downloads

**Filters Available:**
- Status: draft, validated, sent, paid, cancelled
- Date: last 7/30/90 days, this/last month, this year, custom range
- Search: invoice number, buyer name, seller name
- Sort: date, amount, invoice number (asc/desc)

### 3. Template System (`components/invoice/TemplateEditor.tsx`)
**Purpose:** Customizable invoice branding

**Features:**
- Logo upload (base64 encoding)
- Header/footer customization
- Color scheme configuration
- Font selection
- Template save/load
- Preview mode

**Template Structure:**
```typescript
interface Template {
  id: string;
  name: string;
  logo?: string;           // Base64 encoded image
  headerText?: string;
  footerText?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}
```

### 4. Export System (`utils/invoice-export.ts`)
**Purpose:** Multi-format export functionality

**Supported Formats:**
1. **PDF** - Human-readable invoice with template styling
2. **UBL XML** - EN 16931 compliant XML
3. **JSON** - Structured data export
4. **CSV** - Spreadsheet-compatible format
5. **ZUGFeRD** (Planned) - Hybrid PDF/XML format

**Export Functions:**
```typescript
exportInvoiceToPDF(invoice: Invoice, template?: Template): void
exportInvoiceToUBLXML(invoice: Invoice): void
exportInvoiceToJSON(invoice: Invoice): void
exportInvoiceToCSV(invoices: Invoice[]): void
bulkExport(invoices: Invoice[], format: ExportFormat): void
```

### 5. Import System (`utils/invoice-import.ts`)
**Purpose:** Import invoices from external sources

**Supported Formats:**
1. **JSON** - Single or array of invoices
2. **CSV** - Line items with metadata
3. **UBL XML** - EN 16931 compliant import

**Import Process:**
```typescript
async importInvoices(file: File): Promise<ImportResult>
// Returns: { success, invoices, errors, warnings }
```

**Template Downloads:**
```typescript
downloadImportTemplate()      // CSV
downloadJSONTemplate()         // JSON
downloadUBLXMLTemplate()       // UBL XML
```

### 6. Validation System (`utils/invoice-validation.ts`)
**Purpose:** EN 16931 compliance validation

**Validation Rules:**
- Required fields (invoice number, issue date, parties, lines)
- VAT ID format validation
- Tax category validation
- Currency code validation (ISO 4217)
- Country code validation (ISO 3166-1)
- Unit code validation (UN/ECE Recommendation 20)
- Calculation accuracy checks

**Validation Levels:**
- ✅ **Valid** - Fully EN 16931 compliant
- ⚠️ **Warning** - Missing optional fields
- ❌ **Error** - Missing required fields or invalid data

### 7. Internationalization (`utils/i18n.ts`)
**Purpose:** Multi-language support

**Supported Languages:**
- English (EN) - Default
- German (DE)
- Arabic (AR) - with RTL support
- Polish (PL)
- French (FR)
- Italian (IT)

**Translation Structure:**
```typescript
translations = {
  common: { save, cancel, delete, ... },
  invoice: { title, number, date, ... },
  validation: { errors, warnings, ... },
  status: { draft, sent, paid, ... },
  ...
}
```

**Usage:**
```typescript
const { t, language, setLanguage } = useLanguage();
<h1>{t('invoice.title')}</h1>
```

### 8. Theme System (`components/ThemeBuilder.tsx`)
**Purpose:** Customizable color schemes

**Features:**
- Light/Dark mode toggle
- Custom color palette
- CSS custom properties
- Real-time preview
- Export/import theme config

**Default Theme (Purple/Violet/Fuchsia):**
```css
--color-primary: #7c3aed;      /* Violet */
--color-secondary: #a855f7;    /* Purple */
--color-accent: #d946ef;       /* Fuchsia */
--color-gradient: linear-gradient(to right, var(--color-primary), var(--color-secondary), var(--color-accent));
```

---

## Integration Guide

### Step 1: Setup Dependencies

```bash
npm install react react-dom typescript
npm install tailwindcss @tailwindcss/forms
npm install lucide-react sonner jspdf
npm install react-hook-form@7.55.0
npm install motion
```

### Step 2: Copy Core Files

**Required Files:**
```
/types/invoice.ts
/utils/invoice-calculations.ts
/utils/invoice-validation.ts
/utils/invoice-export.ts
/utils/invoice-import.ts
/utils/invoice-pdf.ts
/contexts/LanguageContext.tsx
/utils/i18n.ts
```

**Required Components:**
```
/components/invoice/
/components/ui/
/components/LanguageSwitcher.tsx
```

### Step 3: Configure Tailwind CSS

Copy `/styles/globals.css` or integrate the CSS custom properties:

```css
@layer base {
  :root {
    --color-primary: 262.1 83.3% 57.8%;
    --color-secondary: 270 95.2% 75.3%;
    --color-accent: 292 84% 60.8%;
    /* ... other tokens */
  }
}
```

### Step 4: Integrate Invoice Components

**Minimal Integration:**
```tsx
import { InvoiceEditor } from './components/screens/InvoiceEditor';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <InvoiceEditor />
    </LanguageProvider>
  );
}
```

**Full Integration:**
```tsx
import { useState } from 'react';
import { Invoice } from './types/invoice';
import { InvoiceEditor } from './components/screens/InvoiceEditor';
import { InvoiceList } from './components/screens/InvoiceList';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [view, setView] = useState<'list' | 'editor'>('list');

  return (
    <LanguageProvider>
      {view === 'list' ? (
        <InvoiceList
          onSelectInvoice={(invoice) => {
            setSelectedInvoice(invoice);
            setView('editor');
          }}
        />
      ) : (
        <InvoiceEditor
          invoice={selectedInvoice}
          onSave={(invoice) => {
            // Save invoice to your backend
            console.log('Saved:', invoice);
            setView('list');
          }}
        />
      )}
    </LanguageProvider>
  );
}
```

### Step 5: Backend Integration (Optional)

Replace mock data with API calls:

```typescript
// utils/invoice-api.ts
export async function fetchInvoices(): Promise<Invoice[]> {
  const response = await fetch('/api/invoices');
  return response.json();
}

export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  return response.json();
}

export async function updateInvoice(invoice: Invoice): Promise<Invoice> {
  const response = await fetch(`/api/invoices/${invoice.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  return response.json();
}

export async function deleteInvoice(id: string): Promise<void> {
  await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
}
```

---

## Development Roadmap

### Phase 1: Core Functionality ✅ (Complete)
- [x] Invoice data model
- [x] Basic CRUD operations
- [x] EN 16931 validation
- [x] Tax calculations
- [x] PDF export
- [x] UBL XML export
- [x] JSON export

### Phase 2: Advanced Features ✅ (Complete)
- [x] CSV export/import
- [x] Template system
- [x] Multilingual support (6 languages)
- [x] Theme builder
- [x] Bulk operations
- [x] Status management
- [x] Activity logging
- [x] Dashboard analytics
- [x] Inline editing in preview

### Phase 3: Enhanced UX ✅ (Complete)
- [x] Search and filtering
- [x] Sorting options
- [x] Pagination
- [x] Custom date ranges
- [x] Template downloads (CSV, JSON, UBL XML)
- [x] Responsive design
- [x] Dark mode support
- [x] Accessibility (WCAG 2.1 AA)

### Phase 4: Integration & Extensions 🔄 (In Progress)
- [ ] Backend API integration
- [ ] Authentication & authorization
- [ ] User management
- [ ] Multi-tenant support
- [ ] Cloud storage integration
- [ ] Email integration (send invoices)
- [ ] Payment gateway integration
- [ ] Webhook notifications

### Phase 5: Advanced Standards 📋 (Planned)
- [ ] ZUGFeRD format support
- [ ] Peppol integration
- [ ] Digital signatures
- [ ] E-archiving compliance
- [ ] Multi-currency support
- [ ] Tax rate lookup (EU VIES)
- [ ] Recurring invoices
- [ ] Invoice versioning
- [ ] Credit notes
- [ ] Partial payments

### Phase 6: Business Features 📋 (Planned)
- [ ] Customer management (CRM)
- [ ] Product catalog
- [ ] Inventory tracking
- [ ] Quotation generation
- [ ] Purchase orders
- [ ] Expense tracking
- [ ] Reports and analytics
- [ ] API for third-party integrations

---

## Customization Guide

### 1. Adding Custom Fields

**Step 1:** Extend the Invoice type
```typescript
// types/invoice.ts
interface Invoice {
  // ... existing fields
  customField1?: string;
  customField2?: number;
}
```

**Step 2:** Update the editor
```typescript
// components/screens/InvoiceEditor.tsx
<Input
  label="Custom Field"
  value={invoice.customField1}
  onChange={(e) => setInvoice({ ...invoice, customField1: e.target.value })}
/>
```

**Step 3:** Update exports
```typescript
// utils/invoice-export.ts
// Add field to PDF, XML, JSON exports
```

### 2. Custom Validation Rules

```typescript
// utils/invoice-validation.ts
export function validateInvoice(invoice: Invoice): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Add custom validation
  if (invoice.customField1 && invoice.customField1.length > 100) {
    errors.push('Custom field exceeds maximum length');
  }

  // ... existing validation
  return { isValid: errors.length === 0, errors, warnings };
}
```

### 3. Custom Export Formats

```typescript
// utils/invoice-export.ts
export function exportInvoiceToCustomFormat(invoice: Invoice): void {
  const customData = {
    // Transform invoice data to your format
    id: invoice.id,
    number: invoice.invoiceNumber,
    // ... custom mapping
  };

  const blob = new Blob([JSON.stringify(customData)], { type: 'application/json' });
  // ... download logic
}
```

### 4. Custom Templates

```typescript
// components/invoice/TemplateEditor.tsx
interface CustomTemplate extends Template {
  watermark?: string;
  customCss?: string;
  emailTemplate?: string;
}
```

### 5. Adding New Languages

```typescript
// utils/i18n.ts
export const translations = {
  // ... existing languages
  es: {
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      // ... Spanish translations
    },
    // ... complete translation object
  },
};

export type Language = 'en' | 'de' | 'ar' | 'pl' | 'fr' | 'it' | 'es';
```

---

## API Reference

### Invoice Calculations

```typescript
import { 
  calculateLineTotal,
  calculateInvoiceTotals,
  calculateTaxTotals 
} from './utils/invoice-calculations';

// Calculate line item total
const lineTotal = calculateLineTotal(line);
// Returns: quantity * unitPrice

// Calculate all invoice totals
const totals = calculateInvoiceTotals(invoice);
// Returns: {
//   lineExtensionAmount,
//   taxExclusiveAmount,
//   taxInclusiveAmount,
//   payableAmount,
//   taxTotals
// }
```

### Invoice Validation

```typescript
import { 
  validateInvoice,
  validateParty,
  validateVATId,
  isEN16931Compliant 
} from './utils/invoice-validation';

// Validate entire invoice
const result = validateInvoice(invoice);
// Returns: { isValid, errors, warnings }

// Check EN 16931 compliance
const isCompliant = isEN16931Compliant(invoice);
// Returns: boolean
```

### Invoice Export

```typescript
import {
  exportInvoiceToPDF,
  exportInvoiceToUBLXML,
  exportInvoiceToJSON,
  exportInvoiceToCSV,
  bulkExport
} from './utils/invoice-export';

// Single invoice export
exportInvoiceToPDF(invoice, template);
exportInvoiceToUBLXML(invoice);
exportInvoiceToJSON(invoice);

// Bulk export
bulkExport(invoices, 'pdf'); // or 'ubl-xml', 'json', 'csv'
```

### Invoice Import

```typescript
import { 
  importInvoices,
  downloadImportTemplate,
  downloadJSONTemplate,
  downloadUBLXMLTemplate
} from './utils/invoice-import';

// Import from file
const result = await importInvoices(file);
// Returns: { success, invoices, errors, warnings }

// Download templates
downloadImportTemplate();      // CSV
downloadJSONTemplate();         // JSON
downloadUBLXMLTemplate();       // UBL XML
```

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/invoice-calculations.test.ts
describe('Invoice Calculations', () => {
  test('calculates line total correctly', () => {
    const line = { quantity: 10, unitPrice: 50 };
    expect(calculateLineTotal(line)).toBe(500);
  });

  test('calculates tax correctly', () => {
    const invoice = createTestInvoice();
    const totals = calculateInvoiceTotals(invoice);
    expect(totals.taxInclusiveAmount).toBe(1200);
  });
});
```

### Integration Tests
```typescript
// __tests__/invoice-export.test.ts
describe('Invoice Export', () => {
  test('exports valid UBL XML', () => {
    const invoice = createTestInvoice();
    const xml = generateUBLXML(invoice);
    expect(xml).toContain('<Invoice');
    expect(xml).toContain('urn:oasis:names:specification:ubl');
  });
});
```

### E2E Tests
```typescript
// Use Playwright or Cypress
test('creates and exports invoice', async ({ page }) => {
  await page.goto('/invoices/new');
  await page.fill('[name="invoiceNumber"]', 'INV-001');
  await page.click('button:has-text("Export")');
  await page.click('text=PDF');
  // Assert download occurred
});
```

---

## Performance Optimization

### 1. Lazy Loading
```typescript
// App.tsx
const InvoiceEditor = lazy(() => import('./components/screens/InvoiceEditor'));
const Dashboard = lazy(() => import('./components/screens/Dashboard'));
```

### 2. Memoization
```typescript
// components/invoice/TaxSummaryPanel.tsx
const taxTotals = useMemo(
  () => calculateTaxTotals(invoice.lines),
  [invoice.lines]
);
```

### 3. Virtual Scrolling
```typescript
// For large invoice lists
import { useVirtualizer } from '@tanstack/react-virtual';
```

### 4. Debounced Search
```typescript
// components/screens/InvoiceList.tsx
const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  []
);
```

---

## Security Considerations

### 1. Input Sanitization
```typescript
// Sanitize user input before saving
import DOMPurify from 'dompurify';

const sanitizedNote = DOMPurify.sanitize(invoice.note);
```

### 2. XSS Prevention
```typescript
// Use textContent instead of innerHTML
element.textContent = userInput;
```

### 3. CSRF Protection
```typescript
// Add CSRF token to API requests
headers: {
  'X-CSRF-Token': getCsrfToken(),
}
```

### 4. Data Validation
```typescript
// Always validate on backend
app.post('/api/invoices', validateRequest, async (req, res) => {
  const result = validateInvoice(req.body);
  if (!result.isValid) {
    return res.status(400).json({ errors: result.errors });
  }
  // ... save invoice
});
```

---

## Deployment

### Environment Variables
```env
REACT_APP_API_URL=https://api.example.com
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_DEFAULT_LANGUAGE=en
REACT_APP_SUPPORTED_LANGUAGES=en,de,fr,it,pl,ar
```

### Build Configuration
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && npm run deploy:prod"
  }
}
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Support & Maintenance

### Documentation
- Component API documentation in JSDoc format
- Type definitions in TypeScript
- README files in each major directory
- Inline code comments for complex logic

### Version Control
- Semantic versioning (MAJOR.MINOR.PATCH)
- Conventional commits
- Feature branches
- Pull request reviews

### Monitoring
- Error tracking (Sentry, LogRocket)
- Analytics (Google Analytics, Mixpanel)
- Performance monitoring (Lighthouse, Web Vitals)
- User feedback collection

---

## Contributing Guidelines

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Component naming conventions

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Write tests
4. Update documentation
5. Submit PR with description
6. Pass CI/CD checks
7. Code review
8. Merge to main

### Issue Templates
- Bug report
- Feature request
- Documentation improvement
- Performance issue

---

## License & Credits

### License
MIT License - Free for commercial and personal use

### Credits
- Built with React and TypeScript
- UI components from shadcn/ui
- Icons from Lucide React
- PDF generation with jsPDF
- Based on EN 16931 European e-invoicing standard
- UBL 2.1 specification from OASIS

### Acknowledgments
- European Commission for EN 16931 standard
- OASIS for UBL specification
- Open-source community

---

## FAQ

### Q: Can I use this in a commercial project?
A: Yes, the MIT license allows commercial use.

### Q: Does it support country-specific requirements?
A: The core supports EN 16931 (pan-European). Country-specific extensions can be added.

### Q: Can I integrate with my existing backend?
A: Yes, replace mock data functions with your API calls.

### Q: Is it production-ready?
A: The frontend is production-ready. Backend integration and security hardening needed for production deployment.

### Q: What browsers are supported?
A: Modern browsers (Chrome, Firefox, Safari, Edge) with ES6+ support.

### Q: Can I add custom fields?
A: Yes, extend the Invoice type and update components accordingly.

### Q: Is RTL support included?
A: Yes, Arabic language includes full RTL support.

### Q: Can I customize the PDF output?
A: Yes, through the template system and by modifying `invoice-pdf.ts`.

---

## Quick Start Checklist

- [ ] Install dependencies
- [ ] Copy required files to your project
- [ ] Configure Tailwind CSS
- [ ] Set up language context
- [ ] Integrate InvoiceEditor component
- [ ] Replace mock data with API calls
- [ ] Customize theme colors
- [ ] Add your logo to templates
- [ ] Configure validation rules
- [ ] Test export/import functionality
- [ ] Set up authentication
- [ ] Deploy to production

---

## Contact & Support

For questions, issues, or feature requests:
- Create an issue in the repository
- Check existing documentation
- Review the integration guide
- Consult the API reference

---

**Last Updated:** November 1, 2025  
**Version:** 2.0.0  
**Status:** Production Ready (Frontend)
