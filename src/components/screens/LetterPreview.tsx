import { useState, useEffect } from 'react';
import { Invoice, InvoiceTemplate, CompanyProfile, Buyer } from '../../types/invoice';
import { letterService, buyerService } from '../../services/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { ArrowLeft, Download, Save, Edit2, Check, X, Layout, Sparkles, Loader2, Users } from 'lucide-react';
import { generateLetterPDF } from '../../utils/letter-pdf';
import { useLanguage } from '../../contexts/LanguageContext';
import { RichTextEditor } from '../ui/RichTextEditor';
import { aiLetterService } from '../../services/api';
import { toast } from 'sonner';

interface LetterPreviewProps {
  letter: Invoice;
  onBack: () => void;
  onSave?: (letter: Invoice) => void;
  template?: InvoiceTemplate;
  allTemplates?: InvoiceTemplate[];
  onTemplateChange?: (templateId: string) => void;
  profile?: CompanyProfile | null;
}

export function LetterPreview({
  letter: initialLetter,
  onBack,
  onSave,
  template: initialTemplate,
  allTemplates = [],
  onTemplateChange,
  profile,
}: LetterPreviewProps) {
  const { t, isRtl } = useLanguage();
  const [letter, setLetter] = useState<Invoice>(initialLetter);
  const [hasChanges, setHasChanges] = useState(() => String(initialLetter.id ?? '').startsWith('new_'));
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [richEditValue, setRichEditValue] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate | undefined>(initialTemplate);
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  useEffect(() => {
    buyerService.getAll().then(setBuyers).catch(() => {});
  }, []);

  // Sync template when prop changes
  useEffect(() => {
    setCurrentTemplate(initialTemplate);
  }, [initialTemplate?.id]);

  // Sync letter when prop changes
  useEffect(() => {
    const inv = initialLetter;
    const isDifferent = !letter.id || inv.id !== letter.id;
    if (isDifferent) {
      setLetter(inv);
      setHasChanges(String(inv.id ?? '').startsWith('new_'));
    } else if (JSON.stringify(inv) !== JSON.stringify(letter)) {
      setLetter(inv);
      setHasChanges(true);
    }
  }, [initialLetter]);

  const handleTemplateChange = (templateId: string) => {
    const selected = allTemplates.find(t => t.id === templateId);
    if (!selected) return;
    setCurrentTemplate(selected);
    setLetter(prev => ({ ...prev, templateId }));
    setHasChanges(true);
    onTemplateChange?.(templateId);
  };

  const handleBuyerSelect = (buyerId: string) => {
    const b = buyers.find(x => x.id === buyerId);
    if (!b) return;
    setLetter(prev => ({
      ...prev,
      buyer: {
        ...prev.buyer,
        name: b.name,
        vatId: b.vatId || '',
        address: {
          street: b.address?.street || '',
          city: b.address?.city || '',
          postalCode: b.address?.postalCode || '',
          country: b.address?.country || '',
        },
        contactEmail: b.contactEmail || '',
      },
    }));
    setHasChanges(true);
  };

  const handleFieldChange = (field: string, value: string) => {
    setLetter(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setEditingField(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isNew = !letter.id || String(letter.id).startsWith('new_');
      let savedLetter = letter;

      if (isNew) {
        const { id, ...data } = letter;
        const res = await letterService.create(data as Invoice);
        savedLetter = { ...letter, id: String(res.id) };
        setLetter(savedLetter);
        toast.success(t('previewModal.letterCreated') || 'Letter created successfully');
      } else {
        await letterService.update(String(letter.id), letter);
        toast.success(t('previewModal.letterUpdated') || 'Letter updated successfully');
      }

      setHasChanges(false);
      onSave?.(savedLetter);
    } catch {
      toast.error(t('previewModal.letterSaveFailed') || 'Failed to save letter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const id = toast.loading(t('common.loading') || 'Generating PDF...');
      await generateLetterPDF(letter, currentTemplate, profile);
      toast.dismiss(id);
      toast.success(t('common.downloaded') || 'Downloaded');
    } catch {
      toast.error(t('previewModal.pdfGenerationFailed') || 'Failed to generate PDF');
    }
  };

  // Effective branding values: letter > template > profile
  const effectiveLogo = currentTemplate?.logoUrl || profile?.logoUrl;
  const effectiveHeader = currentTemplate?.headerText || profile?.headerText;
  const effectiveFooter = currentTemplate?.footerText || profile?.footerText;
  const effectiveSeller = {
    name: letter.seller?.name || currentTemplate?.seller?.name || profile?.name || '',
    address: {
      street: letter.seller?.address?.street || currentTemplate?.seller?.address?.street || profile?.address?.street || '',
      city: letter.seller?.address?.city || currentTemplate?.seller?.address?.city || profile?.address?.city || '',
      postalCode: letter.seller?.address?.postalCode || currentTemplate?.seller?.address?.postalCode || profile?.address?.postalCode || '',
      country: letter.seller?.address?.country || currentTemplate?.seller?.address?.country || profile?.address?.country || '',
    },
    contactEmail: letter.seller?.contactEmail || profile?.email || '',
  };

  // Only show business_letter templates in the letter preview
  const sortedTemplates = allTemplates.filter(t => t.templateType === 'business_letter');

  // Read visibility from the active template layout
  const activeLayout = currentTemplate?.layout?.length ? currentTemplate.layout : null;
  const getLayoutEl = (type: string) => {
    if (!activeLayout) return { visible: true, y: 0 }; // no layout → show everything
    const el = activeLayout.find(e => e.type === type);
    return el && el.visible !== false ? el : null;
  };
  const isVisible = (type: string) => !!getLayoutEl(type);

  // Derive render order for flowing sections from layout y-coordinates
  const sectionOrder = (['logo', 'header', 'sender', 'dates', 'to', 'title', 'description', 'signature', 'footer'] as const)
    .map(type => ({ type, y: activeLayout?.find(e => e.type === type)?.y ?? 9999 }))
    .sort((a, b) => a.y - b.y)
    .map(s => s.type);

  const handleImproveWithAI = async () => {
    if (!richEditValue || !richEditValue.trim() || isImproving) return;
    setIsImproving(true);
    const toastId = toast.loading('Improving letter body with AI…');
    try {
      const result = await aiLetterService.improveBody(richEditValue, undefined, {
        subject: letter.note || undefined,
        recipient: letter.buyer?.name || undefined,
        sender: effectiveSeller.name || undefined,
      });
      setRichEditValue(result.body);
      toast.dismiss(toastId);
      toast.success('Letter body improved!');
    } catch (err: unknown) {
      toast.dismiss(toastId);
      const msg = err?.response?.data?.message || err?.message || 'AI improvement failed';
      toast.error(msg);
    } finally {
      setIsImproving(false);
    }
  };

  // Generic editable text — takes an explicit onSave so it works for nested paths
  const renderEditableText = (
    key: string,
    value: string,
    onSave: (val: string) => void,
    className = '',
    placeholder = ''
  ) => {
    if (editingField === key) {
      return (
        <input
          autoFocus
          defaultValue={value}
          onBlur={e => { onSave(e.target.value); setEditingField(null); setHasChanges(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSave((e.target as HTMLInputElement).value); setEditingField(null); setHasChanges(true); }
            if (e.key === 'Escape') setEditingField(null);
          }}
          className={`${className} border-b-2 border-purple-400 outline-none bg-transparent w-full`}
        />
      );
    }
    return (
      <span
        onDoubleClick={() => setEditingField(key)}
        className={`${className} cursor-pointer hover:bg-purple-50 rounded px-0.5 group relative inline-block`}
        title="Double-click to edit"
      >
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
        <Edit2 className="h-3 w-3 absolute -right-4 top-0.5 opacity-0 group-hover:opacity-50 text-purple-500" />
      </span>
    );
  };

  // Helpers for updating buyer and seller nested fields
  const updateBuyer = (field: string, value: string) =>
    setLetter(prev => ({ ...prev, buyer: { ...prev.buyer, [field]: value } }));
  const updateBuyerAddress = (field: string, value: string) =>
    setLetter(prev => ({ ...prev, buyer: { ...prev.buyer, address: { ...prev.buyer?.address, [field]: value } } }));
  const updateSeller = (field: string, value: string) =>
    setLetter(prev => ({ ...prev, seller: { ...prev.seller, [field]: value } }));
  const updateSellerAddress = (field: string, value: string) =>
    setLetter(prev => ({ ...prev, seller: { ...prev.seller, address: { ...prev.seller?.address, [field]: value } } }));

  // Simple inline text editor (input on double-click)
  const renderField = (field: string, value: string, className = '', placeholder = '') => {
    if (editingField === field) {
      return (
        <input
          autoFocus
          defaultValue={value}
          onBlur={e => handleFieldChange(field, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleFieldChange(field, (e.target as HTMLInputElement).value);
            if (e.key === 'Escape') setEditingField(null);
          }}
          className={`${className} border-b-2 border-purple-400 outline-none bg-transparent w-full`}
        />
      );
    }
    return (
      <span
        onDoubleClick={() => setEditingField(field)}
        className={`${className} cursor-pointer hover:bg-purple-50 rounded px-0.5 group relative inline-block`}
        title="Double-click to edit"
      >
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
        <Edit2 className="h-3 w-3 absolute -right-4 top-0.5 opacity-0 group-hover:opacity-50 text-purple-500" />
      </span>
    );
  };

  // Rich text inline editor for letter body
  const renderBodyField = () => {
    if (editingField === 'body') {
      return (
        <div className="border-2 border-purple-400 rounded-xl overflow-hidden shadow-sm">
          <div className="min-h-[220px]">
            <RichTextEditor
              value={richEditValue}
              onChange={setRichEditValue}
              placeholder={t('templates.letterBodyPlaceholder') || 'Type your letter content here...'}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border-t border-purple-200">
            <Button
              size="sm"
              variant="outline"
              onClick={handleImproveWithAI}
              disabled={isImproving || !richEditValue?.trim()}
              className="border-violet-300 text-violet-700 hover:bg-violet-50 gap-1.5"
              title="Rewrite the letter body using AI to make it more professional"
            >
              {isImproving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />}
              {isImproving ? 'Improving…' : 'Improve with AI'}
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                <X className="h-3 w-3 mr-1" />
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 text-white hover:bg-purple-700"
                onClick={() => handleFieldChange('body', richEditValue)}
              >
                <Check className="h-3 w-3 mr-1" />
                {t('common.apply') || 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        onDoubleClick={() => { setRichEditValue(letter.body || ''); setEditingField('body'); }}
        className="cursor-pointer hover:bg-purple-50 rounded-lg group relative min-h-[160px] p-1 transition-colors"
        title="Double-click to edit"
      >
        {letter.body ? (
          <div
            className="text-body text-gray-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: letter.body }}
          />
        ) : (
          <p className="text-gray-400 italic text-body min-h-[160px] flex items-start pt-2">
            {t('templates.letterBodyPlaceholder') || 'No letter content. Double-click to add.'}
          </p>
        )}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/80 rounded px-1.5 py-0.5 shadow-sm border border-purple-200">
          <Edit2 className="h-3 w-3 text-purple-500" />
          <span className="text-[10px] text-purple-500 font-medium">Double-click to edit</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm pb-4 pt-2 flex items-center justify-between border-b border-purple-50 shadow-sm -mx-2 px-2 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>

        <div className="flex gap-2 items-center">
          {/* Template selector */}
          {sortedTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-purple-600" />
              <Select
                value={currentTemplate?.id ?? ''}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="w-[200px] bg-white border-purple-100 shadow-sm hover:border-purple-300 transition-colors">
                  <SelectValue placeholder={t('previewModal.switchLayout') || 'Switch Template'} />
                </SelectTrigger>
                <SelectContent>
                  {sortedTemplates.map(tmpl => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>
                      <span className="flex items-center gap-2">
                        {tmpl.name}
                        {tmpl.templateType === 'business_letter' && (
                          <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">Letter</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!hasChanges && !String(letter.id ?? '').includes('_') && (
            <span className="text-micro text-muted-foreground italic px-2">
              {t('previewModal.allChangesSaved') || 'All changes saved'}
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && !String(letter.id ?? '').includes('_'))}
            className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? (t('common.saving') || 'Saving...') : t('common.save')}
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            {t('previewModal.downloadPdf') || 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Edit hint */}
      <div className="mb-4 flex items-center gap-2 text-micro text-purple-500 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
        <Edit2 className="h-3.5 w-3.5 shrink-0" />
        <span>Double-click any text field on the letter to edit it inline. Use the rich text editor for the body content.</span>
      </div>

      {/* Letter Document */}
      <Card className="p-6">
        <div className="bg-slate-50 shadow-inner min-h-[900px] py-12">
          <div className="flex justify-center">
            <div
              className="bg-white p-10 md:p-14 shadow-2xl border border-gray-100 rounded-[2.5rem] w-full max-w-4xl min-h-[1120px]"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="max-w-3xl mx-auto space-y-8">
                {sectionOrder.map(type => {
                  if (!isVisible(type)) return null;

                  if (type === 'logo') return effectiveLogo ? (
                    <div key="logo">
                      <img src={effectiveLogo} alt="Logo" className="h-16 object-contain" />
                    </div>
                  ) : null;

                  if (type === 'header') return effectiveHeader ? (
                    <div key="header" className="text-center text-micro text-gray-400 italic">
                      <div dangerouslySetInnerHTML={{ __html: effectiveHeader }} />
                    </div>
                  ) : null;

                  if (type === 'title') return (
                    <div key="title" className="flex justify-between items-start pb-8 border-b-2 border-purple-200">
                      <div className="flex-1">
                        <div className="text-display font-light text-purple-700 tracking-tight">
                          {renderField('title', (letter as any).title || '', '', 'Business Letter')}
                        </div>
                        <div className="mt-2 text-heading-2 text-gray-500 font-mono tracking-wider">
                          {renderField('invoiceNumber', letter.invoiceNumber || '', '', 'Reference')}
                        </div>
                      </div>
                      {isVisible('dates') && (
                        <div className="text-right space-y-1 shrink-0 ml-6">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                            {t('previewModal.issueDate') || 'ISSUE DATE'}
                          </p>
                          <div className="text-heading-2 text-gray-900">
                            {letter.issueDate ? new Date(letter.issueDate).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  );

                  // dates shown inline with title above — skip as standalone
                  if (type === 'dates') return null;

                  if (type === 'sender') return (
                    <div key="sender" className="flex justify-end py-2">
                      <div className="w-64">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-3 border-b border-gray-100 pb-2">
                          {t('previewModal.from') || 'FROM'}
                        </p>
                        <div className="text-body space-y-1">
                          <div className="text-heading-2 font-semibold text-gray-900">
                            {renderEditableText('seller.name', effectiveSeller.name, updateSeller.bind(null, 'name'), 'font-semibold text-gray-900', 'Sender name')}
                          </div>
                          <div className="text-gray-600">
                            {renderEditableText('seller.address.street', effectiveSeller.address?.street || '', updateSellerAddress.bind(null, 'street'), 'text-gray-600', 'Street')}
                          </div>
                          <div className="text-gray-600 flex gap-1">
                            {renderEditableText('seller.address.postalCode', effectiveSeller.address?.postalCode || '', updateSellerAddress.bind(null, 'postalCode'), 'text-gray-600 w-20', 'ZIP')}
                            {renderEditableText('seller.address.city', effectiveSeller.address?.city || '', updateSellerAddress.bind(null, 'city'), 'text-gray-600', 'City')}
                          </div>
                          <div className="text-gray-600">
                            {renderEditableText('seller.address.country', effectiveSeller.address?.country || '', updateSellerAddress.bind(null, 'country'), 'text-gray-600', 'Country')}
                          </div>
                          <div className="text-gray-500 text-micro">
                            {renderEditableText('seller.contactEmail', effectiveSeller.contactEmail, updateSeller.bind(null, 'contactEmail'), 'text-gray-500 text-micro', 'Email')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                  if (type === 'to') return (
                    <div key="to" className="py-4">
                      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                          {t('editor.recipient') || 'TO'}
                        </p>
                        {buyers.length > 0 && (
                          <Select onValueChange={handleBuyerSelect}>
                            <SelectTrigger className="h-7 w-auto border-none bg-purple-50 text-purple-700 text-[10px] font-bold uppercase py-0 px-2 gap-1.5 focus:ring-0 shadow-none hover:bg-purple-100 transition-colors">
                              <Users className="h-3 w-3" />
                              <SelectValue placeholder={t('previewModal.selectFromDirectory') || 'Select from directory'} />
                            </SelectTrigger>
                            <SelectContent>
                              {buyers.map(b => (
                                <SelectItem key={b.id} value={b.id} className="text-micro">{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="text-body space-y-1">
                        <div className="text-heading-3 font-bold text-gray-900">
                          {renderEditableText('buyer.name', letter.buyer?.name || '', updateBuyer.bind(null, 'name'), 'font-bold text-gray-900', 'Recipient name')}
                        </div>
                        <div className="text-gray-600">
                          {renderEditableText('buyer.address.street', letter.buyer?.address?.street || '', updateBuyerAddress.bind(null, 'street'), 'text-gray-600', 'Street')}
                        </div>
                        <div className="text-gray-600 flex gap-1">
                          {renderEditableText('buyer.address.postalCode', letter.buyer?.address?.postalCode || '', updateBuyerAddress.bind(null, 'postalCode'), 'text-gray-600 w-20', 'ZIP')}
                          {renderEditableText('buyer.address.city', letter.buyer?.address?.city || '', updateBuyerAddress.bind(null, 'city'), 'text-gray-600', 'City')}
                        </div>
                        <div className="text-gray-600">
                          {renderEditableText('buyer.address.country', letter.buyer?.address?.country || '', updateBuyerAddress.bind(null, 'country'), 'text-gray-600', 'Country')}
                        </div>
                      </div>
                    </div>
                  );

                  if (type === 'description') return (
                    <div key="description" className="space-y-5 pt-2">
                      {/* Subject */}
                      <div className="py-2">
                        <p className="text-body font-semibold text-gray-700">
                          {t('editor.letterSubject') || 'Re:'}{' '}
                          {renderField('note', letter.note || '', 'text-gray-700', 'e.g. Project Update, Meeting Follow-up')}
                        </p>
                      </div>
                      {/* Salutation */}
                      <p className="text-body text-gray-800">
                        {renderField('salutation', letter.salutation || '', 'text-gray-800', 'e.g. Dear Sir/Madam,')}
                      </p>
                      {/* Body */}
                      {renderBodyField()}
                      {/* Closing */}
                      <div className="pt-6">
                        <p className="text-body text-gray-800">
                          {renderField('closing', letter.closing || '', 'text-gray-800', 'e.g. Yours sincerely,')}
                        </p>
                      </div>
                    </div>
                  );

                  if (type === 'signature') return (
                    <div key="signature" className="mt-8 w-40 border-t border-gray-300 pt-1">
                      <p className="text-micro text-gray-500">{effectiveSeller.name}</p>
                    </div>
                  );

                  if (type === 'footer') return effectiveFooter ? (
                    <div key="footer" className="mt-12 pt-8 border-t border-gray-100 text-[10px] text-gray-400 text-center leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: effectiveFooter }} />
                    </div>
                  ) : null;

                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
