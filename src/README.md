# EN 16931-Compliant Invoice Builder

A comprehensive, production-ready invoice builder application that creates standardized European e-invoices with full UBL XML export capabilities. Built with React + TypeScript, featuring multilingual support, template management, bulk operations, and WCAG 2.1 AA accessibility compliance.

![Version](https://img.shields.io/badge/version-2.0.0-purple)
![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)

---

## 🌟 Key Features

### ✅ Complete Invoice Management
- **Dashboard** with real-time statistics and analytics
- **Invoice Editor** with inline editing and auto-calculations
- **Invoice List** with advanced search, filtering, and sorting
- **Template System** with customizable headers, footers, and logos
- **Activity Log** with complete audit trail
- **Settings** with theme builder and company profile management

### 🌍 Multilingual Support
- **6 Languages**: English, German, Arabic (RTL), Polish, French, Italian
- **Language Switcher** in navigation bar
- **Complete Translations** for all UI elements and messages
- **RTL Support** for Arabic with proper layout adjustments

### 📤 Export & Import
**Export Formats:**
- PDF - Human-readable documents
- UBL XML - EN 16931 compliant
- JSON - Structured data
- CSV - Spreadsheet format
- Bulk export for multiple invoices

**Import Formats:**
- JSON (single or array)
- CSV (with headers)
- UBL XML (EN 16931 compliant)
- Template downloads for all formats

### 🎨 Design & Theming
- **Vibrant Purple/Violet/Fuchsia** gradient color scheme
- **Dark Mode** support with theme toggle
- **Theme Builder** with custom color palette
- **Template Editor** with logo upload and customization
- **Responsive Design** (desktop/tablet/mobile)

### ✏️ Inline Editing
- **Double-click to edit** any field in preview mode
- **Real-time updates** with instant save
- **Keyboard shortcuts** for power users
- **Undo/Redo** support

### 📊 EN 16931 Compliance
- **Real-time Validation** against EN 16931 standard
- **UBL 2.1 XML Export** with proper namespaces
- **Tax Calculations** with multiple tax categories
- **Party Management** with VAT ID validation
- **Payment Terms** and bank details support

### ♿ Accessibility (WCAG 2.1 AA)
- **Keyboard Navigation** with focus indicators
- **Screen Reader** support with ARIA labels
- **Semantic HTML** structure
- **High Contrast** mode support
- **Touch-Friendly** targets (44x44px minimum)

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/invoice-builder.git

# Install dependencies
npm install

# Start development server
npm run dev
```

### Basic Usage

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

### Demo Credentials

The application includes a demo login screen with auto-fill credentials:
- **Username:** demo
- **Password:** demo123

Click "Use Demo Credentials" to automatically fill and submit.

---

## 📂 Project Structure

```
/
├── App.tsx                          # Main application with navigation
├── components/
│   ├── invoice/                     # Invoice-specific components
│   │   ├── ExportModal.tsx         # Export format selection
│   │   ├── LineItemRow.tsx         # Editable line item
│   │   ├── PartyCard.tsx           # Seller/Buyer information
│   │   ├── PreviewModal.tsx        # Invoice preview with inline editing
│   │   ├── TaxSummaryPanel.tsx     # Tax calculations display
│   │   ├── TemplateEditor.tsx      # Template customization
│   │   ├── ValidationChip.tsx      # EN 16931 validation status
│   │   └── ValidationPanel.tsx     # Detailed validation errors
│   ├── screens/                     # Full-page views
│   │   ├── ActivityLog.tsx         # User activity tracking
│   │   ├── Dashboard.tsx           # Analytics and overview
│   │   ├── InvoiceEditor.tsx       # Invoice creation/editing
│   │   ├── InvoiceList.tsx         # Invoice management
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

## 💻 Technology Stack

### Core
- **React 18+** - UI library
- **TypeScript 5+** - Type safety
- **Tailwind CSS v4.0** - Styling framework
- **Vite** - Build tool and dev server

### UI Components
- **shadcn/ui** - Pre-built accessible components
- **Lucide React** - Icon system
- **Recharts** - Data visualization
- **Sonner** - Toast notifications

### Libraries
- **React Hook Form 7.55.0** - Form validation
- **jsPDF** - PDF generation
- **Motion/React** - Animations
- **date-fns** - Date manipulation

### Standards
- **EN 16931** - European e-invoicing standard
- **UBL 2.1** - Universal Business Language
- **WCAG 2.1 AA** - Web accessibility

---

## 📋 Core Features Documentation

### 1. Dashboard

**Overview:**
- Total invoice count and value
- Status breakdown (draft, sent, paid, cancelled)
- Recent invoices with quick actions
- Activity timeline
- Charts and analytics (via Recharts)

**Quick Actions:**
- Create new invoice
- View all invoices
- Import bulk invoices
- Access settings

### 2. Invoice Editor

**Features:**
- **Party Management**: Seller and buyer information with address
- **Line Items**: Dynamic addition/removal with drag-to-reorder
- **Tax Calculations**: Real-time updates with multiple tax categories
- **Validation**: Live EN 16931 compliance checking
- **Templates**: Apply pre-configured templates
- **Preview**: Inline editing in preview modal
- **Status**: Draft, validated, sent, paid, cancelled

**Data Mapping (EN 16931):**
- Invoice/ID (BT-1) - Invoice number
- Invoice/IssueDate (BT-2) - Issue date
- Invoice/DueDate (BT-9) - Due date
- Invoice/InvoiceTypeCode (BT-3) - Type code
- Invoice/DocumentCurrencyCode (BT-5) - Currency
- AccountingSupplierParty - Seller information
- AccountingCustomerParty - Buyer information
- InvoiceLine - Line items with tax
- LegalMonetaryTotal - Calculated totals

**Keyboard Shortcuts:**
- `Ctrl/Cmd + S` - Save invoice
- `Ctrl + Alt + N` - Add line item
- `P` - Preview invoice
- `E` - Export invoice

### 3. Invoice List

**Features:**
- **Search**: Invoice number, buyer/seller name
- **Filters**:
  - Status: All, draft, validated, sent, paid, cancelled
  - Date: Last 7/30/90 days, this/last month, this year, custom range
- **Sorting**: Date, amount, invoice number (ascending/descending)
- **Bulk Operations**:
  - Select multiple invoices
  - Bulk export (PDF, UBL XML, JSON, CSV)
  - Bulk status change
  - Bulk delete
- **Pagination**: 10, 25, 50, 100 items per page
- **Import**: Upload JSON, CSV, or UBL XML files

**Custom Date Range:**
- Select start and end dates
- Calendar picker with date validation
- Clear custom range option

### 4. Template System

**Template Editor:**
- **Logo Upload**: Base64 encoded images
- **Header Text**: Customizable header content
- **Footer Text**: Customizable footer content
- **Color Scheme**: Primary, secondary, accent colors
- **Font Selection**: Heading and body fonts
- **Preview**: Real-time template preview

**Template Library:**
- Save custom templates
- Load existing templates
- Delete templates
- Set default template
- Export/import templates

**Built-in Templates:**
- Standard Service Invoice
- Product Sales Invoice
- Export Invoice (zero-rated VAT)
- Custom templates

### 5. Export System

**Export Formats:**

**PDF:**
- Human-readable invoice
- Template styling applied
- Logo and branding
- Tax breakdown
- Payment information
- Generated with jsPDF

**UBL XML:**
- EN 16931 compliant
- Proper namespaces
- All required elements
- Valid XML structure
- UTF-8 encoding

**JSON:**
- Complete invoice data
- Structured format
- Easy to parse
- Preserves all fields

**CSV:**
- Line items in tabular format
- Headers included
- Spreadsheet compatible
- Bulk export support

**Bulk Export:**
- Select multiple invoices
- Choose export format
- Download as separate files
- Progress indicator

### 6. Import System

**Supported Formats:**

**JSON:**
- Single invoice object
- Array of invoices
- Auto-validation
- Error reporting

**CSV:**
- Line items with metadata
- Headers required
- Multi-invoice support
- Warning for missing columns

**UBL XML:**
- EN 16931 compliant XML
- Single or multiple invoices
- Full party and line item parsing
- Tax calculation verification

**Import Process:**
1. Select file (JSON, CSV, or XML)
2. File validation and parsing
3. Data normalization
4. Error/warning reporting
5. Import to invoice list

**Template Downloads:**
- CSV Template - Example with all columns
- JSON Template - Complete invoice object
- UBL XML Template - EN 16931 compliant XML

### 7. Validation System

**EN 16931 Compliance:**
- Required fields validation
- VAT ID format checking
- Currency code validation (ISO 4217)
- Country code validation (ISO 3166-1)
- Tax category validation
- Calculation accuracy checks

**Validation Levels:**
- ✅ **Valid** - Fully compliant
- ⚠️ **Warning** - Missing optional fields
- ❌ **Error** - Missing required fields

**Real-time Validation:**
- Live validation as you type
- Validation chip in header
- Detailed validation panel
- Suggested fixes for each issue
- UBL path references

### 8. Tax Calculations

**Supported Tax Categories:**
- **S** - Standard rate (e.g., 20% VAT)
- **Z** - Zero-rated
- **E** - Exempt
- **AE** - Reverse charge
- **K** - Intra-community
- **G** - Free export

**Calculations:**
- Line total = quantity × unit price
- Tax amount = line total × tax percent
- Line extension amount (sum of line totals)
- Tax exclusive amount (before tax)
- Tax inclusive amount (with tax)
- Payable amount (final total)

**Tax Breakdown:**
- Grouped by tax category and rate
- Taxable amount per category
- Tax amount per category
- Total tax summary

### 9. Multilingual Support

**Languages:**
- 🇬🇧 English (EN) - Default
- 🇩🇪 German (DE) - Deutsch
- 🇸🇦 Arabic (AR) - العربية (RTL)
- 🇵🇱 Polish (PL) - Polski
- 🇫🇷 French (FR) - Français
- 🇮🇹 Italian (IT) - Italiano

**Translation Coverage:**
- UI elements and labels
- Validation messages
- Status labels
- Error messages
- Help text
- Button labels
- Navigation items

**RTL Support (Arabic):**
- Right-to-left layout
- Mirrored navigation
- Proper text alignment
- Icon positioning
- Date and number formatting

### 10. Activity Log

**Tracked Events:**
- Invoice created
- Invoice updated
- Invoice validated
- Invoice exported (with format)
- Invoice sent
- Invoice status changed
- Invoice deleted
- Template applied
- Bulk operations

**Log Details:**
- Timestamp (ISO 8601)
- User attribution
- Action type
- Invoice reference
- Additional metadata
- Success/failure status

**Filtering:**
- By action type
- By date range
- By invoice
- By user

### 11. Settings

**Company Profile:**
- Company name
- VAT ID
- Legal organization ID
- Address (street, city, postal code, country)
- Contact email
- Contact phone
- Website
- Bank details (IBAN, BIC)

**Invoice Defaults:**
- Default currency
- Default tax rates
- Invoice numbering format
- Payment terms
- Due date offset

**Theme & Appearance:**
- Light/Dark mode
- Custom color palette
- Font preferences
- Language selection
- Date format

**Advanced:**
- UBL version
- EN 16931 validation strictness
- Export preferences
- Template defaults

---

## 🎨 Design System

### Color Palette

**Default Theme (Purple/Violet/Fuchsia):**
```css
--color-primary: #7c3aed;      /* Violet 600 */
--color-secondary: #a855f7;    /* Purple 500 */
--color-accent: #d946ef;       /* Fuchsia 500 */
--gradient: linear-gradient(to right, #7c3aed, #a855f7, #d946ef);
```

**Status Colors:**
```css
--color-draft: #6b7280;        /* Gray 500 */
--color-validated: #3b82f6;    /* Blue 500 */
--color-sent: #f59e0b;         /* Amber 500 */
--color-paid: #10b981;         /* Green 500 */
--color-cancelled: #ef4444;    /* Red 500 */
```

### Typography

**Font Stack:**
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Font Sizes:**
- Small: 0.875rem (14px)
- Base: 1rem (16px)
- Large: 1.125rem (18px)
- XL: 1.25rem (20px)
- 2XL: 1.5rem (24px)
- 3XL: 1.875rem (30px)

### Spacing Scale

```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
```

### Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large desktop */
```

---

## 🔌 Integration Guide

### Backend Integration

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
```

### Authentication Integration

Replace demo login with real authentication:

```typescript
// components/screens/Login.tsx
const handleLogin = async (username: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem('authToken', token);
    // Redirect to dashboard
  }
};
```

### Custom Validation Rules

Extend validation system:

```typescript
// utils/invoice-validation.ts
export function validateInvoice(invoice: Invoice): ValidationResult {
  // Add custom rules
  if (invoice.customField && !isValidCustomField(invoice.customField)) {
    errors.push({
      field: 'customField',
      message: 'Custom field validation failed',
      severity: 'error',
    });
  }
  
  // ... existing validation
}
```

---

## 📱 Responsive Design

### Desktop (1280px+)
- Three-column layout
- Side-by-side party cards
- Full validation panel
- All features visible

### Tablet (768px - 1279px)
- Two-column layout
- Stacked party cards
- Collapsible panels
- Horizontal scroll for tables

### Mobile (< 768px)
- Single column layout
- Full-width components
- Bottom sheet modals
- Touch-optimized controls
- Simplified navigation

---

## ♿ Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Arrow keys for list navigation
- Enter to activate buttons
- Escape to close modals
- Focus visible on all elements

### ARIA Support
- `role` attributes for semantic meaning
- `aria-label` on icon buttons
- `aria-labelledby` for complex components
- `aria-live` for dynamic updates
- `aria-invalid` for form errors

### Screen Reader Support
- Descriptive labels for all inputs
- Error announcements
- Status updates
- Navigation landmarks
- Heading hierarchy

### Visual Accessibility
- High contrast mode (WCAG AA)
- Color is not the only indicator
- Minimum 44x44px touch targets
- Resizable text up to 200%
- Focus indicators on all elements

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Accessibility Tests
```bash
npm run test:a11y
```

---

## 📦 Build & Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Docker Deployment
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

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit a pull request

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Conventional commits

---

## 📄 License

MIT License - Free for commercial and personal use.

See [LICENSE](LICENSE) file for details.

---

## 🙏 Credits & Attributions

### Standards & Specifications
- **EN 16931** - European Committee for Standardization
- **UBL 2.1** - OASIS Universal Business Language
- **WCAG 2.1** - W3C Web Accessibility Initiative

### Libraries & Tools
- **React** - Meta (Facebook)
- **TypeScript** - Microsoft
- **Tailwind CSS** - Tailwind Labs
- **shadcn/ui** - shadcn (MIT License)
- **Lucide Icons** - Lucide Contributors
- **jsPDF** - Parallax
- **Recharts** - Recharts Contributors

### Design Resources
- **Unsplash** - Stock photography
- **Google Fonts** - Typography

See [Attributions.md](Attributions.md) for complete list.

---

## 📞 Support

### Documentation
- [Project Prompt](PROJECT_PROMPT.md) - Complete development guide
- [API Reference](PROJECT_PROMPT.md#api-reference) - Function documentation
- [Integration Guide](PROJECT_PROMPT.md#integration-guide) - Step-by-step setup

### Issues & Questions
- Create an issue on GitHub
- Check existing documentation
- Review the integration guide

---

## 🗺️ Roadmap

### Completed ✅
- Core invoice CRUD operations
- EN 16931 validation
- Multi-format export/import
- Template system
- Multilingual support (6 languages)
- Theme builder
- Activity logging
- Dashboard analytics
- Bulk operations
- Inline editing

### In Progress 🔄
- Backend API integration
- User authentication
- Cloud storage

### Planned 📋
- ZUGFeRD format support
- Peppol integration
- Digital signatures
- Multi-currency support
- Recurring invoices
- Customer management (CRM)
- Product catalog
- Payment gateway integration

---

**Built with ❤️ for the European e-invoicing community**

**Version:** 2.0.0 | **Last Updated:** November 1, 2025
