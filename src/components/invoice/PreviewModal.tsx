import { useState, useEffect } from 'react';
import { Invoice } from '../../types/invoice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { FileText, Code, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/invoice-calculations';

interface PreviewModalProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'pdf' | 'ubl';
  hideTabs?: boolean;
  onCopyUBL?: (xml: string) => void;
  onDownloadUBL?: (xml: string) => void;
}

export function PreviewModal({ invoice, open, onOpenChange, defaultTab = 'pdf', hideTabs = false, onCopyUBL, onDownloadUBL }: PreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'ubl'>(defaultTab);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // Generate UBL XML preview
  const generateUBL = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
  ${invoice.dueDate ? `<cbc:DueDate>${invoice.dueDate}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>${invoice.invoiceTypeCode || '380'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  
  <!-- Seller (Accounting Supplier Party) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.seller.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${invoice.seller.address.street}</cbc:StreetName>
        <cbc:CityName>${invoice.seller.address.city}</cbc:CityName>
        <cbc:PostalZone>${invoice.seller.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.seller.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${invoice.seller.vatId
        ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.seller.vatId}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`
        : ''
      }
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Buyer (Accounting Customer Party) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.buyer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${invoice.buyer.address.street}</cbc:StreetName>
        <cbc:CityName>${invoice.buyer.address.city}</cbc:CityName>
        <cbc:PostalZone>${invoice.buyer.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.buyer.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${invoice.buyer.vatId
        ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.buyer.vatId}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`
        : ''
      }
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Payment Means -->
  ${invoice.paymentMeans
        ? `<cac:PaymentMeans>
    <cbc:PaymentMeansCode>${invoice.paymentMeans.type === 'BankTransfer' ? '30' : '1'}</cbc:PaymentMeansCode>
    ${invoice.paymentMeans.iban
          ? `<cac:PayeeFinancialAccount>
      <cbc:ID>${invoice.paymentMeans.iban}</cbc:ID>
      ${invoice.paymentMeans.bic ? `<cac:FinancialInstitutionBranch><cbc:ID>${invoice.paymentMeans.bic}</cbc:ID></cac:FinancialInstitutionBranch>` : ''}
    </cac:PayeeFinancialAccount>`
          : ''
        }
  </cac:PaymentMeans>`
        : ''
      }
  
  <!-- Tax Totals -->
${invoice.taxTotals
        .map(
          (tax) => `  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${tax.taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${tax.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${tax.taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${tax.taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`
        )
        .join('\n')}
  
  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Invoice Lines -->
${invoice.lines
        .map(
          (line) => `  <cac:InvoiceLine>
    <cbc:ID>${line.id}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${line.unitCode}">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${(line.quantity * line.unitPrice).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${line.description}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${line.taxCategory}</cbc:ID>
        <cbc:Percent>${line.taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
        )
        .join('\n')}
</Invoice>`;
    return xml;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{hideTabs ? 'E-Invoice (UBL XML) Preview' : `Invoice Preview - ${invoice.invoiceNumber}`}</DialogTitle>
          <DialogDescription>
            {hideTabs ? 'UBL XML' : 'Preview your invoice in PDF format or as UBL XML'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'pdf' | 'ubl')} className="w-full min-w-0">
          {!hideTabs && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pdf">
                <FileText className="h-4 w-4 mr-2" />
                PDF Preview
              </TabsTrigger>
              <TabsTrigger value="ubl">
                <Code className="h-4 w-4 mr-2" />
                UBL XML
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="pdf" className="mt-4">
            <ScrollArea className="h-[600px] border rounded-lg bg-white p-8">
              {/* PDF-style invoice preview */}
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-primary">INVOICE</h1>
                    <p className="text-muted-foreground mt-2">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p>{formatDate(invoice.issueDate)}</p>
                    {invoice.dueDate && (
                      <>
                        <p className="text-sm text-muted-foreground mt-2">Due Date</p>
                        <p>{formatDate(invoice.dueDate)}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">From</p>
                    <p>{invoice.seller.name}</p>
                    {invoice.seller.vatId && (
                      <p className="text-sm">VAT: {invoice.seller.vatId}</p>
                    )}
                    <p className="text-sm mt-2">{invoice.seller.address.street}</p>
                    <p className="text-sm">
                      {invoice.seller.address.postalCode} {invoice.seller.address.city}
                    </p>
                    <p className="text-sm">{invoice.seller.address.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Bill To</p>
                    <p>{invoice.buyer.name}</p>
                    {invoice.buyer.vatId && <p className="text-sm">VAT: {invoice.buyer.vatId}</p>}
                    <p className="text-sm mt-2">{invoice.buyer.address.street}</p>
                    <p className="text-sm">
                      {invoice.buyer.address.postalCode} {invoice.buyer.address.city}
                    </p>
                    <p className="text-sm">{invoice.buyer.address.country}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2 text-center w-10">#</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Unit Price</th>
                        <th className="pb-2 text-right">Tax</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lines.map((line, index) => (
                        <tr key={line.id} className="border-b">
                          <td className="py-3 text-center">{index + 1}</td>
                          <td className="py-3">{line.description}</td>
                          <td className="py-3 text-right">
                            {line.quantity} {line.unitCode}
                          </td>
                          <td className="py-3 text-right">
                            {formatCurrency(line.unitPrice, invoice.currency)}
                          </td>
                          <td className="py-3 text-right">{line.taxPercent}%</td>
                          <td className="py-3 text-right">
                            {formatCurrency(line.quantity * line.unitPrice, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(invoice.lineExtensionAmount, invoice.currency)}</span>
                    </div>
                    {invoice.taxTotals.map((tax, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {tax.taxType} {tax.taxPercent}%
                        </span>
                        <span>{formatCurrency(tax.taxAmount, invoice.currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(invoice.payableAmount, invoice.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {invoice.paymentMeans && (
                  <div className="border-t pt-4">
                    <p className="text-sm mb-2">Payment Information</p>
                    {invoice.paymentMeans.iban && (
                      <>
                        <p className="text-sm">IBAN: {invoice.paymentMeans.iban}</p>
                        {invoice.paymentMeans.bic && (
                          <p className="text-sm">BIC: {invoice.paymentMeans.bic}</p>
                        )}
                      </>
                    )}
                    {invoice.paymentTerms?.note && (
                      <p className="text-sm mt-2">{invoice.paymentTerms.note}</p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ubl" className={hideTabs ? "mt-0 min-w-0" : "mt-4 min-w-0"}>
            <div className="h-[600px] w-full border border-slate-800 rounded-lg bg-slate-900 overflow-hidden shadow-inner flex flex-col">
              <ScrollArea className="flex-1 w-full">
                <div className="p-6 min-w-0">
                  <pre className="text-sm text-emerald-300 font-mono whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed">
                    <code>{generateUBL()}</code>
                  </pre>
                </div>
              </ScrollArea>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button
                variant="outline"
                className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700"
                onClick={() => {
                  const xml = generateUBL();
                  if (onCopyUBL) {
                    onCopyUBL(xml);
                  } else {
                    navigator.clipboard.writeText(xml);
                  }
                }}
              >
                <FileText className="h-4 w-4" />
                Copy XML
              </Button>
              <Button
                variant="default"
                className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 shadow-sm border-0"
                onClick={() => {
                  const xml = generateUBL();
                  if (onDownloadUBL) {
                    onDownloadUBL(xml);
                  } else {
                    const blob = new Blob([xml], { type: 'application/xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${invoice.invoiceNumber}.xml`;
                    a.click();
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download UBL XML
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
