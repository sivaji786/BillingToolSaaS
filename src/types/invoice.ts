// EN 16931 / UBL 2.1 Invoice Data Types

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2 country code
}

export interface Party {
  name: string;
  vatId?: string;
  legalOrganizationId?: string;
  gln?: string;
  address: Address;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Buyer extends Party {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitCode: string; // UN/ECE Recommendation 20 (e.g., HUR=hours, EA=each, DAY=day)
  unitPrice: number;
  taxCategory: 'S' | 'Z' | 'E' | 'AE' | 'K' | 'G'; // S=Standard, Z=Zero-rated, E=Exempt, AE=Reverse charge, K=Intra-community, G=Free export
  taxPercent: number;
  lineExtensionAmount?: number; // Calculated: quantity * unitPrice
  taxAmount?: number; // Calculated
  grossAmount?: number; // Calculated: lineExtensionAmount + taxAmount
  note?: string;
}

export interface TaxTotal {
  taxType: string; // e.g., "VAT"
  taxableAmount: number;
  taxAmount: number;
  taxPercent: number;
  taxCategory?: string;
}

export interface PaymentMeans {
  type: 'BankTransfer' | 'CreditCard' | 'DebitCard' | 'Cash' | 'Other';
  iban?: string;
  bic?: string;
  accountName?: string;
  paymentReference?: string;
}

export interface PaymentTerms {
  note?: string;
  dueDate?: string; // ISO 8601 date
  earlyPaymentDiscount?: number;
  penaltyPercent?: number;
}

export interface Invoice {
  id?: string;
  templateId?: string; // Links to the InvoiceTemplate used for this invoice
  templateType?: TemplateType;
  invoiceNumber: string;
  issueDate: string; // ISO 8601 date (YYYY-MM-DD)
  dueDate?: string;
  invoiceTypeCode?: string; // 380=Commercial invoice, 381=Credit note, 384=Corrected invoice
  currency: string; // ISO 4217 currency code
  documentCurrencyCode?: string;
  taxCurrencyCode?: string;
  seller: Party;
  buyer: Party;
  lines: InvoiceLine[];
  taxTotals: TaxTotal[];
  lineExtensionAmount: number; // Sum of line amounts (before tax)
  taxExclusiveAmount: number; // Total without tax
  taxInclusiveAmount: number; // Total with tax
  allowanceTotalAmount?: number; // Discounts
  chargeTotalAmount?: number; // Additional charges
  prepaidAmount?: number; // Already paid amount
  payableAmount: number; // Amount to be paid
  paymentMeans?: PaymentMeans;
  paymentTerms?: PaymentTerms;
  note?: string;
  body?: string;
  salutation?: string;
  closing?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  attachments?: string[];
  status?: 'draft' | 'validated' | 'sent' | 'paid' | 'cancelled';
  signed?: boolean;
  signatureDate?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface TemplateLayoutElement {
  id: string;
  type: 'logo' | 'seller' | 'buyer' | 'dates' | 'items' | 'totals' | 'footer' | 'qr' | 'notes' | 'title' | 'header' | 'signature' | 'tax_summary' | 'to' | 'description' | 'sender';
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  zIndex?: number;
  fontSize?: number;
  style?: Record<string, any>;
  content?: string;
}

export type TemplateType = 'invoice' | 'business_letter';

export interface ValidationError {
  field: string; // UI field identifier
  ublPath: string; // UBL element path (e.g., "Invoice/IssueDate")
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  templateType?: TemplateType;
  description: string;
  seller: Partial<Party>;
  defaultCurrency: string;
  defaultTaxCategory: string;
  defaultTaxPercent: number;
  defaultPaymentTerms?: PaymentTerms;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
  layout?: TemplateLayoutElement[];
}

export interface CompanyType {
  id: number;
  name: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  vatId: string;
  legalOrganizationId?: string;
  address: Address;
  email: string;
  phone: string;
  website?: string;
  logoUrl?: string;
  signatureUrl?: string;
  bankAccount?: {
    iban: string;
    bic: string;
    accountName: string;
  };
  headerText?: string;
  footerText?: string;
  companyTypeId?: number;
  defaultTemplateId?: string;
  invoiceNumberFormat?: string;
  letterNumberFormat?: string;
  defaultCurrency?: string;
  defaultTaxRate?: number;
  paymentTermsDays?: number;
}

export interface ExportOptions {
  format: 'pdf' | 'ubl-xml' | 'peppol-bis' | 'json' | 'csv';
  includeAttachments?: boolean;
  embedPdfInUbl?: boolean; // PDF/A-3 embedded in UBL
  signDocument?: boolean;
  peppolProfile?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'created' | 'updated' | 'validated' | 'exported' | 'sent' | 'signed' | 'deleted';
  invoiceNumber: string;
  user: string;
  details?: string;
  signed: boolean;
}

export const unitCodes = [
  { code: 'HUR', description: 'Hour(s)' },
  { code: 'DAY', description: 'Day(s)' },
  { code: 'EA', description: 'Each' },
  { code: 'KGM', description: 'Kilogram' },
  { code: 'LTR', description: 'Litre' },
  { code: 'MTR', description: 'Metre' },
  { code: 'MTQ', description: 'Cubic metre' },
  { code: 'TNE', description: 'Tonne' },
  { code: 'XPK', description: 'Package' },
];

export const taxCategories = [
  { code: 'S', description: 'Standard rate' },
  { code: 'Z', description: 'Zero-rated' },
  { code: 'E', description: 'Exempt' },
  { code: 'AE', description: 'Reverse charge' },
  { code: 'K', description: 'Intra-community supply' },
  { code: 'G', description: 'Free export' },
];

// AI Assistant Types
export interface AIPromptRequest {
  prompt: string;
  context?: 'create' | 'edit';
  templateType?: 'invoice' | 'business_letter';
  existingInvoice?: Partial<Invoice>;
  language?: string;
  parsedInvoice?: any;
}

export interface AIPromptResponse {
  success: boolean;
  invoice?: Invoice;
  confidence?: number;
  suggestions?: string[];
  errors?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  invoiceData?: Invoice;
}

