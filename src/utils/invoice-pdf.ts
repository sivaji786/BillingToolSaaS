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
    secondary: [139, 92, 246] as [number, number, number], // Violet 500
    text: [15, 23, 42] as [number, number, number], // Slate 900
    textMuted: [100, 116, 139] as [number, number, number], // Slate 500
    border: [226, 232, 240] as [number, number, number], // Slate 200
  };

  const layout = template?.layout && template.layout.length > 0 ? template.layout : undefined;

  // Helper values
  const logoUrl = template?.logoUrl || profile?.logoUrl;
  const headerText = template?.headerText || profile?.headerText;

  // Fallback payment means
  const effectivePaymentMeans = invoice.paymentMeans?.iban ? invoice.paymentMeans : (profile?.bankAccount ? {
    type: 'BankTransfer' as const,
    iban: profile.bankAccount.iban,
    bic: profile.bankAccount.bic,
    accountName: profile.bankAccount.accountName,
  } : undefined);

  // --- Header Decoration ---
  // Top purple accent line (simulating the gradient)
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Helper function for layout positioning
  const getPos = (type: string, defaultX: number, defaultY: number, defaultW: number, defaultH: number) => {
    if (layout) {
      const el = layout.find(e => e.type === type);
      if (el) {
        if (el.visible) {
          return { x: el.x, y: el.y, w: el.w, h: el.h, visible: true, fromLayout: true };
        } else {
          return { x: 0, y: 0, w: 0, h: 0, visible: false, fromLayout: true };
        }
      }
    }
    return { x: defaultX, y: defaultY, w: defaultW, h: defaultH, visible: true, fromLayout: false };
  };

  // 1. Logo
  const logoPos = getPos('logo', margin, 30, 150, 60);
  if (logoUrl && logoPos.visible) {
    try {
      const img = await loadImage(logoUrl);
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

  // 1.5 Header Text (Company Info usually centered or right)
  const headerPos = getPos('header', pageWidth - margin - 250, 30, 250, 60);
  if (headerText && headerPos.visible) {
    // Render HTML header text
    await renderHtmlContent(doc, headerText, headerPos.x, headerPos.y, headerPos.w, colors.textMuted);
  }

  // 2. Invoice Title & Number
  const titlePos = getPos('title', margin, 110, 300, 50);
  if (titlePos.visible) {
    // Seller Name Large
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    const sellerName = invoice.seller.name || profile?.name || 'INVOICE';
    doc.text(sellerName, titlePos.x, titlePos.y + 20);

    // Invoice Number
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.text(invoice.invoiceNumber, titlePos.x, titlePos.y + 45);
  }

  // 3. Dates (Right Aligned)
  const datesPos = getPos('dates', pageWidth - margin - 150, 110, 150, 60);
  if (datesPos.visible) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let curY = datesPos.y + 15;

    doc.setTextColor(...colors.textMuted);
    doc.text('Issue Date', datesPos.x, curY);
    doc.setTextColor(...colors.text);
    doc.text(formatDate(invoice.issueDate), pageWidth - margin, curY, { align: 'right' });

    if (invoice.dueDate) {
      curY += 15;
      doc.setTextColor(...colors.textMuted);
      doc.text('Due Date', datesPos.x, curY);
      doc.setTextColor(...colors.text);
      doc.text(formatDate(invoice.dueDate), pageWidth - margin, curY, { align: 'right' });
    }
  }

  // Separator Line
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(1);
  doc.line(margin, 175, pageWidth - margin, 175);

  // 4. Seller and Buyer (Grid Layout)
  const sellerPos = getPos('seller', margin, 190, 250, 100);
  const buyerPos = getPos('buyer', pageWidth / 2 + 20, 190, 250, 100);

  // Helper to render address
  const renderAddress = (title: string, data: any, x: number, y: number) => {
    let curY = y + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textMuted);
    doc.text(title, x, curY);
    curY += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(data.name, x, curY);
    curY += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colors.text);

    if (data.vatId) {
      doc.setTextColor(...colors.textMuted);
      doc.text(`VAT: ${data.vatId}`, x, curY);
      doc.setTextColor(...colors.text);
      curY += 12;
    }

    doc.text(data.address.street, x, curY);
    curY += 12;
    doc.text(`${data.address.postalCode} ${data.address.city}`, x, curY);
    curY += 12;
    doc.text(data.address.country, x, curY);
  };

  if (sellerPos.visible) renderAddress('From', invoice.seller, sellerPos.x, sellerPos.y);
  if (buyerPos.visible) renderAddress('Bill To', invoice.buyer, buyerPos.x, buyerPos.y);


  // 5. Line Items Table
  let currentY = 320;
  const itemsPos = getPos('items', margin, 320, pageWidth - (margin * 2), 300);

  if (itemsPos.visible) {
    const tableStartY = itemsPos.fromLayout ? itemsPos.y : Math.max(itemsPos.y, currentY);

    const tableData = invoice.lines.map((line, index) => {
      const lineTotal = line.quantity * line.unitPrice;
      return [
        (index + 1).toString(),
        line.description,
        line.quantity.toString(),
        formatCurrency(line.unitPrice, invoice.currency),
        `${line.taxPercent}%`,
        formatCurrency(lineTotal, invoice.currency),
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Amount']],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 8,
        lineColor: colors.border,
        lineWidth: 0.5,
        textColor: colors.text,
      },
      headStyles: {
        fillColor: colors.primary, // Purple Header
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center', textColor: colors.textMuted },
        1: { cellWidth: 'auto' }, // Description
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 70, halign: 'right' },
        4: { cellWidth: 40, halign: 'right' },
        5: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        // Footer page numbers could go here
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // 6. Totals Section
  const totalsPos = getPos('totals', pageWidth - margin - 220, currentY, 220, 100);
  if (totalsPos.visible) {
    let curY = currentY;
    const labelX = totalsPos.x;
    const valueX = pageWidth - margin;

    const printRow = (label: string, value: string, isTotal = false) => {
      doc.setFontSize(isTotal ? 12 : 10);
      doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
      const color = isTotal ? colors.primary : colors.textMuted;
      doc.setTextColor(...color);
      doc.text(label, labelX, curY);

      doc.setTextColor(...colors.text);
      if (isTotal) {
        doc.setTextColor(...colors.primary);
        doc.setFontSize(14); // Larger total
      }
      doc.text(value, valueX, curY, { align: 'right' });
      curY += isTotal ? 20 : 15;
    };

    printRow('Subtotal', formatCurrency(invoice.lineExtensionAmount, invoice.currency));

    invoice.taxTotals.forEach((tax) => {
      printRow(`${tax.taxType} (${tax.taxPercent}%)`, formatCurrency(tax.taxAmount, invoice.currency));
    });

    // Divider
    doc.setLineWidth(1);
    doc.setDrawColor(...colors.border);
    doc.line(labelX, curY - 5, valueX, curY - 5);
    curY += 10;

    printRow('Total', formatCurrency(invoice.payableAmount, invoice.currency), true);

    currentY = Math.max(currentY, curY + 10);
  }

  // 7. Notes & Terms
  const notesPos = getPos('notes', margin, currentY, 300, 80);
  if (invoice.note && notesPos.visible) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textMuted);
    doc.text('Notes', margin, currentY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    const lines = doc.splitTextToSize(invoice.note, 300);
    doc.text(lines, margin, currentY + 15);

    currentY += (lines.length * 12) + 20;
  }

  // 8. Payment & QR (Bottom Area)
  const qrPos = getPos('qr', pageWidth - margin - 100, currentY, 100, 100);
  const paymentInfoVisible = !!(invoice.paymentTerms?.note || effectivePaymentMeans?.iban);

  // Ensure we don't run off page
  if (currentY > pageHeight - 150) {
    doc.addPage();
    currentY = 50;
  }

  if (paymentInfoVisible) {
    const startY = currentY;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.textMuted);
    doc.text('Payment Information', margin, startY);

    let textY = startY + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);

    if (invoice.paymentTerms?.note) {
      const lines = doc.splitTextToSize(invoice.paymentTerms.note, 300);
      doc.text(lines, margin, textY);
      textY += (lines.length * 11) + 5;
    }

    if (effectivePaymentMeans?.iban) {
      doc.text(`IBAN: ${effectivePaymentMeans.iban}`, margin, textY);
      textY += 11;
      if (effectivePaymentMeans.bic) {
        doc.text(`BIC: ${effectivePaymentMeans.bic}`, margin, textY);
        textY += 11;
      }
      if (effectivePaymentMeans.accountName) {
        doc.text(`Account: ${effectivePaymentMeans.accountName}`, margin, textY);
      }
    }
  }

  if (effectivePaymentMeans?.iban && qrPos.visible) {
    try {
      const qrSize = 80;
      const invoiceForQR = { ...invoice, paymentMeans: effectivePaymentMeans };
      const qrCodeDataURL = await getQRCodeDataURL(invoiceForQR, undefined, 200);
      if (qrCodeDataURL) {
        doc.addImage(qrCodeDataURL, 'PNG', pageWidth - margin - qrSize - 10, currentY, qrSize, qrSize);
        doc.setFontSize(8);
        doc.setTextColor(...colors.textMuted);
        doc.text('Scan to Pay', pageWidth - margin - (qrSize / 2) - 10, currentY + qrSize + 10, { align: 'center' });
      }
    } catch (e) {
      console.warn(e);
    }
  }

  // 9. Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...colors.textMuted);

    // Bottom line
    doc.setDrawColor(...colors.border);
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);

    const footerText = `Page ${i} of ${pageCount}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 25, { align: 'center' });

    // Add company footer text if it exists
    if (headerText) { // Reuse header text logic or profile text for footer?
      // Optional: add small copyright or company info
    }
  }

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

/**
 * Renders HTML content (rich text with images) to a jsPDF instance
 * by temporarily rendering to a hidden DOM element and capturing it.
 */
async function renderHtmlContent(
  doc: jsPDF,
  html: string,
  x: number,
  y: number,
  width: number,
  defaultColor: [number, number, number] = [156, 163, 175] // lightGray
): Promise<number> {
  if (!html || !html.trim()) return 0;

  try {
    const { default: html2canvas } = await import('html2canvas');

    const container = document.createElement('div');
    // Use a scaling factor to match PDF points/pixels
    container.style.width = width + 'pt';
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.className = 'richtext-pdf-render';

    // Set basic styles to approximate PDF look
    container.style.fontSize = '9pt'; // Increased from 8pt for better visibility
    container.style.lineHeight = '1.4';
    container.style.color = `rgb(${defaultColor.join(',')})`;
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.textAlign = 'center';
    container.style.padding = '5px';

    container.innerHTML = html;

    // Ensure images have cross-origin or are base64
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      img.style.maxWidth = '100%'; // Allow image to fill container width
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '5px auto';
    });

    document.body.appendChild(container);

    // Wait a bit for images to load
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(container, {
      scale: 2, // High resolution for PDF
      backgroundColor: null,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const renderedWidth = width;
    const renderedHeight = (canvas.height * renderedWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', x, y, renderedWidth, renderedHeight);

    document.body.removeChild(container);
    return renderedHeight;
  } catch (error) {
    console.warn('Could not render HTML content for PDF, falling back to plain text:', error);

    // Fallback: render as plain text if html2canvas fails
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainText) {
      doc.setFontSize(9);
      doc.setTextColor(...defaultColor);
      const lines = doc.splitTextToSize(plainText, width);
      doc.text(lines, x + width / 2, y, { align: 'center' });
      return lines.length * 12; // Approximate height
    }

    return 0;
  }
}

// Helper function to load images
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
