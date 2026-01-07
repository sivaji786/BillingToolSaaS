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
  // margin removed

  // Colors - using black for everything except header/footer
  const black: [number, number, number] = [0, 0, 0]; // #000000
  const lightGray: [number, number, number] = [156, 163, 175]; // Only for header/footer

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

  // Function to get element position
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

  // 1. Logo (max 58px height to fit in 60px container with 2px padding)
  const logoPos = getPos('logo', 20, 20, 170, 58);
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

  // 1.5 Header Text (max 58px height to fit in 60px container with 2px padding)
  const headerPos = getPos('header', 200, 20, 375, 58);
  if (headerText && headerPos.visible) {
    // Determine the alignment from the HTML if possible, or default to left for header
    await renderHtmlContent(doc, headerText, headerPos.x, headerPos.y, headerPos.w, lightGray);
  }

  // 2. Title and Invoice Number
  const titlePos = getPos('title', 20, 90, 200, 40);
  if (titlePos.visible) {
    doc.setFontSize(15);
    doc.setTextColor(...black);
    const title = profile?.name ? profile.name : 'INVOICE';
    doc.text(title, titlePos.x, titlePos.y + 15);

    doc.setFontSize(11);
    doc.setTextColor(...black);
    doc.text(invoice.invoiceNumber, titlePos.x, titlePos.y + 30);
  }

  // 3. Dates
  const datesPos = getPos('dates', 380, 90, 20, 60);
  if (datesPos.visible) {
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text('Issue Date: ' + formatDate(invoice.issueDate), datesPos.x, datesPos.y + 10);

    if (invoice.dueDate) {
      doc.setTextColor(...black);
      doc.text('Due Date: ' + formatDate(invoice.dueDate), datesPos.x, datesPos.y + 25);
    }
  }

  // 4. Seller Info
  const sellerPos = getPos('seller', 20, 160, 260, 100);
  if (sellerPos.visible) {
    let curY = sellerPos.y + 10;
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text('From', sellerPos.x, curY);
    curY += 12;

    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text(invoice.seller.name, sellerPos.x, curY);
    curY += 10;

    doc.setFontSize(9);
    if (invoice.seller.vatId) {
      doc.setTextColor(...lightGray);
      doc.text(`VAT: ${invoice.seller.vatId}`, sellerPos.x, curY);
      curY += 10;
    }

    doc.setTextColor(...black);
    doc.text(invoice.seller.address.street, sellerPos.x, curY);
    curY += 10;
    doc.text(`${invoice.seller.address.postalCode} ${invoice.seller.address.city}`, sellerPos.x, curY);
    curY += 10;
    doc.text(invoice.seller.address.country, sellerPos.x, curY);
  }

  // 5. Buyer Info
  const buyerPos = getPos('buyer', 310, 160, 260, 100);
  if (buyerPos.visible) {
    let curY = buyerPos.y + 10;
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text('Bill To', buyerPos.x, curY);
    curY += 12;

    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text(invoice.buyer.name, buyerPos.x, curY);
    curY += 10;

    doc.setFontSize(9);
    if (invoice.buyer.vatId) {
      doc.setTextColor(...lightGray);
      doc.text(`VAT: ${invoice.buyer.vatId}`, buyerPos.x, curY);
      curY += 10;
    }

    doc.setTextColor(...black);
    doc.text(invoice.buyer.address.street, buyerPos.x, curY);
    curY += 10;
    doc.text(`${invoice.buyer.address.postalCode} ${invoice.buyer.address.city}`, buyerPos.x, curY);
    curY += 10;
    doc.text(invoice.buyer.address.country, buyerPos.x, curY);
  }

  // Track Y position for dynamic flow
  // Estimate end of header section if we need to flow the table
  let currentY = 280; // Start position for line items

  // 6. Items Table
  const itemsPos = getPos('items', 20, 280, 555, 300);

  if (itemsPos.visible) {
    // If using default layout, flow after header. If custom, respect Y (unless overflow handled by autoTable)
    const tableStartY = itemsPos.fromLayout ? itemsPos.y : Math.max(itemsPos.y, currentY + 2);

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
        lineColor: lightGray, // Light gray borders
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [255, 255, 255], // White background
        textColor: [...black],
        fontSize: 9,
        fontStyle: 'bold',
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [...black],
        lineColor: lightGray, // Light gray borders
        lineWidth: 0.5,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 60, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 60, halign: 'right' },
      },
      margin: { left: itemsPos.x, right: pageWidth - (itemsPos.x + itemsPos.w) },
    });

    currentY = (doc as any).lastAutoTable.finalY + 2;
  }

  // getRenderY function removed - now using direct currentY positioning for all elements

  // 7. Totals (dynamic positioning based on currentY)
  const totalsPos = getPos('totals', 350, currentY, 225, 120);
  if (totalsPos.visible) {
    let curY = currentY + 15;
    const labelX = totalsPos.x;
    const valueX = totalsPos.x + totalsPos.w;

    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text('Subtotal:', labelX, curY);
    doc.setTextColor(...black);
    doc.text(formatCurrency(invoice.lineExtensionAmount, invoice.currency), valueX, curY, { align: 'right' });
    curY += 12;

    invoice.taxTotals.forEach((tax) => {
      doc.setTextColor(...lightGray);
      doc.text(`${tax.taxType} (${tax.taxPercent}%):`, labelX, curY);
      doc.setTextColor(...black);
      doc.text(formatCurrency(tax.taxAmount, invoice.currency), valueX, curY, { align: 'right' });
      curY += 12;
    });

    curY += 5;
    doc.setFontSize(11);
    doc.setTextColor(...black);
    doc.text('Total:', labelX, curY);
    doc.setTextColor(...black);
    doc.text(formatCurrency(invoice.payableAmount, invoice.currency), valueX, curY, { align: 'right' });

    currentY = curY + 2;
  }

  // 8. Notes (dynamic positioning based on currentY)
  const notesPos = getPos('notes', 20, currentY, 320, 80);
  if (invoice.note && notesPos.visible) {
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text('Notes:', notesPos.x, currentY + 30);

    doc.setTextColor(...black);
    const noteLines = doc.splitTextToSize(invoice.note, notesPos.w);
    doc.text(noteLines, notesPos.x, currentY + 42);

    // Update currentY based on actual note height
    const noteHeight = noteLines.length * 12 + 22;
    currentY = currentY + noteHeight + 2;
  }

  // 9. Payment Info and QR Code (dynamic positioning based on currentY)
  const qrPos = getPos('qr', 480, currentY, 120, 120);
  const paymentInfoVisible = !!(invoice.paymentTerms?.note || effectivePaymentMeans?.iban);

  if (paymentInfoVisible || qrPos.visible) {
    // Use fixed height for payment section
    const paymentSectionHeight = 120; // Fixed height for payment info + QR code
    const paymentSpacing = 2; // Minimal spacing

    // Check if section fits on current page
    const sectionStartY = currentY + paymentSpacing;
    const sectionEndY = sectionStartY + paymentSectionHeight;

    let renderY = sectionStartY;

    // Only add new page if section truly doesn't fit
    if (sectionEndY > pageHeight - 80) {
      doc.addPage();
      renderY = 50;
      currentY = 50;
    }

    // A. Payment Terms and Bank Info (Left of QR)
    if (paymentInfoVisible) {
      let textY = renderY + 10;
      const textX = 20;
      const textWidth = qrPos.x - textX - 20;

      if (invoice.paymentTerms?.note) {
        doc.setFontSize(9);
        doc.setTextColor(...lightGray);
        doc.text('Payment Terms:', textX, textY);
        textY += 12;
        doc.setTextColor(...black);
        const termLines = doc.splitTextToSize(invoice.paymentTerms.note, textWidth);
        doc.text(termLines, textX, textY);
        textY += (termLines.length * 10) + 5;
      }

      if (effectivePaymentMeans?.iban) {
        doc.setFontSize(9);
        doc.setTextColor(...lightGray);
        doc.text('Payment Information:', textX, textY);
        textY += 12;
        doc.setTextColor(...black);
        doc.text(`IBAN: ${effectivePaymentMeans.iban}`, textX, textY);
        textY += 10;
        if (effectivePaymentMeans.bic) {
          doc.text(`BIC: ${effectivePaymentMeans.bic}`, textX, textY);
          textY += 10;
        }
        if (effectivePaymentMeans.accountName) {
          doc.text(`Account: ${effectivePaymentMeans.accountName}`, textX, textY);
          textY += 10;
        }
      }
    }

    // B. QR Code (Right Side)
    if (effectivePaymentMeans?.iban && qrPos.visible) {
      try {
        const invoiceForQR = { ...invoice, paymentMeans: effectivePaymentMeans };
        const qrCodeDataURL = await getQRCodeDataURL(invoiceForQR, undefined, 200);

        if (qrCodeDataURL) {
          doc.addImage(qrCodeDataURL, 'PNG', qrPos.x, renderY, qrPos.w, qrPos.w);

          doc.setFontSize(8);
          doc.setTextColor(...lightGray);
          doc.text('Scan to pay', qrPos.x + (qrPos.w * 0.9) / 2, renderY + (qrPos.w * 0.9) + 10, { align: 'center' });

          const country = invoice.seller.address.country;
          let qrStandard = 'EPC QR Code';
          if (country === 'CH' || country === 'LI') qrStandard = 'Swiss QR Invoice';
          else if (country === 'DE') qrStandard = 'GiroCode';

          doc.setFontSize(7);
          doc.text(qrStandard, qrPos.x + (qrPos.w * 0.9) / 2, renderY + (qrPos.w * 0.9) + 20, { align: 'center' });
        }
      } catch (error) {
        console.warn('Could not add QR code to PDF:', error);
      }
    }

    currentY = renderY + paymentSectionHeight;
  }

  // 10. Footer
  const footerPos = getPos('footer', 20, 680, 595, 60);
  console.log('--- Footer Rendering Start ---', { footerPos_y: footerPos.y, content_currentY: currentY });
  const rawFooterText = template?.footerText || profile?.footerText;
  if (rawFooterText && footerPos.visible) {
    // Simple approach: place footer after content with some spacing
    // Use fixed height for footer area
    const footerSpacing = 2; // Minimal spacing before footer
    const footerHeight = 60; // Fixed height for footer content

    // Check if we need a new page
    const footerStartY = footerPos.y + footerSpacing;
    const footerEndY = footerStartY + footerHeight;
    const pageBottomMargin = 50; // Leave space for page numbers

    let renderY = footerStartY;

    // Only add new page if footer truly doesn't fit
    if (footerEndY > pageHeight - pageBottomMargin) {
      doc.addPage();
      renderY = 50; // Start near top of new page
      currentY = 50;
    }

    // Draw separator line
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(footerPos.x, renderY, footerPos.x + footerPos.w, renderY);

    // Render footer content
    const footerContentY = renderY + 10;
    const renderedH = await renderHtmlContent(doc, rawFooterText, footerPos.x, footerContentY, footerPos.w);

    currentY = footerContentY + renderedH + 10;
    console.log('--- Footer Rendering End ---', { footer_finalY: currentY });
  }

  // Add Page Numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
  }

  // Save the PDF
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
