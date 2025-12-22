import { Invoice } from '../types/invoice';

/**
 * Import utility for invoices - supports multiple formats:
 * - JSON (structured invoice data)
 * - CSV (line items with invoice metadata)
 * - UBL XML (EN 16931 compliant)
 */

export type ImportFormat = 'json' | 'csv' | 'ubl-xml';

export interface ImportResult {
  success: boolean;
  invoices: Invoice[];
  errors: string[];
  warnings: string[];
}

/**
 * Main import function - detects format and parses accordingly
 */
export async function importInvoices(file: File): Promise<ImportResult> {
  try {
    const content = await readFileContent(file);
    const format = detectFormat(file, content);

    switch (format) {
      case 'json':
        return importFromJSON(content);
      case 'csv':
        return importFromCSV(content);
      case 'ubl-xml':
        return importFromUBLXML(content);
      default:
        return {
          success: false,
          invoices: [],
          errors: ['Unsupported file format. Please use JSON, CSV, or UBL XML.'],
          warnings: [],
        };
    }
  } catch (error) {
    return {
      success: false,
      invoices: [],
      errors: [`Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Read file content as text
 */
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Detect file format
 */
function detectFormat(file: File, content: string): ImportFormat | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'json' || content.trim().startsWith('{') || content.trim().startsWith('[')) {
    return 'json';
  }
  
  if (extension === 'xml' || content.trim().startsWith('<?xml') || content.includes('<Invoice')) {
    return 'ubl-xml';
  }
  
  if (extension === 'csv' || content.includes(',')) {
    return 'csv';
  }
  
  return null;
}

/**
 * Import from JSON format
 */
function importFromJSON(content: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invoices: Invoice[] = [];

  try {
    const parsed = JSON.parse(content);
    const data = Array.isArray(parsed) ? parsed : [parsed];

    data.forEach((item, index) => {
      try {
        const invoice = validateAndNormalizeInvoice(item, index);
        invoices.push(invoice);
      } catch (error) {
        errors.push(`Invoice ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    });

    if (invoices.length === 0 && errors.length > 0) {
      return { success: false, invoices: [], errors, warnings };
    }

    if (errors.length > 0) {
      warnings.push(`Successfully imported ${invoices.length} invoices, ${errors.length} failed`);
    }

    return {
      success: true,
      invoices,
      errors: [],
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      invoices: [],
      errors: ['Invalid JSON format'],
      warnings: [],
    };
  }
}

/**
 * Import from CSV format
 * Expected format: Each row is a line item, with invoice metadata repeated
 */
