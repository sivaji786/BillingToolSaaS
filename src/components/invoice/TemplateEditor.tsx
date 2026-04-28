import * as React from 'react';
import { useState, useRef } from 'react';
import { InvoiceTemplate, CompanyProfile, TemplateType } from '../../types/invoice';
import { DEFAULT_LAYOUT, DEFAULT_LETTER_LAYOUT } from '../../utils/invoice-templates-defaults';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import { Upload, X, Image as ImageIcon, Layout as LayoutIcon } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateEditorProps {
  template?: InvoiceTemplate;
  profile?: CompanyProfile | null;
  onSave: (template: InvoiceTemplate) => void;
  onCancel: () => void;
  initialTemplateType?: TemplateType;
}

export function TemplateEditor({ template, profile, onSave, onCancel, initialTemplateType = 'invoice' }: TemplateEditorProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<InvoiceTemplate>(
    template || {
      id: '',
      name: '',
      templateType: initialTemplateType,
      description: '',
      seller: {
        name: profile?.name || '',
        vatId: profile?.vatId || '',
        address: profile?.address || {
          street: '',
          city: '',
          postalCode: '',
          country: '',
        },
        contactEmail: profile?.email || '',
        contactPhone: profile?.phone || '',
      },
      defaultCurrency: profile?.defaultCurrency || 'EUR',
      defaultTaxCategory: profile?.defaultTaxRate === 0 ? 'Z' : 'S',
      defaultTaxPercent: profile?.defaultTaxRate ?? 19,
      defaultPaymentTerms: {
        note: profile?.paymentTermsDays ? `Payment due within ${profile.paymentTermsDays} days` : 'Payment due within 30 days',
      },
      logoUrl: profile?.logoUrl || '',
      headerText: profile?.headerText || '',
      footerText: profile?.footerText || '',
    }
  );

  const isLetter = formData.templateType === 'business_letter';

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSellerChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      seller: {
        ...prev.seller,
        [field]: value,
      },
    }));
  };

  const handleAddressChange = (field: keyof NonNullable<InvoiceTemplate['seller']['address']>, value: string) => {
    setFormData((prev) => ({
      ...prev,
      seller: {
        ...prev.seller,
        address: {
          ...(prev.seller.address || { street: '', city: '', postalCode: '', country: '' }),
          [field]: value,
        },
      },
    }));
  };

  const handlePaymentTermsChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      defaultPaymentTerms: {
        ...prev.defaultPaymentTerms,
        note: value,
      },
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('common.error'), {
        description: t('templates.uploadImageError') || 'Please upload an image file',
      });
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('common.error'), {
        description: t('templates.imageSizeError') || 'Image size should be less than 2MB',
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleInputChange('logoUrl', base64String);
      toast.success(t('common.success'), {
        description: t('templates.logoUploadSuccess') || 'Logo uploaded successfully',
      });
    };
    reader.onerror = () => {
      toast.error(t('common.error'), {
        description: t('templates.logoUploadError') || 'Failed to upload logo',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    handleInputChange('logoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error(t('common.error'), {
        description: t('templates.nameRequired') || 'Template name is required',
      });
      return;
    }

    if (!formData.seller.name?.trim()) {
      toast.error(t('common.error'), {
        description: t('templates.sellerNameRequired') || 'Seller name is required',
      });
      return;
    }

    const defaultLayout = formData.templateType === 'business_letter' ? DEFAULT_LETTER_LAYOUT : DEFAULT_LAYOUT;
    const templateToSave = {
      ...formData,
      id: formData.id || `new_${Date.now()}`,
      templateType: formData.templateType || 'invoice',
      layout: formData.layout && formData.layout.length > 0 ? formData.layout : defaultLayout,
    };

    onSave(templateToSave);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-purple-900 dark:text-purple-100 mb-1">
          {template ? t('templates.editTemplate') : t('templates.newTemplate')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('templates.templateEditorDesc') || 'Configure template details, branding, and default settings'}
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-purple-900 dark:text-purple-100">
            {t('templates.basicInfo') || 'Basic Information'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">{t('templates.templateName') || 'Template Name'} *</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('templates.namePlaceholder') || "e.g., Standard Service Invoice"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-type">{t('templates.templateType') || 'Template Type'} *</Label>
              <Select
                value={formData.templateType || 'invoice'}
                onValueChange={(value: TemplateType) => {
                  handleInputChange('templateType', value);
                  if (value === 'business_letter') {
                    handleInputChange('defaultTaxPercent', 0);
                    handleInputChange('defaultTaxCategory', 'Z');
                  }
                }}
              >
                <SelectTrigger id="template-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">{t('nav.invoices') || 'Invoice'}</SelectItem>
                  <SelectItem value="business_letter">{t('nav.letters') || 'Business Letter'}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {isLetter
                  ? (t('templates.typeLetterDesc') || 'For formal business correspondence')
                  : (t('templates.typeInvoiceDesc') || 'For billing customers with EN 16931 compliance')}
              </p>
            </div>

            {!isLetter && (
              <div className="space-y-2">
                <Label htmlFor="default-currency">{t('editor.currency')} *</Label>
                <Select
                  value={formData.defaultCurrency}
                  onValueChange={(value: string) => handleInputChange('defaultCurrency', value)}
                >
                  <SelectTrigger id="default-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('templates.description') || 'Description'}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('templates.descPlaceholder') || "Describe when to use this template..."}
              rows={2}
            />
          </div>
        </div>

        <Separator />

        {/* Branding */}
        <div className="space-y-4">
          <h3 className="text-purple-900 dark:text-purple-100">
            {t('templates.branding') || 'Branding'}
          </h3>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>{t('templates.logo') || 'Logo'}</Label>
            <div className="flex items-start gap-4">
              {formData.logoUrl ? (
                <div className="relative">
                  <img
                    src={formData.logoUrl}
                    alt="Template logo"
                    className="h-24 w-auto object-contain border rounded-lg p-2 bg-white"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-24 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {formData.logoUrl ? t('templates.changeLogo') : t('templates.uploadLogo')}
                </Button>
                <p className="text-xs text-gray-500">
                  {t('templates.logoRequirements') || 'PNG, JPG or SVG. Max 2MB. Transparent background recommended.'}
                </p>
              </div>
            </div>
          </div>

          {/* Header Text */}
          <div className="space-y-2">
            <Label htmlFor="header-text">{t('templates.headerText') || 'Header Text'}</Label>
            <Textarea
              id="header-text"
              value={formData.headerText || ''}
              onChange={(e) => handleInputChange('headerText', e.target.value)}
              placeholder="Enter text to appear at the top of invoices (e.g., company slogan, tax info)"
              rows={2}
            />
            <p className="text-xs text-gray-500">
              {t('templates.headerDesc') || 'This text will appear at the top of your invoices, below the logo.'}
            </p>
          </div>

          {/* Footer Text */}
          <div className="space-y-2">
            <Label htmlFor="footer-text">{t('templates.footerText') || 'Footer Text'}</Label>
            <Textarea
              id="footer-text"
              value={formData.footerText || ''}
              onChange={(e) => handleInputChange('footerText', e.target.value)}
              placeholder="Enter text to appear at the bottom of invoices (e.g., legal info, bank details, terms)"
              rows={3}
            />
            <p className="text-xs text-gray-500">
              {t('templates.footerDesc') || 'This text will appear at the bottom of your invoices. Great for bank details, legal notices, or terms.'}
            </p>
          </div>
        </div>

        <Separator />

        {/* Seller Information */}
        <div className="space-y-4">
          <h3 className="text-purple-900 dark:text-purple-100">
            {t('editor.sellerInfo') || 'Seller Information'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seller-name">{t('editor.companyName')} *</Label>
              <Input
                id="seller-name"
                value={formData.seller.name}
                onChange={(e) => handleSellerChange('name', e.target.value)}
                placeholder="Company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat-id">{t('editor.vatId')}</Label>
              <Input
                id="vat-id"
                value={formData.seller.vatId || ''}
                onChange={(e) => handleSellerChange('vatId', e.target.value)}
                placeholder="e.g., DE123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">{t('editor.email')}</Label>
              <Input
                id="contact-email"
                type="email"
                value={formData.seller.contactEmail || ''}
                onChange={(e) => handleSellerChange('contactEmail', e.target.value)}
                placeholder="billing@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone">{t('editor.phone')}</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={formData.seller.contactPhone || ''}
                onChange={(e) => handleSellerChange('contactPhone', e.target.value)}
                placeholder="+49 30 12345678"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street">{t('editor.street')}</Label>
              <Input
                id="street"
                value={formData.seller.address?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t('editor.city')}</Label>
              <Input
                id="city"
                value={formData.seller.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal-code">{t('editor.postalCode')}</Label>
              <Input
                id="postal-code"
                value={formData.seller.address?.postalCode || ''}
                onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                placeholder="Postal code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">{t('editor.country')}</Label>
              <Select
                value={formData.seller.address?.country || ''}
                onValueChange={(value: string) => handleAddressChange('country', value)}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="IT">Italy</SelectItem>
                  <SelectItem value="ES">Spain</SelectItem>
                  <SelectItem value="NL">Netherlands</SelectItem>
                  <SelectItem value="BE">Belgium</SelectItem>
                  <SelectItem value="AT">Austria</SelectItem>
                  <SelectItem value="CH">Switzerland</SelectItem>
                  <SelectItem value="PL">Poland</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Default Tax Settings + Payment Terms — invoice only */}
        {!isLetter && (
          <>
            <div className="space-y-4">
              <h3 className="text-purple-900 dark:text-purple-100">
                {t('templates.defaultTaxSettings') || 'Default Tax Settings'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-category">{t('editor.lineItem.taxCategory') || 'Tax Category'}</Label>
                  <Select
                    value={formData.defaultTaxCategory}
                    onValueChange={(value: string) => handleInputChange('defaultTaxCategory', value)}
                  >
                    <SelectTrigger id="tax-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">S - Standard rate</SelectItem>
                      <SelectItem value="Z">Z - Zero rated</SelectItem>
                      <SelectItem value="E">E - Exempt</SelectItem>
                      <SelectItem value="AE">AE - Reverse charge</SelectItem>
                      <SelectItem value="K">K - Intra-community</SelectItem>
                      <SelectItem value="G">G - Free export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-percent">{t('editor.taxRate')} (%)</Label>
                  <Input
                    id="tax-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.defaultTaxPercent}
                    onChange={(e) => handleInputChange('defaultTaxPercent', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-purple-900 dark:text-purple-100">
                {t('templates.defaultPaymentTerms') || 'Default Payment Terms'}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="payment-terms">{t('editor.paymentTerms')}</Label>
                <Textarea
                  id="payment-terms"
                  value={formData.defaultPaymentTerms?.note || ''}
                  onChange={(e) => handlePaymentTermsChange(e.target.value)}
                  placeholder="e.g., Payment due within 30 days"
                  rows={2}
                />
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => {
            window.location.hash = `designLayout/${template?.id || 'new'}`;
          }}
          className="gap-2"
        >
          <LayoutIcon className="h-4 w-4" />
          {t('templates.designLayout') || 'Design Layout'}
        </Button>
        <div className="flex-1" />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white"
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
