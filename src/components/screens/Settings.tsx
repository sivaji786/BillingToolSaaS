import { useState, useEffect, useRef } from 'react';
import { CompanyProfile, CompanyType } from '../../types/invoice';
import { companyTypeService } from '../../services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Building2, CreditCard, FileText, Upload, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RichTextEditor } from '../ui/RichTextEditor';


interface ImageUploadFieldProps {
  label: string;
  value: string | undefined | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
  onRemove: () => void;
  hint?: string;
  previewClass?: string;
}

function ImageUploadField({ label, value, inputRef, onUpload, onRemove, hint, previewClass = 'h-16' }: ImageUploadFieldProps) {
  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
      />
      {value ? (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 flex items-center gap-4">
          <img src={value} alt={`${label} preview`} className={`${previewClass} object-contain`} />
          <div className="flex flex-col gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1" /> Change {label}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={onRemove}>
              <X className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors cursor-pointer gap-2 text-muted-foreground"
        >
          <Upload className="h-5 w-5" />
          <span className="text-body font-medium">Upload {label}</span>
          {hint && <span className="text-micro">{hint}</span>}
        </button>
      )}
    </div>
  );
}

interface SettingsProps {
  profile: CompanyProfile;
  onUpdateProfile: (profile: CompanyProfile) => Promise<void>;
}

function formatNumberPreview(format: string, seq: number): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy   = yyyy.slice(-2);
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  return format
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{YY\}/g,   yy)
    .replace(/\{MM\}/g,   mm)
    .replace(/\{(N+)\}/g, (_match, ns) => String(seq).padStart(ns.length, '0'));
}

