import { useState, useEffect, useMemo, useCallback } from 'react';
import { Invoice, InvoiceLine, ValidationError, InvoiceTemplate, CompanyProfile } from '../../types/invoice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  ArrowLeft,
  Save,
  Eye,
  Download,
  CheckCircle,
  Plus,
  AlertCircle,
  LayoutTemplate,
  FileText,
} from 'lucide-react';
import { LineItemRow } from '../invoice/LineItemRow';
import { PartyCard } from '../invoice/PartyCard';
import { TaxSummaryPanel } from '../invoice/TaxSummaryPanel';
import { ValidationPanel } from '../invoice/ValidationPanel';
import { ExportModal } from '../invoice/ExportModal';
import { ValidationChip } from '../invoice/ValidationChip';
import { calculateInvoiceTotals } from '../../utils/invoice-calculations';
import { validateInvoice, isInvoiceValid } from '../../utils/invoice-validation';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';


interface InvoiceEditorProps {
  invoice: Invoice;
  onSave: (invoice: Invoice) => void;
  onBack: () => void;
  onPreview: (invoice: Invoice) => void;
  mode?: 'invoice' | 'template';
  templates?: InvoiceTemplate[];
  onLoadTemplate?: (template: InvoiceTemplate) => void;
  profile?: CompanyProfile | null;
}

