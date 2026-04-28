import type { jsPDF } from 'jspdf';
import { Invoice, InvoiceTemplate, CompanyProfile } from '../types/invoice';
import { formatDate } from './invoice-calculations';
import { DEFAULT_LETTER_LAYOUT } from './invoice-templates-defaults';

const COLORS = {
  primary:   [124, 58, 237]  as [number, number, number],
  accent:    [126, 34, 206]  as [number, number, number],
  text:      [15,  23, 42]   as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  border:    [233, 213, 255] as [number, number, number],
  lightBg:   [250, 245, 255] as [number, number, number],
};

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function generateLetterPDF(
  letter: Invoice,
  template?: InvoiceTemplate,
  profile?: CompanyProfile | null
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const layout = template?.layout?.length ? template.layout : DEFAULT_LETTER_LAYOUT;

  const effectiveLogo   = template?.logoUrl   || profile?.logoUrl;
  const effectiveHeader = template?.headerText || profile?.headerText;
  const effectiveFooter = template?.footerText || profile?.footerText;
  const effectiveSeller = {
    name: letter.seller?.name || template?.seller?.name || profile?.name || '',
    address: {
      street:     letter.seller?.address?.street     || template?.seller?.address?.street     || profile?.address?.street     || '',
      city:       letter.seller?.address?.city       || template?.seller?.address?.city       || profile?.address?.city       || '',
      postalCode: letter.seller?.address?.postalCode || template?.seller?.address?.postalCode || profile?.address?.postalCode || '',
      country:    letter.seller?.address?.country    || template?.seller?.address?.country    || profile?.address?.country    || '',
    },
    contactEmail: letter.seller?.contactEmail || profile?.email || '',
  };

  const getLayoutEl = (type: string) => {
    const el = layout.find(e => e.type === type);
    return el && el.visible !== false ? el : null;
  };

  // Top accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 6, 'F');

  let currentY = 60;

  const checkPageOverflow = (needed: number) => {
    if (currentY + needed > pageHeight - 100) {
      doc.addPage();
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, pageWidth, 6, 'F');
      currentY = 60;
      return true;
    }
    return false;
  };

  // ── LOGO ─────────────────────────────────────────────────────────────────────
  const logoEl = getLayoutEl('logo');
  if (logoEl && effectiveLogo) {
    try {
      const img = await loadImage(effectiveLogo);
      const ar  = img.width / img.height;
      const h   = Math.min(logoEl.h, 50);
      const w   = h * ar;
      doc.addImage(img, 'PNG', logoEl.x, logoEl.y, w, h);
    } catch { /* non-fatal */ }
  }

  // ── HEADER TEXT ──────────────────────────────────────────────────────────────
  const headerEl = getLayoutEl('header');
  if (headerEl && effectiveHeader) {
    const text = stripHtmlToText(effectiveHeader);
    if (text) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      const maxW = pageWidth - headerEl.x - margin;
      const lines = doc.splitTextToSize(text, maxW);
      const centerX = headerEl.x + maxW / 2;
      doc.text(lines, centerX, headerEl.y + 10, { align: 'center' });
    }
  }

  // ── SENDER block (top-right) ─────────────────────────────────────────────────
  const senderEl = getLayoutEl('sender');
  if (senderEl) {
    const senderX      = pageWidth - margin - 170;
    const senderStartY = (logoEl?.y ?? 40) + 2;
    let sy = senderStartY;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    if (effectiveSeller.name)                { doc.text(effectiveSeller.name,                    senderX, sy); sy += 11; }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    if (effectiveSeller.address?.street)     { doc.text(String(effectiveSeller.address.street),  senderX, sy); sy += 10; }
    const pc = [effectiveSeller.address?.postalCode, effectiveSeller.address?.city].filter(Boolean).join(' ');
    if (pc)                                  { doc.text(pc,                                       senderX, sy); sy += 10; }
    if (effectiveSeller.address?.country)    { doc.text(String(effectiveSeller.address.country), senderX, sy); sy += 10; }
    if (effectiveSeller.contactEmail)        { doc.text(String(effectiveSeller.contactEmail),     senderX, sy); }
  }

  // ── DATE ─────────────────────────────────────────────────────────────────────
  const datesEl = getLayoutEl('dates');
  if (datesEl) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('DATE', pageWidth - margin, datesEl.y, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(formatDate(letter.issueDate), pageWidth - margin, datesEl.y + 14, { align: 'right' });
  }

  // ── RECIPIENT block (TO) ─────────────────────────────────────────────────────
  const toEl = getLayoutEl('to');
  if (toEl) {
    const toX = toEl.x;
    const toY = toEl.y;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textMuted);
    doc.text('TO', toX, toY);

    let ty = toY + 14;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    if (letter.buyer?.name) { doc.text(String(letter.buyer.name), toX, ty); ty += 14; }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    if (letter.buyer?.address?.street) { doc.text(String(letter.buyer.address.street), toX, ty); ty += 12; }
    const bpc = [letter.buyer?.address?.postalCode, letter.buyer?.address?.city].filter(Boolean).join(' ');
    if (bpc) { doc.text(bpc, toX, ty); ty += 12; }
    if (letter.buyer?.address?.country) { doc.text(String(letter.buyer.address.country), toX, ty); }
  }

  // ── TITLE + REFERENCE ────────────────────────────────────────────────────────
  const titleEl = getLayoutEl('title');
  if (titleEl) {
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text((letter as any).title || 'Business Letter', margin, titleEl.y + 22);

    if (letter.invoiceNumber) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      doc.text(String(letter.invoiceNumber), margin, titleEl.y + 40);
    }
  }

  // ── LETTER BODY (subject, salutation, body paragraphs, closing) ──────────────
  const descEl = getLayoutEl('description');
  if (descEl) {
    currentY = Math.max(descEl.y, titleEl ? titleEl.y + 60 : descEl.y);
    const contentWidth = pageWidth - margin * 2;

    // Subject (Re:)
    if (letter.note) {
      checkPageOverflow(22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      const subjLines = doc.splitTextToSize(`Re: ${letter.note}`, contentWidth);
      doc.text(subjLines, margin, currentY);
      currentY += subjLines.length * 14 + 10;
    }

    // Salutation
    if (letter.salutation) {
      checkPageOverflow(18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const salLines = doc.splitTextToSize(String(letter.salutation), contentWidth);
      doc.text(salLines, margin, currentY);
      currentY += salLines.length * 14 + 12;
    }

    // Body paragraphs — strip HTML, preserve paragraph breaks
    const rawBody = ((letter as any).body || '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (rawBody) {
      for (const para of rawBody.split('\n\n')) {
        const lines = doc.splitTextToSize(para.replace(/\n/g, ' ').trim(), contentWidth);
        checkPageOverflow(lines.length * 14 + 10);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 14 + 10;
      }
      currentY += 8;
    }

    // Closing
    if (letter.closing) {
      checkPageOverflow(80);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      const closeLines = doc.splitTextToSize(String(letter.closing), 200);
      doc.text(closeLines, margin, currentY);
      currentY += closeLines.length * 14 + 44;
    }
  }

  // ── SIGNATURE ────────────────────────────────────────────────────────────────
  const sigEl = getLayoutEl('signature');
  if (sigEl) {
    const sigX = sigEl.x ?? margin;
    const sigY = Math.max(currentY, sigEl.y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    if (effectiveSeller.name) doc.text(String(effectiveSeller.name), sigX, sigY);
  }

  // ── FOOTER TEXT ──────────────────────────────────────────────────────────────
  const footerEl = getLayoutEl('footer');
  if (footerEl && effectiveFooter) {
    const text = stripHtmlToText(effectiveFooter);
    if (text) {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.textMuted);
        const footerWidth = pageWidth - margin * 2;
        const lines = doc.splitTextToSize(text, footerWidth);
        const totalH = lines.length * 11;
        const startY = pageHeight - margin - totalH;
        doc.text(lines, pageWidth / 2, startY, { align: 'center' });
      }
    }
  }

  const filename = (letter.invoiceNumber || 'business-letter').replace(/[/\\?%*:|"<>]/g, '-');
  doc.save(`${filename}.pdf`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = url;
  });
}
