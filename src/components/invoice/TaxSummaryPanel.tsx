import { useState } from 'react';
import { Invoice } from '../../types/invoice';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { formatCurrency } from '../../utils/invoice-calculations';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface TaxSummaryPanelProps {
  invoice: Invoice;
}

export function TaxSummaryPanel({ invoice }: TaxSummaryPanelProps) {
  const { t } = useLanguage();
  const [isUblExpanded, setIsUblExpanded] = useState(false);

  return (
    <Card className="p-6 space-y-4">
      <h3>{t('editor.taxSummary')}</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('editor.subtotalExclTax')}</span>
          <span>{formatCurrency(invoice.lineExtensionAmount, invoice.currency)}</span>
        </div>

        {invoice.allowanceTotalAmount && invoice.allowanceTotalAmount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>{t('editor.discount')}</span>
            <span>-{formatCurrency(invoice.allowanceTotalAmount, invoice.currency)}</span>
          </div>
        )}

        {invoice.chargeTotalAmount && invoice.chargeTotalAmount > 0 && (
          <div className="flex justify-between">
            <span>{t('editor.additionalCharges')}</span>
            <span>{formatCurrency(invoice.chargeTotalAmount, invoice.currency)}</span>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          {invoice.taxTotals.map((tax, index) => (
            <div key={index} className="flex justify-between text-body">
              <span className="text-muted-foreground">
                {tax.taxType} {tax.taxPercent}% {t('editor.on')}{' '}
                {formatCurrency(tax.taxableAmount, invoice.currency)}
              </span>
              <span>{formatCurrency(tax.taxAmount, invoice.currency)}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('editor.totalInclTax')}</span>
          <span>{formatCurrency(invoice.taxInclusiveAmount, invoice.currency)}</span>
        </div>

        {invoice.prepaidAmount && invoice.prepaidAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>{t('editor.prepaidAmount')}</span>
            <span>-{formatCurrency(invoice.prepaidAmount, invoice.currency)}</span>
          </div>
        )}

        <Separator className="my-2" />

        <div className="flex justify-between">
          <span>{t('editor.amountDue')}</span>
          <span className="text-primary">
            {formatCurrency(invoice.payableAmount, invoice.currency)}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsUblExpanded(!isUblExpanded)}
          className="w-full justify-start px-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
        >
          {isUblExpanded ? (
            <ChevronDown className="h-4 w-4 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          <strong className="text-micro">{t('editor.ublMappings')}</strong>
        </Button>

        {isUblExpanded && (
          <div className="mt-2 space-y-1 text-micro text-muted-foreground pl-6">
            <p>LineExtensionAmount: Invoice/LegalMonetaryTotal/LineExtensionAmount</p>
            <p>TaxExclusiveAmount: Invoice/LegalMonetaryTotal/TaxExclusiveAmount</p>
            <p>TaxInclusiveAmount: Invoice/LegalMonetaryTotal/TaxInclusiveAmount</p>
            <p>PayableAmount: Invoice/LegalMonetaryTotal/PayableAmount</p>
          </div>
        )}
      </div>
    </Card>
  );
}
