# Development Guidelines

This document provides comprehensive guidelines for developing and maintaining the EN 16931-Compliant Invoice Builder application.

---

## 📋 Table of Contents

1. [Code Style & Standards](#code-style--standards)
2. [Component Development](#component-development)
3. [TypeScript Guidelines](#typescript-guidelines)
4. [Styling Guidelines](#styling-guidelines)
5. [Accessibility Guidelines](#accessibility-guidelines)
6. [Internationalization](#internationalization)
7. [Testing Guidelines](#testing-guidelines)
8. [Performance Guidelines](#performance-guidelines)
9. [Security Guidelines](#security-guidelines)
10. [Git Workflow](#git-workflow)
11. [Documentation Standards](#documentation-standards)
12. [EN 16931 Compliance](#en-16931-compliance)

---

## 🎨 Code Style & Standards

### General Principles

1. **Consistency** - Follow existing patterns in the codebase
2. **Readability** - Write code that is easy to understand
3. **Simplicity** - Prefer simple solutions over complex ones
4. **DRY** - Don't Repeat Yourself
5. **SOLID** - Follow SOLID principles where applicable

### Code Formatting

**Use Prettier for automatic formatting:**
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

**ESLint Configuration:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `InvoiceEditor.tsx`)
- Utilities: `kebab-case.ts` (e.g., `invoice-calculations.ts`)
- Types: `kebab-case.ts` (e.g., `invoice.ts`)
- Contexts: `PascalCase.tsx` (e.g., `LanguageContext.tsx`)

**Variables & Functions:**
```typescript
// Variables: camelCase
const invoiceNumber = 'INV-001';
const taxRate = 20;

// Constants: UPPER_SNAKE_CASE
const MAX_LINE_ITEMS = 100;
const DEFAULT_CURRENCY = 'EUR';

// Functions: camelCase with verb prefix
function calculateTotal() { }
function validateInvoice() { }
function getInvoiceById() { }

// Boolean variables: is/has prefix
const isValid = true;
const hasErrors = false;
const canExport = true;
```

**Components:**
```typescript
// Component names: PascalCase
export function InvoiceEditor() { }
export function LineItemRow() { }

// Props interfaces: ComponentNameProps
interface InvoiceEditorProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice) => void;
}
```

**Types & Interfaces:**
```typescript
// Interfaces: PascalCase (no I prefix)
interface Invoice { }
interface Party { }

// Types: PascalCase
type InvoiceStatus = 'draft' | 'sent' | 'paid';
type ExportFormat = 'pdf' | 'ubl-xml' | 'json';

// Enums: PascalCase for enum, UPPER_CASE for values
enum InvoiceType {
  COMMERCIAL = '380',
  CREDIT_NOTE = '381',
}
```

---

## 🧩 Component Development

### Component Structure

**Standard Component Template:**
```typescript
import { useState } from 'react';
import { Button } from '../ui/button';
import { Invoice } from '../../types/invoice';

interface MyComponentProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice) => void;
}

export function MyComponent({ invoice, onSave }: MyComponentProps) {
  // 1. Hooks
  const [isEditing, setIsEditing] = useState(false);
  
  // 2. Derived state / Computed values
  const isValid = invoice ? validateInvoice(invoice).isValid : false;
  
  // 3. Event handlers
  const handleSave = () => {
    if (invoice && onSave) {
      onSave(invoice);
    }
  };
  
  // 4. Effects (if needed)
  // useEffect(...);
  
  // 5. Early returns
  if (!invoice) {
    return <div>No invoice provided</div>;
  }
  
  // 6. Render
  return (
    <div className="space-y-4">
      {/* Component content */}
      <Button onClick={handleSave}>Save</Button>
    </div>
  );
}
```

### Component Best Practices

1. **Single Responsibility** - Each component should do one thing well
2. **Composition** - Build complex UIs from simple components
3. **Props Over State** - Prefer controlled components
4. **Memoization** - Use `useMemo` and `useCallback` for expensive operations
5. **Error Boundaries** - Wrap components that might fail

**Example - Breaking Down Large Components:**
```typescript
// ❌ Bad - Everything in one component
export function InvoiceEditor() {
  return (
    <div>
      {/* 500 lines of code */}
    </div>
  );
}

// ✅ Good - Composed from smaller components
export function InvoiceEditor() {
  return (
    <div>
      <InvoiceHeader />
      <PartyInformation />
      <LineItems />
      <TaxSummary />
      <InvoiceActions />
    </div>
  );
}
```

### State Management

**Local State:**
```typescript
// Use useState for component-local state
const [isOpen, setIsOpen] = useState(false);
```

**Global State:**
```typescript
// Use Context for app-wide state
const { language, setLanguage } = useLanguage();
```

**Derived State:**
```typescript
// Compute values instead of storing them
const total = useMemo(
  () => calculateInvoiceTotals(invoice),
  [invoice]
);
```

### Event Handlers

**Naming Convention:**
```typescript
// Event handlers: handle + Action
const handleClick = () => { };
const handleChange = (e: ChangeEvent<HTMLInputElement>) => { };
const handleSubmit = (e: FormEvent) => { };

// Callback props: on + Action
interface Props {
  onClick?: () => void;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
}
```

---

## 📘 TypeScript Guidelines

### Type Safety

**Always Define Types:**
```typescript
// ✅ Good - Explicit types
interface Invoice {
  id: string;
  number: string;
  date: string;
}

// ❌ Bad - Using any
const invoice: any = { };

// ✅ Good - Typed function
function calculateTotal(invoice: Invoice): number {
  return invoice.lines.reduce((sum, line) => sum + line.total, 0);
}

// ❌ Bad - Implicit any
function calculateTotal(invoice) {
  return invoice.lines.reduce((sum, line) => sum + line.total, 0);
}
```

### Type vs Interface

**Use Interface for:**
- Object shapes
- Component props
- Public API contracts

```typescript
interface Invoice {
  id: string;
  number: string;
}

interface InvoiceEditorProps {
  invoice?: Invoice;
  onSave?: (invoice: Invoice) => void;
}
```

**Use Type for:**
- Unions
- Intersections
- Mapped types
- Utility types

```typescript
type InvoiceStatus = 'draft' | 'sent' | 'paid';
type ExportFormat = 'pdf' | 'ubl-xml' | 'json' | 'csv';
type Nullable<T> = T | null;
```

### Generic Types

```typescript
// Generic function
function getById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Generic interface
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

### Type Guards

```typescript
// Type guard function
function isInvoice(value: unknown): value is Invoice {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'invoiceNumber' in value
  );
}

// Usage
if (isInvoice(data)) {
  // data is typed as Invoice here
  console.log(data.invoiceNumber);
}
```

### Avoid Type Assertions

```typescript
// ❌ Bad - Type assertion
const invoice = data as Invoice;

// ✅ Good - Type guard with validation
if (isInvoice(data)) {
  const invoice = data; // TypeScript knows this is Invoice
}
```

---

## 🎨 Styling Guidelines

### Tailwind CSS Best Practices

**Component Classes:**
```typescript
// ✅ Good - Organized classes
<div className="
  flex items-center justify-between
  p-4 rounded-lg
  bg-white dark:bg-gray-800
  border border-gray-200 dark:border-gray-700
  hover:shadow-md
  transition-shadow
">
```

**Responsive Design:**
```typescript
// Mobile-first approach
<div className="
  flex flex-col
  md:flex-row
  lg:gap-6
">
```

**Custom Classes:**
```css
/* Only for truly reusable patterns */
@layer components {
  .invoice-card {
    @apply p-6 rounded-lg border border-gray-200 dark:border-gray-700;
  }
}
```

### Color System

**Use CSS Custom Properties:**
```css
/* In globals.css */
:root {
  --color-primary: 262.1 83.3% 57.8%;
  --color-secondary: 270 95.2% 75.3%;
}

/* In components */
.bg-primary {
  background-color: hsl(var(--color-primary));
}
```

**Tailwind Classes:**
```typescript
// Use semantic color names
<Button className="bg-purple-600 hover:bg-purple-700">
<Alert className="bg-red-50 text-red-800">
```

### Dark Mode

```typescript
// Always include dark mode variants
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

---

## ♿ Accessibility Guidelines

### WCAG 2.1 AA Compliance

**1. Keyboard Navigation**
```typescript
// ✅ All interactive elements must be keyboard accessible
<button onClick={handleClick}>Action</button>

// ❌ Don't use divs for interactive elements
<div onClick={handleClick}>Action</div>
```

**2. ARIA Labels**
```typescript
// Icon buttons need aria-label
<button aria-label="Delete invoice">
  <Trash2 className="h-4 w-4" />
</button>

// Form inputs need labels
<label htmlFor="invoice-number">Invoice Number</label>
<input id="invoice-number" type="text" />
```

**3. Semantic HTML**
```typescript
// ✅ Good - Semantic structure
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Title</h1>
    <section>Content</section>
  </article>
</main>

// ❌ Bad - Div soup
<div className="header">
  <div className="nav">
    <div className="link">Home</div>
  </div>
</div>
```

**4. Focus Management**
```typescript
// Visible focus indicators
<button className="focus:ring-2 focus:ring-purple-500 focus:outline-none">
```

**5. Color Contrast**
- Text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

**6. Screen Reader Support**
```typescript
// Live regions for dynamic updates
<div role="status" aria-live="polite">
  {message}
</div>

// Hidden content for screen readers
<span className="sr-only">Additional context</span>
```

### Accessibility Checklist

- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical
- [ ] Color is not the only indicator
- [ ] Text can be resized to 200%
- [ ] ARIA labels on icon buttons
- [ ] Proper heading hierarchy
- [ ] Error messages are announced
- [ ] Loading states are announced

---

## 🌍 Internationalization

### Translation Keys

**Naming Convention:**
```typescript
// Format: section.key
const translations = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
  },
  invoice: {
    title: 'Invoice',
    number: 'Invoice Number',
  },
  validation: {
    required: 'This field is required',
  },
};
```

### Using Translations

```typescript
// In components
const { t } = useLanguage();

<h1>{t('invoice.title')}</h1>
<Button>{t('common.save')}</Button>
```

### Adding New Translations

**1. Add to English (default):**
```typescript
// utils/i18n.ts
en: {
  newSection: {
    newKey: 'English text',
  },
}
```

**2. Add to all other languages:**
```typescript
de: {
  newSection: {
    newKey: 'German text',
  },
},
ar: {
  newSection: {
    newKey: 'Arabic text',
  },
},
// ... other languages
```

### RTL Support

```typescript
// For RTL languages (Arabic)
<div className={language === 'ar' ? 'rtl' : 'ltr'}>
```

---

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// Component tests
describe('InvoiceEditor', () => {
  it('renders invoice number', () => {
    const invoice = createTestInvoice();
    render(<InvoiceEditor invoice={invoice} />);
    expect(screen.getByText(invoice.invoiceNumber)).toBeInTheDocument();
  });

  it('calls onSave when save button clicked', () => {
    const onSave = jest.fn();
    render(<InvoiceEditor invoice={invoice} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalled();
  });
});

// Utility tests
describe('calculateInvoiceTotals', () => {
  it('calculates total correctly', () => {
    const invoice = createTestInvoice();
    const totals = calculateInvoiceTotals(invoice);
    expect(totals.payableAmount).toBe(1200);
  });
});
```

### Integration Tests

```typescript
// Multi-component tests
describe('Invoice workflow', () => {
  it('creates and saves invoice', async () => {
    render(<App />);
    
    // Navigate to create
    fireEvent.click(screen.getByText('New Invoice'));
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Invoice Number'), {
      target: { value: 'INV-001' }
    });
    
    // Save
    fireEvent.click(screen.getByText('Save'));
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText('Invoice saved')).toBeInTheDocument();
    });
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- 100% coverage for critical paths (calculations, validation)
- Test edge cases and error conditions
- Test accessibility features

---

## ⚡ Performance Guidelines

### Optimization Techniques

**1. Memoization:**
```typescript
// Expensive calculations
const totals = useMemo(
  () => calculateInvoiceTotals(invoice),
  [invoice]
);

// Callback functions
const handleSave = useCallback(
  () => saveInvoice(invoice),
  [invoice]
);
```

**2. Lazy Loading:**
```typescript
// Code splitting for routes
const Dashboard = lazy(() => import('./components/screens/Dashboard'));
const InvoiceEditor = lazy(() => import('./components/screens/InvoiceEditor'));
```

**3. Virtual Scrolling:**
```typescript
// For large lists (100+ items)
import { useVirtualizer } from '@tanstack/react-virtual';
```

**4. Debouncing:**
```typescript
// Search input
const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  []
);
```

### Performance Checklist

- [ ] Memoize expensive calculations
- [ ] Lazy load route components
- [ ] Debounce search inputs
- [ ] Virtual scrolling for long lists
- [ ] Optimize images (WebP, lazy loading)
- [ ] Minimize bundle size
- [ ] Use React DevTools Profiler
- [ ] Monitor Core Web Vitals

---

## 🔒 Security Guidelines

### Input Validation

```typescript
// Always validate and sanitize user input
function validateInvoiceNumber(number: string): boolean {
  return /^[A-Z0-9-]+$/.test(number);
}

// Sanitize HTML content
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### XSS Prevention

```typescript
// ✅ Good - React escapes by default
<div>{userInput}</div>

// ❌ Bad - dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Good - Sanitized HTML
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### API Security

```typescript
// Include CSRF token
headers: {
  'X-CSRF-Token': getCsrfToken(),
  'Content-Type': 'application/json',
}

// Validate responses
if (!response.ok) {
  throw new Error('API request failed');
}
```

### Security Checklist

- [ ] Validate all user input
- [ ] Sanitize HTML content
- [ ] Use HTTPS for all API calls
- [ ] Include CSRF protection
- [ ] Don't store sensitive data in localStorage
- [ ] Implement rate limiting
- [ ] Keep dependencies updated
- [ ] Use Content Security Policy

---

## 🔄 Git Workflow

### Branch Naming

```
feature/add-payment-terms
bugfix/fix-tax-calculation
hotfix/security-patch
refactor/optimize-calculations
docs/update-readme
```

### Commit Messages

**Format: Conventional Commits**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(invoice): add inline editing to preview mode

- Double-click any field to edit
- Auto-save on blur
- Keyboard shortcuts for navigation

Closes #123
```

```
fix(validation): correct VAT ID format validation

The regex was not accepting some valid German VAT IDs.
Updated pattern to match EU VAT format specifications.

Fixes #456
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Update documentation
4. Add/update tests
5. Ensure all tests pass
6. Create PR with description
7. Request code review
8. Address feedback
9. Merge to `main`

---

## 📚 Documentation Standards

### Code Comments

```typescript
/**
 * Calculate invoice totals including tax
 * 
 * @param invoice - Invoice object with line items
 * @returns Calculated totals object
 * 
 * @example
 * const totals = calculateInvoiceTotals(invoice);
 * console.log(totals.payableAmount); // 1200.00
 */
export function calculateInvoiceTotals(invoice: Invoice): InvoiceTotals {
  // Implementation
}
```

### Component Documentation

```typescript
/**
 * Invoice editor component for creating and editing invoices
 * 
 * Features:
 * - Real-time validation
 * - Auto-calculation of totals
 * - Template support
 * - Export to multiple formats
 * 
 * @example
 * <InvoiceEditor
 *   invoice={invoice}
 *   onSave={handleSave}
 * />
 */
export function InvoiceEditor({ invoice, onSave }: InvoiceEditorProps) {
  // Implementation
}
```

### README Updates

- Keep README.md up to date with new features
- Update version numbers
- Add migration guides for breaking changes
- Include code examples

---

## 📊 EN 16931 Compliance

### Required Fields

**Document Level:**
- Invoice number (BT-1)
- Issue date (BT-2)
- Type code (BT-3)
- Currency (BT-5)

**Parties:**
- Seller name and address
- Buyer name and address
- VAT IDs (when applicable)

**Line Items:**
- Description
- Quantity and unit code
- Unit price
- Tax category and percent

### Validation Rules

```typescript
// Always validate against EN 16931
const validation = validateInvoice(invoice);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### UBL Mapping

```typescript
// Document each UBL element in comments
// UBL: Invoice/ID (BT-1)
invoiceNumber: string;

// UBL: Invoice/IssueDate (BT-2)
issueDate: string;

// UBL: Invoice/DocumentCurrencyCode (BT-5)
currency: string;
```

---

## 🎯 Code Review Checklist

### For Reviewers

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Error handling is adequate
- [ ] Accessibility requirements met
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Translations added for new text

### For Authors

- [ ] Self-review completed
- [ ] All tests pass locally
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] PR description is clear
- [ ] Commits are well-organized
- [ ] No merge conflicts
- [ ] Screenshots included (if UI changes)

---

## 📝 Best Practices Summary

### DO ✅

- Write semantic HTML
- Use TypeScript strictly
- Include accessibility features
- Write tests for new code
- Document complex logic
- Use meaningful variable names
- Keep components small and focused
- Validate user input
- Handle errors gracefully
- Follow EN 16931 standards

### DON'T ❌

- Use `any` type
- Skip accessibility features
- Ignore TypeScript errors
- Leave console.log in production
- Hardcode text (use translations)
- Create deeply nested components
- Ignore error states
- Trust user input
- Bypass validation
- Break existing functionality

---

## 🔄 Continuous Improvement

### Regular Tasks

- **Weekly:** Review and update dependencies
- **Monthly:** Run accessibility audits
- **Quarterly:** Performance optimization review
- **Ongoing:** Refactor and improve code quality

### Learning Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [EN 16931 Standard](https://ec.europa.eu/digital-building-blocks/wikis/display/DIGITAL/Compliance+with+eInvoicing+standard)

---

**Last Updated:** November 1, 2025  
**Version:** 2.0.0

These guidelines are living documents. Suggest improvements via pull requests!
