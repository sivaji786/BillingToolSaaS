import { useState, useEffect, useRef } from 'react';
import { Invoice } from '../../types/invoice';
import { invoiceService } from '../../services/api';
import { generateInvoicePDF } from '../../utils/invoice-pdf';
import { formatCurrency, formatDate } from '../../utils/invoice-calculations';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Download, FileText, AlertTriangle, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';

interface SharedInvoiceViewProps {
  token: string;
}

function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'paid':      return 'default';
    case 'sent':      return 'secondary';
    case 'overdue':   return 'destructive';
    case 'cancelled': return 'destructive';
    default:          return 'outline';
  }
}

export function SharedInvoiceView({ token }: SharedInvoiceViewProps) {
  const invoiceCaptureRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPixelPerfect, setIsDownloadingPixelPerfect] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link — no token provided.');
      setIsLoading(false);
      return;
    }
    invoiceService.getByShareToken(token)
      .then(setInvoice)
      .catch(() => setError('This invoice link is invalid or has been removed.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    try {
      await generateInvoicePDF(invoice);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPixelPerfect = async () => {
    if (!invoice || !invoiceCaptureRef.current) return;
    setIsDownloadingPixelPerfect(true);
    const element = invoiceCaptureRef.current;
    const savedStyle = {
      width: element.style.width,
      maxWidth: element.style.maxWidth,
      margin: element.style.margin,
    };
    try {
      // Pin to A4 width so the card fills the page correctly
      element.style.width = '794px';
      element.style.maxWidth = '794px';
      element.style.margin = '0';
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));

      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.offsetWidth,
        height: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const scaledHeight = canvas.height * (pdfWidth / canvas.width);

      let yOffset = 0;
      let pageIndex = 0;
      while (yOffset < scaledHeight) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, scaledHeight);
        yOffset += pdfHeight;
        pageIndex++;
      }

      pdf.save(`${invoice.invoiceNumber}.pdf`);
      toast.success('Downloaded', { description: `${invoice.invoiceNumber}.pdf` });
    } catch {
      toast.error('Failed to generate pixel-perfect PDF');
    } finally {
      element.style.width = savedStyle.width;
      element.style.maxWidth = savedStyle.maxWidth;
      element.style.margin = savedStyle.margin;
      setIsDownloadingPixelPerfect(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#2a8fbd]" />
          <p>Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-heading-2 font-medium text-gray-900">Link not found</h2>
          <p className="text-gray-500">{error ?? 'This share link is no longer valid.'}</p>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go to BillingTool
          </Button>
        </Card>
      </div>
    );
  }

  const subtotal = invoice.lineExtensionAmount ?? 0;
  const tax = (invoice.taxInclusiveAmount ?? 0) - (invoice.taxExclusiveAmount ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Top bar */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#1e3a5f] font-medium">
          <FileText className="h-5 w-5" />
          BillingTool
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            variant="outline"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
          <Button
            onClick={handleDownloadPixelPerfect}
            disabled={isDownloadingPixelPerfect}
            className="bg-gradient-to-r from-[#1e3a5f] to-[#3d5a80] text-white hover:from-[#e07530] hover:to-[#e07530]"
          >
            {isDownloadingPixelPerfect ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Image className="h-4 w-4 mr-2" />
            )}
            Pixel-Perfect PDF
          </Button>
        </div>
      </div>

      {/* Invoice card */}
      <div className="max-w-4xl mx-auto" ref={invoiceCaptureRef}>
        <Card className="p-8 shadow-md">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8 pb-6 border-b">
            <div>
              <h1 className="text-heading-1 font-medium text-gray-900 mb-2">
                {invoice.invoiceNumber}
              </h1>
              <Badge variant={statusVariant(invoice.status)}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>
            <div className="text-body text-gray-500 sm:text-right space-y-1">
              <div><span className="font-medium text-gray-700">Issue date:</span> {formatDate(invoice.issueDate)}</div>
              {invoice.dueDate && (
                <div><span className="font-medium text-gray-700">Due date:</span> {formatDate(invoice.dueDate)}</div>
              )}
            </div>
          </div>

          {/* Seller & Buyer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-micro font-medium text-gray-500 uppercase tracking-wide mb-2">From</h3>
              <div className="text-gray-900 font-medium">{invoice.seller.name}</div>
              {invoice.seller.vatId && <div className="text-body text-gray-500">VAT: {invoice.seller.vatId}</div>}
              {invoice.seller.address?.street && (
                <div className="text-body text-gray-500 mt-1">
                  <div>{invoice.seller.address.street}</div>
                  <div>{[invoice.seller.address.postalCode, invoice.seller.address.city].filter(Boolean).join(' ')}</div>
                  {invoice.seller.address.country && <div>{invoice.seller.address.country}</div>}
                </div>
              )}
              {invoice.seller.contactEmail && (
                <div className="text-body text-gray-500 mt-1">{invoice.seller.contactEmail}</div>
              )}
            </div>
            <div>
              <h3 className="text-micro font-medium text-gray-500 uppercase tracking-wide mb-2">To</h3>
              <div className="text-gray-900 font-medium">{invoice.buyer.name}</div>
              {invoice.buyer.vatId && <div className="text-body text-gray-500">VAT: {invoice.buyer.vatId}</div>}
              {invoice.buyer.address?.street && (
                <div className="text-body text-gray-500 mt-1">
                  <div>{invoice.buyer.address.street}</div>
                  <div>{[invoice.buyer.address.postalCode, invoice.buyer.address.city].filter(Boolean).join(' ')}</div>
                  {invoice.buyer.address.country && <div>{invoice.buyer.address.country}</div>}
                </div>
              )}
              {invoice.buyer.contactEmail && (
                <div className="text-body text-gray-500 mt-1">{invoice.buyer.contactEmail}</div>
              )}
            </div>
          </div>

          {/* Line items */}
          {invoice.lines && invoice.lines.length > 0 && (
            <div className="mb-8">
              <h3 className="text-micro font-medium text-gray-500 uppercase tracking-wide mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 font-medium text-gray-600">Description</th>
                      <th className="text-right py-2 px-4 font-medium text-gray-600">Qty</th>
                      <th className="text-right py-2 px-4 font-medium text-gray-600">Unit price</th>
                      <th className="text-right py-2 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, i) => (
                      <tr key={line.id ?? i} className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-900">{line.description}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{line.quantity}</td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatCurrency(line.unitPrice, invoice.currency)}
                        </td>
                        <td className="py-3 text-right text-gray-900">
                          {formatCurrency(line.lineExtensionAmount ?? line.quantity * line.unitPrice, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-body">
              {subtotal > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal, invoice.currency)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatCurrency(tax, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-heading-2 text-gray-900 border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(invoice.payableAmount, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          {invoice.note && (
            <div className="mt-8 pt-6 border-t text-body text-gray-500">
              <span className="font-medium text-gray-700">Note: </span>{invoice.note}
            </div>
          )}
        </Card>

        {/* CTA footer */}
        <p className="text-center text-body text-gray-500 mt-6">
          Powered by{' '}
          <a href="/" className="text-[#2a8fbd] hover:underline font-medium">
            BillingTool
          </a>
          {' '}— create and share professional invoices for free.
        </p>
      </div>
    </div>
  );
}