function importFromCSV(content: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invoicesMap = new Map<string, any>();

  try {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return {
        success: false,
        invoices: [],
        errors: ['CSV file is empty or has no data rows'],
        warnings: [],
      };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ['invoiceNumber', 'description', 'quantity', 'unitPrice'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      warnings.push(`Missing recommended columns: ${missingHeaders.join(', ')}`);
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          warnings.push(`Row ${i + 1}: Column count mismatch, skipping`);
          continue;
        }

        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx];
        });

        const invoiceNumber = row.invoiceNumber || `IMP-${Date.now()}-${i}`;
        
        if (!invoicesMap.has(invoiceNumber)) {
          invoicesMap.set(invoiceNumber, {
            invoiceNumber,
            issueDate: row.issueDate || new Date().toISOString().split('T')[0],
            dueDate: row.dueDate,
            currency: row.currency || 'EUR',
            seller: {
              name: row.sellerName || '[mn]medianet Inh Bernhard Hnida',
              vatId: row.sellerVatId || '',
              address: {
                street: row.sellerStreet || '',
                city: row.sellerCity || '',
                postalCode: row.sellerPostalCode || '',
                country: row.sellerCountry || 'DE',
              },
              contactEmail: row.sellerEmail || '',
            },
            buyer: {
              name: row.buyerName || 'Customer',
              vatId: row.buyerVatId || '',
              address: {
                street: row.buyerStreet || '',
                city: row.buyerCity || '',
                postalCode: row.buyerPostalCode || '',
                country: row.buyerCountry || '',
              },
              contactEmail: row.buyerEmail || '',
            },
            lines: [],
            note: row.note || '',
            paymentTerms: row.paymentTerms || '',
            status: row.status || 'draft',
          });
        }

        // Add line item
        const invoice = invoicesMap.get(invoiceNumber);
        invoice.lines.push({
          id: `line-${invoice.lines.length + 1}`,
          description: row.description || 'Item',
          quantity: parseFloat(row.quantity) || 1,
          unitCode: row.unitCode || 'EA',
          unitPrice: parseFloat(row.unitPrice) || 0,
          taxCategory: row.taxCategory || 'S',
          taxPercent: parseFloat(row.taxPercent) || 20,
        });
      } catch (error) {
        warnings.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    const invoices = Array.from(invoicesMap.values()).map((inv, idx) => 
      validateAndNormalizeInvoice(inv, idx)
    );

    return {
      success: invoices.length > 0,
      invoices,
      errors: invoices.length === 0 ? ['No valid invoices found in CSV'] : [],
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      invoices: [],
      errors: [`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Import from UBL XML format
 */
function importFromUBLXML(content: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invoices: Invoice[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        invoices: [],
        errors: ['Invalid XML format'],
        warnings: [],
      };
    }

    // Handle single invoice or multiple invoices
    const invoiceElements = xmlDoc.querySelectorAll('Invoice');
    
    if (invoiceElements.length === 0) {
      return {
        success: false,
        invoices: [],
        errors: ['No Invoice elements found in XML'],
        warnings: [],
      };
    }

    invoiceElements.forEach((invoiceEl, index) => {
      try {
        const invoice = parseUBLInvoice(invoiceEl);
        invoices.push(validateAndNormalizeInvoice(invoice, index));
      } catch (error) {
        errors.push(`Invoice ${index + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    });

    return {
      success: invoices.length > 0,
      invoices,
      errors: invoices.length === 0 ? errors : [],
      warnings: errors.length > 0 ? [`${errors.length} invoice(s) failed to import`] : [],
    };
  } catch (error) {
    return {
      success: false,
      invoices: [],
      errors: [`XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Parse UBL Invoice element
 */
function parseUBLInvoice(invoiceEl: Element): any {
  const getTextContent = (selector: string): string => {
    const el = invoiceEl.querySelector(selector);
    return el?.textContent?.trim() || '';
  };

  const invoice: any = {
    invoiceNumber: getTextContent('ID') || getTextContent('cbc\\:ID'),
    issueDate: getTextContent('IssueDate') || getTextContent('cbc\\:IssueDate'),
    dueDate: getTextContent('DueDate') || getTextContent('cbc\\:DueDate'),
    currency: getTextContent('DocumentCurrencyCode') || getTextContent('cbc\\:DocumentCurrencyCode') || 'EUR',
    note: getTextContent('Note') || getTextContent('cbc\\:Note'),
    invoiceTypeCode: getTextContent('InvoiceTypeCode') || getTextContent('cbc\\:InvoiceTypeCode') || '380',
    status: 'draft',
  };

  // Parse seller (AccountingSupplierParty)
  const supplierParty = invoiceEl.querySelector('AccountingSupplierParty Party, cac\\:AccountingSupplierParty cac\\:Party');
  if (supplierParty) {
    invoice.seller = {
      name: supplierParty.querySelector('PartyName Name, cac\\:PartyName cbc\\:Name')?.textContent?.trim() || '',
      vatId: supplierParty.querySelector('PartyIdentification ID, cac\\:PartyIdentification cbc\\:ID')?.textContent?.trim() || '',
      legalOrganizationId: supplierParty.querySelector('PartyLegalEntity CompanyID, cac\\:PartyLegalEntity cbc\\:CompanyID')?.textContent?.trim() || '',
      address: {
        street: supplierParty.querySelector('PostalAddress StreetName, cac\\:PostalAddress cbc\\:StreetName')?.textContent?.trim() || '',
        city: supplierParty.querySelector('PostalAddress CityName, cac\\:PostalAddress cbc\\:CityName')?.textContent?.trim() || '',
        postalCode: supplierParty.querySelector('PostalAddress PostalZone, cac\\:PostalAddress cbc\\:PostalZone')?.textContent?.trim() || '',
        country: supplierParty.querySelector('PostalAddress Country IdentificationCode, cac\\:PostalAddress cac\\:Country cbc\\:IdentificationCode')?.textContent?.trim() || '',
      },
      contactEmail: supplierParty.querySelector('Contact ElectronicMail, cac\\:Contact cbc\\:ElectronicMail')?.textContent?.trim() || '',
      contactPhone: supplierParty.querySelector('Contact Telephone, cac\\:Contact cbc\\:Telephone')?.textContent?.trim() || '',
    };
  } else {
    invoice.seller = {
      name: '[mn]medianet Inh Bernhard Hnida',
      vatId: '',
      address: { street: '', city: '', postalCode: '', country: 'DE' },
      contactEmail: '',
    };
  }

  // Parse buyer (AccountingCustomerParty)
  const customerParty = invoiceEl.querySelector('AccountingCustomerParty Party, cac\\:AccountingCustomerParty cac\\:Party');
  if (customerParty) {
    invoice.buyer = {
      name: customerParty.querySelector('PartyName Name, cac\\:PartyName cbc\\:Name')?.textContent?.trim() || '',
      vatId: customerParty.querySelector('PartyIdentification ID, cac\\:PartyIdentification cbc\\:ID')?.textContent?.trim() || '',
      address: {
        street: customerParty.querySelector('PostalAddress StreetName, cac\\:PostalAddress cbc\\:StreetName')?.textContent?.trim() || '',
        city: customerParty.querySelector('PostalAddress CityName, cac\\:PostalAddress cbc\\:CityName')?.textContent?.trim() || '',
        postalCode: customerParty.querySelector('PostalAddress PostalZone, cac\\:PostalAddress cbc\\:PostalZone')?.textContent?.trim() || '',
        country: customerParty.querySelector('PostalAddress Country IdentificationCode, cac\\:PostalAddress cac\\:Country cbc\\:IdentificationCode')?.textContent?.trim() || '',
      },
      contactEmail: customerParty.querySelector('Contact ElectronicMail, cac\\:Contact cbc\\:ElectronicMail')?.textContent?.trim() || '',
    };
  } else {
    invoice.buyer = {
      name: 'Customer',
      vatId: '',
      address: { street: '', city: '', postalCode: '', country: '' },
      contactEmail: '',
    };
  }

  // Parse payment terms
  invoice.paymentTerms = getTextContent('PaymentTerms Note') || getTextContent('cac\\:PaymentTerms cbc\\:Note');

  // Parse line items
  invoice.lines = [];
  const lineItems = invoiceEl.querySelectorAll('InvoiceLine, cac\\:InvoiceLine');
  
  lineItems.forEach((lineEl) => {
    const quantity = parseFloat(lineEl.querySelector('InvoicedQuantity, cbc\\:InvoicedQuantity')?.textContent || '1');
    const unitCode = lineEl.querySelector('InvoicedQuantity, cbc\\:InvoicedQuantity')?.getAttribute('unitCode') || 'EA';
    const unitPrice = parseFloat(lineEl.querySelector('Price PriceAmount, cac\\:Price cbc\\:PriceAmount')?.textContent || '0');
    const description = lineEl.querySelector('Item Description, cac\\:Item cbc\\:Description')?.textContent?.trim() 
                     || lineEl.querySelector('Item Name, cac\\:Item cbc\\:Name')?.textContent?.trim() 
                     || 'Item';
    const taxPercent = parseFloat(lineEl.querySelector('Item ClassifiedTaxCategory Percent, cac\\:Item cac\\:ClassifiedTaxCategory cbc\\:Percent')?.textContent || '20');
    const taxCategory = lineEl.querySelector('Item ClassifiedTaxCategory ID, cac\\:Item cac\\:ClassifiedTaxCategory cbc\\:ID')?.textContent?.trim() || 'S';

    invoice.lines.push({
      id: `line-${invoice.lines.length + 1}`,
      description,
      quantity,
      unitCode,
      unitPrice,
      taxPercent,
      taxCategory,
    });
  });

  return invoice;
}

/**
 * Validate and normalize invoice data
 */
function validateAndNormalizeInvoice(data: any, index: number): Invoice {
  if (!data.invoiceNumber) {
    throw new Error('Missing invoice number');
  }

  if (!data.lines || data.lines.length === 0) {
    throw new Error('Invoice must have at least one line item');
  }

  // Generate ID if not present
  const id = data.id || `imported-${Date.now()}-${index}`;

  // Ensure required fields with defaults
  return {
    id,
    invoiceNumber: data.invoiceNumber,
    issueDate: data.issueDate || new Date().toISOString().split('T')[0],
    dueDate: data.dueDate,
    invoiceTypeCode: data.invoiceTypeCode || '380',
    currency: data.currency || 'EUR',
    seller: data.seller || {
      name: '[mn]medianet Inh Bernhard Hnida',
      vatId: '',
      address: { street: '', city: '', postalCode: '', country: 'DE' },
      contactEmail: '',
    },
    buyer: data.buyer || {
      name: 'Customer',
      vatId: '',
      address: { street: '', city: '', postalCode: '', country: '' },
      contactEmail: '',
    },
    lines: data.lines.map((line: any, idx: number) => ({
      id: line.id || `line-${idx + 1}`,
      description: line.description || 'Item',
      quantity: typeof line.quantity === 'number' ? line.quantity : parseFloat(line.quantity) || 1,
      unitCode: line.unitCode || 'EA',
      unitPrice: typeof line.unitPrice === 'number' ? line.unitPrice : parseFloat(line.unitPrice) || 0,
      taxCategory: line.taxCategory || 'S',
      taxPercent: typeof line.taxPercent === 'number' ? line.taxPercent : parseFloat(line.taxPercent) || 20,
    })),
    note: data.note || '',
    paymentTerms: data.paymentTerms || '',
    status: data.status || 'draft',
    // Calculated fields will be computed by invoice-calculations utility
    lineExtensionAmount: 0,
    taxExclusiveAmount: 0,
    taxInclusiveAmount: 0,
    payableAmount: 0,
    taxTotals: [],
  };
}

/**
 * Generate CSV template for import
 */
export function generateImportTemplate(): string {
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

  const exampleRow = [
    'INV-2025-001',
    '2025-10-31',
    '2025-11-30',
    'EUR',
    '[mn]medianet Inh Bernhard Hnida',
    'DE123456789',
    'Musterstrasse 1',
    'Berlin',
    '10115',
    'DE',
    'billing@medianet-home.de',
    'Example Customer Ltd',
    'FR987654321',
    'Rue Example 5',
    'Paris',
    '75001',
    'FR',
    'customer@example.fr',
    'Consulting Service',
    '10',
    'HUR',
    '80.00',
    '20',
    'S',
    'Thank you for your business',
    'Net 30 days',
    'draft',
  ];

  return [
    headers.join(','),
    exampleRow.map(v => `"${v}"`).join(','),
  ].join('\n');
}

/**
 * Download CSV template
 */
export function downloadImportTemplate(): void {
  const csv = generateImportTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invoice-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate JSON template for import
 */
export function generateJSONTemplate(): string {
  const template = {
    invoiceNumber: 'INV-2025-001',
    issueDate: '2025-10-31',
    dueDate: '2025-11-30',
    invoiceTypeCode: '380',
    currency: 'EUR',
    seller: {
      name: '[mn]medianet Inh Bernhard Hnida',
      vatId: 'DE123456789',
      legalOrganizationId: 'HRB12345',
      address: {
        street: 'Musterstrasse 1',
        city: 'Berlin',
        postalCode: '10115',
        country: 'DE',
      },
      contactEmail: 'billing@medianet-home.de',
      contactPhone: '+49 30 12345678',
    },
    buyer: {
      name: 'Example Customer Ltd',
      vatId: 'FR987654321',
      address: {
        street: 'Rue Example 5',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
      },
      contactEmail: 'customer@example.fr',
      contactPhone: '+33 1 23456789',
    },
    lines: [
      {
        id: 'line-1',
        description: 'Consulting Service - Business Analysis',
        quantity: 10,
        unitCode: 'HUR',
        unitPrice: 80.00,
        taxCategory: 'S',
        taxPercent: 20,
      },
      {
        id: 'line-2',
        description: 'Software License - Annual Subscription',
        quantity: 1,
        unitCode: 'EA',
        unitPrice: 500.00,
        taxCategory: 'S',
        taxPercent: 20,
      },
    ],
    note: 'Thank you for your business. Payment due within 30 days.',
    paymentTerms: 'Net 30 days. Bank transfer to IBAN: DE89370400440532013000',
    status: 'draft',
  };

  return JSON.stringify(template, null, 2);
}

/**
 * Download JSON template
 */
export function downloadJSONTemplate(): void {
  const json = generateJSONTemplate();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invoice-import-template.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate UBL XML template for import (EN 16931 compliant)
 */
export function generateUBLXMLTemplate(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- Invoice Identification -->
  <cbc:ID>INV-2025-001</cbc:ID>
  <cbc:IssueDate>2025-10-31</cbc:IssueDate>
  <cbc:DueDate>2025-11-30</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:Note>Thank you for your business. Payment due within 30 days.</cbc:Note>

  <!-- Seller Information (Accounting Supplier Party) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VAT">DE123456789</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>[mn]medianet Inh Bernhard Hnida</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Musterstrasse 1</cbc:StreetName>
        <cbc:CityName>Berlin</cbc:CityName>
        <cbc:PostalZone>10115</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>DE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>[mn]medianet Inh Bernhard Hnida</cbc:RegistrationName>
        <cbc:CompanyID>HRB12345</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>billing@medianet-home.de</cbc:ElectronicMail>
        <cbc:Telephone>+49 30 12345678</cbc:Telephone>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Buyer Information (Accounting Customer Party) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VAT">FR987654321</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>Example Customer Ltd</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Rue Example 5</cbc:StreetName>
        <cbc:CityName>Paris</cbc:CityName>
        <cbc:PostalZone>75001</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>FR</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:Contact>
        <cbc:ElectronicMail>customer@example.fr</cbc:ElectronicMail>
        <cbc:Telephone>+33 1 23456789</cbc:Telephone>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Payment Terms -->
  <cac:PaymentTerms>
    <cbc:Note>Net 30 days. Bank transfer to IBAN: DE89370400440532013000</cbc:Note>
  </cac:PaymentTerms>

  <!-- Invoice Line 1 -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="HUR">10</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">800.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Consulting Service - Business Analysis</cbc:Description>
      <cbc:Name>Consulting Service</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>20</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">80.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>

  <!-- Invoice Line 2 -->
  <cac:InvoiceLine>
    <cbc:ID>2</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">500.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Software License - Annual Subscription</cbc:Description>
      <cbc:Name>Software License</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>20</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">500.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>

  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">260.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">1300.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">260.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>20</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Monetary Totals -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">1300.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">1300.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">1560.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">1560.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

</Invoice>`;
}

/**
 * Download UBL XML template
 */
export function downloadUBLXMLTemplate(): void {
  const xml = generateUBLXMLTemplate();
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invoice-import-template.xml';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
