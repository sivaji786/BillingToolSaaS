import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, InvoiceTemplate, CompanyProfile } from '../types/invoice';
import { formatCurrency, formatDate } from './invoice-calculations';
import { getQRCodeDataURL } from '../components/invoice/InvoiceQRCode';

export async function generateInvoicePDF(
  invoice: Invoice,
  template?: InvoiceTemplate,
  profile?: CompanyProfile | null
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Colors matching the purple theme
  const primaryColor: [number, number, number] = [139, 92, 246]; // Purple
  const darkGray: [number, number, number] = [55, 65, 81];
  const lightGray: [number, number, number] = [156, 163, 175];

  // Helper values
  const logoUrl = template?.logoUrl || profile?.logoUrl;
  const headerText = template?.headerText || (profile?.headerText ? stripHtml(profile.headerText) : undefined);


  // Fallback payment means
  const effectivePaymentMeans = invoice.paymentMeans?.iban ? invoice.paymentMeans : (profile?.bankAccount ? {
    type: 'BankTransfer' as const,
    iban: profile.bankAccount.iban,
    bic: profile.bankAccount.bic,
    accountName: profile.bankAccount.accountName,
  } : undefined);

  // Logo
  if (logoUrl) {
    try {
      // Try to load and add logo
      const img = await loadImage(logoUrl);
      const logoHeight = 20;
      const logoWidth = (img.width / img.height) * logoHeight;
      doc.addImage(img, 'PNG', pageWidth / 2 - logoWidth / 2, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 10;
    } catch (error) {
      console.warn('Could not load logo:', error);
    }
  }

  // Header Text
  if (headerText) {
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    const headerLines = doc.splitTextToSize(headerText, pageWidth - 2 * margin);
    doc.text(headerLines, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += headerLines.length * 4 + 10;

    // Line separator
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
  }

  // Invoice Title and Number
  doc.setFontSize(15);
  doc.setTextColor(...primaryColor);
  const title = profile?.name ? profile.name : 'INVOICE';
  doc.text(title, margin, yPosition);

  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.text(invoice.invoiceNumber, margin, yPosition + 8);

  // Dates (right aligned)
  doc.setFontSize(9);
  doc.setTextColor(...lightGray);
  doc.text('Issue Date:', pageWidth - margin - 60, yPosition);
  doc.setTextColor(...darkGray);
  doc.text(formatDate(invoice.issueDate), pageWidth - margin, yPosition, { align: 'right' });

  if (invoice.dueDate) {
    yPosition += 6;
    doc.setTextColor(...lightGray);
    doc.text('Due Date:', pageWidth - margin - 60, yPosition);
    doc.setTextColor(...darkGray);
    doc.text(formatDate(invoice.dueDate), pageWidth - margin, yPosition, { align: 'right' });
  }

  yPosition += 20;

  // Parties Information
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;

  // From (Seller)
  doc.setFontSize(9);
  doc.setTextColor(...lightGray);
  doc.text('From', leftColX, yPosition);
  doc.text('Bill To', rightColX, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.text(invoice.seller.name, leftColX, yPosition);
  doc.text(invoice.buyer.name, rightColX, yPosition);
  yPosition += 5;

  doc.setFontSize(9);
  if (invoice.seller.vatId) {
    doc.setTextColor(...lightGray);
    doc.text(`VAT: ${invoice.seller.vatId}`, leftColX, yPosition);
  }
  if (invoice.buyer.vatId) {
    doc.setTextColor(...lightGray);
    doc.text(`VAT: ${invoice.buyer.vatId}`, rightColX, yPosition);
  }
  yPosition += 6;

  // Addresses
  doc.setTextColor(...darkGray);
  doc.text(invoice.seller.address.street, leftColX, yPosition);
  doc.text(invoice.buyer.address.street, rightColX, yPosition);
  yPosition += 5;

  doc.text(
    `${invoice.seller.address.postalCode} ${invoice.seller.address.city}`,
    leftColX,
    yPosition
  );
  doc.text(
    `${invoice.buyer.address.postalCode} ${invoice.buyer.address.city}`,
    rightColX,
    yPosition
  );
  yPosition += 5;

  doc.text(invoice.seller.address.country, leftColX, yPosition);
  doc.text(invoice.buyer.address.country, rightColX, yPosition);
  yPosition += 15;

  // Line Items Table
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
    startY: yPosition,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Amount']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [245, 243, 255], // Light purple
      textColor: [...primaryColor],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [...darkGray],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  const totalsX = pageWidth - margin - 60;
  const valuesX = pageWidth - margin;

  doc.setFontSize(9);
  doc.setTextColor(...lightGray);
  doc.text('Subtotal:', totalsX, yPosition);
  doc.setTextColor(...darkGray);
  doc.text(formatCurrency(invoice.lineExtensionAmount, invoice.currency), valuesX, yPosition, {
    align: 'right',
  });
  yPosition += 6;

  // Tax breakdown
  invoice.taxTotals.forEach((tax) => {
    doc.setTextColor(...lightGray);
    doc.text(`${tax.taxType} (${tax.taxPercent}%):`, totalsX, yPosition);
    doc.setTextColor(...darkGray);
    doc.text(formatCurrency(tax.taxAmount, invoice.currency), valuesX, yPosition, {
      align: 'right',
    });
    yPosition += 6;
  });

  yPosition += 6;

  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.text('Total:', totalsX, yPosition);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(invoice.payableAmount, invoice.currency), valuesX, yPosition, {
    align: 'right',
  });
  yPosition += 15;

  // Notes
  if (invoice.note) {
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text('Notes:', margin, yPosition);
    yPosition += 5;

    doc.setTextColor(...darkGray);
    const noteLines = doc.splitTextToSize(invoice.note, pageWidth - 2 * margin);
    doc.text(noteLines, margin, yPosition);
    yPosition += noteLines.length * 5 + 10;
  }

  // Payment Terms and Info Section
  const paymentSectionStartY = yPosition;
  let leftColumnY = paymentSectionStartY;

  // Payment Terms (Left Column)
  if (invoice.paymentTerms?.note) {
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text('Payment Terms:', margin, leftColumnY);
    leftColumnY += 5;

    doc.setTextColor(...darkGray);
    const termsLines = doc.splitTextToSize(invoice.paymentTerms.note, pageWidth / 2 - margin);
    doc.text(termsLines, margin, leftColumnY);
    leftColumnY += termsLines.length * 5 + 10;
  }

  // Payment Information (Left Column)
  if (effectivePaymentMeans?.iban) {
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    doc.text('Payment Information:', margin, leftColumnY);
    leftColumnY += 5;

    doc.setTextColor(...darkGray);
    doc.text(`IBAN: ${effectivePaymentMeans.iban}`, margin, leftColumnY);
    leftColumnY += 5;

    if (effectivePaymentMeans.bic) {
      doc.text(`BIC: ${effectivePaymentMeans.bic}`, margin, leftColumnY);
      leftColumnY += 5;
    }
    if (effectivePaymentMeans.accountName) {
      doc.text(`Account: ${effectivePaymentMeans.accountName}`, margin, leftColumnY);
      leftColumnY += 5;
    }
  }

  // QR Code (Right Column)
  let rightColumnY = paymentSectionStartY;
  if (effectivePaymentMeans?.iban) {
    try {
      // Create a temporary invoice object with the effective payment means for QR code generation
      const invoiceForQR = { ...invoice, paymentMeans: effectivePaymentMeans };
      const qrCodeDataURL = await getQRCodeDataURL(invoiceForQR, undefined, 200);

      if (qrCodeDataURL) {
        const qrCodeSize = 35;
        // Position QR code on the right side
        const qrCodeX = pageWidth - margin - qrCodeSize;

        // Check if we need to check page bounds (less likely here as we usually have space, but good practice)
        // For simplicity reusing current page logic as this is a specific section

        doc.addImage(qrCodeDataURL, 'PNG', qrCodeX, rightColumnY, qrCodeSize, qrCodeSize);
        rightColumnY += qrCodeSize + 5;

        // Add label below QR code
        doc.setFontSize(8);
        doc.setTextColor(...lightGray);
        doc.text('Scan to pay', qrCodeX + qrCodeSize / 2, rightColumnY, { align: 'center' });
        rightColumnY += 5;

        // Add QR code standard info
        const country = invoice.seller.address.country;
        let qrStandard = 'EPC QR Code';
        if (country === 'CH' || country === 'LI') {
          qrStandard = 'Swiss QR Invoice';
        } else if (country === 'DE') {
          qrStandard = 'GiroCode';
        }
        doc.setFontSize(7);
        doc.text(qrStandard, qrCodeX + qrCodeSize / 2, rightColumnY, { align: 'center' });
        rightColumnY += 5;
      }
    } catch (error) {
      console.warn('Could not add QR code to PDF:', error);
    }
  }

  // Update main yPosition to the maximum of both columns
  yPosition = Math.max(leftColumnY, rightColumnY) + 15;

  // Footer
  const rawFooterText = template?.footerText || profile?.footerText;

  if (rawFooterText) {
    // Check if we need a new page
    const footerHeight = 20;
    if (yPosition + footerHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPosition = margin;
    } else {
      // Add some space before footer
      yPosition += 10;
    }

    // Line separator
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Handle Footer Images
    // Use raw HTML content here
    console.log('Processing footer text for images...');
    const footerHtml = rawFooterText;
    const imgSources: string[] = [];
    const div = document.createElement('div');
    div.innerHTML = footerHtml;
    const imgs = div.getElementsByTagName('img');
    console.log(`Found ${imgs.length} images in footer HTML`);
    for (let i = 0; i < imgs.length; i++) {
      imgSources.push(imgs[i].src);
    }

    if (imgSources.length > 0) {
      try {
        console.log('Loading footer images...', imgSources);
        // Load all images first
        const imageElements = await Promise.all(imgSources.map(src => loadImage(src)));
        console.log(`Loaded ${imageElements.length} images successfully`);

        let currentX = margin;
        const availableWidth = pageWidth - 2 * margin;

        imageElements.forEach((img, i) => {
          // Convert pixels to a reasonable PDF size
          // Apply a multiplier to make images visible (0.25 means 100px image = 25 PDF points)
          const pixelToPdfMultiplier = 0.25;

          let imgWidth = img.width * pixelToPdfMultiplier;
          let imgHeight = img.height * pixelToPdfMultiplier;

          // If image is too wide, scale it down to fit available width
          if (imgWidth > availableWidth) {
            const scaleFactor = availableWidth / imgWidth;
            imgWidth = availableWidth;
            imgHeight = imgHeight * scaleFactor;
          }

          console.log(`Adding image ${i} to PDF: original=${img.width}x${img.height}px, PDF size=${imgWidth.toFixed(1)}x${imgHeight.toFixed(1)}pt at x=${currentX}, y=${yPosition}`);

          // Determine format from src if data url
          let format = 'PNG';
          if (img.src.startsWith('data:image/jpeg')) format = 'JPEG';
          else if (img.src.startsWith('data:image/webp')) format = 'WEBP';

          doc.addImage(img, format, currentX, yPosition, imgWidth, imgHeight);
          currentX += imgWidth + 5;
        });

        yPosition += 50; // Space for images
      } catch (error) {
        console.error('Could not load footer images:', error);
      }
    } else {
      console.log('No image sources extracted from footer HTML');
    }

    // Render plain text if available
    const footerPlainText = stripHtml(rawFooterText);
    if (footerPlainText.trim()) {
      doc.setFontSize(7);
      doc.setTextColor(...lightGray);
      const footerLines = doc.splitTextToSize(footerPlainText, pageWidth - 2 * margin);
      doc.text(footerLines, pageWidth / 2, yPosition, { align: 'center' });
    }
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
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`${invoice.invoiceNumber}.pdf`);
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

function stripHtml(html: string): string {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}