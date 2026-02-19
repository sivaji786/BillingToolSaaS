import { useState, useEffect } from 'react';
import { Invoice, InvoiceTemplate, InvoiceLine, CompanyProfile, Buyer } from '../../types/invoice';
import { buyerService } from '../../services/api';
import { BuyerAutocomplete } from '../invoice/BuyerAutocomplete';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  ArrowLeft,
  Download,
  FileText,
  Copy,
  Save,
  Edit2,
  Plus,
  Trash2,
  Code,
} from 'lucide-react';
import { formatCurrency, calculateInvoiceTotals } from '../../utils/invoice-calculations';
import { generateInvoicePDF } from '../../utils/invoice-pdf';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';
import { InvoiceQRCode } from '../invoice/InvoiceQRCode';
import { invoiceService } from '../../services/api';

interface InvoicePreviewProps {
  invoice: Invoice;
  onBack: () => void;
  onSave?: (invoice: Invoice) => void;
  template?: InvoiceTemplate;
  profile?: CompanyProfile | null;
}

export function InvoicePreview({ invoice, onBack, onSave, template, profile }: InvoicePreviewProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pdf' | 'ubl'>('pdf');
  const [editedInvoice, setEditedInvoice] = useState<Invoice>(() => {
    const inv = { ...invoice };
    if (!inv.lines) inv.lines = [];
    return inv;
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(() => (invoice.id?.startsWith('new_') || false));
  const [isSaving, setIsSaving] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        const data = await buyerService.getAll();
        setBuyers(data);
      } catch (error) {
        console.error('Failed to fetch buyers', error);
      }
    };
    fetchBuyers();
  }, []);

  useEffect(() => {
    const inv = { ...invoice };
    if (!inv.lines) inv.lines = [];

    // Check if this is a different invoice (e.g. navigation)
    const isDifferentInvoice = !editedInvoice.id || inv.id !== editedInvoice.id;

    if (isDifferentInvoice) {
      setEditedInvoice(inv);
      // New invoices should be considered to have changes so they can be saved
      setHasChanges(inv.id?.startsWith('new_') || false);
    } else {
      // Same invoice ID - check if the incoming prop is different from our local state
      // (This happens when the AI assistant updates the invoice)
      const currentData = JSON.stringify(editedInvoice);
      const incomingData = JSON.stringify(inv);

      if (incomingData !== currentData) {
        setEditedInvoice(inv);
        setHasChanges(true); // Mark as changed because of external (AI) update
      }
    }
  }, [invoice]);

  const handleFieldChange = (path: string, value: any) => {
    setEditedInvoice((prev) => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current: any = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return updated;
    });
    setHasChanges(true);
  };

  const handleLineChange = (lineId: string, field: keyof InvoiceLine, value: any) => {
    setEditedInvoice((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line
      ),
    }));
    setHasChanges(true);
  };

  const handleAddLine = () => {
    const newLine: InvoiceLine = {
      id: String(Date.now()),
      description: '',
      quantity: 1,
      unitCode: 'EA',
      unitPrice: 0,
      taxCategory: 'S',
      taxPercent: 19,
    };

    setEditedInvoice((prev) => ({
      ...prev,
      lines: [...prev.lines, newLine],
    }));
    setHasChanges(true);
  };

  const handleRemoveLine = (lineId: string) => {
    setEditedInvoice((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== lineId),
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const calculated = calculateInvoiceTotals(editedInvoice);

      // Determine if this is a new invoice or existing one
      const isNewInvoice = !editedInvoice.id || editedInvoice.id.startsWith('new_');

      // Check if buyer exists in directory, if not create it
      if (editedInvoice.buyer.name && editedInvoice.buyer.name.trim().length >= 3) {
        const buyerExists = buyers.find(b =>
          b.name.toLowerCase() === editedInvoice.buyer.name.toLowerCase()
        );

        if (!buyerExists) {
          try {
            await buyerService.create({
              name: editedInvoice.buyer.name,
              vatId: editedInvoice.buyer.vatId,
              legalOrganizationId: editedInvoice.buyer.legalOrganizationId,
              address: editedInvoice.buyer.address,
              contact: {
                email: editedInvoice.buyer.contactEmail,
                phone: editedInvoice.buyer.contactPhone
              }
            });
            // Update local buyers list
            const updatedBuyers = await buyerService.getAll();
            setBuyers(updatedBuyers);
          } catch (e) {
            console.error('Failed to auto-save new buyer during preview save:', e);
          }
        }
      }

      let savedResult = calculated;
      if (isNewInvoice) {
        // Create new invoice in database
        const createdInvoice = await invoiceService.create(calculated);
        // Update local state with the new ID from server
        setEditedInvoice(createdInvoice);
        savedResult = createdInvoice;
        toast.success(t('common.saved'), {
          description: t('previewModal.invoiceCreated') || 'Invoice created successfully',
        });
      } else {
        // Update existing invoice in database (ID is guaranteed to exist here)
        await invoiceService.update(editedInvoice.id!, calculated);
        toast.success(t('common.saved'), {
          description: t('previewModal.invoiceUpdated') || 'Invoice updated successfully',
        });
      }

      setHasChanges(false);
      // Pass the actual saved result (with server-generated ID if new) to parent
      onSave?.(savedResult);
    } catch (error) {
      console.error('Failed to save invoice:', error);
      toast.error(t('common.error'), {
        description: t('previewModal.saveFailed') || 'Failed to save invoice. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDoubleClick = (fieldName: string) => {
    setEditingField(fieldName);
  };

  const handleBlur = () => {
    setEditingField(null);
  };

  const renderEditableField = (
    fieldName: string,
    value: string | number,
    onChange: (value: string) => void,
    className: string = '',
    multiline: boolean = false
  ) => {
    if (editingField === fieldName) {
      if (multiline) {
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            className={`${className} min-h-[60px]`}
          />
        );
      }
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          className={className}
        />
      );
    }

    return (
      <div
        onDoubleClick={() => handleDoubleClick(fieldName)}
        className={`${className} cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 rounded px-1 transition-colors group relative`}
        title="Double-click to edit"
      >
        {value || <span className="text-gray-400 italic">Double-click to add</span>}
        <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-50 text-purple-600" />
      </div>
    );
  };

  // Generate UBL XML preview
  const generateUBL = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ID>${editedInvoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${editedInvoice.issueDate}</cbc:IssueDate>
  ${editedInvoice.dueDate ? `<cbc:DueDate>${editedInvoice.dueDate}</cbc:DueDate>` : ''}
  <cbc:InvoiceTypeCode>${editedInvoice.invoiceTypeCode || '380'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${editedInvoice.currency}</cbc:DocumentCurrencyCode>
  
  <!-- Seller (Accounting Supplier Party) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${editedInvoice.seller.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${editedInvoice.seller.address.street}</cbc:StreetName>
        <cbc:CityName>${editedInvoice.seller.address.city}</cbc:CityName>
        <cbc:PostalZone>${editedInvoice.seller.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${editedInvoice.seller.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${editedInvoice.seller.vatId
        ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${editedInvoice.seller.vatId}</cbc:CompanyID>
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
        <cbc:Name>${editedInvoice.buyer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${editedInvoice.buyer.address.street}</cbc:StreetName>
        <cbc:CityName>${editedInvoice.buyer.address.city}</cbc:CityName>
        <cbc:PostalZone>${editedInvoice.buyer.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${editedInvoice.buyer.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${editedInvoice.buyer.vatId
        ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${editedInvoice.buyer.vatId}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`
        : ''
      }
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Payment Means -->
  ${editedInvoice.paymentMeans
        ? `<cac:PaymentMeans>
    <cbc:PaymentMeansCode>${editedInvoice.paymentMeans.type === 'BankTransfer' ? '30' : '1'}</cbc:PaymentMeansCode>
    ${editedInvoice.paymentMeans.iban
          ? `<cac:PayeeFinancialAccount>
      <cbc:ID>${editedInvoice.paymentMeans.iban}</cbc:ID>
      ${editedInvoice.paymentMeans.bic ? `<cac:FinancialInstitutionBranch><cbc:ID>${editedInvoice.paymentMeans.bic}</cbc:ID></cac:FinancialInstitutionBranch>` : ''}
    </cac:PayeeFinancialAccount>`
          : ''
        }
  </cac:PaymentMeans>`
        : ''
      }
  
  <!-- Tax Total -->
  ${editedInvoice.taxTotals
        .map(
          (tax) => `<cac:TaxTotal>
    <cbc:TaxAmount currencyID="${editedInvoice.currency}">${tax.taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${editedInvoice.currency}">${tax.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${editedInvoice.currency}">${tax.taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${tax.taxCategory || 'S'}</cbc:ID>
        <cbc:Percent>${tax.taxPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>${tax.taxType}</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>`
        )
        .join('\n  ')}
  
  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${editedInvoice.currency}">${editedInvoice.lineExtensionAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${editedInvoice.currency}">${editedInvoice.taxExclusiveAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${editedInvoice.currency}">${editedInvoice.taxInclusiveAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${editedInvoice.currency}">${editedInvoice.payableAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Invoice Lines -->
  ${editedInvoice.lines
        .map(
          (line, index) => `<cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${line.unitCode}">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${editedInvoice.currency}">${(line.quantity * line.unitPrice).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${line.description}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${editedInvoice.currency}">${line.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${editedInvoice.currency}">${((line.quantity * line.unitPrice * line.taxPercent) / 100).toFixed(2)}</cbc:TaxAmount>
    </cac:TaxTotal>
  </cac:InvoiceLine>`
        )
        .join('\n  ')}
</Invoice>`;
    return xml;
  };

  const handleCopyXML = () => {
    navigator.clipboard.writeText(generateUBL());
    toast.success(t('common.copied'), {
      description: t('previewModal.copiedToClipboard'),
    });
  };

  const handleDownloadXML = () => {
    const blob = new Blob([generateUBL()], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedInvoice.invoiceNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('common.downloaded'), {
      description: `${editedInvoice.invoiceNumber}.xml`,
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const toastId = toast.loading(t('common.loading'), {
        description: t('previewModal.generatingPdf') || 'Generating PDF...',
      });

      // Use the original PDF generator that matches the preview
      await generateInvoicePDF(editedInvoice, template, profile);

      toast.dismiss(toastId);
      toast.success(t('common.downloaded'), {
        description: `${editedInvoice.invoiceNumber}.pdf`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(t('common.error'), {
        description: t('previewModal.pdfGenerationFailed') || 'Failed to generate PDF',
      });
    }
  };

  const calculated = calculateInvoiceTotals(editedInvoice);

  // Helper values for display
  const logoUrl = template?.logoUrl || profile?.logoUrl;
  const headerText = template?.headerText || profile?.headerText;
  const footerText = template?.footerText || profile?.footerText;

  // Create effective invoice with fallbacks
  const effectiveInvoice = {
    ...editedInvoice,
    paymentMeans: editedInvoice.paymentMeans?.iban ? editedInvoice.paymentMeans : (profile?.bankAccount ? {
      type: 'BankTransfer' as const,
      iban: profile.bankAccount.iban,
      bic: profile.bankAccount.bic,
      accountName: profile.bankAccount.accountName,
    } : undefined)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && !editedInvoice.id?.includes('_'))}
            className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common.saving') || 'Saving...' : t('common.save')}
          </Button>
          {!hasChanges && !editedInvoice.id?.includes('_') && (
            <span className="text-xs text-muted-foreground self-center italic px-2">
              {t('previewModal.allChangesSaved') || 'All changes saved'}
            </span>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'pdf' | 'ubl')}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white shadow-md border-2 border-purple-100">
              <TabsTrigger
                value="pdf"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:via-purple-600 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('previewModal.pdfPreview')}
              </TabsTrigger>
              <TabsTrigger
                value="ubl"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:via-purple-600 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white"
              >
                <Code className="h-4 w-4 mr-2" />
                {t('previewModal.ublXml')}
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {activeTab === 'pdf' ? (
                <Button onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('previewModal.downloadPdf') || 'Download PDF'}
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCopyXML}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('previewModal.copyXml')}
                  </Button>
                  <Button onClick={handleDownloadXML}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('previewModal.downloadUblXml')}
                  </Button>
                </>
              )}
            </div>
          </div>

          <TabsContent value="pdf" className="mt-0">
            <div className="border rounded-lg bg-white shadow-inner">
              <div className="p-12">
                {/* PDF-style invoice preview */}
                <div className="max-w-4xl mx-auto space-y-12 bg-white">
                  {/* Logo & Header */}
                  {logoUrl && (
                    <div className="flex justify-center pb-6 border-b border-purple-100">
                      <img
                        src={logoUrl}
                        alt="Company Logo"
                        className="h-16 object-contain"
                      />
                    </div>
                  )}

                  {headerText && (
                    <div
                      className="text-center text-sm text-gray-600 pb-6 border-b border-purple-100"
                      dangerouslySetInnerHTML={{ __html: headerText }}
                    />
                  )}

                  {/* Footer Text (moved from original position to here, as per instruction context) */}


                  {/* Header */}
                  <div className="flex justify-between items-start pb-8 border-b-2 border-purple-200">
                    <div>
                      <h1 className="text-primary text-4xl">{editedInvoice.seller.name}</h1>
                      <div className="mt-3 text-lg">
                        {renderEditableField(
                          'invoiceNumber',
                          editedInvoice.invoiceNumber,
                          (value: string) => handleFieldChange('invoiceNumber', value)
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('previewModal.issueDate')}</p>
                        <div className="text-lg">
                          {renderEditableField(
                            'issueDate',
                            editedInvoice.issueDate,
                            (value: string) => handleFieldChange('issueDate', value)
                          )}
                        </div>
                      </div>
                      {editedInvoice.dueDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t('previewModal.dueDate')}</p>
                          <div className="text-lg">
                            {renderEditableField(
                              'dueDate',
                              editedInvoice.dueDate,
                              (value: string) => handleFieldChange('dueDate', value)
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="grid grid-cols-2 gap-12">
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">{t('previewModal.from')}</p>
                      <div className="space-y-1">
                        <div className="text-lg">
                          {renderEditableField(
                            'seller.name',
                            editedInvoice.seller.name,
                            (value: string) => handleFieldChange('seller.name', value)
                          )}
                        </div>
                        {editedInvoice.seller.vatId && (
                          <div className="text-sm">
                            {t('previewModal.vat')}:{' '}
                            {renderEditableField(
                              'seller.vatId',
                              editedInvoice.seller.vatId,
                              (value: string) => handleFieldChange('seller.vatId', value),
                              'inline-block'
                            )}
                          </div>
                        )}
                        <div className="mt-3 text-sm space-y-0.5">
                          {renderEditableField(
                            'seller.address.street',
                            editedInvoice.seller.address.street,
                            (value: string) => handleFieldChange('seller.address.street', value),
                            'block'
                          )}
                          <div>
                            {renderEditableField(
                              'seller.address.postalCode',
                              editedInvoice.seller.address.postalCode,
                              (value: string) => handleFieldChange('seller.address.postalCode', value),
                              'inline-block mr-2'
                            )}
                            {renderEditableField(
                              'seller.address.city',
                              editedInvoice.seller.address.city,
                              (value: string) => handleFieldChange('seller.address.city', value),
                              'inline-block'
                            )}
                          </div>
                          {renderEditableField(
                            'seller.address.country',
                            editedInvoice.seller.address.country,
                            (value: string) => handleFieldChange('seller.address.country', value),
                            'block'
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">{t('previewModal.billTo')}</p>
                      <div className="space-y-1">
                        <div className="text-lg">
                          {editingField === 'buyer.name' ? (
                            <BuyerAutocomplete
                              value={editedInvoice.buyer.name}
                              suggestions={buyers}
                              onChange={(val) => handleFieldChange('buyer.name', val)}
                              onSelect={(selectedBuyer) => {
                                setEditedInvoice(prev => ({
                                  ...prev,
                                  buyer: {
                                    ...prev.buyer,
                                    name: selectedBuyer.name,
                                    vatId: selectedBuyer.vatId || '',
                                    legalOrganizationId: selectedBuyer.legalOrganizationId || '',
                                    address: selectedBuyer.address,
                                    contactEmail: selectedBuyer.contactEmail || '',
                                    contactPhone: selectedBuyer.contactPhone || '',
                                  }
                                }));
                                setHasChanges(true);
                                setEditingField(null);
                              }}
                              placeholder="Company name"
                            />
                          ) : (
                            <div
                              onDoubleClick={() => setEditingField('buyer.name')}
                              className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 rounded px-1 transition-colors group relative"
                              title="Double-click to edit"
                            >
                              {editedInvoice.buyer.name || <span className="text-gray-400 italic">Double-click to add</span>}
                              <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-50 text-purple-600" />
                            </div>
                          )}
                        </div>
                        {editedInvoice.buyer.vatId && (
                          <div className="text-sm">
                            {t('previewModal.vat')}:{' '}
                            {renderEditableField(
                              'buyer.vatId',
                              editedInvoice.buyer.vatId,
                              (value: string) => handleFieldChange('buyer.vatId', value),
                              'inline-block'
                            )}
                          </div>
                        )}
                        <div className="mt-3 text-sm space-y-0.5">
                          {renderEditableField(
                            'buyer.address.street',
                            editedInvoice.buyer.address.street,
                            (value: string) => handleFieldChange('buyer.address.street', value),
                            'block'
                          )}
                          <div>
                            {renderEditableField(
                              'buyer.address.postalCode',
                              editedInvoice.buyer.address.postalCode,
                              (value: string) => handleFieldChange('buyer.address.postalCode', value),
                              'inline-block mr-2'
                            )}
                            {renderEditableField(
                              'buyer.address.city',
                              editedInvoice.buyer.address.city,
                              (value: string) => handleFieldChange('buyer.address.city', value),
                              'inline-block'
                            )}
                          </div>
                          {renderEditableField(
                            'buyer.address.country',
                            editedInvoice.buyer.address.country,
                            (value: string) => handleFieldChange('buyer.address.country', value),
                            'block'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg">{t('previewModal.items')}</h3>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-purple-50 dark:bg-purple-950">
                          <tr>
                            <th className="text-center p-3 text-sm w-10">#</th>
                            <th className="text-left p-3 text-sm">{t('previewModal.colDescription')}</th>
                            <th className="text-right p-3 text-sm">{t('previewModal.quantity')}</th>
                            <th className="text-right p-3 text-sm">{t('previewModal.unitPrice')}</th>
                            <th className="text-right p-3 text-sm">{t('previewModal.tax')}</th>
                            <th className="text-right p-3 text-sm">{t('previewModal.amount')}</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editedInvoice.lines.map((line, index) => {
                            const lineTotal = line.quantity * line.unitPrice;
                            return (
                              <tr key={line.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                                <td className="p-3 text-center text-muted-foreground">
                                  {index + 1}
                                </td>
                                <td className="p-3">
                                  {editingField === `line.${line.id}.description` ? (
                                    <Textarea
                                      value={line.description}
                                      onChange={(e) =>
                                        handleLineChange(line.id, 'description', e.target.value)
                                      }
                                      onBlur={handleBlur}
                                      autoFocus
                                      className="min-h-[60px]"
                                    />
                                  ) : (
                                    <div
                                      onDoubleClick={() =>
                                        handleDoubleClick(`line.${line.id}.description`)
                                      }
                                      className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 rounded px-1 transition-colors group relative min-h-[40px]"
                                      title="Double-click to edit"
                                    >
                                      {line.description || (
                                        <span className="text-gray-400 italic">Double-click to add</span>
                                      )}
                                      <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-50 text-purple-600" />
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {editingField === `line.${line.id}.quantity` ? (
                                    <Input
                                      type="number"
                                      value={line.quantity}
                                      onChange={(e) =>
                                        handleLineChange(
                                          line.id,
                                          'quantity',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      onBlur={handleBlur}
                                      autoFocus
                                      className="text-right"
                                    />
                                  ) : (
                                    <div
                                      onDoubleClick={() =>
                                        handleDoubleClick(`line.${line.id}.quantity`)
                                      }
                                      className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 rounded px-1 transition-colors group relative"
                                      title="Double-click to edit"
                                    >
                                      {line.quantity}
                                      <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-50 text-purple-600" />
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {editingField === `line.${line.id}.unitPrice` ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={line.unitPrice}
                                      onChange={(e) =>
                                        handleLineChange(
                                          line.id,
                                          'unitPrice',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      onBlur={handleBlur}
                                      autoFocus
                                      className="text-right"
                                    />
                                  ) : (
                                    <div
                                      onDoubleClick={() =>
                                        handleDoubleClick(`line.${line.id}.unitPrice`)
                                      }
                                      className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 rounded px-1 transition-colors group relative"
                                      title="Double-click to edit"
                                    >
                                      {formatCurrency(line.unitPrice, editedInvoice.currency)}
                                      <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-50 text-purple-600" />
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-right text-sm">
                                  {line.taxPercent}%
                                </td>
                                <td className="p-3 text-right">
                                  {formatCurrency(lineTotal, editedInvoice.currency)}
                                </td>
                                <td className="p-3">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveLine(line.id)}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddLine}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {t('editor.addLine') || 'Add Line'}
                      </Button>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-80 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('previewModal.subtotal')}</span>
                        <span>{formatCurrency(calculated.lineExtensionAmount, editedInvoice.currency)}</span>
                      </div>
                      {calculated.taxTotals.map((tax, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {tax.taxType} ({tax.taxPercent}%)
                          </span>
                          <span>{formatCurrency(tax.taxAmount, editedInvoice.currency)}</span>
                        </div>
                      ))}
                      <div className="border-t-2 border-purple-200 pt-3 flex justify-between text-lg">
                        <span>{t('previewModal.total')}</span>
                        <span className="text-primary">
                          {formatCurrency(calculated.payableAmount, editedInvoice.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {editedInvoice.note && (
                    <div className="border-t pt-6">
                      <p className="text-sm text-muted-foreground mb-2">{t('previewModal.notes')}</p>
                      {renderEditableField(
                        'note',
                        editedInvoice.note,
                        (value: string) => handleFieldChange('note', value),
                        'text-sm',
                        true
                      )}
                    </div>
                  )}

                  {/* Payment Terms and QR Code Section */}
                  {(editedInvoice.paymentTerms?.note || effectiveInvoice.paymentMeans?.iban) && (
                    <div className="border-t pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Payment Terms - Left Side */}
                        <div>
                          {editedInvoice.paymentTerms?.note && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground mb-2">{t('previewModal.paymentTerms')}</p>
                              <p className="text-sm">{editedInvoice.paymentTerms.note}</p>
                            </div>
                          )}

                          {/* Payment Info Text */}
                          {effectiveInvoice.paymentMeans?.iban && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">{t('previewModal.paymentInfo') || 'Payment Information'}</p>
                              <p className="text-sm">IBAN: {effectiveInvoice.paymentMeans.iban}</p>
                              {effectiveInvoice.paymentMeans.bic && (
                                <p className="text-sm">BIC: {effectiveInvoice.paymentMeans.bic}</p>
                              )}
                              {effectiveInvoice.paymentMeans.accountName && (
                                <p className="text-sm">Account owner: {effectiveInvoice.paymentMeans.accountName}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* QR Code - Right Side */}
                        {effectiveInvoice.paymentMeans?.iban && (
                          <div className="flex justify-center md:justify-end">
                            <InvoiceQRCode
                              invoice={effectiveInvoice}
                              size={200}
                              showLabel={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  {footerText && (
                    <div
                      className="border-t pt-6 text-xs text-gray-600 text-center"
                      dangerouslySetInnerHTML={{ __html: footerText }}
                    />
                  )}

                  {/* BOTTOM ACTION BUTTON */}
                  <div className="flex flex-col items-center gap-4 pt-12 border-t mt-12">
                    <Button
                      size="lg"
                      variant="default"
                      onClick={handleSave}
                      disabled={isSaving || (!hasChanges && !editedInvoice.id?.includes('_'))}
                      className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white min-w-[200px] shadow-xl hover:scale-105 transition-transform"
                    >
                      <Save className="h-5 w-5 mr-3" />
                      {isSaving ? t('common.saving') || 'Saving...' : t('common.save') || 'Save Changes'}
                    </Button>
                    {!hasChanges && !editedInvoice.id?.includes('_') && (
                      <p className="text-sm text-muted-foreground italic">
                        {t('previewModal.noChangesToSave') || 'No new changes to save'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ubl" className="mt-0">
            <div className="border rounded-lg bg-gray-50 dark:bg-gray-950">
              <pre className="p-6 text-xs">
                {generateUBL()}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}