export function InvoiceEditor({ invoice: initialInvoice, onSave, onBack, onPreview, mode = 'invoice', templates = [], onLoadTemplate, profile }: InvoiceEditorProps) {
  const { t } = useLanguage();
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Memoize heavy calculations
  const calculatedInvoice = useMemo(() => {
    return calculateInvoiceTotals(invoice);
  }, [invoice]);

  const validationErrors = useMemo(() => {
    return validateInvoice(calculatedInvoice);
  }, [calculatedInvoice]);

  // Track unsaved changes
  useEffect(() => {
    if (JSON.stringify(invoice) !== JSON.stringify(initialInvoice)) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [invoice, initialInvoice]);

  const handleUpdateInvoice = useCallback((updates: Partial<Invoice>) => {
    setInvoice(prev => ({ ...prev, ...updates }));
  }, []);

  const handleUpdateLine = useCallback((index: number, updatedLine: InvoiceLine) => {
    setInvoice(prev => {
      const newLines = [...prev.lines];
      newLines[index] = updatedLine;
      return { ...prev, lines: newLines };
    });
  }, []);

  const handleDeleteLine = useCallback((index: number) => {
    setInvoice(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
    toast.success(t('editor.lineDeleted') || 'Line item deleted');
  }, [t]);

  const handleAddLine = useCallback(() => {
    const newLine: InvoiceLine = {
      id: String(Date.now()),
      description: '',
      quantity: 1,
      unitCode: 'EA',
      unitPrice: 0,
      taxCategory: 'S',
      taxPercent: 19.0,
    };
    setInvoice(prev => ({
      ...prev,
      lines: [...prev.lines, newLine]
    }));
    toast.success(t('editor.lineAdded') || 'Line item added');
  }, [t]);

  const handleSave = useCallback(() => {
    const toSave = {
      ...calculatedInvoice,
      updatedAt: new Date().toISOString(),
    };
    onSave(toSave);
    setHasUnsavedChanges(false);
    toast.success(t('editor.invoiceSaved'));
  }, [calculatedInvoice, onSave, t]);

  const handleValidate = () => {
    const errors = validateInvoice(calculatedInvoice);

    if (errors.filter((e) => e.severity === 'error').length === 0) {
      toast.success(t('editor.validationSuccess') || 'Invoice is valid!', {
        description: t('editor.validationSuccessDesc') || 'All EN 16931 requirements are met',
      });
      handleUpdateInvoice({ status: 'validated' });
    } else {
      toast.error(t('editor.validationFailed') || 'Validation failed', {
        description: `${errors.filter((e) => e.severity === 'error').length} ${t('validation.errors')}`,
      });
    }
  };

  const handleExport = async (options: any) => {
    try {
      const { exportInvoice } = await import('../../utils/invoice-export');
      await exportInvoice(calculatedInvoice, options);
      toast.success(t('exportModal.exportSuccess'), {
        description: `${t('exportModal.exportSuccessDesc').replace('{format}', options.format.toUpperCase())}`,
      });
    } catch (error) {
      toast.error(t('common.error'), {
        description: 'Failed to export invoice',
      });
      console.error('Export error:', error);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'n') {
        e.preventDefault();
        handleAddLine();
      }
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onPreview(calculatedInvoice);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoice, handleSave, handleAddLine, onPreview, calculatedInvoice]);

  const isValid = isInvoiceValid(calculatedInvoice);
  const isTemplateMode = mode === 'template';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('editor.back') || 'Back'}
          </Button>
          <div>
            <h1>{isTemplateMode ? (t('templates.templateEditor') || 'Template Editor') : (t('editor.title') || 'Invoice Editor')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTemplateMode
                ? (invoice.invoiceNumber || t('templates.newTemplate') || 'New Template')
                : (invoice.invoiceNumber || t('editor.newInvoice') || 'New Invoice')
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isTemplateMode && templates && templates.length > 0 && onLoadTemplate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  {t('templates.loadTemplate') || 'Load Template'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>{t('templates.selectTemplate') || 'Select a Template'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {templates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => onLoadTemplate(template)}
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                    {template.description && (
                      <span className="text-xs text-muted-foreground pl-6">{template.description}</span>
                    )}
                  </DropdownMenuItem>
                ))}
                {templates.length === 0 && (
                  <DropdownMenuItem disabled>
                    {t('templates.noTemplates') || 'No templates available'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!isTemplateMode && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t('editor.status') || 'Status'}:</label>
              <Select
                value={invoice.status || 'draft'}
                onValueChange={(value: any) => {
                  handleUpdateInvoice({ status: value });
                  toast.success(t('editor.statusUpdated') || 'Status updated', {
                    description: `${t('editor.invoiceStatusChangedTo') || 'Invoice status changed to'} ${t(`status.${value}`)}`,
                  });
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="validated">{t('status.validated')}</SelectItem>
                  <SelectItem value="sent">{t('status.sent')}</SelectItem>
                  <SelectItem value="paid">{t('status.paid')}</SelectItem>
                  <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {hasUnsavedChanges && (
            <Badge variant="secondary">{t('editor.unsavedChanges') || 'Unsaved changes'}</Badge>
          )}
          {isValid ? (
            <ValidationChip severity="info" />
          ) : (
            <ValidationChip
              severity="error"
              count={validationErrors.filter((e) => e.severity === 'error').length}
            />
          )}
          {invoice.signed && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {t('status.signed')}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
              <Save className="h-4 w-4 mr-2" />
              {isTemplateMode
                ? (t('templates.saveTemplate') || 'Save Template')
                : (t('editor.saveDraft') || 'Save Draft')
              }
            </Button>
            {!isTemplateMode && (
              <>
                <Button variant="outline" onClick={handleValidate}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('editor.validate') || 'Validate'}
                </Button>
                <Button variant="outline" onClick={() => onPreview(calculatedInvoice)}>
                  <Eye className="h-4 w-4 mr-2" />
                  {t('editor.preview')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsExportOpen(true)}
                  disabled={!isValid}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('editor.export')}
                </Button>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+S</kbd> {t('common.save')} •{' '}
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Alt+N</kbd> {t('editor.addLine')}
            {!isTemplateMode && (
              <>
                {' '}•{' '}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">P</kbd> {t('editor.preview')}
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Metadata */}
          <Card className="p-6 space-y-4">
            <h2>{isTemplateMode ? (t('templates.templateDetails') || 'Template Details') : t('editor.invoiceDetails')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">
                  {isTemplateMode
                    ? (t('templates.templateName') || 'Template Name')
                    : t('editor.invoiceNumber')
                  } *
                </Label>
                <Input
                  id="invoiceNumber"
                  value={invoice.invoiceNumber}
                  onChange={(e) => handleUpdateInvoice({ invoiceNumber: e.target.value })}
                  placeholder={isTemplateMode ? t('templates.templateNamePlaceholder') || "My Template Name" : "INV-2025-00123"}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isTemplateMode
                    ? (t('templates.templateNameDesc') || 'A descriptive name for this template')
                    : 'UBL: Invoice/ID'
                  }
                </p>
              </div>

              <div>
                <Label htmlFor="currency">{t('editor.currency')} *</Label>
                <Select
                  value={invoice.currency}
                  onValueChange={(value: string) => handleUpdateInvoice({ currency: value })}
                >
                  <SelectTrigger id="currency" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  UBL: Invoice/DocumentCurrencyCode
                </p>
              </div>

              {!isTemplateMode && (
                <>
                  <div>
                    <Label htmlFor="issueDate">{t('editor.issueDate')} *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={invoice.issueDate}
                      onChange={(e) => handleUpdateInvoice({ issueDate: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      UBL: Invoice/IssueDate
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dueDate">{t('editor.dueDate')}</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={invoice.dueDate || ''}
                      onChange={(e) => handleUpdateInvoice({ dueDate: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      UBL: Invoice/DueDate
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PartyCard
              party={invoice.seller}
              title={`${t('editor.seller')} (Supplier)`}
              onUpdate={(party) => handleUpdateInvoice({ seller: party })}
              ublPath="Invoice/AccountingSupplierParty"
              defaultParty={profile ? {
                name: profile.name,
                vatId: profile.vatId,
                legalOrganizationId: profile.legalOrganizationId,
                address: profile.address,
                contactEmail: profile.email,
                contactPhone: profile.phone,
              } : undefined}
            />
            {!isTemplateMode && (
              <PartyCard
                party={invoice.buyer}
                title={`${t('editor.buyer')} (Customer)`}
                onUpdate={(party) => handleUpdateInvoice({ buyer: party })}
                ublPath="Invoice/AccountingCustomerParty"
              />
            )}
            {isTemplateMode && (
              <Card className="p-6">
                <h3 className="mb-4">{t('templates.templateInfo') || 'Template Information'}</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {t('templates.templateInfoDesc') || 'Configure default seller information, currency, and tax settings for this template. Buyer information will be added when creating invoices from this template.'}
                  </p>
                  <div className="pt-3 border-t">
                    <Label htmlFor="templateDescription">{t('templates.description') || 'Description'}</Label>
                    <Input
                      id="templateDescription"
                      value={invoice.note || ''}
                      onChange={(e) => handleUpdateInvoice({ note: e.target.value })}
                      placeholder={t('templates.descriptionPlaceholder') || 'e.g., Consulting services invoice template'}
                      className="mt-1"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Line Items */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2>{isTemplateMode ? (t('templates.defaultLineItems') || 'Default Line Items (Optional)') : t('editor.lineItems')}</h2>
              <Button onClick={handleAddLine} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('editor.addLine')}
              </Button>
            </div>
            {isTemplateMode && (
              <p className="text-sm text-muted-foreground">
                {t('templates.lineItemsDesc') || 'You can add default line items that will be pre-filled when using this template, or leave empty to start with a blank invoice.'}
              </p>
            )}

            {invoice.lines.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('editor.noLineItems') || 'No line items yet'}</p>
                <p className="text-sm mt-2">{t('editor.noLineItemsDesc') || 'Add items or services to the invoice'}</p>
                <Button onClick={handleAddLine} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('editor.addFirstLine') || 'Add First Line'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {calculatedInvoice.lines.map((line, index) => (
                  <LineItemRow
                    key={line.id}
                    line={line}
                    currency={invoice.currency}
                    index={index}
                    onUpdate={(_id, updates) => {
                      const updatedLine = { ...line, ...updates };
                      handleUpdateLine(index, updatedLine);
                    }}
                    onDelete={() => handleDeleteLine(index)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Tax Summary */}
          <TaxSummaryPanel invoice={calculatedInvoice} />

          {/* Validation */}
          <Card className="p-6">
            <ValidationPanel errors={validationErrors} />
          </Card>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onBack}>
          {t('editor.back') || 'Back'}
        </Button>
        <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
          <Save className="h-4 w-4 mr-2" />
          {isTemplateMode
            ? (t('templates.saveTemplate') || 'Save Template')
            : (t('editor.saveDraft') || 'Save Draft')
          }
        </Button>
      </div>

      {/* Modals */}
      <ExportModal
        invoiceNumber={invoice.invoiceNumber}
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        onExport={handleExport}
      />
    </div>
  );
}
