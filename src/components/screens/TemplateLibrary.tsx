import { useState } from 'react';
import { InvoiceTemplate, TemplateType } from '../../types/invoice';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileText, Plus, Edit, Trash2, Layout, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PLATFORM_TEMPLATES } from '../../utils/invoice-templates-defaults';

interface TemplateLibraryProps {
  templates: InvoiceTemplate[];
  onSelectTemplate: (template: InvoiceTemplate) => void;
  onNewTemplate: (type: TemplateType) => void;
  onEditTemplate?: (template: InvoiceTemplate) => void;
  onDeleteTemplate?: (template: InvoiceTemplate) => void;
  initialFilterType?: TemplateType;
}

// ── Mini document preview rendered as SVG ─────────────────────────────────────
function TemplateMiniPreview({ template }: { template: InvoiceTemplate }) {
  const isLetter = template.templateType === 'business_letter';

  return (
    <div className="relative w-full h-44 bg-gray-50 overflow-hidden rounded-t-xl border-b border-gray-100">
      <svg
        viewBox="0 0 595 450"
        preserveAspectRatio="xMidYMin meet"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        {/* Paper */}
        <rect x="0" y="0" width="595" height="450" fill="white" />

        {/* Purple top accent */}
        <rect x="0" y="0" width="595" height="6" fill="#7c3aed" />

        {/* Logo */}
        {template.logoUrl ? (
          <image href={template.logoUrl} x="38" y="18" height="40" width="100"
            preserveAspectRatio="xMinYMid meet" />
        ) : (
          <rect x="38" y="18" width="70" height="32" rx="4" fill="#f3e8ff" />
        )}

        {isLetter ? (
          <>
            {/* Sender top-right */}
            <rect x="400" y="20" width="130" height="7" rx="2" fill="#ddd6fe" />
            <rect x="400" y="31" width="110" height="5" rx="2" fill="#ede9fe" />
            <rect x="400" y="40" width="95" height="5" rx="2" fill="#ede9fe" />

            {/* Date */}
            <rect x="450" y="72" width="100" height="6" rx="2" fill="#c4b5fd" />

            {/* TO label */}
            <rect x="38" y="98" width="30" height="5" rx="2" fill="#a78bfa" />
            {/* Recipient name */}
            <rect x="38" y="110" width="150" height="9" rx="2" fill="#1e1b4b" opacity="0.65" />
            <rect x="38" y="124" width="120" height="5" rx="2" fill="#e2e8f0" />
            <rect x="38" y="133" width="100" height="5" rx="2" fill="#e2e8f0" />

            {/* Title */}
            <rect x="38" y="165" width="200" height="16" rx="3" fill="#7c3aed" opacity="0.25" />
            <rect x="38" y="167" width="170" height="12" rx="2" fill="#7c3aed" opacity="0.45" />

            {/* Divider */}
            <line x1="38" y1="193" x2="557" y2="193" stroke="#ddd6fe" strokeWidth="1.2" />

            {/* Body paragraphs */}
            {[210, 220, 230, 240, 250].map(y => (
              <rect key={y} x="38" y={y} width={y === 250 ? 380 : 515} height="6" rx="2" fill="#e2e8f0" />
            ))}
            {[272, 282, 292, 302].map(y => (
              <rect key={y} x="38" y={y} width={y === 302 ? 320 : 500} height="6" rx="2" fill="#e2e8f0" />
            ))}

            {/* Closing */}
            <rect x="38" y="335" width="120" height="6" rx="2" fill="#e2e8f0" />
            {/* Signature line */}
            <line x1="38" y1="370" x2="210" y2="370" stroke="#ddd6fe" strokeWidth="1" />
            <rect x="38" y="378" width="90" height="5" rx="2" fill="#c4b5fd" />
          </>
        ) : (
          <>
            {/* Invoice title block */}
            <rect x="38" y="72" width="185" height="20" rx="3" fill="#7c3aed" opacity="0.18" />
            <rect x="38" y="74" width="145" height="16" rx="2" fill="#7c3aed" opacity="0.52" />
            {/* Invoice number */}
            <rect x="38" y="98" width="110" height="6" rx="2" fill="#e2e8f0" />

            {/* Dates (right) */}
            <rect x="455" y="72" width="45" height="5" rx="2" fill="#a78bfa" />
            <rect x="435" y="81" width="120" height="8" rx="2" fill="#ede9fe" />
            <rect x="455" y="94" width="45" height="5" rx="2" fill="#a78bfa" />
            <rect x="435" y="103" width="120" height="8" rx="2" fill="#ede9fe" />

            {/* Seller block */}
            <rect x="38" y="138" width="55" height="5" rx="2" fill="#a78bfa" />
            <rect x="38" y="148" width="160" height="9" rx="2" fill="#1e1b4b" opacity="0.65" />
            <rect x="38" y="162" width="140" height="5" rx="2" fill="#e2e8f0" />
            <rect x="38" y="171" width="120" height="5" rx="2" fill="#e2e8f0" />
            <rect x="38" y="180" width="95" height="5" rx="2" fill="#e2e8f0" />

            {/* Buyer block */}
            <rect x="310" y="138" width="70" height="5" rx="2" fill="#a78bfa" />
            <rect x="310" y="148" width="160" height="9" rx="2" fill="#1e1b4b" opacity="0.65" />
            <rect x="310" y="162" width="140" height="5" rx="2" fill="#e2e8f0" />
            <rect x="310" y="171" width="120" height="5" rx="2" fill="#e2e8f0" />
            <rect x="310" y="180" width="95" height="5" rx="2" fill="#e2e8f0" />

            {/* Items table header */}
            <rect x="38" y="218" width="519" height="22" rx="3" fill="#7c3aed" />
            <rect x="48" y="225" width="130" height="8" rx="2" fill="white" opacity="0.6" />
            <rect x="370" y="225" width="55" height="8" rx="2" fill="white" opacity="0.6" />
            <rect x="455" y="225" width="90" height="8" rx="2" fill="white" opacity="0.6" />

            {/* Row 1 */}
            <rect x="38" y="242" width="519" height="18" fill="#faf5ff" />
            <rect x="48" y="248" width="180" height="6" rx="2" fill="#e2e8f0" />
            <rect x="370" y="248" width="50" height="6" rx="2" fill="#e2e8f0" />
            <rect x="455" y="248" width="90" height="6" rx="2" fill="#e2e8f0" />

            {/* Row 2 */}
            <rect x="38" y="261" width="519" height="18" fill="white" />
            <rect x="48" y="267" width="155" height="6" rx="2" fill="#e2e8f0" />
            <rect x="370" y="267" width="50" height="6" rx="2" fill="#e2e8f0" />
            <rect x="455" y="267" width="90" height="6" rx="2" fill="#e2e8f0" />

            {/* Row 3 */}
            <rect x="38" y="280" width="519" height="18" fill="#faf5ff" />
            <rect x="48" y="286" width="165" height="6" rx="2" fill="#e2e8f0" />
            <rect x="370" y="286" width="50" height="6" rx="2" fill="#e2e8f0" />
            <rect x="455" y="286" width="90" height="6" rx="2" fill="#e2e8f0" />

            {/* Subtotal / tax lines */}
            <line x1="310" y1="312" x2="557" y2="312" stroke="#ddd6fe" strokeWidth="1" />
            <rect x="360" y="320" width="85" height="6" rx="2" fill="#e2e8f0" />
            <rect x="462" y="320" width="90" height="6" rx="2" fill="#e2e8f0" />
            <rect x="360" y="332" width="65" height="6" rx="2" fill="#e2e8f0" />
            <rect x="462" y="332" width="90" height="6" rx="2" fill="#e2e8f0" />

            {/* Total due bar */}
            <rect x="330" y="348" width="227" height="22" rx="3" fill="#7c3aed" />
            <rect x="340" y="355" width="110" height="8" rx="2" fill="white" opacity="0.55" />
            <rect x="460" y="355" width="88" height="8" rx="2" fill="white" opacity="0.9" />
          </>
        )}

        {/* Footer bar */}
        <rect x="0" y="428" width="595" height="22" fill="#faf5ff" />
        <rect x="38" y="433" width="300" height="5" rx="2" fill="#ddd6fe" />
        <rect x="38" y="442" width="200" height="4" rx="2" fill="#ede9fe" />
      </svg>

      {/* Fade out at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function TemplateLibrary({
  templates,
  onSelectTemplate,
  onNewTemplate,
  onEditTemplate,
  onDeleteTemplate,
  initialFilterType = 'invoice',
}: TemplateLibraryProps) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<TemplateType>(initialFilterType);

  const filtered = templates.filter(t => t.templateType === activeFilter || !t.templateType && activeFilter === 'invoice');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>{t('templates.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('templates.subtitle')}
          </p>
        </div>
        <Button onClick={() => onNewTemplate(activeFilter)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('templates.newTemplate')}
        </Button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          onClick={() => setActiveFilter('invoice')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeFilter === 'invoice'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          {t('nav.invoices') || 'Invoices'}
          <Badge variant="secondary" className="ml-1 text-xs">
            {templates.filter(t => t.templateType === 'invoice' || !t.templateType).length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveFilter('business_letter')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeFilter === 'business_letter'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          {t('nav.letters') || 'Business Letters'}
          <Badge variant="secondary" className="ml-1 text-xs">
            {templates.filter(t => t.templateType === 'business_letter').length}
          </Badge>
        </button>
      </div>

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="font-medium">{t('templates.noTemplatesOfType') || 'No templates yet'}</p>
          <p className="text-sm mt-1">{t('templates.createFirst') || 'Create your first template to get started'}</p>
          <Button className="mt-4" onClick={() => onNewTemplate(activeFilter)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('templates.newTemplate')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              {/* Document preview thumbnail */}
              <TemplateMiniPreview template={template} />

              {/* Card body */}
              <div className="p-5 space-y-4 flex flex-col flex-1">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  {PLATFORM_TEMPLATES.some(pt => pt.id === template.id) && (
                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                      System Default
                    </Badge>
                  )}
                  <Badge variant="outline" className={template.templateType === 'business_letter' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}>
                    {template.templateType === 'business_letter' ? (t('nav.letters') || 'Letter') : (t('nav.invoices') || 'Invoice')}
                  </Badge>
                  <Badge variant="secondary">{template.defaultCurrency}</Badge>
                </div>

                {/* Name + description */}
                <div>
                  <h3 className="font-semibold text-base">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>

                {/* Stats */}
                {template.templateType !== 'business_letter' && (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('templates.defaultTax')}</span>
                      <span>{template.defaultTaxCategory} {template.defaultTaxPercent}%</span>
                    </div>
                    {template.seller.name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('templates.seller')}</span>
                        <span className="truncate max-w-[140px] text-right">{template.seller.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {template.templateType === 'business_letter' && template.seller.name && (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('templates.seller')}</span>
                      <span className="truncate max-w-[140px] text-right">{template.seller.name}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 mt-auto">
                  <Button onClick={() => onSelectTemplate(template)} className="flex-1">
                    {t('templates.useTemplate')}
                  </Button>
                  {!PLATFORM_TEMPLATES.some(pt => pt.id === template.id) ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => { if (template.id) window.location.hash = `designLayout/${template.id}`; }}
                        title="Design Layout"
                      >
                        <Layout className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEditTemplate?.(template)}
                        title={t('common.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onDeleteTemplate?.(template)}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1 text-right">
                      <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase tracking-wider border-none">ReadOnly</Badge>
                    </div>
                  )}
                </div>

                {/* Footer note */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {template.templateType === 'business_letter' ? (
                    <p>{t('templates.preConfiguredFor') || 'Pre-configured for'} {t('nav.letters') || 'Business Letters'}</p>
                  ) : (
                    <p>{t('templates.preConfiguredFor')} {template.defaultCurrency} {t('templates.invoices')}</p>
                  )}
                  {template.defaultPaymentTerms?.note && (
                    <p className="mt-0.5 truncate">{template.defaultPaymentTerms.note}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="p-6 bg-muted/50">
        <h3 className="mb-2">{t('templates.aboutTemplates')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('templates.aboutTemplatesDesc')}
        </p>
      </Card>
    </div>
  );
}
