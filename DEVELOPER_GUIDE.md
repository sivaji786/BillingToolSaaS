# Invoice PDF Generation - Quick Reference Guide

## For Developers

### Basic Usage

```typescript
import { printInvoiceHTML } from '../../utils/invoice-pdf-html';

// In your component
const handleDownloadPDF = () => {
  printInvoiceHTML(invoice, template, profile);
};
```

### Function Reference

#### `generateInvoiceHTML(invoice, template?, profile?)`
Generates HTML string for the invoice.

**Parameters**:
- `invoice: Invoice` - The invoice object (required)
- `template?: InvoiceTemplate` - Optional template with logo, header, footer
- `profile?: CompanyProfile` - Optional company profile for fallback values

**Returns**: `string` - Complete HTML document

**Example**:
```typescript
const html = generateInvoiceHTML(invoice, template, profile);
console.log(html); // <!DOCTYPE html><html>...
```

#### `downloadInvoiceHTML(invoice, template?, profile?)`
Downloads the invoice as an HTML file.

**Parameters**: Same as `generateInvoiceHTML`

**Returns**: `void`

**Example**:
```typescript
// Downloads as "INV-2024-001.html"
downloadInvoiceHTML(invoice, template, profile);
```

#### `printInvoiceHTML(invoice, template?, profile?)`
Opens invoice in new window and triggers print dialog.

**Parameters**: Same as `generateInvoiceHTML`

**Returns**: `void`

**Example**:
```typescript
// Opens print dialog for PDF conversion
printInvoiceHTML(invoice, template, profile);
```

### Invoice Object Structure

```typescript
interface Invoice {
  invoiceNumber: string;           // "INV-2024-001"
  issueDate: string;                // "2024-01-05"
  dueDate?: string;                 // "2024-02-05"
  currency: string;                 // "EUR", "USD", etc.
  
  seller: Party;                    // Company information
  buyer: Party;                     // Client information
  
  lines: InvoiceLine[];             // Line items
  
  lineExtensionAmount: number;      // Subtotal
  taxTotals: TaxTotal[];            // Tax breakdown
  payableAmount: number;            // Total amount
  
  paymentMeans?: PaymentMeans;      // IBAN, BIC, etc.
  paymentTerms?: PaymentTerms;      // Payment terms text
  note?: string;                    // Additional notes
}
```

### Styling Rules

All generated HTML follows these rules:

```typescript
// ✅ CORRECT - Professional styling
<p style="color: #000000; font-family: Arial, Helvetica, sans-serif;">

// ❌ WRONG - Colored styling
<p style="color: #8b5cf6; font-family: 'Custom Font';">

// ✅ CORRECT - Simple borders
<table style="border: 1px solid #222222;">

// ❌ WRONG - Colored borders
<table style="border: 2px solid #8b5cf6;">

// ✅ CORRECT - Right-aligned numbers
<td style="text-align: right;">€1,234.56</td>

// ❌ WRONG - Left-aligned numbers
<td style="text-align: left;">€1,234.56</td>
```

### Customization

#### Adding Logo
```typescript
const template = {
  logoUrl: 'https://example.com/logo.png',
  // ... other template fields
};

printInvoiceHTML(invoice, template, profile);
```

#### Adding Header Text
```typescript
const template = {
  headerText: 'Company Name | Tax ID: XXX | www.company.com',
  // ... other template fields
};
```

#### Adding Footer Text
```typescript
const template = {
  footerText: 'Company Ltd. | Address | Contact Info',
  // ... other template fields
};
```

#### Adding Payment Information
```typescript
const profile = {
  bankAccount: {
    iban: 'DE89 3704 0044 0532 0130 00',
    bic: 'COBADEFFXXX',
    accountName: 'Company Name',
  },
  // ... other profile fields
};

printInvoiceHTML(invoice, template, profile);
```

### Helper Functions

#### Format Currency
```typescript
import { formatCurrency } from './invoice-calculations';

const formatted = formatCurrency(1234.56, 'EUR');
// Returns: "€1,234.56"
```

#### Format Date
```typescript
import { formatDate } from './invoice-calculations';

const formatted = formatDate('2024-01-05');
// Returns: "01/05/2024" (locale-dependent)
```

### Testing

#### Unit Test Example
```typescript
import { generateInvoiceHTML } from './invoice-pdf-html';

describe('generateInvoiceHTML', () => {
  it('should generate valid HTML', () => {
    const html = generateInvoiceHTML(mockInvoice);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(mockInvoice.invoiceNumber);
  });
  
  it('should include logo when provided', () => {
    const template = { logoUrl: 'https://example.com/logo.png' };
    const html = generateInvoiceHTML(mockInvoice, template);
    expect(html).toContain('<img src="https://example.com/logo.png"');
  });
  
  it('should use only black/gray colors', () => {
    const html = generateInvoiceHTML(mockInvoice);
    expect(html).not.toContain('color: #8b5cf6');
    expect(html).toContain('color: #000000');
  });
});
```

