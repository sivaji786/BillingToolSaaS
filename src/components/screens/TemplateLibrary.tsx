import { InvoiceTemplate } from '../../types/invoice';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileText, Plus, Edit, Trash2, Layout } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PLATFORM_TEMPLATES } from '../../utils/invoice-templates-defaults';

interface TemplateLibraryProps {
  templates: InvoiceTemplate[];
  onSelectTemplate: (template: InvoiceTemplate) => void;
  onNewTemplate: () => void;
  onEditTemplate?: (template: InvoiceTemplate) => void;
  onDeleteTemplate?: (template: InvoiceTemplate) => void;
}

export function TemplateLibrary({
  templates,
  onSelectTemplate,
  onNewTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: TemplateLibraryProps) {
  const { t } = useLanguage();

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
        <Button onClick={onNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('templates.newTemplate')}
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              {template.logoUrl ? (
                <img
                  src={template.logoUrl}
                  alt={template.name}
                  className="h-8 object-contain"
                />
              ) : (
                <FileText className="h-8 w-8 text-primary" />
              )}
              <div className="flex gap-2">
                {PLATFORM_TEMPLATES.some(pt => pt.id === template.id) && (
                  <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                    System Default
                  </Badge>
                )}
                <Badge variant="secondary">{template.defaultCurrency}</Badge>
              </div>
            </div>

            <div>
              <h3>{template.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {template.description}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('templates.defaultTax')}</span>
                <span>
                  {template.defaultTaxCategory} {template.defaultTaxPercent}%
                </span>
              </div>
              {template.seller.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('templates.seller')}</span>
                  <span>{template.seller.name}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onSelectTemplate(template)}
                className="flex-1"
              >
                {t('templates.useTemplate')}
              </Button>
              {!PLATFORM_TEMPLATES.some(pt => pt.id === template.id) ? (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (template.id) {
                        window.location.hash = `designLayout/${template.id}`;
                      }
                    }}
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

            <div className="pt-2 border-t text-xs text-muted-foreground">
              <p>{t('templates.preConfiguredFor')} {template.defaultCurrency} {t('templates.invoices')}</p>
              {template.defaultPaymentTerms && (
                <p className="mt-1">{template.defaultPaymentTerms.note}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

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
