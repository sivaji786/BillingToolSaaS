import type { jsPDF } from 'jspdf';
// import autoTable from 'jspdf-autotable'; // Dynamic import used
// import html2canvas from 'html2canvas'; // Dynamic import used
import { Invoice, InvoiceTemplate, CompanyProfile } from '../types/invoice';
import { formatCurrency, formatDate } from './invoice-calculations';
import { getQRCodeDataURL } from '../components/invoice/InvoiceQRCode';

export async function generateInvoicePDF(
  invoice: Invoice,
  template?: InvoiceTemplate,
  profile?: CompanyProfile | null
): Promise<void> {
  // Dynamic imports for performance
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // Point to Pixel ratio (1pt = 1px for our 72dpi designer)

  // Use points (pt) for consistency with the editor's 72 DPI canvas
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Branding Colors (Matches ShadCDN Violet/Purple theme)
  const colors = {
    primary: [124, 58, 237] as [number, number, number], // Violet 600 (#7c3aed)
    accent: [126, 34, 206] as [number, number, number], // Purple 700 (#7e22ce)
    secondary: [139, 92, 246] as [number, number, number], // Violet 500
    text: [15, 23, 42] as [number, number, number], // Slate 900
    textMuted: [100, 116, 139] as [number, number, number], // Slate 500
    border: [233, 213, 255] as [number, number, number], // Purple 200 for dividers
    lightBg: [250, 245, 255] as [number, number, number], // Purple 50 (#faf5ff)
  };

  const layout = template?.layout && template.layout.length > 0 ? template.layout : undefined;
  const isBusinessLetter = invoice.templateType === 'business_letter';

  // --- 1. Create Effective Data (Same as InvoicePreview.tsx) ---
  const effectivePaymentMeans = invoice.paymentMeans?.iban ? invoice.paymentMeans : (profile?.bankAccount ? {
    type: 'BankTransfer' as const,
    iban: profile.bankAccount.iban,
    bic: profile.bankAccount.bic,
    accountName: profile.bankAccount.accountName,
  } : undefined);

  const effectiveSeller = {
    ...profile,
    ...(template?.seller || {}),
    ...invoice.seller,
    address: {
        ...(profile?.address || {}),
        ...(template?.seller?.address || {}),
        ...(invoice.seller?.address || {})
    }
  };

  const effectiveNote = invoice.note || template?.defaultPaymentTerms?.note || '';
  const effectiveLogo = template?.logoUrl || profile?.logoUrl;
  const effectiveHeaderHtml = template?.headerText || profile?.headerText;
  const effectiveFooterHtml = template?.footerText || profile?.footerText;

  // --- 2. Header Decoration ---
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // --- 3. Positional Helper ---
  const getPos = (type: string, defaultX: number, defaultY: number, defaultW: number, defaultH: number) => {
    if (layout) {
      const el = layout.find(e => e.type === type);
      if (el) {
        if (el.visible != false) {
          let adjustedY = el.y;
          if (el.y > itemsPos.y) {
            adjustedY += tableShift;
          }
          return { x: el.x, y: adjustedY, w: defaultW, h: defaultH, visible: true, fromLayout: true, fontSize: el.fontSize };
        } else {
          return { x: 0, y: 0, w: defaultW, h: defaultH, visible: false, fromLayout: true, fontSize: el.fontSize };
        }
      }
    }
    return { x: defaultX, y: defaultY, w: defaultW, h: defaultH, visible: true, fromLayout: false, fontSize: undefined };
  };

  let tableShift = 0;
  const rawItemsPos = layout?.find(e => e.type === 'items');
  const itemsPos = rawItemsPos ? { x: rawItemsPos.x, y: rawItemsPos.y, w: pageWidth - (margin * 2), h: 200, visible: rawItemsPos.visible, fromLayout: true } 
                             : { x: margin, y: 320, w: pageWidth - (margin * 2), h: 200, visible: true, fromLayout: false };
  // --- 4. Pagination Helper ---
  const checkPageOverflow = (requiredHeight: number) => {
    const threshold = pageHeight - 120; // Increased room for taller footer
    if (currentY + requiredHeight > threshold) {
      doc.addPage();
      // Redraw top accent bar on new page
      doc.setFillColor(...colors.primary);
      doc.rect(0, 0, pageWidth, 6, 'F');
      currentY = 60; // Reset Y with some top padding
      return true;
    }
    return false;
  };

  // --- 4. Render Sections in Hierarchy ---

  // Logo
  const logoPos = getPos('logo', margin, 35, 120, 50);
  if (logoPos.visible) {
    if (effectiveLogo) {
      try {
        const img = await loadImage(effectiveLogo);
        const aspectRatio = img.width / img.height;
        let renderW = logoPos.w;
        let renderH = logoPos.w / aspectRatio;
        if (renderH > logoPos.h) {
          renderH = logoPos.h;
          renderW = renderH * aspectRatio;
        }
        doc.addImage(img, 'PNG', logoPos.x, logoPos.y, renderW, renderH);
      } catch (error) {
        console.warn('Could not load logo:', error);
      }
    }
  }

  // Header Text
  const headerPos = getPos('header', margin, 100, 300, 40);
  if (effectiveHeaderHtml && headerPos.visible) {
    await renderHtmlContent(doc, effectiveHeaderHtml, headerPos.x, headerPos.y, headerPos.w, colors.textMuted);
  }

  // Title & Number (Grouped like UI)
  const titlePos = getPos('title', margin, 120, 300, 60);
  if (titlePos.visible) {
    const titleFs = titlePos.fontSize || 26;
    const titleSubFs = Math.max(9, Math.round(titleFs * 0.46));
    doc.setFontSize(titleFs);
    doc.setFont('helvetica', 'normal'); // Match web view: font-light (not bold)
    doc.setTextColor(...colors.primary);
    doc.text(isBusinessLetter ? (invoice.title || 'Business Letter') : (effectiveSeller.name || 'INVOICE'), titlePos.x, titlePos.y + 25);

    doc.setFontSize(titleSubFs + 2); // Slightly larger invoice number to match web's heading-2
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.textMuted);
    doc.text(isBusinessLetter ? `Ref: ${invoice.invoiceNumber || 'N/A'}` : String(invoice.invoiceNumber || 'N/A'), titlePos.x, titlePos.y + 45);
  }

  // Dates
  const datesPos = getPos('dates', pageWidth - margin - 150, 120, 150, 60);
  if (datesPos.visible) {
    const dateValFs = datesPos.fontSize || 11;
    const dateLblFs = Math.max(7, Math.round(dateValFs * 0.82));
    let curY = datesPos.y + 15;
    doc.setFontSize(dateLblFs);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textMuted);
    doc.text('ISSUE DATE', pageWidth - margin, curY, { align: 'right' });

    curY += 15;
    doc.setFontSize(dateValFs);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text(formatDate(invoice.issueDate), pageWidth - margin, curY, { align: 'right' });

    if (invoice.dueDate) {
      curY += 20;
      doc.setFontSize(dateLblFs);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.textMuted);
      doc.text('DUE DATE', pageWidth - margin, curY, { align: 'right' });

      curY += 15;
      doc.setFontSize(dateValFs);
      doc.setTextColor(...colors.text);
      doc.text(formatDate(invoice.dueDate), pageWidth - margin, curY, { align: 'right' });
    }
  }

  // Seller & Buyer — buyer always LEFT, seller always RIGHT (matches web view convention).
  // We still use template y/fontSize/visibility, but ignore template x so columns never swap.
  const rawBuyerLayout = layout?.find(e => e.type === 'buyer');
  const rawSellerLayout = layout?.find(e => e.type === 'seller');
  const partyY = Math.max(rawBuyerLayout?.y ?? 210, rawSellerLayout?.y ?? 210);
  const buyerPos = {
    x: margin,
    y: partyY,
    w: 250, h: 100,
    visible: rawBuyerLayout ? rawBuyerLayout.visible !== false : true,
    fontSize: rawBuyerLayout?.fontSize,
  };
  const sellerPos = {
    x: pageWidth / 2 + 20,
    y: partyY,
    w: 250, h: 100,
    visible: rawSellerLayout ? rawSellerLayout.visible !== false : true,
    fontSize: rawSellerLayout?.fontSize,
  };

  const renderParty = (title: string, data: any, x: number, y: number, baseFontSize?: number) => {
    const nameFs = baseFontSize || 11;
    const detailFs = Math.max(7, Math.round(nameFs * 0.82));
    const labelFs = Math.max(6, Math.round(nameFs * 0.73));
    let curY = y + 10;
    doc.setFontSize(labelFs);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textMuted);
    doc.text(title.toUpperCase(), x, curY);
    curY += 15;

    doc.setFontSize(nameFs);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(String(data.name || ''), x, curY);
    curY += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(detailFs);
    doc.setTextColor(...colors.textMuted);
    if (data.vatId) {
      doc.text(`VAT: ${String(data.vatId)}`, x, curY);
      curY += 12;
    }

    if (data.address) {
      if (data.address.street) {
        doc.text(String(data.address.street), x, curY);
        curY += 12;
      }
      const pc = [data.address.postalCode, data.address.city].filter(Boolean).join(' ');
      if (pc) {
        doc.text(pc, x, curY);
        curY += 12;
      }
      if (data.address.country) {
        doc.text(String(data.address.country), x, curY);
      }
    }
  };

  if (buyerPos.visible) renderParty(isBusinessLetter ? 'To' : 'Bill To', invoice.buyer, buyerPos.x, buyerPos.y, buyerPos.fontSize);
  if (sellerPos.visible) renderParty('From', effectiveSeller, sellerPos.x, sellerPos.y, sellerPos.fontSize);

  // Initialize currentY — letters don't have an items section so ignore itemsPos.y
  let currentY = isBusinessLetter
    ? Math.max(buyerPos.y + 130, sellerPos.y + 130)
    : Math.max(buyerPos.y + 80, sellerPos.y + 80, itemsPos.y);

  // Items Table — invoices only
  if (itemsPos.visible && !isBusinessLetter) {
    const tableData = invoice.lines.map((line, index) => [
      (index + 1).toString(),
      line.description,
      line.quantity.toString(),
      formatCurrency(line.unitPrice, invoice.currency),
      `${line.taxPercent}%`,
      formatCurrency(line.quantity * line.unitPrice, invoice.currency),
    ]);

    autoTable(doc, {
      startY: itemsPos.y,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Amount']],
      body: tableData,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: itemsPos.fontSize || 9, cellPadding: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text },
      headStyles: { fillColor: colors.lightBg, textColor: colors.textMuted, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 30, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold', textColor: colors.text } },
      margin: { left: margin, right: margin },
    });

    const tableBottom = (doc as any).lastAutoTable.finalY || (itemsPos.y + 20);
    tableShift = itemsPos.fromLayout ? (tableBottom - (itemsPos.y + itemsPos.h)) : 0;
    currentY = tableBottom + 30;
  }

  // Business letter body — rendered directly (no template layout required)
  if (isBusinessLetter) {
    const contentWidth = pageWidth - margin * 2;

    // Subject
    if (invoice.note) {
      checkPageOverflow(22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.text);
      const subjectLines = doc.splitTextToSize(`Re: ${invoice.note}`, contentWidth);
      doc.text(subjectLines, margin, currentY);
      currentY += subjectLines.length * 14 + 8;
    }

    // Divider
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 20;

    // Salutation
    if (invoice.salutation) {
      checkPageOverflow(20);
      const salLines = doc.splitTextToSize(String(invoice.salutation), contentWidth);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(salLines, margin, currentY);
      currentY += salLines.length * 14 + 12;
    }

    // Body — strip HTML tags for plain-text PDF rendering
    const rawBody = ((invoice as any).body || '')
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
      const paragraphs = rawBody.split('\n\n');
      for (const para of paragraphs) {
        const paraLines = doc.splitTextToSize(para.replace(/\n/g, ' ').trim(), contentWidth);
        checkPageOverflow(paraLines.length * 14 + 10);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        doc.text(paraLines, margin, currentY);
        currentY += paraLines.length * 14 + 10;
      }
      currentY += 8;
    }

    // Closing + signature line
    if (invoice.closing) {
      checkPageOverflow(80);
      const closeLines = doc.splitTextToSize(String(invoice.closing), 200);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(closeLines, margin, currentY);
      currentY += closeLines.length * 14 + 44;

      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY, margin + 160, currentY);
      currentY += 14;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.textMuted);
      doc.text(String(effectiveSeller.name || ''), margin, currentY);
    }
  }

  // --- 5. Render Post-Table Dynamic Flow ---
  // Elements that should follow the flow after the items table
  const flowTypes = ['totals', 'tax_summary', 'notes', 'signature', 'qr', 'to', 'description'];
  const flowElements = template?.layout?.filter(el => el.visible != false && flowTypes.includes(el.type)) || [];
  
  // Sort by original layout order (as seen in UI)
  for (const el of flowElements) {
    if (el.type === 'totals') {
      const showTaxSummary = layout ? layout.find(e => e.type === 'tax_summary')?.visible === true : true;
      checkPageOverflow(120);
      
      const totalsPos = getPos('totals', pageWidth - margin - 200, currentY, 200, 100);
      const totalsValFs = totalsPos.fontSize || 11;
      const totalsLblFs = Math.max(7, Math.round(totalsValFs * 0.82));
      let curY = currentY;
      const drawRow = (lbl: string, val: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? totalsValFs : totalsLblFs);
        if (bold) {
          doc.setTextColor(...colors.accent);
        } else {
          doc.setTextColor(...colors.textMuted);
        }
        doc.text(lbl, totalsPos.x, curY);
        doc.setTextColor(...(bold ? colors.accent : colors.text));
        doc.text(val, pageWidth - margin, curY, { align: 'right' });
        curY += bold ? 20 : 15;
      };

      drawRow('Subtotal', formatCurrency(invoice.lineExtensionAmount, invoice.currency));
      if (!showTaxSummary) {
        invoice.taxTotals.filter(t => t.taxAmount > 0).forEach(t => drawRow(`${t.taxType} (${t.taxPercent}%)`, formatCurrency(t.taxAmount, invoice.currency)));
      }
      doc.setDrawColor(...colors.border);
      doc.line(totalsPos.x, curY - 5, pageWidth - margin, curY - 5);
      curY += 10;
      drawRow('TOTAL', formatCurrency(invoice.payableAmount, invoice.currency), true);
      currentY = curY + 30;
    }

    if (el.type === 'tax_summary' && invoice.taxTotals.length > 0) {
      const taxFs = el.fontSize || 8;
      checkPageOverflow(80 + (invoice.taxTotals.length * 25));
      doc.setFontSize(Math.round(taxFs * 1.125));
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.textMuted);
      doc.text('TAX SUMMARY', margin, currentY);

      const taxData = invoice.taxTotals.map(t => [
        t.taxType,
        `${t.taxPercent}%`,
        formatCurrency(t.taxableAmount, invoice.currency),
        formatCurrency(t.taxAmount, invoice.currency)
      ]);

      autoTable(doc, {
        startY: currentY + 15,
        head: [['Tax Type', '%', 'Taxable Amount', 'Amount']],
        body: taxData,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: taxFs, cellPadding: 6, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text },
        headStyles: { fillColor: colors.lightBg, textColor: colors.textMuted, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: margin, right: margin },
      });
      currentY = (doc as any).lastAutoTable.finalY + 30;
    }

    if (el.type === 'notes' && effectiveNote) {
      const notesFs = el.fontSize || 9;
      const notesWidth = 400;
      const lines = doc.splitTextToSize(effectiveNote, notesWidth);
      const notesHeight = (lines.length * (notesFs + 3)) + 40;
      checkPageOverflow(notesHeight);

      doc.setFontSize(notesFs);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.textMuted);
      doc.text('NOTES', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(lines, margin, currentY + 15);
      currentY += (lines.length * (notesFs + 3)) + 30;
    }

    if (el.type === 'signature') {
      const signaturePos = getPos('signature', pageWidth - margin - 180, currentY, 180, 50);
      checkPageOverflow(80);
      const sigY = currentY;
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(signaturePos.x, sigY + 35, signaturePos.x + signaturePos.w, sigY + 35);
      doc.setFontSize(signaturePos.fontSize || 8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.textMuted);
      doc.text('SIGNATURE', signaturePos.x + signaturePos.w / 2, sigY + 48, { align: 'center' });
      currentY += 60;
    }

    if (el.type === 'qr' && effectivePaymentMeans?.iban) {
      checkPageOverflow(160);
      const qrSectionY = currentY;
      const qrSize = 100;
      const qrX = pageWidth - margin - qrSize;
      
      // 1. Render Textual Payment Details on the Left
      let payY = qrSectionY;
      const qrFs = el.fontSize || 9;
      const qrValFs = Math.round(qrFs * 1.11);
      const qrLblFs = Math.max(6, Math.round(qrFs * 0.78));
      const drawPayRow = (lbl: string, val: string) => {
        doc.setFontSize(qrLblFs);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.textMuted);
        doc.text(lbl.toUpperCase(), margin, payY);
        payY += 10;
        doc.setFontSize(qrValFs);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        doc.text(val, margin, payY);
        payY += 15;
      };

      doc.setFontSize(qrFs);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('PAYMENT DETAILS', margin, payY);
      payY += 18;
      
      if (effectivePaymentMeans.accountName) drawPayRow('Account Owner', effectivePaymentMeans.accountName);
      drawPayRow('IBAN', effectivePaymentMeans.iban);
      if (effectivePaymentMeans.bic) drawPayRow('BIC', effectivePaymentMeans.bic);

      // 2. Render QR Code on the Right
      try {
        const qrCodeDataURL = await getQRCodeDataURL({ ...invoice, paymentMeans: effectivePaymentMeans }, undefined, 400);
        if (qrCodeDataURL) {
          doc.addImage(qrCodeDataURL, 'PNG', qrX, qrSectionY, qrSize, qrSize);
          doc.setFontSize(qrFs);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.primary);
          doc.text('GiroCode / QR Pay', qrX + qrSize/2, qrSectionY + qrSize + 12, { align: 'center' });
          doc.setFontSize(qrLblFs);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.textMuted);
          doc.text('Scan with your banking app', qrX + qrSize/2, qrSectionY + qrSize + 22, { align: 'center' });
        }
      } catch (e) {
        console.warn('QR error:', e);
      }
      currentY = Math.max(payY, qrSectionY + 110) + 20;
    }

    if (el.type === 'to') {
      const partyPos = getPos('to', el.x, el.y, el.w, el.h);
      renderParty('Recipient', invoice.buyer, partyPos.x, partyPos.y);
      currentY = Math.max(currentY, partyPos.y + 80);
    }

    if (el.type === 'description') {
      const descPos = getPos('description', el.x, el.y, el.w, el.h);
      const blockWidth = el.w || (pageWidth - margin * 2);
      let blockY = descPos.y + 10;

      // Salutation
      if (invoice.salutation) {
        const salLines = doc.splitTextToSize(invoice.salutation, blockWidth);
        checkPageOverflow(salLines.length * 14 + 8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        doc.text(salLines, descPos.x, blockY);
        blockY += salLines.length * 14 + 10;
      }

      // Body — strip HTML tags for PDF plain-text rendering
      const rawBody = (invoice.body || '').replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (rawBody) {
        const bodyLines = doc.splitTextToSize(rawBody, blockWidth);
        checkPageOverflow(bodyLines.length * 14 + 8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        doc.text(bodyLines, descPos.x, blockY);
        blockY += bodyLines.length * 14 + 16;
      }

      // Closing
      if (invoice.closing) {
        const closeLines = doc.splitTextToSize(invoice.closing, blockWidth);
        checkPageOverflow(closeLines.length * 14 + 8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        doc.text(closeLines, descPos.x, blockY);
        blockY += closeLines.length * 14 + 8;
      }

      currentY = blockY + 20;
    }
  }

  // --- 6. Fallback rendering when no template layout (e.g. SharedInvoiceView) ---
  // Without a layout, flowElements is empty so totals and QR are never rendered above.
  if (!layout && !isBusinessLetter) {
    // Totals
    checkPageOverflow(120);
    const totalsX = pageWidth - margin - 200;
    const totalsValFs = 11;
    const totalsLblFs = 9;
    let curY = currentY;
    const drawFallbackRow = (lbl: string, val: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? totalsValFs : totalsLblFs);
      doc.setTextColor(...(bold ? colors.accent : colors.textMuted));
      doc.text(lbl, totalsX, curY);
      doc.setTextColor(...(bold ? colors.accent : colors.text));
      doc.text(val, pageWidth - margin, curY, { align: 'right' });
      curY += bold ? 20 : 15;
    };

    drawFallbackRow('Subtotal', formatCurrency(invoice.lineExtensionAmount, invoice.currency));
    invoice.taxTotals.filter(t => t.taxAmount > 0).forEach(t => drawFallbackRow(`${t.taxType} (${t.taxPercent}%)`, formatCurrency(t.taxAmount, invoice.currency)));
    doc.setDrawColor(...colors.border);
    doc.line(totalsX, curY - 5, pageWidth - margin, curY - 5);
    curY += 10;
    drawFallbackRow('TOTAL', formatCurrency(invoice.payableAmount, invoice.currency), true);
    currentY = curY + 30;

    // QR Code + Payment Details
    if (effectivePaymentMeans?.iban) {
      checkPageOverflow(160);
      const qrSectionY = currentY;
      const qrSize = 100;
      const qrX = pageWidth - margin - qrSize;

      let payY = qrSectionY;
      const qrLblFs = 7;
      const qrValFs = 10;
      const drawPayRow = (lbl: string, val: string) => {
        doc.setFontSize(qrLblFs);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.textMuted);
        doc.text(lbl.toUpperCase(), margin, payY);
        payY += 10;
        doc.setFontSize(qrValFs);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        doc.text(val, margin, payY);
        payY += 15;
      };

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('PAYMENT DETAILS', margin, payY);
      payY += 18;

      if (effectivePaymentMeans.accountName) drawPayRow('Account Owner', effectivePaymentMeans.accountName);
      drawPayRow('IBAN', effectivePaymentMeans.iban);
      if (effectivePaymentMeans.bic) drawPayRow('BIC', effectivePaymentMeans.bic);

      try {
        const qrCodeDataURL = await getQRCodeDataURL({ ...invoice, paymentMeans: effectivePaymentMeans }, undefined, 400);
        if (qrCodeDataURL) {
          doc.addImage(qrCodeDataURL, 'PNG', qrX, qrSectionY, qrSize, qrSize);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.primary);
          doc.text('GiroCode / QR Pay', qrX + qrSize / 2, qrSectionY + qrSize + 12, { align: 'center' });
          doc.setFontSize(qrLblFs);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.textMuted);
          doc.text('Scan with your banking app', qrX + qrSize / 2, qrSectionY + qrSize + 22, { align: 'center' });
        }
      } catch (e) {
        console.warn('QR error:', e);
      }
      currentY = Math.max(payY, qrSectionY + 110) + 20;
    }
  }

  // Footer
  if (effectiveFooterHtml) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...colors.border);
        doc.line(margin, pageHeight - 80, pageWidth - margin, pageHeight - 80);
        await renderHtmlContent(doc, effectiveFooterHtml, margin, pageHeight - 70, pageWidth - margin*2, colors.textMuted);
    }
  }

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

async function renderHtmlContent(doc: jsPDF, html: string, x: number, y: number, width: number, color: [number, number, number]): Promise<number> {
  const { default: html2canvas } = await import('html2canvas');
  const container = document.createElement('div');
  container.style.width = width + 'pt';
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.fontSize = '8pt';
  container.style.color = `rgb(${color.join(',')})`;
  container.style.textAlign = 'center';
  container.innerHTML = html;
  document.body.appendChild(container);
  
  const canvas = await html2canvas(container, { scale: 3, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const h = (canvas.height * width) / canvas.width;
  doc.addImage(imgData, 'PNG', x, y, width, h);
  document.body.removeChild(container);
  return h;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
