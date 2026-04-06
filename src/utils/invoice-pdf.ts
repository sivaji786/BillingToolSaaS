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
        if (el.visible) {
          let adjustedY = el.y;
          if (el.y > itemsPos.y) {
            adjustedY += tableShift;
          }
          return { x: el.x, y: adjustedY, w: el.w, h: el.h, visible: true, fromLayout: true };
        } else {
          return { x: 0, y: 0, w: 0, h: 0, visible: false, fromLayout: true };
        }
      }
    }
    return { x: defaultX, y: defaultY, w: defaultW, h: defaultH, visible: true, fromLayout: false };
  };

  let tableShift = 0;
  const rawItemsPos = layout?.find(e => e.type === 'items');
  const itemsPos = rawItemsPos ? { x: rawItemsPos.x, y: rawItemsPos.y, w: rawItemsPos.w, h: rawItemsPos.h, visible: rawItemsPos.visible, fromLayout: true } 
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
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(effectiveSeller.name || 'INVOICE', titlePos.x, titlePos.y + 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.textMuted);
    doc.text(String(invoice.invoiceNumber || 'N/A'), titlePos.x, titlePos.y + 45);
  }

  // Dates
  const datesPos = getPos('dates', pageWidth - margin - 150, 120, 150, 60);
  if (datesPos.visible) {
    let curY = datesPos.y + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textMuted);
    doc.text('ISSUE DATE', pageWidth - margin, curY, { align: 'right' });
    
    curY += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text(formatDate(invoice.issueDate), pageWidth - margin, curY, { align: 'right' });

    if (invoice.dueDate) {
      curY += 20;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.textMuted);
      doc.text('DUE DATE', pageWidth - margin, curY, { align: 'right' });
      
      curY += 15;
      doc.setFontSize(11);
      doc.setTextColor(...colors.text);
      doc.text(formatDate(invoice.dueDate), pageWidth - margin, curY, { align: 'right' });
    }
  }

  // Seller & Buyer
  const sellerPos = getPos('seller', pageWidth / 2 + 20, 210, 250, 100);
  const buyerPos = getPos('buyer', margin, 210, 250, 100);

  const renderParty = (title: string, data: any, x: number, y: number) => {
    let curY = y + 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textMuted);
    doc.text(title.toUpperCase(), x, curY);
    curY += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(String(data.name || ''), x, curY);
    curY += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
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

  if (buyerPos.visible) renderParty('Bill To', invoice.buyer, buyerPos.x, buyerPos.y);
  if (sellerPos.visible) renderParty('From', effectiveSeller, sellerPos.x, sellerPos.y);

  // Initialize currentY for sections after the parties
  let currentY = Math.max(buyerPos.y + 80, sellerPos.y + 80, itemsPos.y);

  // Items Table
  if (itemsPos.visible) {
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
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text },
      headStyles: { fillColor: colors.lightBg, textColor: colors.textMuted, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 30, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold', textColor: colors.text } },
      margin: { left: margin, right: margin },
    });

    const tableBottom = (doc as any).lastAutoTable.finalY || (itemsPos.y + 20);
    tableShift = itemsPos.fromLayout ? (tableBottom - (itemsPos.y + itemsPos.h)) : 0;
    currentY = tableBottom + 30;
  }

  // --- 5. Render Post-Table Dynamic Flow ---
  // Elements that should follow the flow after the items table
  const flowTypes = ['totals', 'tax_summary', 'notes', 'signature', 'qr'];
  const flowElements = template?.layout?.filter(el => el.visible && flowTypes.includes(el.type)) || [];
  
  // Sort by original layout order (as seen in UI)
  for (const el of flowElements) {
    if (el.type === 'totals') {
      const showTaxSummary = layout ? layout.find(e => e.type === 'tax_summary')?.visible === true : true;
      checkPageOverflow(120);
      
      const totalsPos = getPos('totals', pageWidth - margin - 200, currentY, 200, 100);
      let curY = currentY; 
      const drawRow = (lbl: string, val: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 11 : 9);
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
        invoice.taxTotals.forEach(t => drawRow(`${t.taxType} (${t.taxPercent}%)`, formatCurrency(t.taxAmount, invoice.currency)));
      }
      doc.setDrawColor(...colors.border);
      doc.line(totalsPos.x, curY - 5, pageWidth - margin, curY - 5);
      curY += 10;
      drawRow('TOTAL', formatCurrency(invoice.payableAmount, invoice.currency), true);
      currentY = curY + 30;
    }

    if (el.type === 'tax_summary' && invoice.taxTotals.length > 0) {
      checkPageOverflow(80 + (invoice.taxTotals.length * 25));
      doc.setFontSize(9);
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
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 6, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text },
        headStyles: { fillColor: colors.lightBg, textColor: colors.textMuted, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: margin, right: margin },
      });
      currentY = (doc as any).lastAutoTable.finalY + 30;
    }

    if (el.type === 'notes' && effectiveNote) {
      const notesWidth = 400;
      const lines = doc.splitTextToSize(effectiveNote, notesWidth);
      const notesHeight = (lines.length * 12) + 40;
      checkPageOverflow(notesHeight);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.textMuted);
      doc.text('NOTES', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.text);
      doc.text(lines, margin, currentY + 15);
      currentY += (lines.length * 12) + 30;
    }

    if (el.type === 'signature') {
      const signaturePos = getPos('signature', pageWidth - margin - 180, currentY, 180, 50);
      checkPageOverflow(80);
      const sigY = currentY;
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.5);
      doc.line(signaturePos.x, sigY + 35, signaturePos.x + signaturePos.w, sigY + 35);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.textMuted);
      doc.text('SIGNATURE', signaturePos.x + signaturePos.w / 2, sigY + 48, { align: 'center' });
      currentY += 60;
    }

    if (el.type === 'qr' && effectivePaymentMeans?.iban) {
      checkPageOverflow(160);
      const qrSectionY = currentY;
      const qrSize = 80;
      const qrX = pageWidth - margin - qrSize;
      
      // 1. Render Textual Payment Details on the Left
      let payY = qrSectionY;
      const drawPayRow = (lbl: string, val: string) => {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.textMuted);
        doc.text(lbl.toUpperCase(), margin, payY);
        payY += 10;
        doc.setFontSize(10);
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

      // 2. Render QR Code on the Right
      try {
        const qrCodeDataURL = await getQRCodeDataURL({ ...invoice, paymentMeans: effectivePaymentMeans }, undefined, 400);
        if (qrCodeDataURL) {
          doc.addImage(qrCodeDataURL, 'PNG', qrX, qrSectionY, qrSize, qrSize);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.primary);
          doc.text('GiroCode / QR Pay', qrX + qrSize/2, qrSectionY + qrSize + 12, { align: 'center' });
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.textMuted);
          doc.text('Scan with your banking app', qrX + qrSize/2, qrSectionY + qrSize + 22, { align: 'center' });
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