export function Settings({ profile, onUpdateProfile }: SettingsProps) {
  const { t } = useLanguage();

  const [editedProfile, setEditedProfile] = useState<CompanyProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await companyTypeService.getAll();
        setCompanyTypes(types);
      } catch (e) {
        console.error('Failed to fetch company types', e);
      }
    };
    fetchTypes();
  }, []);

  // Sync state with prop if profile changes (e.g. after save or re-fetch)
  useEffect(() => {
    setEditedProfile(profile);
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile(editedProfile);
      // Toast is handled in parent or we can do it here if parent doesn't throw
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSaving(false);
    }
  };


  const handleImageUpload = (field: 'logoUrl' | 'signatureUrl', file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onloadend = () => handleChange(field, reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleChange = (field: keyof CompanyProfile | string, value: string | number) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1] as keyof CompanyProfile['address'];
      setEditedProfile({
        ...editedProfile,
        address: {
          ...editedProfile.address,
          [addressField]: value,
        },
      });
    } else if (field.startsWith('bankAccount.')) {
      const bankField = field.split('.')[1];
      setEditedProfile({
        ...editedProfile,
        bankAccount: {
          ...editedProfile.bankAccount!,
          [bankField]: value,
        },
      });
    } else if (field === 'companyTypeId') {
      setEditedProfile({
        ...editedProfile,
        companyTypeId: typeof value === 'number' ? value : parseInt(value),
      });
    } else {
      setEditedProfile({
        ...editedProfile,
        [field]: value,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>{t('settings.title') || 'Settings'}</h1>
        <p className="text-muted-foreground mt-2">
          {t('settings.subtitle') || 'Configure company profile, tax rules, and invoice defaults'}
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 mr-2" />
            {t('settings.companyProfile') || 'Company Profile'}
          </TabsTrigger>
          <TabsTrigger value="defaults">
            <FileText className="h-4 w-4 mr-2" />
            {t('settings.invoiceDefaults') || 'Invoice Defaults'}
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="h-4 w-4 mr-2" />
            {t('settings.paymentInfo') || 'Payment Info'}
          </TabsTrigger>
        </TabsList>

        {/* Company Profile */}
        <TabsContent value="company">
          <Card className="p-6 space-y-6">
            <div>
              <h2>Company Information</h2>
              <p className="text-body text-muted-foreground mt-1">
                This information will be used as the default seller on invoices
              </p>
            </div>

            <Separator />

            <div className="space-y-4 mb-6">
              <Label htmlFor="company-type">Company Type</Label>
              <Select
                value={editedProfile.companyTypeId?.toString()}
                onValueChange={(value: string) => handleChange('companyTypeId', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  {companyTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-body text-muted-foreground">
                Determines available roles and permissions structure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  value={editedProfile.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Company Name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="vat-id">VAT ID *</Label>
                <Input
                  id="vat-id"
                  value={editedProfile.vatId || ''}
                  onChange={(e) => handleChange('vatId', e.target.value)}
                  placeholder="DE123456789"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="legal-org-id">Legal Organization ID</Label>
                <Input
                  id="legal-org-id"
                  value={editedProfile.legalOrganizationId || ''}
                  onChange={(e) => handleChange('legalOrganizationId', e.target.value)}
                  placeholder="HRB 12345"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={editedProfile.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-4">Address</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    value={editedProfile.address.street || ''}
                    onChange={(e) => handleChange('address.street', e.target.value)}
                    placeholder="Street and number"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="postal-code">Postal Code *</Label>
                    <Input
                      id="postal-code"
                      value={editedProfile.address.postalCode || ''}
                      onChange={(e) => handleChange('address.postalCode', e.target.value)}
                      placeholder="12345"
                      className="mt-1"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={editedProfile.address.city || ''}
                      onChange={(e) => handleChange('address.city', e.target.value)}
                      placeholder="City"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="country">Country Code *</Label>
                  <Input
                    id="country"
                    value={editedProfile.address.country || ''}
                    onChange={(e) => handleChange('address.country', e.target.value.toUpperCase())}
                    placeholder="DE"
                    maxLength={2}
                    className="mt-1"
                  />
                  <p className="text-micro text-muted-foreground mt-1">
                    ISO 3166-1 alpha-2 code
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedProfile.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="billing@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={editedProfile.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+49 30 12345678"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-4">Company Logo</h3>
              <ImageUploadField
                label="Logo"
                value={editedProfile.logoUrl}
                inputRef={logoInputRef}
                onUpload={(f) => handleImageUpload('logoUrl', f)}
                onRemove={() => { handleChange('logoUrl', ''); if (logoInputRef.current) logoInputRef.current.value = ''; }}
                hint="Recommended size: 200×80 px. Max 2 MB. Stored as base64."
                previewClass="h-16"
              />
            </div>

            <Separator />

            <div>
              <h3 className="mb-4">Signature Image</h3>
              <ImageUploadField
                label="Signature"
                value={editedProfile.signatureUrl}
                inputRef={signatureInputRef}
                onUpload={(f) => handleImageUpload('signatureUrl', f)}
                onRemove={() => { handleChange('signatureUrl', ''); if (signatureInputRef.current) signatureInputRef.current.value = ''; }}
                hint="Upload a PNG/JPG of your handwritten signature. Max 2 MB."
                previewClass="h-12"
              />
            </div>
          </Card>
        </TabsContent>

        {/* Payment Info */}
        <TabsContent value="payment">
          <Card className="p-6 space-y-6">
            <div>
              <h2>Bank Account Information</h2>
              <p className="text-body text-muted-foreground mt-1">
                Default payment information for invoices
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={editedProfile.bankAccount?.iban || ''}
                  onChange={(e) => handleChange('bankAccount.iban', e.target.value)}
                  placeholder="DE89370400440532013000"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bic">BIC / SWIFT</Label>
                <Input
                  id="bic"
                  value={editedProfile.bankAccount?.bic || ''}
                  onChange={(e) => handleChange('bankAccount.bic', e.target.value)}
                  placeholder="COBADEBBXXX"
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  value={editedProfile.bankAccount?.accountName || ''}
                  onChange={(e) => handleChange('bankAccount.accountName', e.target.value)}
                  placeholder="Account holder name"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Invoice Defaults */}
        <TabsContent value="defaults">
          <Card className="p-6 space-y-6">
            <div>
              <h2>Invoice Defaults</h2>
              <p className="text-body text-muted-foreground mt-1">
                Default settings for new invoices
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="default-currency">{t('settings.defaultCurrency') || 'Default Currency'}</Label>
                <Input
                  id="default-currency"
                  value={editedProfile.defaultCurrency || 'EUR'}
                  onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="default-tax-rate">{t('settings.defaultTaxRate') || 'Default Tax Rate (%)'}</Label>
                <Input
                  id="default-tax-rate"
                  type="number"
                  value={editedProfile.defaultTaxRate ?? 19}
                  onChange={(e) => handleChange('defaultTaxRate', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="invoice-format">{t('settings.invoiceNumberFormat') || 'Invoice Number Format'}</Label>
                <Input
                  id="invoice-format"
                  value={editedProfile.invoiceNumberFormat || 'INV-{YYYY}-{NNNNN}'}
                  onChange={(e) => handleChange('invoiceNumberFormat', e.target.value)}
                  placeholder="INV-{YYYY}-{NNNNN}"
                  className="mt-1"
                />
                <p className="text-micro text-muted-foreground mt-1">
                  Tokens: <code className="bg-muted px-1 rounded">{'{YYYY}'}</code> <code className="bg-muted px-1 rounded">{'{YY}'}</code> <code className="bg-muted px-1 rounded">{'{MM}'}</code> <code className="bg-muted px-1 rounded">{'{NNN…}'}</code>
                </p>
                <p className="text-micro mt-1 font-mono text-purple-700 bg-purple-50 border border-purple-100 rounded px-2 py-1">
                  Preview: {formatNumberPreview(editedProfile.invoiceNumberFormat || 'INV-{YYYY}-{NNNNN}', 42)}
                </p>
              </div>

              <div>
                <Label htmlFor="letter-format">{t('settings.letterNumberFormat') || 'Letter Number Format'}</Label>
                <Input
                  id="letter-format"
                  value={editedProfile.letterNumberFormat || 'LTR-{YYYY}-{NNNNN}'}
                  onChange={(e) => handleChange('letterNumberFormat', e.target.value)}
                  placeholder="LTR-{YYYY}-{NNNNN}"
                  className="mt-1"
                />
                <p className="text-micro text-muted-foreground mt-1">
                  Tokens: <code className="bg-muted px-1 rounded">{'{YYYY}'}</code> <code className="bg-muted px-1 rounded">{'{YY}'}</code> <code className="bg-muted px-1 rounded">{'{MM}'}</code> <code className="bg-muted px-1 rounded">{'{NNN…}'}</code>
                </p>
                <p className="text-micro mt-1 font-mono text-purple-700 bg-purple-50 border border-purple-100 rounded px-2 py-1">
                  Preview: {formatNumberPreview(editedProfile.letterNumberFormat || 'LTR-{YYYY}-{NNNNN}', 7)}
                </p>
              </div>

              <div>
                <Label htmlFor="payment-terms">{t('settings.paymentTerms') || 'Payment Terms (days)'}</Label>
                <Input
                  id="payment-terms"
                  type="number"
                  value={editedProfile.paymentTermsDays ?? 30}
                  onChange={(e) => handleChange('paymentTermsDays', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label htmlFor="header-text">{t('templates.headerText') || 'Header Text'}</Label>
                <div className="mt-1 bg-white dark:bg-black rounded-md">
                  <RichTextEditor
                    key={`header-${profile.id}`}
                    value={editedProfile.headerText || ''}
                    onChange={(value) => handleChange('headerText', value)}
                    placeholder="Enter text to appear at the top of invoices"
                  />
                </div>
                <p className="text-micro text-muted-foreground mt-4">
                  {t('templates.headerDesc') || 'This text will appear at the top of your invoices, below the logo.'}
                </p>
              </div>

              <div>
                <Label htmlFor="footer-text">{t('templates.footerText') || 'Footer Text'}</Label>
                <div className="mt-1 bg-white dark:bg-black rounded-md">
                  <RichTextEditor
                    key={`footer-${profile.id}`}
                    value={editedProfile.footerText || ''}
                    onChange={(value) => handleChange('footerText', value)}
                    placeholder="Enter text to appear at the bottom of invoices"
                  />
                </div>
                <p className="text-micro text-muted-foreground mt-4">
                  {t('templates.footerDesc') || 'This text will appear at the bottom of your invoices.'}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" disabled={isSaving}>
          {isSaving ? (t('common.saving') || 'Saving...') : (t('settings.saveChanges') || 'Save Settings')}
        </Button>
      </div>
    </div>
  );
}
