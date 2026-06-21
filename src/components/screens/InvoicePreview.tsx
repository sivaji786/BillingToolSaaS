import { useState, useEffect, useRef } from 'react';
import { Invoice, InvoiceTemplate, InvoiceLine, CompanyProfile, Buyer } from '../../types/invoice';
import { buyerService, companyProfileService } from '../../services/api';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
  Layout,
  Printer,
  Users,
  Image,
} from 'lucide-react';
import { formatCurrency, calculateInvoiceTotals } from '../../utils/invoice-calculations';
import { generateInvoicePDF } from '../../utils/invoice-pdf';
import { generateUBLXML } from '../../utils/invoice-export';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';
import { InvoiceQRCode } from '../invoice/InvoiceQRCode';
import { invoiceService } from '../../services/api';

interface InvoicePreviewProps {
  invoice: Invoice;
  onBack: () => void;
  onSave?: (invoice: Invoice) => void;
  template?: InvoiceTemplate;
  allTemplates?: InvoiceTemplate[];
  onTemplateChange?: (templateId: string) => void;
  profile?: CompanyProfile | null;
}

export function InvoicePreview({
  invoice,
  onBack,
  onSave,
  template: initialTemplate,
  allTemplates = [],
  onTemplateChange,
  profile
}: InvoicePreviewProps) {
  const { t, isRtl } = useLanguage();
  const invoiceCaptureRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'pdf' | 'ubl'>('pdf');
  const [previewMode, setPreviewMode] = useState<'web' | 'print'>(() => {
    // Default to 'web' for a professional look unless explicitly designed
    return 'web';
  });
  const [editedInvoice, setEditedInvoice] = useState<Invoice>(() => {
    const inv = { ...invoice };
    if (!inv.lines) inv.lines = [];
    return inv;
  });
  const [template, setTemplate] = useState<InvoiceTemplate | undefined>(initialTemplate);
  const isBusinessLetter = editedInvoice.templateType === 'business_letter';

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
    }
  }, [initialTemplate]);

  // Auto-select template based on precedence: Invoice choice > Profile preference > First available
  useEffect(() => {
    if (allTemplates.length > 0) {
      // 1. Try to find specifically saved template on invoice
      let bestMatch = allTemplates.find(t => t.id === editedInvoice.templateId);

      // 2. Fall back to profile defaultTemplateId
      if (!bestMatch && profile?.defaultTemplateId) {
        bestMatch = allTemplates.find(t => t.id === profile.defaultTemplateId);
      }

      // 3. Last resort: first available template
      const fallbackTemplate = bestMatch || allTemplates[0];

      // Only update if we've found a better match OR if nothing is selected yet
      if (fallbackTemplate && (!template || template.id !== fallbackTemplate.id)) {
        setTemplate(fallbackTemplate);
        // Only notify parent if we actually found something better than what we had
        if (!template || fallbackTemplate.id !== template.id) {
          onTemplateChange?.(fallbackTemplate.id);
        }
      }
    }
  }, [allTemplates, template, editedInvoice.templateId, profile?.defaultTemplateId, onTemplateChange]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(() => String(invoice.id ?? '').startsWith('new_'));
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
      setHasChanges(String(inv.id ?? '').startsWith('new_'));
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
      taxPercent: 0,
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

  const handleBuyerSelect = (buyerId: string) => {
    const selectedBuyer = buyers.find(b => b.id === buyerId);
    if (!selectedBuyer) return;

    setEditedInvoice(prev => ({
      ...prev,
      buyer: {
        ...prev.buyer,
        name: selectedBuyer.name,
        vatId: selectedBuyer.vatId || '',
        legalOrganizationId: selectedBuyer.legalOrganizationId || '',
        address: {
          street: selectedBuyer.address.street || '',
          city: selectedBuyer.address.city || '',
          postalCode: selectedBuyer.address.postalCode || '',
          country: selectedBuyer.address.country || '',
        },
        contactEmail: selectedBuyer.contactEmail || '',
        contactPhone: selectedBuyer.contactPhone || '',
      }
    }));
    setHasChanges(true);
    toast.success(t('previewModal.buyerSelected') || 'Buyer information updated');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const calculated = calculateInvoiceTotals(editedInvoice);

      // Determine if this is a new invoice or existing one
      const isNewInvoice = !editedInvoice.id || String(editedInvoice.id).startsWith('new_');

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
        await invoiceService.update(String(editedInvoice.id), calculated);
        toast.success(t('common.saved'), {
          description: t('previewModal.invoiceUpdated') || 'Invoice updated successfully',
        });
      }

      setHasChanges(false);

      // Persist template choice to profile if it exists
      if (profile?.id && template?.id) {
        try {
          await companyProfileService.update(profile.id, {
            ...profile,
            defaultTemplateId: template.id
          });
        } catch (profileError) {
          console.error('Failed to update default template in profile:', profileError);
          // Don't toast for profile update failure as it's secondary to invoice save
        }
      }

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
    multiline: boolean = false,
    placeholder: string = t('common.doubleClickToAdd') || 'Double-click to add',
    disabled: boolean = false
  ) => {
    if (editingField === fieldName && !disabled) {
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
      <span
        onDoubleClick={!disabled ? () => handleDoubleClick(fieldName) : undefined}
        className={`${className} inline-block ${!disabled ? 'cursor-pointer hover:bg-[#f0f6ff] dark:hover:bg-[#1e3a5f] rounded px-1 group relative' : ''} transition-colors`}
        title={!disabled ? "Double-click to edit" : ""}
      >
        {(value !== undefined && value !== null && value !== '') ? value : <span className="text-gray-400 italic">{placeholder}</span>}
        {!disabled && <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-50 text-[#2a8fbd]" />}
      </span>
    );
  };

  // Generate UBL XML preview

  const handleCopyXML = () => {
    navigator.clipboard.writeText(generateUBLXML(calculated));
    toast.success(t('common.copied'), {
      description: t('previewModal.copiedToClipboard'),
    });
  };

  const handleDownloadXML = () => {
    const blob = new Blob([generateUBLXML(calculated)], { type: 'application/xml' });
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

      // Use the calculated invoice which has the refreshed totals
      await generateInvoicePDF(calculated, template, profile);


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

  const handleDownloadPDFPixelPerfect = async () => {
    if (!invoiceCaptureRef.current) {
      toast.error('Preview not ready');
      return;
    }
    const toastId = toast.loading(t('common.loading'), {
      description: 'Rendering pixel-perfect PDF…',
    });
    const element = invoiceCaptureRef.current;
    const wasWebMode = previewMode === 'web';
    const savedStyle = {
      width: element.style.width,
      minHeight: element.style.minHeight,
      borderRadius: element.style.borderRadius,
      boxShadow: element.style.boxShadow,
    };
    try {
      // Switch to print view so the captured element has no interactive controls
      // (no edit buttons, dropdowns, or delete icons)
      if (wasWebMode) setPreviewMode('print');

      // Pin to A4 width and strip decorative chrome for a clean capture
      element.style.width = '794px';
      element.style.minHeight = 'auto';
      element.style.borderRadius = '0';
      element.style.boxShadow = 'none';

      // Wait for React to re-render in print mode and the browser to reflow
      await new Promise(r => setTimeout(r, 150));

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

      pdf.save(`${editedInvoice.invoiceNumber}.pdf`);
      toast.dismiss(toastId);
      toast.success(t('common.downloaded'), { description: `${editedInvoice.invoiceNumber}.pdf` });
    } catch (error) {
      console.error('Pixel-perfect PDF error:', error);
      toast.dismiss(toastId);
      toast.error(t('common.error'), { description: 'Failed to generate pixel-perfect PDF' });
    } finally {
      // Restore styles first, then mode — so the element resizes before React re-renders
      element.style.width = savedStyle.width;
      element.style.minHeight = savedStyle.minHeight;
      element.style.borderRadius = savedStyle.borderRadius;
      element.style.boxShadow = savedStyle.boxShadow;
      if (wasWebMode) setPreviewMode('web');
    }
  };

  const calculated = calculateInvoiceTotals(editedInvoice);


  const renderDynamicLayout = (isInteractive: boolean) => {
    if (!template?.layout) return null;

    // Create effective data with hierarchical fallbacks: Invoice > Template > Profile

    // 1. Logo, Header, Footer
    const effectiveLogo = template?.logoUrl || profile?.logoUrl;
    const effectiveHeaderHtml = template?.headerText || profile?.headerText;
    const effectiveFooterHtml = template?.footerText || profile?.footerText;

    // 2. Seller Data — prefer non-empty: invoice > template > profile
    const effectiveSeller = {
      ...profile,
      ...(template?.seller || {}),
      ...editedInvoice.seller,
      name: editedInvoice.seller?.name || template?.seller?.name || profile?.name || '',
      vatId: editedInvoice.seller?.vatId || template?.seller?.vatId || profile?.vatId || '',
      legalOrganizationId: editedInvoice.seller?.legalOrganizationId || template?.seller?.legalOrganizationId || profile?.legalOrganizationId || '',
      contactEmail: editedInvoice.seller?.contactEmail || profile?.email || '',
      contactPhone: editedInvoice.seller?.contactPhone || profile?.phone || '',
      address: {
        street: editedInvoice.seller?.address?.street || template?.seller?.address?.street || profile?.address?.street || '',
        city: editedInvoice.seller?.address?.city || template?.seller?.address?.city || profile?.address?.city || '',
        postalCode: editedInvoice.seller?.address?.postalCode || template?.seller?.address?.postalCode || profile?.address?.postalCode || '',
        country: editedInvoice.seller?.address?.country || template?.seller?.address?.country || profile?.address?.country || '',
      }
    };

    // 3. Payment Means (Bank Info)
    // Note: Templates currently don't store separate IBANs, so we fall back directly to Profile
    const effectivePaymentMeans = editedInvoice.paymentMeans?.iban ? editedInvoice.paymentMeans :
      (profile?.bankAccount ? {
        type: 'BankTransfer' as const,
        iban: profile.bankAccount.iban,
        bic: profile.bankAccount.bic,
        accountName: profile.bankAccount.accountName,
      } : undefined);

    // 4. Notes & Payment Terms
    const effectiveNote = editedInvoice.note || template?.defaultPaymentTerms?.note || '';

    const calculated = calculateInvoiceTotals(editedInvoice);
    const visibleElements = template.layout.filter(el => el.visible != false);
    const isTaxSummaryVisible = template.layout.find(el => el.type === 'tax_summary')?.visible !== false;

    // Helper: render a single element as a section
    const renderElement = (el: any) => {
      const key = el.id || `${el.type}-${Math.random()}`;

      if (el.type === 'logo') {
        if (!effectiveLogo) return null;
        return (
          <div key={key} className="flex mb-2">
            <img src={effectiveLogo} alt="Logo" className="h-16 object-contain" />
          </div>
        );
      }

      if (el.type === 'items') {
        if (isBusinessLetter) {
          return (
            <div key={key} className="w-full space-y-5 pt-2">
              {/* Salutation */}
              <div className="text-body text-gray-800">
                {renderEditableField('salutation', editedInvoice.salutation || '', (val) => handleFieldChange('salutation', val), '', false, 'Dear Sir/Madam,', !isInteractive)}
              </div>
              {/* Body */}
              <div className="text-body text-gray-700 leading-relaxed min-h-[240px]">
                {isInteractive
                  ? renderEditableField('body', editedInvoice.body || '', (val) => handleFieldChange('body', val), 'w-full min-h-[240px] text-body leading-relaxed', true, 'Letter content...', false)
                  : <div dangerouslySetInnerHTML={{ __html: editedInvoice.body || '<p style="color:#9ca3af;font-style:italic">No content</p>' }} />
                }
              </div>
              {/* Closing */}
              <div className="text-body text-gray-800 pt-6">
                {renderEditableField('closing', editedInvoice.closing || '', (val) => handleFieldChange('closing', val), '', false, 'Yours sincerely,', !isInteractive)}
              </div>
            </div>
          );
        }
        return (
          <div key={key} className="w-full">
            <h3 className="text-body font-medium uppercase tracking-wide text-gray-500 mb-3">{t('previewModal.items')}</h3>
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-body">
                <thead className="bg-[#f0f6ff] text-gray-500">
                  <tr>
                    <th className="text-center p-3 w-8">#</th>
                    <th className="text-left p-3">{t('previewModal.colDescription')}</th>
                    <th className="text-right p-3">{t('previewModal.quantity')}</th>
                    <th className="text-right p-3">{t('previewModal.unitPrice')}</th>
                    <th className="text-right p-3">{t('previewModal.tax')}</th>
                    <th className="text-right p-3">{t('previewModal.amount')}</th>
                    {isInteractive && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {editedInvoice.lines.map((line, index) => {
                    const lineTotal = line.quantity * line.unitPrice;
                    return (
                      <tr key={line.id} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-center text-gray-400 font-mono text-micro">{index + 1}</td>
                        <td className="p-3">
                          {renderEditableField(`line.${line.id}.description`, line.description || '', (val) => handleLineChange(line.id, 'description', val), 'min-h-[32px]', true, undefined, !isInteractive)}
                        </td>
                        <td className="p-3 text-right">
                          {renderEditableField(`line.${line.id}.quantity`, line.quantity, (val) => handleLineChange(line.id, 'quantity', parseFloat(val as string) || 0), 'text-right', false, undefined, !isInteractive)}
                        </td>
                        <td className="p-3 text-right">
                          {renderEditableField(`line.${line.id}.unitPrice`, line.unitPrice, (val) => handleLineChange(line.id, 'unitPrice', parseFloat(val as string) || 0), 'text-right', false, undefined, !isInteractive)}
                        </td>
                        <td className="p-3 text-right text-gray-500">
                          {isInteractive ? (
                            <div className="flex justify-end items-center">
                              {renderEditableField(`line.${line.id}.taxPercent`, line.taxPercent, (val) => handleLineChange(line.id, 'taxPercent', parseFloat(val as string) || 0), 'text-right w-10', false, '', false)}
                              <span className="ml-0.5">%</span>
                            </div>
                          ) : (
                            <span>{line.taxPercent}%</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(lineTotal, editedInvoice.currency)}</td>
                        {isInteractive && (
                          <td className="p-3">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)} className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {isInteractive && (
              <Button variant="outline" size="sm" onClick={handleAddLine} className="mt-3 gap-1.5 text-micro border-dashed text-[#2a8fbd] border-[rgba(30,58,95,0.15)] hover:bg-[#f0f6ff]">
                <Plus className="h-3.5 w-3.5" />
                {t('previewModal.addLineItem')}
              </Button>
            )}
          </div>
        );
      }

      if (el.type === 'totals') {
        if (isBusinessLetter) return null;
        const showTaxSummary = template.layout?.find((e: any) => e.type === 'tax_summary')?.visible === true;
        return (
          <div key={key} className="flex justify-end pt-4 w-full">
            <div className="w-72 space-y-2 text-body">
              <div className="flex justify-between text-gray-500">
                <span>{t('previewModal.subtotal')}</span>
                <span>{formatCurrency(calculated.lineExtensionAmount, editedInvoice.currency)}</span>
              </div>
              {!showTaxSummary && isTaxSummaryVisible && calculated.taxTotals.map((tax, i) => (
                <div key={i} className="flex justify-between text-gray-500">
                  <span>{t('previewModal.tax')} ({tax.taxPercent}%)</span>
                  <span>{formatCurrency(tax.taxAmount, editedInvoice.currency)}</span>
                </div>
              ))}
              <div className="border-t-2 border-[rgba(30,58,95,0.15)] pt-3 flex justify-between text-heading-3 font-medium">
                <span>{t('previewModal.total')}</span>
                <span className="text-[#1e3a5f] font-medium">{formatCurrency(calculated.payableAmount, editedInvoice.currency)}</span>
              </div>
            </div>
          </div>
        );
      }

      if (el.type === 'tax_summary') {
        if (isBusinessLetter || !isTaxSummaryVisible || calculated.taxTotals.length === 0) return null;
        return (
          <div key={key} className="w-full">
            <h3 className="text-body font-medium uppercase tracking-wide text-gray-500 mb-3">{t('previewModal.taxSummary')}</h3>
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-body">
                <thead className="bg-[#f0f6ff] text-gray-500">
                  <tr>
                    <th className="text-left p-3">{t('previewModal.colTaxType')}</th>
                    <th className="text-right p-3">{t('previewModal.colTaxPercent')}</th>
                    <th className="text-right p-3">{t('previewModal.colTaxableAmount')}</th>
                    <th className="text-right p-3">{t('previewModal.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {calculated.taxTotals.map((tax, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{tax.taxType}</td>
                      <td className="p-3 text-right text-gray-500">{tax.taxPercent}%</td>
                      <td className="p-3 text-right text-gray-500">{formatCurrency(tax.taxableAmount, editedInvoice.currency)}</td>
                      <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(tax.taxAmount, editedInvoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      if (el.type === 'header') {
        if (!effectiveHeaderHtml) return null;
        return (
          <div key={key} className="w-full text-center text-micro text-gray-400 mb-6 italic">
            <div dangerouslySetInnerHTML={{ __html: effectiveHeaderHtml }} />
          </div>
        );
      }

      if (el.type === 'notes') {
        if (!effectiveNote) return null;
        return (
          <div key={key} className="pt-2 border-t border-gray-100 mt-6 w-full">
            <p className="text-micro text-gray-400 uppercase tracking-wide mb-2">{t('previewModal.notes')}</p>
            <div className="text-body text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl italic">
              {renderEditableField('note', effectiveNote, (val) => handleFieldChange('note', val), 'italic', true, undefined, !isInteractive)}
            </div>
          </div>
        );
      }

      if (el.type === 'qr') {
        if (isBusinessLetter || !effectivePaymentMeans?.iban) return null;

        // Create a temporary invoice object for the QR code component that includes the fallback payment means
        const qrInvoice = {
          ...editedInvoice,
          paymentMeans: effectivePaymentMeans
        };

        return (
          <div key={key} className="w-full mt-8 rounded-[2rem] p-8 bg-[#f0f6ff]/40 border border-[rgba(30,58,95,0.10)]/50 relative overflow-hidden group">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-[#dbe8f7]/20 rounded-full blur-3xl group-hover:bg-[#dbe8f7]/30 transition-all duration-700"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative z-10">
              {/* Column 1: Textual Payment Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#f0f6ff] rounded-lg text-[#2a8fbd]">
                    <Code className="h-4 w-4" />
                  </div>
                  <h4 className="text-body font-medium uppercase tracking-widest text-[#1e3a5f]">
                    {t('previewModal.paymentDetails')}
                  </h4>
                </div>

                <div className="grid gap-3">
                  {effectivePaymentMeans.accountName && (
                    <div className="flex flex-col">
                      <span className="text-body text-[#3d5a80] font-medium uppercase tracking-tight">{t('previewModal.accountOwner')}</span>
                      <span className="text-body font-medium text-[#1e3a5f]">{effectivePaymentMeans.accountName}</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-body text-[#3d5a80] font-medium uppercase tracking-tight">{t('previewModal.iban')}</span>
                    <span className="text-body font-mono font-medium text-[#1e3a5f] break-all">{effectivePaymentMeans.iban}</span>
                  </div>
                  {effectivePaymentMeans.bic && (
                    <div className="flex flex-col">
                      <span className="text-body text-[#3d5a80] font-medium uppercase tracking-tight">{t('previewModal.bic')}</span>
                      <span className="text-body font-mono font-medium text-[#1e3a5f]">{effectivePaymentMeans.bic}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: QR Code */}
              <div className={`flex flex-col items-center ${isRtl ? 'md:items-start' : 'md:items-end'}`}>
                <div className="bg-white p-4 rounded-3xl shadow-xl shadow-[rgba(30,58,95,0.10)] border border-[rgba(30,58,95,0.10)] flex items-center justify-center transition-transform hover:scale-105 duration-300">
                  <InvoiceQRCode invoice={qrInvoice} size={140} showLabel={false} />
                </div>
                <div className={`mt-4 text-center ${isRtl ? 'md:text-left' : 'md:text-right'}`}>
                  <p className="text-body font-medium text-[#1e3a5f]">{t('qrCode.giroTitle')}</p>
                  <p className="text-body-lg text-[#1e3a5f]/60 leading-relaxed max-w-[200px]">
                    {t('qrCode.giroNote')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (el.type === 'footer') {
        if (!effectiveFooterHtml) return null;
        return (
          <div key={key} className="mt-12 pt-8 border-t border-gray-100 text-body text-gray-400 text-center leading-relaxed w-full">
            <div dangerouslySetInnerHTML={{ __html: effectiveFooterHtml }} />
          </div>
        );
      }

      if (el.type === 'signature') {
        return (
          <div key={key} className="mt-12 flex justify-end w-full">
            <div className="text-center w-48 border-t-2 border-[rgba(30,58,95,0.10)] pt-2">
              <p className="text-body text-gray-400 uppercase font-medium tracking-widest mb-1">Signature</p>
              <div className="h-8"></div>
            </div>
          </div>
        );
      }

      if (el.type === 'to') {
        const buyer = editedInvoice.buyer;
        return (
          <div key={key} className="w-full mb-8">
            <p className="text-body text-gray-400 uppercase font-medium tracking-widest mb-3 border-b border-gray-100 pb-2">{t('editor.buyer')}</p>
            <div className="text-body space-y-1">
              <div className="text-heading-3 font-medium text-gray-900">
                {renderEditableField('buyer.name', buyer.name || '', (val) => handleFieldChange('buyer.name', val), 'font-medium', false, t('previewModal.placeholderBuyerName'), !isInteractive)}
              </div>
              <div className="text-gray-600">
                {renderEditableField('buyer.address.street', buyer.address?.street || '', (val) => handleFieldChange('buyer.address.street', val), '', false, t('previewModal.placeholderStreet'), !isInteractive)}
              </div>
              <div className="text-gray-600">
                {renderEditableField('buyer.address.postalCode', buyer.address?.postalCode || '', (val) => handleFieldChange('buyer.address.postalCode', val), 'inline', false, 'Postal Code', !isInteractive)}
                {' '}
                {renderEditableField('buyer.address.city', buyer.address?.city || '', (val) => handleFieldChange('buyer.address.city', val), 'inline', false, 'City', !isInteractive)}
              </div>
              <div className="text-gray-600">
                {renderEditableField('buyer.address.country', buyer.address?.country || '', (val) => handleFieldChange('buyer.address.country', val), '', false, 'Country', !isInteractive)}
              </div>
            </div>
          </div>
        );
      }

      if (el.type === 'description') {
        return (
          <div key={key} className="w-full mb-8 min-h-[300px]">
            <div className="text-heading-2 text-gray-700 leading-relaxed whitespace-pre-wrap">
              {renderEditableField('body', editedInvoice.body || '', (val) => handleFieldChange('body', val), 'w-full min-h-[300px] text-heading-2 leading-relaxed', true, t('templates.letterBodyPlaceholder'), !isInteractive)}
            </div>
          </div>
        );
      }

      return null;
    };

    // Check which grouped elements exist and are visible
    const hasTitleEl = visibleElements.find(el => el.type === 'title');
    const hasDatesEl = visibleElements.find(el => el.type === 'dates');
    const hasSellerEl = visibleElements.find(el => el.type === 'seller');
    const hasBuyerEl = visibleElements.find(el => el.type === 'buyer');

    const sections: React.ReactNode[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < visibleElements.length; i++) {
      const el = visibleElements[i];
      if (processedIds.has(el.id)) continue;

      // Group Title & Dates if they are closely related in the loop
      if ((el.type === 'title' || el.type === 'dates') && !processedIds.has('_header')) {
        processedIds.add('_header');
        if (hasTitleEl) processedIds.add(hasTitleEl.id);
        if (hasDatesEl) processedIds.add(hasDatesEl.id);

        sections.push(
          <div key="_header" className="flex justify-between items-start pb-8 border-b-2 border-[rgba(30,58,95,0.15)] w-full mb-4">
            <div className="flex-1">
              {hasTitleEl && (
                <>
                  <div className="text-display font-light text-[#1e3a5f] tracking-tight">
                    {isBusinessLetter 
                      ? renderEditableField('title', editedInvoice.title || 'Business Letter', (val) => handleFieldChange('title', val), '', false, 'Letter Title', !isInteractive)
                      : renderEditableField('seller.name', effectiveSeller.name || '', (val) => handleFieldChange('seller.name', val), '', false, t('previewModal.placeholderSellerName'), !isInteractive)
                    }
                  </div>
                  <div className="mt-2 text-heading-2 text-gray-500 font-mono tracking-wider">
                    {renderEditableField('invoiceNumber', editedInvoice.invoiceNumber || '', (val) => handleFieldChange('invoiceNumber', val), '', false, isBusinessLetter ? 'Reference' : t('previewModal.placeholderInvoiceNumber'), !isInteractive)}
                  </div>
                </>
              )}
            </div>
            {hasDatesEl && (
              <div className="text-right space-y-1 shrink-0 ml-6">
                <p className="text-body text-gray-400 uppercase font-medium tracking-widest">{t('previewModal.issueDate')}</p>
                <div className="text-heading-2 text-gray-900">
                  {renderEditableField('issueDate', editedInvoice.issueDate || '', (val) => handleFieldChange('issueDate', val), '', false, t('previewModal.placeholderIssueDate'), !isInteractive)}
                </div>
                {editedInvoice.dueDate && (
                  <>
                    <p className="text-body text-gray-400 uppercase font-medium tracking-widest mt-3">{t('previewModal.dueDate')}</p>
                    <div className="text-heading-2 text-gray-900">
                      {renderEditableField('dueDate', editedInvoice.dueDate || '', (val) => handleFieldChange('dueDate', val), '', false, t('previewModal.placeholderDueDate'), !isInteractive)}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
        continue;
      }

      // Group Seller & Buyer for side-by-side display
      if ((el.type === 'seller' || el.type === 'buyer') && !processedIds.has('_parties')) {
        processedIds.add('_parties');
        if (hasSellerEl) processedIds.add(hasSellerEl.id);
        if (hasBuyerEl) processedIds.add(hasBuyerEl.id);

        sections.push(
          <div key="_parties" className="grid grid-cols-2 gap-12 py-4 w-full">
            {hasBuyerEl && (
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <p className="text-body text-gray-400 uppercase font-medium tracking-widest">{isBusinessLetter ? (t('editor.recipient') || 'TO') : t('previewModal.billTo')}</p>
                  {isInteractive && buyers.length > 0 && (
                    <Select onValueChange={handleBuyerSelect}>
                      <SelectTrigger className="h-7 w-auto border-none bg-[#f0f6ff] text-[#1e3a5f] text-body font-medium uppercase py-0 px-2 gap-1.5 focus:ring-0 shadow-none hover:bg-[#f0f6ff] transition-colors">
                        <Users className="h-3 w-3" />
                        <SelectValue placeholder={t('previewModal.selectFromDirectory') || 'Select Buyer'} />
                      </SelectTrigger>
                      <SelectContent>
                        {buyers.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-micro">
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1 text-body">
                  <div className="font-medium text-heading-2 text-gray-900">
                    {renderEditableField('buyer.name', editedInvoice.buyer.name || '', (val) => handleFieldChange('buyer.name', val), '', false, t('previewModal.placeholderBuyerName'), !isInteractive)}
                  </div>
                  <div className="text-gray-500 leading-relaxed">
                    {renderEditableField('buyer.vatId', editedInvoice.buyer.vatId || '', (val) => handleFieldChange('buyer.vatId', val), 'block italic text-micro', false, t('previewModal.vatPlaceholder'), !isInteractive)}
                    {renderEditableField('buyer.address.street', editedInvoice.buyer.address.street || '', (val) => handleFieldChange('buyer.address.street', val), 'block', false, t('previewModal.placeholderStreet'), !isInteractive)}
                    <div className="flex gap-1">
                      {renderEditableField('buyer.address.postalCode', editedInvoice.buyer.address.postalCode || '', (val) => handleFieldChange('buyer.address.postalCode', val), 'inline-block', false, t('previewModal.placeholderZip'), !isInteractive)}
                      {renderEditableField('buyer.address.city', editedInvoice.buyer.address.city || '', (val) => handleFieldChange('buyer.address.city', val), 'inline-block', false, t('previewModal.placeholderCity'), !isInteractive)}
                    </div>
                    {renderEditableField('buyer.address.country', editedInvoice.buyer.address.country || '', (val) => handleFieldChange('buyer.address.country', val), 'block', false, t('previewModal.placeholderCountry'), !isInteractive)}
                  </div>
                </div>
              </div>
            )}
            {hasSellerEl && (
              <div>
                <p className="text-body text-gray-400 uppercase font-medium tracking-widest mb-3">{t('previewModal.from')}</p>
                <div className="space-y-1 text-body">
                  <div className="font-medium text-heading-2 text-gray-900">
                    {renderEditableField('seller.name2', effectiveSeller.name || '', (val) => handleFieldChange('seller.name', val), '', false, t('previewModal.placeholderSellerName'), !isInteractive)}
                  </div>
                  <div className="text-gray-500 leading-relaxed">
                    {renderEditableField('seller.vatId', effectiveSeller.vatId || '', (val) => handleFieldChange('seller.vatId', val), 'block italic text-micro', false, t('previewModal.vatPlaceholder'), !isInteractive)}
                    {renderEditableField('seller.address.street', effectiveSeller.address?.street || '', (val) => handleFieldChange('seller.address.street', val), 'block', false, t('previewModal.placeholderStreet'), !isInteractive)}
                    <div className="flex gap-1">
                      {renderEditableField('seller.address.postalCode', effectiveSeller.address?.postalCode || '', (val) => handleFieldChange('seller.address.postalCode', val), 'inline-block', false, t('previewModal.placeholderZip'), !isInteractive)}
                      {renderEditableField('seller.address.city', effectiveSeller.address?.city || '', (val) => handleFieldChange('seller.address.city', val), 'inline-block', false, t('previewModal.placeholderCity'), !isInteractive)}
                    </div>
                    {renderEditableField('seller.address.country', effectiveSeller.address?.country || '', (val) => handleFieldChange('seller.address.country', val), 'block', false, t('previewModal.placeholderCountry'), !isInteractive)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        continue;
      }

      // Render other elements individually in their template order
      processedIds.add(el.id);
      const node = renderElement(el);
      if (node) sections.push(node);
    }

    return (
      <div ref={invoiceCaptureRef} className="bg-white p-10 md:p-14 shadow-2xl border border-gray-100 rounded-[2.5rem] w-full min-h-[1120px]" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto space-y-8 flex flex-col items-center">
          {sections}
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm pb-6 pt-2 flex items-center justify-between border-b border-[rgba(30,58,95,0.06)] shadow-sm -mx-2 px-2">
        <div className="flex gap-4 items-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>

          {allTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-[#2a8fbd]" />
              <Select
                value={template?.id}
                onValueChange={(val) => {
                  const newTemplate = allTemplates.find(t => t.id === val);
                  if (newTemplate) {
                    setTemplate(newTemplate);
                    setEditedInvoice(prev => ({ ...prev, templateId: val }));
                    setHasChanges(true); // Template change is a modification!
                    onTemplateChange?.(val);
                  }
                }}
              >
                <SelectTrigger className="w-[200px] bg-white border-[rgba(30,58,95,0.10)] shadow-sm hover:border-[rgba(30,58,95,0.20)] transition-colors">
                  <SelectValue placeholder={t('previewModal.switchLayout') || 'Switch Layout'} />
                </SelectTrigger>
                <SelectContent>
                  {allTemplates.filter(t => t.templateType !== 'business_letter').map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && !String(editedInvoice.id ?? '').includes('_'))}
            className="bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] text-white shadow-md"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common.saving') || 'Saving...' : t('common.save')}
          </Button>
          {!hasChanges && !String(editedInvoice.id ?? '').includes('_') && (
            <span className="text-micro text-muted-foreground self-center italic px-2">
              {t('previewModal.allChangesSaved') || 'All changes saved'}
            </span>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'pdf' | 'ubl')}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white shadow-md border-2 border-[rgba(30,58,95,0.10)]">
              <TabsTrigger
                value="pdf"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#1e3a5f] data-[state=active]:via-[#2a8fbd] data-[state=active]:to-[#3d5a80] data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isBusinessLetter ? (t('ai.letterPreview') || 'Letter Preview') : t('previewModal.pdfPreview')}
              </TabsTrigger>
              {!isBusinessLetter && (
                <TabsTrigger
                  value="ubl"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#1e3a5f] data-[state=active]:via-[#2a8fbd] data-[state=active]:to-[#3d5a80] data-[state=active]:text-white"
                >
                  <Code className="h-4 w-4 mr-2" />
                  {t('previewModal.ublXml')}
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex gap-2">
              {activeTab === 'pdf' ? (
                <>
                  <div className="flex bg-[#f0f6ff] p-1 rounded-lg border border-[rgba(30,58,95,0.12)] h-10">
                    <button
                      onClick={() => setPreviewMode('web')}
                      className={`px-4 rounded-md text-body font-medium uppercase tracking-widest transition-all ${previewMode === 'web' ? 'bg-white shadow-sm text-[#1e3a5f]' : 'text-[#3d5a80] hover:text-[#1e3a5f]'}`}
                    >
                      <Layout className="h-3 w-3 inline mr-2" />
                      {t('previewModal.webView') || 'Web View'}
                    </button>
                    <button
                      onClick={() => setPreviewMode('print')}
                      className={`px-4 rounded-md text-body font-medium uppercase tracking-widest transition-all ${previewMode === 'print' ? 'bg-white shadow-sm text-[#1e3a5f]' : 'text-[#3d5a80] hover:text-[#1e3a5f]'}`}
                    >
                      <Printer className="h-3 w-3 inline mr-2" />
                      {t('previewModal.printView') || 'Print View'}
                    </button>
                  </div>
                  <Button onClick={handleDownloadPDF} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('previewModal.downloadPdf') || 'Download PDF'}
                  </Button>
                  <Button onClick={handleDownloadPDFPixelPerfect} className="bg-gradient-to-r from-[#1e3a5f] to-[#3d5a80] text-white hover:from-[#e07530] hover:to-[#e07530]">
                    <Image className="h-4 w-4 mr-2" />
                    Pixel-Perfect PDF
                  </Button>
                </>
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

          <TabsContent value="pdf" className="mt-0 flex-1 overflow-visible">
            <div className="bg-slate-50 shadow-inner min-h-[900px] py-12">
              <div className="flex justify-center w-full">
                {renderDynamicLayout(previewMode === 'web')}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ubl" className="mt-0">
            <div className="border rounded-lg bg-gray-50 dark:bg-gray-950">
              <pre className="p-6 text-micro">
                {generateUBLXML(calculated)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
