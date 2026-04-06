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

export const PLATFORM_DEFAULT_TEMPLATE: InvoiceTemplate = {
  id: 'platform-default',
  name: 'Standard Professional',
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

export const PLATFORM_TEMPLATES = [
  PLATFORM_DEFAULT_TEMPLATE
];
