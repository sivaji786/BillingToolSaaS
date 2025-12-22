import { Invoice, ExportOptions } from '../types/invoice';
import { generateInvoicePDF } from './invoice-pdf';

/**
 * Export utility for invoices - supports multiple formats:
 * - PDF (generated with jsPDF)
 * - UBL XML (EN 16931 compliant)
 * - Peppol BIS (structured XML package)
 * - JSON (structured data)
 * - CSV (line items spreadsheet)
 */

export async function exportInvoice(invoice: Invoice, options: ExportOptions): Promise<void> {
  const { format } = options;

  switch (format) {
    case 'pdf':
      return exportAsPDF(invoice);
    case 'ubl-xml':
      return exportAsUBLXML(invoice, options);
    case 'peppol-bis':
      return exportAsPeppolBIS(invoice);
    case 'json':
      return exportAsJSON(invoice);
    case 'csv':
      return exportAsCSV(invoice);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export invoice as PDF
 * Uses jsPDF to generate a professional PDF document
 */
async function exportAsPDF(invoice: Invoice): Promise<void> {
  await generateInvoicePDF(invoice);
}

/**
 * Generate HTML for PDF export
 */
function generatePDFHTML(invoice: Invoice): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency,
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
    h1 { font-size: 28pt; font-weight: 700; color: #8b5cf6; margin-bottom: 8px; }
    h2 { font-size: 14pt; font-weight: 600; margin: 24px 0 12px; color: #4a4a4a; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid #8b5cf6; padding-bottom: 20px; }
    .invoice-info { text-align: right; }
    .invoice-info div { margin-bottom: 4px; }
    .invoice-number { font-size: 18pt; font-weight: 700; color: #8b5cf6; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
    .party { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e5e5e5; }
    .party-name { font-weight: 700; font-size: 13pt; margin-bottom: 8px; color: #2a2a2a; }
    .party-detail { margin: 4px 0; color: #4a4a4a; }
    .party-label { font-weight: 600; color: #6a6a6a; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    thead { background: #8b5cf6; color: white; }
    th { padding: 12px; text-align: left; font-weight: 600; font-size: 10pt; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; }
    tr:hover { background: #f9f9f9; }
    .text-right { text-align: right; }
    .totals { margin-top: 30px; }
    .totals-grid { display: grid; grid-template-columns: 1fr; gap: 8px; max-width: 400px; margin-left: auto; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 16px; background: #f9f9f9; border-radius: 4px; }
    .total-row.final { background: #8b5cf6; color: white; font-weight: 700; font-size: 13pt; margin-top: 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 9pt; font-weight: 600; }
    .badge-draft { background: #f3f4f6; color: #6b7280; }
    .badge-validated { background: #dbeafe; color: #1e40af; }
    .badge-sent { background: #fef3c7; color: #92400e; }
    .badge-paid { background: #d1fae5; color: #065f46; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 9pt; color: #6a6a6a; text-align: center; }
    .print-button { 
      position: fixed; 
      top: 20px; 
      right: 20px; 
      padding: 12px 24px; 
      background: #8b5cf6; 
      color: white; 
      border: none; 
      border-radius: 6px; 
      cursor: pointer;
      font-weight: 600;
      font-size: 11pt;
    }
    .print-button:hover { background: #7c3aed; }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <div style="color: #6a6a6a;">EN 16931 Compliant E-Invoice</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <div>Issue Date: ${formatDate(invoice.issueDate)}</div>
      ${invoice.dueDate ? `<div>Due Date: ${formatDate(invoice.dueDate)}</div>` : ''}
      <div><span class="badge badge-${invoice.status || 'draft'}">${(invoice.status || 'draft').toUpperCase()}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h2>From (Seller)</h2>
      <div class="party-name">${invoice.seller.name}</div>
      ${invoice.seller.vatId ? `<div class="party-detail"><span class="party-label">VAT ID:</span> ${invoice.seller.vatId}</div>` : ''}
      ${invoice.seller.legalOrganizationId ? `<div class="party-detail"><span class="party-label">Org ID:</span> ${invoice.seller.legalOrganizationId}</div>` : ''}
      <div class="party-detail">${invoice.seller.address.street}</div>
      <div class="party-detail">${invoice.seller.address.postalCode} ${invoice.seller.address.city}</div>
      <div class="party-detail">${invoice.seller.address.country}</div>
      ${invoice.seller.contactEmail ? `<div class="party-detail" style="margin-top: 8px;">${invoice.seller.contactEmail}</div>` : ''}
      ${invoice.seller.contactPhone ? `<div class="party-detail">${invoice.seller.contactPhone}</div>` : ''}
    </div>

    <div class="party">
      <h2>To (Buyer)</h2>
      <div class="party-name">${invoice.buyer.name}</div>
      ${invoice.buyer.vatId ? `<div class="party-detail"><span class="party-label">VAT ID:</span> ${invoice.buyer.vatId}</div>` : ''}
      <div class="party-detail">${invoice.buyer.address.street}</div>
      <div class="party-detail">${invoice.buyer.address.postalCode} ${invoice.buyer.address.city}</div>
      <div class="party-detail">${invoice.buyer.address.country}</div>
      ${invoice.buyer.contactEmail ? `<div class="party-detail" style="margin-top: 8px;">${invoice.buyer.contactEmail}</div>` : ''}
    </div>
  </div>

  <h2>Line Items</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th class="text-right">Quantity</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Tax %</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.lines.map((line, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${line.description}</td>
          <td class="text-right">${line.quantity} ${line.unitCode}</td>
          <td class="text-right">${formatCurrency(line.unitPrice)}</td>
          <td class="text-right">${line.taxPercent}%</td>
          <td class="text-right">${formatCurrency(line.quantity * line.unitPrice)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-grid">
      <div class="total-row">
        <span>Subtotal (excl. tax):</span>
        <span>${formatCurrency(invoice.lineExtensionAmount)}</span>
      </div>
      ${invoice.taxTotals.map(tax => `
        <div class="total-row">
          <span>Tax (${tax.taxPercent}%):</span>
          <span>${formatCurrency(tax.taxAmount)}</span>
        </div>
      `).join('')}
      <div class="total-row">
        <span>Total (incl. tax):</span>
        <span>${formatCurrency(invoice.taxInclusiveAmount)}</span>
      </div>
      <div class="total-row final">
        <span>AMOUNT DUE:</span>
        <span>${formatCurrency(invoice.payableAmount)}</span>
      </div>
    </div>
  </div>

  ${invoice.paymentTerms ? `
    <div style="margin-top: 30px; padding: 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
      <strong>Payment Terms:</strong> ${invoice.paymentTerms}
    </div>
  ` : ''}

  ${invoice.note ? `
    <div style="margin-top: 20px;">
      <h2>Notes</h2>
      <div style="padding: 16px; background: #f9f9f9; border-radius: 8px;">${invoice.note}</div>
    </div>
  ` : ''}

  <div class="footer">
    Generated by [mn]medianet Invoice Builder • EN 16931 Compliant • ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Export invoice as UBL XML (EN 16931 compliant)
 */
function exportAsUBLXML(invoice: Invoice, options: ExportOptions): Promise<void> {
  return new Promise((resolve) => {
    const xml = generateUBLXML(invoice, options);
    downloadFile(xml, `${invoice.invoiceNumber}.xml`, 'application/xml');
    resolve();
  });
}

/**
 * Generate UBL 2.1 XML format
 */
function generateUBLXML(invoice: Invoice, options: ExportOptions): string {
  const formatDate = (date?: string) => {
    if (!date) return '';
    return date;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- Header Information -->
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXML(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${formatDate(invoice.issueDate)}</cbc:IssueDate>
  ${invoice.dueDate ? `<cbc:DueDate>${formatDate(invoice.dueDate)}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>${invoice.invoiceTypeCode || '380'}</cbc:InvoiceTypeCode>
  ${invoice.note ? `<cbc:Note>${escapeXML(invoice.note)}</cbc:Note>` : ''}
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  
  <!-- Seller (AccountingSupplierParty) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      ${invoice.seller.vatId ? `
      <cac:PartyIdentification>
        <cbc:ID schemeID="VAT">${escapeXML(invoice.seller.vatId)}</cbc:ID>
      </cac:PartyIdentification>
      ` : ''}
      ${invoice.seller.legalOrganizationId ? `
      <cac:PartyLegalEntity>
        <cbc:CompanyID>${escapeXML(invoice.seller.legalOrganizationId)}</cbc:CompanyID>
        <cbc:RegistrationName>${escapeXML(invoice.seller.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ` : ''}
      <cac:PartyName>
        <cbc:Name>${escapeXML(invoice.seller.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(invoice.seller.address.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXML(invoice.seller.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXML(invoice.seller.address.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXML(invoice.seller.address.country)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${invoice.seller.contactEmail || invoice.seller.contactPhone ? `
      <cac:Contact>
        ${invoice.seller.contactEmail ? `<cbc:ElectronicMail>${escapeXML(invoice.seller.contactEmail)}</cbc:ElectronicMail>` : ''}
        ${invoice.seller.contactPhone ? `<cbc:Telephone>${escapeXML(invoice.seller.contactPhone)}</cbc:Telephone>` : ''}
      </cac:Contact>
      ` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Buyer (AccountingCustomerParty) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${invoice.buyer.vatId ? `
      <cac:PartyIdentification>
        <cbc:ID schemeID="VAT">${escapeXML(invoice.buyer.vatId)}</cbc:ID>
      </cac:PartyIdentification>
      ` : ''}
      <cac:PartyName>
        <cbc:Name>${escapeXML(invoice.buyer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(invoice.buyer.address.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXML(invoice.buyer.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXML(invoice.buyer.address.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXML(invoice.buyer.address.country)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${invoice.buyer.contactEmail ? `
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXML(invoice.buyer.contactEmail)}</cbc:ElectronicMail>
      </cac:Contact>
      ` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  ${invoice.paymentTerms ? `
  <!-- Payment Terms -->
  <cac:PaymentTerms>
    <cbc:Note>${escapeXML(invoice.paymentTerms)}</cbc:Note>
  </cac:PaymentTerms>
  ` : ''}
  
  <!-- Tax Total -->
  ${invoice.taxTotals.map(tax => `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${tax.taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${tax.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${tax.taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${tax.taxCategory}</cbc:ID>
        <cbc:Percent>${tax.taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  `).join('\n')}
  
  <!-- Monetary Totals -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Line Items -->
  ${invoice.lines.map((line, idx) => {
    const lineTotal = line.quantity * line.unitPrice;
    return `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${escapeXML(line.unitCode)}">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXML(line.description)}</cbc:Description>
      <cbc:Name>${escapeXML(line.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${line.taxCategory}</cbc:ID>
        <cbc:Percent>${line.taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
    `;
  }).join('\n')}
  
</Invoice>`;
}

/**
 * Export as Peppol BIS package
 */
function exportAsPeppolBIS(invoice: Invoice): Promise<void> {
  return new Promise((resolve) => {
    // For now, export as UBL XML with Peppol-specific customization
    const xml = generateUBLXML(invoice, { format: 'peppol-bis' });
    downloadFile(xml, `${invoice.invoiceNumber}_PEPPOL.xml`, 'application/xml');
    resolve();
  });
}

/**
 * Export invoice as JSON
 */
function exportAsJSON(invoice: Invoice): Promise<void> {
  return new Promise((resolve) => {
    const json = JSON.stringify(invoice, null, 2);
    downloadFile(json, `${invoice.invoiceNumber}.json`, 'application/json');
    resolve();
  });
}

/**
 * Export invoice line items as CSV
 */
function exportAsCSV(invoice: Invoice): Promise<void> {
  return new Promise((resolve) => {
    const headers = ['Line', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Tax %', 'Tax Category', 'Line Total'];
    const rows = invoice.lines.map((line, idx) => [
      (idx + 1).toString(),
      line.description,
      line.quantity.toString(),
      line.unitCode,
      line.unitPrice.toFixed(2),
      line.taxPercent.toString(),
      line.taxCategory,
      (line.quantity * line.unitPrice).toFixed(2),
    ]);

    const csv = [
      `Invoice: ${invoice.invoiceNumber}`,
      `Issue Date: ${invoice.issueDate}`,
      `Seller: ${invoice.seller.name}`,
      `Buyer: ${invoice.buyer.name}`,
      `Currency: ${invoice.currency}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      `Subtotal,${invoice.lineExtensionAmount.toFixed(2)}`,
      `Tax Inclusive Total,${invoice.taxInclusiveAmount.toFixed(2)}`,
      `Amount Due,${invoice.payableAmount.toFixed(2)}`,
    ].join('\n');

    downloadFile(csv, `${invoice.invoiceNumber}.csv`, 'text/csv');
    resolve();
  });
}

/**
 * Helper: Download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper: Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Bulk export multiple invoices
 */
export async function exportInvoicesBulk(
  invoices: Invoice[],
  format: ExportOptions['format']
): Promise<void> {
  // Export each invoice sequentially with a small delay
  for (let i = 0; i < invoices.length; i++) {
    await exportInvoice(invoices[i], { format });
    // Small delay between exports to avoid browser issues
    if (i < invoices.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}
