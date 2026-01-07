import { Invoice, InvoiceTemplate, CompanyProfile } from '../types/invoice';
import { formatCurrency, formatDate } from './invoice-calculations';

/**
 * Generate a complete, well-structured invoice in HTML that can be directly converted to PDF.
 * 
 * Visual and styling rules:
 * - Professional black or very dark gray text (#000000 or #222222)
 * - Clean, professional sans-serif font (Arial, Helvetica, sans-serif)
 * - No colored text, borders, or backgrounds
 * - Simple 1px solid black or dark gray borders
 * - White background throughout
 * - A4 page size (210mm x 297mm)
 * 
 * Structural and compliance rules:
 * - Clear line-item table with serial numbers
 * - Currency shown consistently and clearly
 * - Clearly labeled fields
 * - Numeric columns right-aligned
 * - Only inline styles (no <style> tag or external stylesheets)
 */
export function generateInvoiceHTML(
  invoice: Invoice,
  template?: InvoiceTemplate,
  profile?: CompanyProfile | null
): string {
  // Helper values
  const logoUrl = template?.logoUrl || profile?.logoUrl;
  const headerText = template?.headerText || profile?.headerText;
  const footerText = template?.footerText || profile?.footerText;

  // Fallback payment means
  const effectivePaymentMeans = invoice.paymentMeans?.iban
    ? invoice.paymentMeans
    : (profile?.bankAccount ? {
      type: 'BankTransfer' as const,
      iban: profile.bankAccount.iban,
      bic: profile.bankAccount.bic,
      accountName: profile.bankAccount.accountName,
    } : undefined);

  // Generate line items rows
  const lineItemsRows = invoice.lines.map((line, index) => {
    const lineTotal = line.quantity * line.unitPrice;
    return `
      <tr>
        <td style="padding: 8px; text-align: center; border: 1px solid #222222;">${index + 1}</td>
        <td style="padding: 8px; text-align: left; border: 1px solid #222222;">${line.description}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #222222;">${line.quantity}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #222222;">${formatCurrency(line.unitPrice, invoice.currency)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #222222;">${line.taxPercent}%</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #222222;">${formatCurrency(lineTotal, invoice.currency)}</td>
      </tr>`;
  }).join('');

  // Generate tax breakdown rows
  const taxBreakdownRows = invoice.taxTotals.map(tax => `
    <tr>
      <td style="padding: 6px 12px; text-align: left; border-bottom: 1px solid #cccccc;">${tax.taxType} (${tax.taxPercent}%)</td>
      <td style="padding: 6px 12px; text-align: right; border-bottom: 1px solid #cccccc;">${formatCurrency(tax.taxAmount, invoice.currency)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #000000; background-color: #ffffff; margin: 0 auto; padding: 20px; max-width: 210mm; line-height: 1.4;">
  
  <!-- Company Logo (if provided) -->
  ${logoUrl ? `
  <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
    <tr>
      <td style="text-align: left;">
        <img src="${logoUrl}" alt="Company Logo" style="height: 60px; display: block;">
      </td>
    </tr>
  </table>` : ''}

  <!-- Header Text (if provided) - Preserve HTML content -->
  ${headerText ? `
  <div style="width: 100%; margin-bottom: 15px; color: #222222; font-size: 11px; text-align: left;">
    ${headerText}
  </div>` : ''}

  <!-- Invoice Title and Details -->
  <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #000000;">INVOICE</h1>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #222222;"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
      </td>
      <td style="width: 50%; vertical-align: top; text-align: right;">
        <p style="margin: 0; font-size: 11px; color: #222222;"><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</p>
        ${invoice.dueDate ? `<p style="margin: 5px 0 0 0; font-size: 11px; color: #222222;"><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>` : ''}
      </td>
    </tr>
  </table>

  <!-- Seller and Buyer Information -->
  <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding-right: 15px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; color: #000000;">FROM:</p>
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #000000;">${invoice.seller.name}</p>
        ${invoice.seller.vatId ? `<p style="margin: 2px 0; font-size: 10px; color: #222222;">VAT ID: ${invoice.seller.vatId}</p>` : ''}
        <p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.seller.address.street}</p>
        <p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.seller.address.postalCode} ${invoice.seller.address.city}</p>
        <p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.seller.address.country}</p>
        ${invoice.seller.contactEmail ? `<p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.seller.contactEmail}</p>` : ''}
        ${invoice.seller.contactPhone ? `<p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.seller.contactPhone}</p>` : ''}
      </td>
      <td style="width: 50%; vertical-align: top; padding-left: 15px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; color: #000000;">BILL TO:</p>
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #000000;">${invoice.buyer.name}</p>
        ${invoice.buyer.vatId ? `<p style="margin: 2px 0; font-size: 10px; color: #222222;">VAT ID: ${invoice.buyer.vatId}</p>` : ''}
        <p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.buyer.address.street}</p>
        <p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.buyer.address.postalCode} ${invoice.buyer.address.city}</p>
        <p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.buyer.address.country}</p>
        ${invoice.buyer.contactEmail ? `<p style="margin: 2px 0; font-size: 10px; color: #222222;">${invoice.buyer.contactEmail}</p>` : ''}
      </td>
    </tr>
  </table>

  <!-- Line Items Table -->
  <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; border: 1px solid #222222;">
    <thead>
      <tr style="background-color: #ffffff;">
        <th style="padding: 8px; text-align: center; border: 1px solid #222222; font-weight: bold; color: #000000; font-size: 11px;">#</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #222222; font-weight: bold; color: #000000; font-size: 11px;">Description</th>
        <th style="padding: 8px; text-align: right; border: 1px solid #222222; font-weight: bold; color: #000000; font-size: 11px;">Quantity</th>
        <th style="padding: 8px; text-align: right; border: 1px solid #222222; font-weight: bold; color: #000000; font-size: 11px;">Unit Price</th>
        <th style="padding: 8px; text-align: right; border: 1px solid #222222; font-weight: bold; color: #000000; font-size: 11px;">Tax %</th>
        <th style="padding: 8px; text-align: right; border: 1px solid #222222; font-weight: bold; color: #000000; font-size: 11px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsRows}
    </tbody>
  </table>

  <!-- Totals Summary -->
  <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
    <tr>
      <td style="width: 60%;"></td>
      <td style="width: 40%;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 10px; text-align: left; border-bottom: 1px solid #cccccc; font-size: 11px; color: #222222;">Subtotal</td>
            <td style="padding: 5px 10px; text-align: right; border-bottom: 1px solid #cccccc; font-size: 11px; color: #222222;">${formatCurrency(invoice.lineExtensionAmount, invoice.currency)}</td>
          </tr>
          ${taxBreakdownRows}
          <tr>
            <td style="padding: 8px 10px; text-align: left; border-top: 2px solid #000000; font-weight: bold; font-size: 13px; color: #000000;">TOTAL</td>
            <td style="padding: 8px 10px; text-align: right; border-top: 2px solid #000000; font-weight: bold; font-size: 13px; color: #000000;">${formatCurrency(invoice.payableAmount, invoice.currency)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Payment Information -->
  ${effectivePaymentMeans?.iban ? `
  <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
    <tr>
      <td style="padding: 12px; border: 1px solid #222222; background-color: #ffffff;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: bold; color: #000000;">PAYMENT INFORMATION</p>
        <p style="margin: 2px 0; font-size: 10px; color: #222222;"><strong>IBAN:</strong> ${effectivePaymentMeans.iban}</p>
        ${effectivePaymentMeans.bic ? `<p style="margin: 2px 0; font-size: 10px; color: #222222;"><strong>BIC:</strong> ${effectivePaymentMeans.bic}</p>` : ''}
        ${effectivePaymentMeans.accountName ? `<p style="margin: 2px 0; font-size: 10px; color: #222222;"><strong>Account Name:</strong> ${effectivePaymentMeans.accountName}</p>` : ''}
      </td>
    </tr>
  </table>` : ''}

  <!-- Payment Terms -->
  ${invoice.paymentTerms?.note ? `
  <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
    <tr>
      <td style="padding: 10px; border: 1px solid #222222; background-color: #ffffff;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #000000;">PAYMENT TERMS</p>
        <p style="margin: 0; font-size: 10px; color: #222222;">${invoice.paymentTerms.note}</p>
      </td>
    </tr>
  </table>` : ''}

  <!-- Notes -->
  ${invoice.note ? `
  <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
    <tr>
      <td style="padding: 10px; border: 1px solid #222222; background-color: #ffffff;">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: #000000;">NOTES</p>
        <p style="margin: 0; font-size: 10px; color: #222222;">${invoice.note}</p>
      </td>
    </tr>
  </table>` : ''}

  <!-- Footer - Preserve HTML content -->
  ${footerText ? `
  <hr style="border: none; border-top: 1px solid #222222; margin: 20px 0 10px 0;">
  <div style="width: 100%; text-align: center; font-size: 9px; color: #222222;">
    ${footerText}
  </div>` : ''}

</body>
</html>`;
}

/**
 * Download the invoice as an HTML file that can be opened in a browser
 * and printed/saved as PDF using the browser's print functionality
 */
export function downloadInvoiceHTML(
  invoice: Invoice,
  template?: InvoiceTemplate,
  profile?: CompanyProfile | null
): void {
  const html = generateInvoiceHTML(invoice, template, profile);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoiceNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open the invoice HTML in a new window for printing/PDF conversion
 */
export function printInvoiceHTML(
  invoice: Invoice,
  template?: InvoiceTemplate,
  profile?: CompanyProfile | null
): void {
  const html = generateInvoiceHTML(invoice, template, profile);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for content to load before triggering print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
