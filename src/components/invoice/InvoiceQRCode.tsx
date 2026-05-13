/**
 * Invoice QR Code Component
 * Displays European standard QR codes for payment (EPC, Swiss QR, GiroCode)
 */

import { useEffect, useRef } from 'react';
import { Invoice } from '../../types/invoice';
import { getInvoiceQRCodeData, canGenerateQRCode, getQRCodeStandardName } from '../../utils/qr-code-generator';
import { useLanguage } from '../../contexts/LanguageContext';
import { Info } from 'lucide-react';

interface InvoiceQRCodeProps {
  invoice: Invoice;
  standard?: 'epc' | 'swiss' | 'giro';
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function InvoiceQRCode({
  invoice,
  standard,
  size = 200,
  showLabel = true,
  className = '',
}: InvoiceQRCodeProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!canGenerateQRCode(invoice)) return;

    const qrData = getInvoiceQRCodeData(invoice, standard);
    if (!qrData) return;

    // Generate QR code — lazy-load qrcode to keep it out of the initial bundle
    import('qrcode').then((QRCode) => {
      if (!canvasRef.current) return;
      QRCode.toCanvas(
        canvasRef.current,
        qrData,
        {
          width: size,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' },
        },
        (error) => {
          if (error) console.error('QR Code generation error:', error);
        }
      );
    });
  }, [invoice, standard, size]);

  if (!canGenerateQRCode(invoice)) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Info className="h-4 w-4" />
        <span>{t('qrCode.noPaymentInfo') || 'IBAN required for QR code generation'}</span>
      </div>
    );
  }

  const standardName = getQRCodeStandardName(invoice);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-200 dark:border-gray-700 rounded-lg"
        style={{ width: size, height: size }}
      />
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('qrCode.scanToPay') || 'Scan to Pay'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {standardName}
          </p>
          {invoice.paymentMeans?.iban && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {invoice.paymentMeans.iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Get QR code as data URL for embedding in PDFs
 * 
 * @param invoice - Invoice object
 * @param standard - QR code standard
 * @param size - QR code size in pixels
 * @returns Promise<string> - Data URL of QR code image
 */
export async function getQRCodeDataURL(
  invoice: Invoice,
  standard?: 'epc' | 'swiss' | 'giro',
  size: number = 200
): Promise<string | null> {
  if (!canGenerateQRCode(invoice)) {
    return null;
  }

  const qrData = getInvoiceQRCodeData(invoice, standard);
  if (!qrData) {
    return null;
  }

  try {
    const dataURL = await QRCode.toDataURL(qrData, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
}
