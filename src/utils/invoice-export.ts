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
      return exportAsUBLXML(invoice);
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
 * Export invoice as UBL XML (EN 16931 compliant)
 */
function exportAsUBLXML(invoice: Invoice): Promise<void> {
  return new Promise((resolve) => {
    const xml = generateUBLXML(invoice);
    downloadFile(xml, `${invoice.invoiceNumber}.xml`, 'application/xml');
    resolve();
  });
}

/**
 * Generate UBL 2.1 XML format
 */
export function generateUBLXML(invoice: Invoice): string {
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
      ${(invoice.seller.contactEmail || invoice.seller.contactPhone) ? `
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
  
  ${invoice.paymentMeans ? `
  <!-- Payment Means (Bank Details) -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${invoice.paymentMeans.type === 'BankTransfer' ? '30' : '1'}</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXML(invoice.paymentMeans.iban || '')}</cbc:ID>
      ${invoice.paymentMeans.accountName ? `<cbc:Name>${escapeXML(invoice.paymentMeans.accountName)}</cbc:Name>` : ''}
      <cac:FinancialInstitutionBranch>
        <cbc:ID>${escapeXML(invoice.paymentMeans.bic || '')}</cbc:ID>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  ` : ''}
  
  ${invoice.paymentTerms?.note ? `
  <!-- Payment Terms -->
  <cac:PaymentTerms>
    <cbc:Note>${escapeXML(invoice.paymentTerms.note)}</cbc:Note>
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
    const xml = generateUBLXML(invoice);
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
 * Export invoice as CSV.
 *
 * Uses the SAME flat-row schema as `generateImportTemplate()` in
 * `invoice-import.ts` (one row per line item, invoice/seller/buyer metadata
 * repeated on every row) so that a CSV exported here can be re-imported via
 * the bulk-import feature without any transformation. Do not diverge the
 * header list from `generateImportTemplate` without updating both.
 */
function exportAsCSV(invoice: Invoice): Promise<void> {
  return new Promise((resolve) => {
    const headers = [
      'invoiceNumber',
      'issueDate',
      'dueDate',
      'currency',
      'sellerName',
      'sellerVatId',
      'sellerStreet',
      'sellerCity',
      'sellerPostalCode',
      'sellerCountry',
      'sellerEmail',
      'buyerName',
      'buyerVatId',
      'buyerStreet',
      'buyerCity',
      'buyerPostalCode',
      'buyerCountry',
      'buyerEmail',
      'description',
      'quantity',
      'unitCode',
      'unitPrice',
      'taxPercent',
      'taxCategory',
      'note',
      'paymentTerms',
      'status',
    ];

    const rows = invoice.lines.map((line) => [
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate || '',
      invoice.currency,
      invoice.seller.name,
      invoice.seller.vatId || '',
      invoice.seller.address?.street || '',
      invoice.seller.address?.city || '',
      invoice.seller.address?.postalCode || '',
      invoice.seller.address?.country || '',
      invoice.seller.contactEmail || '',
      invoice.buyer.name,
      invoice.buyer.vatId || '',
      invoice.buyer.address?.street || '',
      invoice.buyer.address?.city || '',
      invoice.buyer.address?.postalCode || '',
      invoice.buyer.address?.country || '',
      invoice.buyer.contactEmail || '',
      line.description,
      line.quantity.toString(),
      line.unitCode,
      line.unitPrice.toFixed(2),
      line.taxPercent.toString(),
      line.taxCategory,
      invoice.note || '',
      invoice.paymentTerms?.note || '',
      invoice.status || 'draft',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
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
function escapeXML(str: any): string {
  if (str === undefined || str === null) return '';
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