#### Integration Test Example
```typescript
import { printInvoiceHTML } from './invoice-pdf-html';

describe('printInvoiceHTML', () => {
  it('should open new window', () => {
    const windowOpenSpy = jest.spyOn(window, 'open');
    printInvoiceHTML(mockInvoice);
    expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
  });
});
```

### Troubleshooting

#### Issue: Logo not displaying
**Solution**: Ensure logo URL is accessible and uses HTTPS
```typescript
// ✅ CORRECT
logoUrl: 'https://example.com/logo.png'

// ❌ WRONG (may be blocked by browser)
logoUrl: 'http://example.com/logo.png'
```

#### Issue: Numbers not right-aligned
**Solution**: Check table cell styling
```typescript
// ✅ CORRECT
<td style="text-align: right;">${amount}</td>

// ❌ WRONG
<td>${amount}</td>
```

#### Issue: Print dialog not opening
**Solution**: Check popup blocker settings
```typescript
// Add user notification
toast.info('Please allow popups for this site');
printInvoiceHTML(invoice, template, profile);
```

#### Issue: HTML tags showing in text
**Solution**: Use stripHtml helper
```typescript
const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

const cleanText = stripHtml(headerText);
```

### Best Practices

1. **Always validate invoice data before generation**
   ```typescript
   if (!invoice.invoiceNumber || !invoice.lines.length) {
     throw new Error('Invalid invoice data');
   }
   ```

2. **Use try-catch for error handling**
   ```typescript
   try {
     printInvoiceHTML(invoice, template, profile);
   } catch (error) {
     console.error('PDF generation failed:', error);
     toast.error('Failed to generate PDF');
   }
   ```

3. **Provide user feedback**
   ```typescript
   toast.success('Opening invoice for PDF download...', {
     description: 'Use your browser\'s print function to save as PDF',
   });
   ```

4. **Test with different browsers**
   - Chrome/Edge (best PDF quality)
   - Firefox
   - Safari
   - Opera

5. **Validate HTML output**
   ```typescript
   const html = generateInvoiceHTML(invoice);
   if (!html.includes('<!DOCTYPE html>')) {
     throw new Error('Invalid HTML generated');
   }
   ```

### Performance Tips

1. **Avoid generating HTML multiple times**
   ```typescript
   // ❌ BAD
   const html1 = generateInvoiceHTML(invoice);
   const html2 = generateInvoiceHTML(invoice); // Duplicate work
   
   // ✅ GOOD
   const html = generateInvoiceHTML(invoice);
   // Reuse html variable
   ```

2. **Use memoization for repeated calls**
   ```typescript
   import { useMemo } from 'react';
   
   const html = useMemo(
     () => generateInvoiceHTML(invoice, template, profile),
     [invoice, template, profile]
   );
   ```

3. **Lazy load the module**
   ```typescript
   const handleDownload = async () => {
     const { printInvoiceHTML } = await import('./invoice-pdf-html');
     printInvoiceHTML(invoice, template, profile);
   };
   ```

### Migration from Old Approach

```typescript
// OLD (jsPDF)
import { generateInvoicePDF } from './invoice-pdf';

const handleDownload = async () => {
  await generateInvoicePDF(invoice, template, profile);
};

// NEW (HTML)
import { printInvoiceHTML } from './invoice-pdf-html';

const handleDownload = () => {
  printInvoiceHTML(invoice, template, profile);
};
```

**Changes**:
- No longer async
- No loading states needed
- Instant execution
- Opens print dialog instead of auto-download

### API Reference Summary

| Function | Purpose | Async | Returns |
|----------|---------|-------|---------|
| `generateInvoiceHTML()` | Generate HTML string | No | `string` |
| `downloadInvoiceHTML()` | Download as HTML file | No | `void` |
| `printInvoiceHTML()` | Open print dialog | No | `void` |

### File Locations

```
src/
├── utils/
│   ├── invoice-pdf-html.ts          ← New module
│   ├── invoice-pdf.ts                ← Old module (still available)
│   └── invoice-calculations.ts       ← Helper functions
└── components/
    └── screens/
        └── InvoicePreview.tsx        ← Updated component
```

### Quick Start Checklist

- [ ] Import `printInvoiceHTML` from `invoice-pdf-html.ts`
- [ ] Remove old `generateInvoicePDF` import
- [ ] Update `handleDownloadPDF` function
- [ ] Remove loading states
- [ ] Add user notification toast
- [ ] Test in multiple browsers
- [ ] Verify PDF output quality
- [ ] Update documentation

### Support

For issues or questions:
1. Check this guide first
2. Review `INVOICE_PDF_REFACTOR.md` for detailed documentation
3. See `PDF_GENERATION_COMPARISON.md` for comparison with old approach
4. Check `sample-invoice.html` for example output

---

**Last Updated**: 2024-01-05
**Version**: 1.0.0
**Status**: Production Ready ✅
