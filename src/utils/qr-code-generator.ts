/**
 * QR Code Generator for European Invoice Standards
 * Implements EPC QR Code (European Payments Council) for SEPA Credit Transfers
 * Reference: EPC Quick Response Code Guidelines Version 2.1
 */

import { Invoice } from '../types/invoice';

/**
 * Generate EPC QR Code data string for SEPA Credit Transfer
 * Format specification: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
 * 
 * @param invoice - Invoice object containing payment information
 * @returns EPC QR code data string or null if required data is missing
 */
export function generateEPCQRCodeData(invoice: Invoice): string | null {
  // Check if we have required payment information
  if (!invoice.paymentMeans?.iban) {
    return null;
  }

  const lines: string[] = [];

  // Line 1: Service Tag - Must be "BCD" for EPC QR Code
  lines.push('BCD');

  // Line 2: Version - "002" (version 2)
  lines.push('002');

  // Line 3: Character Set - "1" = UTF-8, "2" = ISO 8859-1, "3" = ISO 8859-2, "4" = ISO 8859-4, "5" = ISO 8859-5, "6" = ISO 8859-7, "7" = ISO 8859-10, "8" = ISO 8859-15
  lines.push('1'); // UTF-8

  // Line 4: Identification - "SCT" = SEPA Credit Transfer
  lines.push('SCT');

  // Line 5: BIC - Optional (can be empty if within SEPA)
  lines.push(invoice.paymentMeans.bic || '');

  // Line 6: Beneficiary Name (max 70 characters)
  const beneficiaryName = truncateString(invoice.seller.name, 70);
  lines.push(beneficiaryName);

  // Line 7: Beneficiary Account (IBAN)
  const iban = invoice.paymentMeans.iban.replace(/\s/g, '').toUpperCase();
  lines.push(iban);

  // Line 8: Amount in EUR - Format: EUR12.34 (max 12 chars including EUR)
  // Only include if invoice is in EUR
  if (invoice.currency === 'EUR') {
    const amount = `EUR${invoice.payableAmount.toFixed(2)}`;
    lines.push(truncateString(amount, 12));
  } else {
    lines.push(''); // Empty if not EUR
  }

  // Line 9: Purpose - Optional (e.g., "CBFF", "GDDS", "GOVT", "SALA", etc.)
  // Using empty as it's optional
  lines.push('');

  // Line 10: Structured Reference - Invoice number (max 35 characters)
  const reference = truncateString(invoice.invoiceNumber, 35);
  lines.push(reference);

  // Line 11: Unstructured Remittance Information (max 140 characters)
  // Using invoice type and date as additional info
  const remittanceInfo = truncateString(
    `Invoice ${invoice.invoiceNumber} - ${invoice.issueDate}`,
    140
  );
  lines.push(remittanceInfo);

  // Line 12: Beneficiary to Originator Information - Optional
  // Can include seller contact information
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate Swiss QR Code data for Swiss QR Invoice
 * Format specification: Swiss Payment Standards 2019
 * 
 * @param invoice - Invoice object containing payment information
 * @returns Swiss QR code data string or null if required data is missing
 */
export function generateSwissQRCodeData(invoice: Invoice): string | null {
  // Check if we have required payment information
  if (!invoice.paymentMeans?.iban) {
    return null;
  }

  const lines: string[] = [];

  // Header
  lines.push('SPC'); // QRType
  lines.push('0200'); // Version
  lines.push('1'); // Coding Type (1 = UTF-8)

  // Account (IBAN)
  lines.push(invoice.paymentMeans.iban.replace(/\s/g, '').toUpperCase());

  // Creditor (Seller)
  lines.push('S'); // Address Type (S = Structured, K = Combined)
  lines.push(truncateString(invoice.seller.name, 70));
  lines.push(truncateString(invoice.seller.address.street, 70));
  lines.push(truncateString(invoice.seller.address.postalCode, 16));
  lines.push(truncateString(invoice.seller.address.city, 35));
  lines.push(truncateString(invoice.seller.address.country, 2));
  lines.push(''); // Building number
  lines.push(''); // Room number

  // Ultimate Creditor
  lines.push(''); // Address Type
  lines.push(''); // Name
  lines.push(''); // Street
  lines.push(''); // Postal code
  lines.push(''); // City
  lines.push(''); // Country
  lines.push(''); // Building number
  lines.push(''); // Room number

  // Payment Amount Information
  lines.push(invoice.payableAmount.toFixed(2));
  lines.push(invoice.currency);

  // Ultimate Debtor (Buyer)
  lines.push('S');
  lines.push(truncateString(invoice.buyer.name, 70));
  lines.push(truncateString(invoice.buyer.address.street, 70));
  lines.push(truncateString(invoice.buyer.address.postalCode, 16));
  lines.push(truncateString(invoice.buyer.address.city, 35));
  lines.push(truncateString(invoice.buyer.address.country, 2));
  lines.push('');
  lines.push('');

  // Payment Reference
  lines.push('NON'); // Reference Type (NON = without reference)
  lines.push(''); // Reference (empty for NON type)

  // Additional Information
  lines.push(''); // Unstructured message
  lines.push('EPD'); // Trailer
  lines.push(''); // Bill information

  // Alternative Schemes
  lines.push(''); // Alternative scheme parameters

  return lines.join('\r\n');
}

/**
 * Generate GiroCode QR data (German banking standard, subset of EPC)
 * Alias for EPC QR Code as GiroCode follows the same standard
 * 
 * @param invoice - Invoice object
 * @returns GiroCode data string
 */
export function generateGiroCodeData(invoice: Invoice): string | null {
  return generateEPCQRCodeData(invoice);
}

/**
 * Get QR code data based on country and payment method
 * Automatically selects the appropriate QR code standard
 * 
 * @param invoice - Invoice object
 * @param standard - Optional: Force specific standard ('epc', 'swiss', 'giro')
 * @returns QR code data string
 */
export function getInvoiceQRCodeData(
  invoice: Invoice,
  standard?: 'epc' | 'swiss' | 'giro'
): string | null {
  // If standard is specified, use it
  if (standard === 'swiss') {
    return generateSwissQRCodeData(invoice);
  }
  if (standard === 'giro' || standard === 'epc') {
    return generateEPCQRCodeData(invoice);
  }

  // Auto-detect based on country
  const sellerCountry = invoice.seller.address.country;

  // Swiss QR Invoice for Switzerland and Liechtenstein
  if (sellerCountry === 'CH' || sellerCountry === 'LI') {
    return generateSwissQRCodeData(invoice);
  }

  // GiroCode for Germany
  if (sellerCountry === 'DE') {
    return generateGiroCodeData(invoice);
  }

  // EPC QR Code for all other European countries
  return generateEPCQRCodeData(invoice);
}

/**
 * Validate IBAN format (basic validation)
 * 
 * @param iban - IBAN string
 * @returns true if IBAN format is valid
 */
export function validateIBAN(iban: string): boolean {
  const cleanIban = iban.replace(/\s/g, '');

  // Basic format check: 2 letters + 2 digits + up to 30 alphanumeric
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
  // const ibanRegex = /^[0-9]{2}[A-Z0-9]{1,30}$/;

  return ibanRegex.test(cleanIban.toUpperCase());
}

/**
 * Format IBAN with spaces for display
 * 
 * @param iban - IBAN string
 * @returns Formatted IBAN with spaces
 */
export function formatIBAN(iban: string): string {
  const cleanIban = iban.replace(/\s/g, '');
  return cleanIban.match(/.{1,4}/g)?.join(' ') || cleanIban;
}

/**
 * Truncate string to maximum length
 * 
 * @param str - Input string
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Get QR code standard name for display
 * 
 * @param invoice - Invoice object
 * @returns QR code standard name
 */
export function getQRCodeStandardName(invoice: Invoice): string {
  const country = invoice.seller.address.country;

  if (country === 'CH' || country === 'LI') {
    return 'Swiss QR Invoice';
  }
  if (country === 'DE') {
    return 'GiroCode (EPC QR)';
  }
  return 'EPC QR Code';
}

/**
 * Check if invoice can generate QR code
 * 
 * @param invoice - Invoice object
 * @returns true if QR code can be generated
 */
export function canGenerateQRCode(invoice: Invoice): boolean {
  return !!(invoice.paymentMeans?.iban && validateIBAN(invoice.paymentMeans.iban));
}
