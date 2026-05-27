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

// ── Element type → fill colour mapping ────────────────────────────────────────
const ELEMENT_COLORS: Record<string, { fill: string; accent: string }> = {
  logo:        { fill: '#f3e8ff', accent: '#7c3aed' },
  title:       { fill: '#ede9fe', accent: '#7c3aed' },
  header:      { fill: '#ede9fe', accent: '#8b5cf6' },
  seller:      { fill: '#dbeafe', accent: '#2563eb' },
  buyer:       { fill: '#dcfce7', accent: '#16a34a' },
  sender:      { fill: '#dbeafe', accent: '#2563eb' },
  to:          { fill: '#dcfce7', accent: '#16a34a' },
  dates:       { fill: '#fef3c7', accent: '#d97706' },
  items:       { fill: '#f0fdf4', accent: '#16a34a' },
  totals:      { fill: '#ede9fe', accent: '#7c3aed' },
  tax_summary: { fill: '#fef9c3', accent: '#ca8a04' },
  notes:       { fill: '#fff7ed', accent: '#ea580c' },
  footer:      { fill: '#f1f5f9', accent: '#64748b' },
  qr:          { fill: '#f0fdfa', accent: '#0d9488' },
  signature:   { fill: '#f8fafc', accent: '#94a3b8' },
  description: { fill: '#fdf4ff', accent: '#a21caf' },
};

// ── Mini document preview rendered as SVG ─────────────────────────────────────
function TemplateMiniPreview({ template }: { template: InvoiceTemplate }) {
  const layout = template.layout?.filter(el => el.visible) ?? [];
  const hasLayout = layout.length > 0;

  // Sort by zIndex so higher elements paint on top
  const sorted = [...layout].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div className="relative w-full h-44 bg-gray-50 overflow-hidden rounded-t-xl border-b border-gray-100">
      <svg
        viewBox="0 0 595 450"
        preserveAspectRatio="xMidYMin meet"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Paper */}
        <rect x="0" y="0" width="595" height="450" fill="white" />

        {hasLayout ? (
          <>
            {sorted.map(el => {
              const color = ELEMENT_COLORS[el.type] ?? { fill: '#f1f5f9', accent: '#94a3b8' };
              const clampedH = Math.min(el.h, 450 - el.y); // clip to viewBox
              if (clampedH <= 0) return null;
              const innerPad = 4;
              const lineH = 5;
              const lineGap = 4;
              const linesCount = Math.max(0, Math.floor((clampedH - innerPad * 2) / (lineH + lineGap)));
              return (
                <g key={el.id}>
                  <rect
                    x={el.x} y={el.y} width={el.w} height={clampedH}
                    rx="3" fill={color.fill}
                    stroke={color.accent} strokeWidth="1" strokeOpacity="0.4"
                  />
                  {/* First line as accent (label) */}
                  {clampedH >= 12 && (
                    <rect
                      x={el.x + innerPad} y={el.y + innerPad}
                      width={Math.min(el.w * 0.55, el.w - innerPad * 2)}
                      height={lineH} rx="2" fill={color.accent} fillOpacity="0.55"
                    />
                  )}
                  {/* Additional content lines */}
                  {Array.from({ length: Math.min(linesCount - 1, 4) }, (_, i) => (
                    <rect
                      key={i}
                      x={el.x + innerPad}
                      y={el.y + innerPad + (lineH + lineGap) * (i + 1)}
                      width={Math.min(el.w * (0.8 - i * 0.08), el.w - innerPad * 2)}
                      height={lineH} rx="2"
                      fill={color.accent} fillOpacity="0.2"
                    />
                  ))}
                </g>
              );
            })}
          </>
        ) : (
          <>
            {/* Fallback: generic static preview */}
            <rect x="0" y="0" width="595" height="6" fill="#7c3aed" />
            {template.logoUrl ? (
              <image href={template.logoUrl} x="38" y="18" height="40" width="100" preserveAspectRatio="xMinYMid meet" />
            ) : (
              <rect x="38" y="18" width="70" height="32" rx="4" fill="#f3e8ff" />
            )}
            <rect x="38" y="72" width="145" height="16" rx="2" fill="#7c3aed" fillOpacity="0.5" />
            <rect x="38" y="98" width="110" height="6" rx="2" fill="#e2e8f0" />
            <rect x="38" y="138" width="160" height="9" rx="2" fill="#1e1b4b" fillOpacity="0.6" />
            <rect x="310" y="138" width="160" height="9" rx="2" fill="#1e1b4b" fillOpacity="0.6" />
            <rect x="38" y="218" width="519" height="22" rx="3" fill="#7c3aed" />
            <rect x="38" y="242" width="519" height="18" fill="#faf5ff" />
            <rect x="38" y="261" width="519" height="18" fill="white" />
            <rect x="330" y="348" width="227" height="22" rx="3" fill="#7c3aed" />
            <rect x="0" y="428" width="595" height="22" fill="#faf5ff" />
          </>
        )}
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
          className={`flex items-center gap-2 px-4 py-2 text-body font-medium border-b-2 -mb-px transition-colors ${
            activeFilter === 'invoice'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          {t('nav.invoices') || 'Invoices'}
          <Badge variant="secondary" className="ml-1 text-micro">
            {templates.filter(t => t.templateType === 'invoice' || !t.templateType).length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveFilter('business_letter')}
          className={`flex items-center gap-2 px-4 py-2 text-body font-medium border-b-2 -mb-px transition-colors ${
            activeFilter === 'business_letter'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          {t('nav.letters') || 'Business Letters'}
          <Badge variant="secondary" className="ml-1 text-micro">
            {templates.filter(t => t.templateType === 'business_letter').length}
          </Badge>
        </button>
      </div>

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="font-medium">{t('templates.noTemplatesOfType') || 'No templates yet'}</p>
          <p className="text-body mt-1">{t('templates.createFirst') || 'Create your first template to get started'}</p>
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
                  <h3 className="font-semibold text-heading-2">{template.name}</h3>
                  <p className="text-body text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>

                {/* Stats */}
                {template.templateType !== 'business_letter' && (
                  <div className="space-y-1.5 text-body">
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
                  <div className="space-y-1.5 text-body">
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
                      <Badge variant="outline" className="text-body text-muted-foreground uppercase tracking-wider border-none">ReadOnly</Badge>
                    </div>
                  )}
                </div>

                {/* Footer note */}
                <div className="pt-2 border-t text-micro text-muted-foreground">
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
        <p className="text-body text-muted-foreground">
          {t('templates.aboutTemplatesDesc')}
        </p>
      </Card>
    </div>
  );
}
