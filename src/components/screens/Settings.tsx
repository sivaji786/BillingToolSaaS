import { useState, useEffect } from 'react';
import { CompanyProfile, CompanyType } from '../../types/invoice';
import { companyTypeService } from '../../services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Building2, CreditCard, FileText } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RichTextEditor } from '../ui/RichTextEditor';


interface SettingsProps {
  profile: CompanyProfile;
  onUpdateProfile: (profile: CompanyProfile) => Promise<void>;
}

export function Settings({ profile, onUpdateProfile }: SettingsProps) {
  const { t } = useLanguage();

  const [editedProfile, setEditedProfile] = useState<CompanyProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);

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
              <p className="text-sm text-muted-foreground mt-1">
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
              <p className="text-sm text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground mt-1">
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
              <div className="space-y-4">
                <div>
                  <Label htmlFor="logo-url">Logo URL</Label>
                  <Input
                    id="logo-url"
                    type="url"
                    value={editedProfile.logoUrl || ''}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the URL of your company logo. Recommended size: 200x80px or similar aspect ratio.
                  </p>
                </div>
                {editedProfile.logoUrl && (
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <p className="text-sm font-medium mb-2">Logo Preview:</p>
                    <img
                      src={editedProfile.logoUrl}
                      alt="Company Logo Preview"
                      className="h-16 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.alt = 'Failed to load image';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Payment Info */}
        <TabsContent value="payment">
          <Card className="p-6 space-y-6">
            <div>
              <h2>Bank Account Information</h2>
              <p className="text-sm text-muted-foreground mt-1">
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
              <p className="text-sm text-muted-foreground mt-1">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Variables: {'{YYYY}'}, {'{YY}'}, {'{NNN...}'}
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
                <p className="text-xs text-muted-foreground mt-1">
                  Variables: {'{YYYY}'}, {'{YY}'}, {'{NNN...}'}
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
                <p className="text-xs text-muted-foreground mt-4">
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
                <p className="text-xs text-muted-foreground mt-4">
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
