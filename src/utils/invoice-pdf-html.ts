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
  // Create effective data with hierarchical fallbacks
  const effectiveLogo = template?.logoUrl || profile?.logoUrl;
  const effectiveHeaderHtml = template?.headerText || profile?.headerText;
  const effectiveFooterHtml = template?.footerText || profile?.footerText;
  const effectiveNote = invoice.note || template?.defaultPaymentTerms?.note || '';

  const effectiveSeller = {
    ...profile,
    ...(template?.seller || {}),
    ...invoice.seller,
    address: {
        ...(profile?.address || {}),
        ...(template?.seller?.address || {}),
        ...(invoice.seller?.address || {})
    }
  };

  const effectivePaymentMeans = invoice.paymentMeans?.iban ? invoice.paymentMeans : 
                               (profile?.bankAccount ? {
                                  type: 'BankTransfer' as const,
                                  iban: profile.bankAccount.iban,
                                  bic: profile.bankAccount.bic,
                                  accountName: profile.bankAccount.accountName,
                                } : undefined);

  // Generate Items Rows
  const lineItemsRows = invoice.lines.map((line, index) => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 12px; text-align: center; color: #9ca3af; font-size: 11px;">${index + 1}</td>
      <td style="padding: 12px; font-weight: 500; color: #1f2937;">${line.description}</td>
      <td style="padding: 12px; text-align: right;">${line.quantity}</td>
      <td style="padding: 12px; text-align: right;">${formatCurrency(line.unitPrice, invoice.currency)}</td>
      <td style="padding: 12px; text-align: right; color: #6b7280;">${line.taxPercent}%</td>
      <td style="padding: 12px; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(line.quantity * line.unitPrice, invoice.currency)}</td>
    </tr>`).join('');

  // Generate Tax Summary Rows
  const taxSummaryRows = invoice.taxTotals.map(tax => `
    <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #6b7280; font-size: 11px;">
      <span>VAT ${tax.taxPercent}%</span>
      <span>${formatCurrency(tax.taxAmount, invoice.currency)}</span>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face { font-family: 'Inter'; src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); }
    body { font-family: 'Inter', system-ui, sans-serif; color: #1f2937; margin: 0; padding: 40px; line-height: 1.5; background: #fff; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .purple-badge { background: #f5f3ff; color: #7c3aed; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Top Accent Bar -->
    <div style="height: 6px; background: #7c3aed; position: fixed; top: 0; left: 0; right: 0;"></div>

    <!-- Header Area -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
      <div>
        ${effectiveLogo ? `<img src="${effectiveLogo}" style="max-height: 50px; margin-bottom: 15px;">` : ''}
        ${effectiveHeaderHtml ? `<div style="font-size: 10px; color: #9ca3af; margin-top: 10px;">${effectiveHeaderHtml}</div>` : ''}
      </div>
      <div style="text-align: right;">
        <h1 style="font-size: 32px; font-weight: 800; color: #7c3aed; margin: 0;">INVOICE</h1>
        <p style="font-size: 14px; color: #6b7280; margin-top: 5px;"># ${invoice.invoiceNumber}</p>
      </div>
    </div>

    <!-- Dates Information -->
    <div style="display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
      <div style="text-align: right;">
        <p style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px;">Issue Date</p>
        <p style="font-size: 13px; font-weight: 500;">${formatDate(invoice.issueDate)}</p>
      </div>
      ${invoice.dueDate ? `<div style="text-align: right;">
        <p style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 5px;">Due Date</p>
        <p style="font-size: 13px; font-weight: 500;">${formatDate(invoice.dueDate)}</p>
      </div>` : ''}
    </div>

    <!-- Parties Area -->
    <div style="display: flex; gap: 60px; margin-bottom: 40px;">
      <div style="flex: 1;">
        <p style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 10px;">Bill To</p>
        <p style="font-size: 14px; font-weight: 700; margin-bottom: 5px;">${invoice.buyer.name}</p>
        <div style="font-size: 12px; color: #6b7280; line-height: 1.6;">
          ${invoice.buyer.vatId ? `<div>VAT ID: ${invoice.buyer.vatId}</div>` : ''}
          <div>${invoice.buyer.address.street}</div>
          <div>${invoice.buyer.address.postalCode} ${invoice.buyer.address.city}</div>
          <div>${invoice.buyer.address.country}</div>
        </div>
      </div>
      <div style="flex: 1;">
        <p style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 10px;">From</p>
        <p style="font-size: 14px; font-weight: 700; margin-bottom: 5px;">${effectiveSeller.name}</p>
        <div style="font-size: 12px; color: #6b7280; line-height: 1.6;">
          ${effectiveSeller.vatId ? `<div>VAT ID: ${effectiveSeller.vatId}</div>` : ''}
          <div>${effectiveSeller.address.street}</div>
          <div>${effectiveSeller.address.postalCode} ${effectiveSeller.address.city}</div>
          <div>${effectiveSeller.address.country}</div>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div style="border-radius: 12px; border: 1px solid #f3f4f6; overflow: hidden; margin-bottom: 30px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f5f3ff;">
            <th style="padding: 12px; text-align: center; color: #7c3aed; font-weight: 700; width: 40px;">#</th>
            <th style="padding: 12px; text-align: left; color: #7c3aed; font-weight: 700;">Description</th>
            <th style="padding: 12px; text-align: right; color: #7c3aed; font-weight: 700;">Qty</th>
            <th style="padding: 12px; text-align: right; color: #7c3aed; font-weight: 700;">Price</th>
            <th style="padding: 12px; text-align: right; color: #7c3aed; font-weight: 700;">Tax</th>
            <th style="padding: 12px; text-align: right; color: #7c3aed; font-weight: 700;">Amount</th>
          </tr>
        </thead>
        <tbody>${lineItemsRows}</tbody>
      </table>
    </div>

    <!-- Financial Summary Area -->
    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 250px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280; font-size: 13px;">
          <span>Subtotal</span>
          <span>${formatCurrency(invoice.lineExtensionAmount, invoice.currency)}</span>
        </div>
        ${taxSummaryRows}
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #7c3aed; margin-top: 10px; color: #7c3aed; font-weight: 800; font-size: 18px;">
          <span>Total</span>
          <span>${formatCurrency(invoice.payableAmount, invoice.currency)}</span>
        </div>
      </div>
    </div>

    <!-- Notes Section -->
    ${effectiveNote ? `
    <div style="margin-top: 50px;">
      <p style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 10px;">Notes</p>
      <div style="font-size: 12px; color: #6b7280; background: #f9fafb; padding: 15px; border-radius: 8px; font-style: italic;">
        ${effectiveNote}
      </div>
    </div>` : ''}

    <!-- Payment Info & Signature -->
    <div style="display: flex; justify-content: space-between; margin-top: 60px; padding-top: 30px;">
      <div>
        ${effectivePaymentMeans?.iban ? `
        <p style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 10px;">Payment Details</p>
        <div style="font-size: 11px; color: #6b7280;">
          <div><strong>IBAN:</strong> ${effectivePaymentMeans.iban}</div>
          ${effectivePaymentMeans.bic ? `<div><strong>BIC:</strong> ${effectivePaymentMeans.bic}</div>` : ''}
          ${effectivePaymentMeans.accountName ? `<div><strong>Owner:</strong> ${effectivePaymentMeans.accountName}</div>` : ''}
        </div>` : ''}
      </div>
      <div style="text-align: center; width: 180px;">
        <div style="border-bottom: 1px solid #7c3aed; height: 40px; margin-bottom: 10px;"></div>
        <p style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Signature</p>
      </div>
    </div>

    <!-- Global Footer -->
    <div style="position: fixed; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 9px; color: #9ca3af; padding-top: 20px; border-top: 1px solid #f3f4f6;">
      ${effectiveFooterHtml || ''}
    </div>
  </div>
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
