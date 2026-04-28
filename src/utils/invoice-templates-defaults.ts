import { InvoiceTemplate, TemplateLayoutElement } from '../types/invoice';

export const DEFAULT_LAYOUT: TemplateLayoutElement[] = [
  { id: 'logo', type: 'logo', x: 40, y: 40, w: 120, h: 50, visible: true, zIndex: 10 },
  { id: 'header', type: 'header', x: 180, y: 40, w: 375, h: 50, visible: true, zIndex: 10 },
  { id: 'title', type: 'title', x: 40, y: 120, w: 220, h: 40, visible: true, zIndex: 10 },
  { id: 'dates', type: 'dates', x: 340, y: 120, w: 215, h: 60, visible: true, zIndex: 10 },
  { id: 'seller', type: 'seller', x: 40, y: 200, w: 240, h: 100, visible: true, zIndex: 10 },
  { id: 'buyer', type: 'buyer', x: 315, y: 200, w: 240, h: 100, visible: true, zIndex: 10 },
  { id: 'items', type: 'items', x: 40, y: 320, w: 515, h: 240, visible: true, zIndex: 10 },
  { id: 'tax_summary', type: 'tax_summary', x: 40, y: 575, w: 260, h: 90, visible: true, zIndex: 10 },
  { id: 'totals', type: 'totals', x: 325, y: 575, w: 230, h: 110, visible: true, zIndex: 10 },
  { id: 'notes', type: 'notes', x: 40, y: 700, w: 310, h: 70, visible: true, zIndex: 10 },
  { id: 'signature', type: 'signature', x: 380, y: 700, w: 175, h: 60, visible: true, zIndex: 10 },
  { id: 'qr', type: 'qr', x: 510, y: 775, w: 45, h: 45, visible: true, zIndex: 10 },
  { id: 'footer', type: 'footer', x: 40, y: 790, w: 460, h: 30, visible: true, zIndex: 10 },
];

export const DEFAULT_LETTER_LAYOUT: TemplateLayoutElement[] = [
  { id: 'logo', type: 'logo', x: 40, y: 40, w: 120, h: 50, visible: true, zIndex: 10 },
  { id: 'header', type: 'header', x: 180, y: 40, w: 375, h: 50, visible: true, zIndex: 10 },
  { id: 'sender', type: 'sender', x: 355, y: 100, w: 200, h: 100, visible: true, zIndex: 10 },
  { id: 'dates', type: 'dates', x: 400, y: 120, w: 155, h: 40, visible: true, zIndex: 10 },
  { id: 'to', type: 'to', x: 40, y: 160, w: 300, h: 100, visible: true, zIndex: 10 },
  { id: 'title', type: 'title', x: 40, y: 280, w: 515, h: 40, visible: true, zIndex: 10 },
  { id: 'description', type: 'description', x: 40, y: 340, w: 515, h: 400, visible: true, zIndex: 10 },
  { id: 'signature', type: 'signature', x: 40, y: 760, w: 200, h: 60, visible: true, zIndex: 10 },
  { id: 'qr', type: 'qr', x: 40, y: 840, w: 60, h: 60, visible: false, zIndex: 10 },
  { id: 'footer', type: 'footer', x: 40, y: 920, w: 515, h: 40, visible: true, zIndex: 10 },
];

export const PLATFORM_DEFAULT_TEMPLATE: InvoiceTemplate = {
  id: 'platform-default',
  name: 'Standard Professional',
  templateType: 'invoice',
  description: 'The official platform-standard layout. Clean, professional and compliant with UBL 2.1.',
  seller: {},
  defaultCurrency: 'EUR',
  defaultTaxCategory: 'S',
  defaultTaxPercent: 19,
  defaultPaymentTerms: {
    note: 'Payment due within 14 days without deduction.'
  },
  layout: DEFAULT_LAYOUT
};

export const PLATFORM_LETTER_TEMPLATE: InvoiceTemplate = {
  id: 'platform-letter',
  name: 'Modern Business Letter',
  templateType: 'business_letter',
  description: 'A clean, modern layout for formal business correspondence.',
  seller: {},
  defaultCurrency: 'EUR',
  defaultTaxCategory: 'S',
  defaultTaxPercent: 0,
  layout: DEFAULT_LETTER_LAYOUT
};

export const PLATFORM_TEMPLATES = [
  PLATFORM_DEFAULT_TEMPLATE,
  PLATFORM_LETTER_TEMPLATE
];
