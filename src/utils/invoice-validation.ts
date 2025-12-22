// EN 16931 validation rules

import { Invoice, ValidationError } from '../types/invoice';

/**
 * Validate invoice against EN 16931 requirements
 * Returns array of validation errors/warnings
 */
export function validateInvoice(invoice: Invoice): ValidationError[] {
  const errors: ValidationError[] = [];

  // BT-1: Invoice number (required)
  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') {
    errors.push({
      field: 'invoiceNumber',
      ublPath: 'Invoice/ID',
      severity: 'error',
      message: 'Invoice number is required',
      suggestion: 'Enter a unique invoice number (e.g., INV-2025-00123)',
    });
  }

  // BT-2: Issue date (required)
  if (!invoice.issueDate) {
    errors.push({
      field: 'issueDate',
      ublPath: 'Invoice/IssueDate',
      severity: 'error',
      message: 'Issue date is required',
      suggestion: 'Select the invoice issue date',
    });
  } else {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(invoice.issueDate)) {
      errors.push({
        field: 'issueDate',
        ublPath: 'Invoice/IssueDate',
        severity: 'error',
        message: 'Issue date must be in YYYY-MM-DD format',
        suggestion: 'Use ISO 8601 date format (e.g., 2025-10-30)',
      });
    }
  }

  // BT-5: Invoice currency code (required)
  if (!invoice.currency || invoice.currency.length !== 3) {
    errors.push({
      field: 'currency',
      ublPath: 'Invoice/DocumentCurrencyCode',
      severity: 'error',
      message: 'Valid ISO 4217 currency code is required',
      suggestion: 'Use 3-letter currency code (e.g., EUR, USD, GBP)',
    });
  }

  // BG-4: Seller information (required)
  if (!invoice.seller) {
    errors.push({
      field: 'seller',
      ublPath: 'Invoice/AccountingSupplierParty',
      severity: 'error',
      message: 'Seller information is required',
    });
  } else {
    // BT-27: Seller name (required)
    if (!invoice.seller.name || invoice.seller.name.trim() === '') {
      errors.push({
        field: 'seller.name',
        ublPath: 'Invoice/AccountingSupplierParty/Party/PartyName/Name',
        severity: 'error',
        message: 'Seller name is required',
      });
    }

    // BT-31: Seller VAT identifier (required in most cases)
    if (!invoice.seller.vatId || invoice.seller.vatId.trim() === '') {
      errors.push({
        field: 'seller.vatId',
        ublPath: 'Invoice/AccountingSupplierParty/Party/PartyTaxScheme/CompanyID',
        severity: 'warning',
        message: 'Seller VAT ID is recommended',
        suggestion: 'Add VAT identifier for the seller',
      });
    }

    // BT-35-38: Seller address (required)
    if (!invoice.seller.address) {
      errors.push({
        field: 'seller.address',
        ublPath: 'Invoice/AccountingSupplierParty/Party/PostalAddress',
        severity: 'error',
        message: 'Seller address is required',
      });
    } else {
      if (!invoice.seller.address.country) {
        errors.push({
          field: 'seller.address.country',
          ublPath: 'Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode',
          severity: 'error',
          message: 'Seller country code is required',
          suggestion: 'Use ISO 3166-1 alpha-2 country code (e.g., DE, FR, GB)',
        });
      }
    }
  }

  // BG-7: Buyer information (required)
  if (!invoice.buyer) {
    errors.push({
      field: 'buyer',
      ublPath: 'Invoice/AccountingCustomerParty',
      severity: 'error',
      message: 'Buyer information is required',
    });
  } else {
    // BT-44: Buyer name (required)
    if (!invoice.buyer.name || invoice.buyer.name.trim() === '') {
      errors.push({
        field: 'buyer.name',
        ublPath: 'Invoice/AccountingCustomerParty/Party/PartyName/Name',
        severity: 'error',
        message: 'Buyer name is required',
      });
    }

    // BT-50-53: Buyer address
    if (!invoice.buyer.address) {
      errors.push({
        field: 'buyer.address',
        ublPath: 'Invoice/AccountingCustomerParty/Party/PostalAddress',
        severity: 'warning',
        message: 'Buyer address is recommended',
      });
    } else if (!invoice.buyer.address.country) {
      errors.push({
        field: 'buyer.address.country',
        ublPath: 'Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode',
        severity: 'warning',
        message: 'Buyer country code is recommended',
      });
    }
  }

  // BG-25: Invoice lines (at least one required)
  if (!invoice.lines || invoice.lines.length === 0) {
    errors.push({
      field: 'lines',
      ublPath: 'Invoice/InvoiceLine',
      severity: 'error',
      message: 'At least one invoice line is required',
      suggestion: 'Add items or services to the invoice',
    });
  } else {
    // Validate each line
    invoice.lines.forEach((line, index) => {
      // BT-126: Line ID (required)
      if (!line.id) {
        errors.push({
          field: `lines[${index}].id`,
          ublPath: `Invoice/InvoiceLine[${index + 1}]/ID`,
          severity: 'error',
          message: `Line ${index + 1}: Line ID is required`,
        });
      }

      // BT-153: Line description (required)
      if (!line.description || line.description.trim() === '') {
        errors.push({
          field: `lines[${index}].description`,
          ublPath: `Invoice/InvoiceLine[${index + 1}]/Item/Name`,
          severity: 'error',
          message: `Line ${index + 1}: Description is required`,
        });
      }

      // BT-129: Quantity (required, must be > 0)
      if (!line.quantity || line.quantity <= 0) {
        errors.push({
          field: `lines[${index}].quantity`,
          ublPath: `Invoice/InvoiceLine[${index + 1}]/InvoicedQuantity`,
          severity: 'error',
          message: `Line ${index + 1}: Quantity must be greater than 0`,
        });
      }

      // BT-130: Unit code (required)
      if (!line.unitCode) {
        errors.push({
          field: `lines[${index}].unitCode`,
          ublPath: `Invoice/InvoiceLine[${index + 1}]/InvoicedQuantity/@unitCode`,
          severity: 'error',
          message: `Line ${index + 1}: Unit code is required`,
          suggestion: 'Use UN/ECE Recommendation 20 unit codes (e.g., HUR, EA, DAY)',
        });
      }

      // BT-146: Unit price (required)
      if (line.unitPrice === undefined || line.unitPrice === null) {
        errors.push({
          field: `lines[${index}].unitPrice`,
          ublPath: `Invoice/InvoiceLine[${index + 1}]/Price/PriceAmount`,
          severity: 'error',
          message: `Line ${index + 1}: Unit price is required`,
        });
      }

      // BT-151: Tax category (required)
      if (!line.taxCategory) {
        errors.push({
          field: `lines[${index}].taxCategory`,
          ublPath: `Invoice/InvoiceLine[${index + 1}]/Item/ClassifiedTaxCategory/ID`,
          severity: 'error',
          message: `Line ${index + 1}: Tax category is required`,
          suggestion: 'Select a tax category (S=Standard, Z=Zero-rated, E=Exempt, etc.)',
        });
      }

      // BT-152: Tax percent (required)
      if (line.taxPercent === undefined || line.taxPercent === null) {
        errors.push({
          field: `lines[${index}].taxPercent`,
          ublPath: `Invoice/InvoiceLine[${index + 1}]/Item/ClassifiedTaxCategory/Percent`,
          severity: 'error',
          message: `Line ${index + 1}: Tax percent is required`,
        });
      }
    });
  }

  // BG-22: Document totals validation
  if (invoice.payableAmount === undefined || invoice.payableAmount === null) {
    errors.push({
      field: 'payableAmount',
      ublPath: 'Invoice/LegalMonetaryTotal/PayableAmount',
      severity: 'error',
      message: 'Payable amount must be calculated',
    });
  }

  // Due date validation (warning if not set)
  if (!invoice.dueDate && invoice.status !== 'draft') {
    errors.push({
      field: 'dueDate',
      ublPath: 'Invoice/DueDate',
      severity: 'warning',
      message: 'Payment due date is recommended',
      suggestion: 'Set a payment due date for the invoice',
    });
  }

  // Payment means validation (info if not set)
  if (!invoice.paymentMeans) {
    errors.push({
      field: 'paymentMeans',
      ublPath: 'Invoice/PaymentMeans',
      severity: 'info',
      message: 'Payment information is not specified',
      suggestion: 'Add payment means (bank transfer, IBAN, etc.) for buyer convenience',
    });
  }

  return errors;
}

/**
 * Check if invoice passes EN 16931 validation (no errors)
 */
export function isInvoiceValid(invoice: Invoice): boolean {
  const errors = validateInvoice(invoice);
  return !errors.some((e) => e.severity === 'error');
}

/**
 * Get validation summary
 */
export function getValidationSummary(errors: ValidationError[]): {
  errorCount: number;
  warningCount: number;
  infoCount: number;
} {
  return {
    errorCount: errors.filter((e) => e.severity === 'error').length,
    warningCount: errors.filter((e) => e.severity === 'warning').length,
    infoCount: errors.filter((e) => e.severity === 'info').length,
  };
}
