// Invoice calculation utilities for EN 16931 compliance

import { Invoice, InvoiceLine, TaxTotal } from '../types/invoice';

/**
 * Calculate line amounts
 * UBL mapping: Invoice/InvoiceLine/LineExtensionAmount
 */
export function calculateLineAmounts(line: InvoiceLine): InvoiceLine {
  const lineExtensionAmount = Number((line.quantity * line.unitPrice).toFixed(2));
  const taxAmount = Number((lineExtensionAmount * (line.taxPercent / 100)).toFixed(2));
  const grossAmount = Number((lineExtensionAmount + taxAmount).toFixed(2));

  return {
    ...line,
    lineExtensionAmount,
    taxAmount,
    grossAmount,
  };
}

/**
 * Calculate invoice totals
 * UBL mappings:
 * - LineExtensionAmount: Invoice/LegalMonetaryTotal/LineExtensionAmount
 * - TaxExclusiveAmount: Invoice/LegalMonetaryTotal/TaxExclusiveAmount
 * - TaxInclusiveAmount: Invoice/LegalMonetaryTotal/TaxInclusiveAmount
 * - PayableAmount: Invoice/LegalMonetaryTotal/PayableAmount
 */
export function calculateInvoiceTotals(invoice: Invoice): Invoice {
  // Defensive check for invoice and lines
  if (!invoice || !invoice.lines) {
    console.error('calculateInvoiceTotals: Invoice or lines is undefined', invoice);
    return invoice || {} as Invoice;
  }

  // Recalculate all line amounts
  const calculatedLines = invoice.lines.map(calculateLineAmounts);

  // Sum line extension amounts (before tax)
  const lineExtensionAmount = Number(
    calculatedLines.reduce((sum, line) => sum + (line.lineExtensionAmount || 0), 0).toFixed(2)
  );

  // Calculate tax totals by tax category
  const taxByCategory = new Map<string, { taxableAmount: number; taxAmount: number; taxPercent: number }>();

  calculatedLines.forEach((line) => {
    const key = `${line.taxCategory}_${line.taxPercent}`;
    const existing = taxByCategory.get(key) || { taxableAmount: 0, taxAmount: 0, taxPercent: line.taxPercent };

    taxByCategory.set(key, {
      taxableAmount: existing.taxableAmount + (line.lineExtensionAmount || 0),
      taxAmount: existing.taxAmount + (line.taxAmount || 0),
      taxPercent: line.taxPercent,
    });
  });

  // Convert to TaxTotal array
  const taxTotals: TaxTotal[] = Array.from(taxByCategory.values()).map((tax) => ({
    taxType: 'VAT',
    taxableAmount: Number(tax.taxableAmount.toFixed(2)),
    taxAmount: Number(tax.taxAmount.toFixed(2)),
    taxPercent: tax.taxPercent,
  }));

  // Sum all tax amounts
  const totalTaxAmount = Number(
    taxTotals.reduce((sum, tax) => sum + tax.taxAmount, 0).toFixed(2)
  );

  // Calculate document totals
  const allowanceTotalAmount = invoice.allowanceTotalAmount || 0;
  const chargeTotalAmount = invoice.chargeTotalAmount || 0;
  const prepaidAmount = invoice.prepaidAmount || 0;

  const taxExclusiveAmount = Number(
    (lineExtensionAmount - allowanceTotalAmount + chargeTotalAmount).toFixed(2)
  );
  const taxInclusiveAmount = Number((taxExclusiveAmount + totalTaxAmount).toFixed(2));
  const payableAmount = Number((taxInclusiveAmount - prepaidAmount).toFixed(2));

  return {
    ...invoice,
    lines: calculatedLines,
    taxTotals,
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    payableAmount,
  };
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Add space between currency symbol and number
  // Match currency symbol at the beginning or end and add space
  return formatted.replace(/^([^\d\s-]+)/, '$1 ').replace(/([^\d\s]+)$/, ' $1');
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get tax category label
 */
export function getTaxCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    S: 'Standard rate',
    Z: 'Zero-rated',
    E: 'Exempt',
    AE: 'Reverse charge',
    K: 'Intra-community supply',
    G: 'Free export',
  };
  return labels[category] || category;
}

/**
 * Get unit code label
 */
export function getUnitCodeLabel(code: string): string {
  const labels: Record<string, string> = {
    HUR: 'Hour(s)',
    DAY: 'Day(s)',
    EA: 'Each',
    KGM: 'Kilogram',
    LTR: 'Litre',
    MTR: 'Metre',
    MTQ: 'Cubic metre',
    TNE: 'Tonne',
    XPK: 'Package',
  };
  return labels[code] || code;
}

/**
 * Generate invoice number based on format and current count
 */
export function generateInvoiceNumber(format: string, currentCount: number): string {
  const date = new Date();
  const year = date.getFullYear().toString();
  const shortYear = year.slice(-2);

  let result = format.replace(/{YYYY}/g, year).replace(/{YY}/g, shortYear);

  // find {NNN...} and replace with padded count
  result = result.replace(/{(N+)}/g, (_, p1) => {
    const padLength = p1.length;
    return String(currentCount + 1).padStart(padLength, '0');
  });

  return result;
}
