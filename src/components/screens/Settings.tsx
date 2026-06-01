import { useState, useEffect, useRef } from 'react';
import { CompanyProfile, CompanyType } from '../../types/invoice';
import { companyTypeService, authService, ssoSettingsService } from '../../services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Building2, CreditCard, FileText, Upload, X, Link2, Shield, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RichTextEditor } from '../ui/RichTextEditor';
import { useAuthStore } from '../../stores/authStore';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';


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

  const user = useAuthStore((s) => s.user);

  const [editedProfile, setEditedProfile] = useState<CompanyProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // SSO-007: Connected Accounts
  const [ssoIdentities, setSsoIdentities] = useState<Array<{ id: number; provider: string; email: string; name: string; last_login_at: string }>>([]);
  const [ssoLinking, setSsoLinking] = useState<string | null>(null);
  const [ssoUnlinking, setSsoUnlinking] = useState<string | null>(null);

  // SSO-017: SSO/SAML config (admin only)
  const [ssoConfig, setSsoConfig] = useState<{
    provider: string; enabled: boolean; sso_only: boolean;
    config: Record<string, string | boolean | Record<string, string>>; sp_metadata_url?: string;
  } | null>(null);
  const [ssoConfigSaving, setSsoConfigSaving] = useState(false);
  const [oidcTesting, setOidcTesting] = useState(false);

  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'owner';

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

    // Load SSO identities (SSO-007)
    authService.getSsoIdentities().then(setSsoIdentities).catch(() => {});

    // Load SSO config if admin (SSO-017)
    if (isAdmin) {
      ssoSettingsService.get().then(setSsoConfig).catch(() => {});
    }

    // Handle ?linked= param (after OAuth link callback)
    const urlParams = new URLSearchParams(window.location.search);
    const linked = urlParams.get('linked');
    if (linked) {
      toast.success(`${linked.charAt(0).toUpperCase() + linked.slice(1)} account connected successfully.`);
      // Reload identities and strip param
      authService.getSsoIdentities().then(setSsoIdentities).catch(() => {});
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, [isAdmin]);

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
          <TabsTrigger value="accounts">
            <Link2 className="h-4 w-4 mr-2" />
            {t('settings.connectedAccounts') || 'Connected Accounts'}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="sso">
              <Shield className="h-4 w-4 mr-2" />
              {t('settings.ssoSaml') || 'SSO & SAML'}
            </TabsTrigger>
          )}
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

        {/* SSO-007: Connected Accounts */}
        <TabsContent value="accounts">
          <Card className="p-6 space-y-6">
            <div>
              <h2>{t('settings.connectedAccounts') || 'Connected Accounts'}</h2>
              <p className="text-body text-muted-foreground mt-1">
                {t('settings.connectedAccountsDesc') || 'Link your social accounts for one-click login. You can connect multiple providers.'}
              </p>
            </div>
            <Separator />
            {(['google', 'microsoft', 'github'] as const).map((provider) => {
              const linked = ssoIdentities.find((i) => i.provider === provider);
              const providerLabels: Record<string, string> = { google: 'Google', microsoft: 'Microsoft', github: 'GitHub' };
              return (
                <div key={provider} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {linked
                      ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                      : <div className="h-5 w-5 rounded-full border-2 border-gray-300" />}
                    <div>
                      <p className="font-medium">{providerLabels[provider]}</p>
                      {linked && <p className="text-micro text-muted-foreground">{linked.email}</p>}
                    </div>
                  </div>
                  {linked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      disabled={ssoUnlinking === provider}
                      onClick={async () => {
                        setSsoUnlinking(provider);
                        try {
                          await authService.unlinkSso(provider);
                          setSsoIdentities((prev) => prev.filter((i) => i.provider !== provider));
                          toast.success(`${providerLabels[provider]} account disconnected.`);
                        } catch {
                          toast.error(`Failed to disconnect ${providerLabels[provider]}.`);
                        } finally {
                          setSsoUnlinking(null);
                        }
                      }}
                    >
                      {ssoUnlinking === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : (t('settings.disconnect') || 'Disconnect')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ssoLinking === provider}
                      onClick={() => {
                        setSsoLinking(provider);
                        const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/api\/?$/, '');
                        const token = useAuthStore.getState().token ?? '';
                        window.location.href = `${base}/auth/sso/${provider}/redirect?action=link&token=${encodeURIComponent(token)}`;
                      }}
                    >
                      {ssoLinking === provider
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : (t('settings.connect') || `Connect ${providerLabels[provider]}`)}
                    </Button>
                  )}
                </div>
              );
            })}
          </Card>
        </TabsContent>

        {/* SSO-017: SSO & SAML (admin only) */}
        {isAdmin && (
          <TabsContent value="sso">
            <Card className="p-6 space-y-6">
              <div>
                <h2>{t('settings.ssoSaml') || 'SSO & SAML'}</h2>
                <p className="text-body text-muted-foreground mt-1">
                  {t('settings.ssoSamlDesc') || 'Configure enterprise SSO for your organisation. Users can log in via your identity provider.'}
                </p>
              </div>
              <Separator />

              {ssoConfig === null ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              ) : (
                <div className="space-y-6">
                  {/* Provider select */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('settings.ssoProvider') || 'SSO Protocol'}</Label>
                      <Select
                        value={ssoConfig.provider}
                        onValueChange={(v) => setSsoConfig({ ...ssoConfig, provider: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saml">SAML 2.0 (Okta, Azure AD, ADFS)</SelectItem>
                          <SelectItem value="oidc">OpenID Connect (Okta, Auth0, Keycloak)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-3 pb-1">
                      <Switch
                        id="sso-enabled"
                        checked={ssoConfig.enabled}
                        onCheckedChange={(v) => setSsoConfig({ ...ssoConfig, enabled: v })}
                      />
                      <Label htmlFor="sso-enabled">{ssoConfig.enabled ? (t('settings.ssoEnabled') || 'SSO Enabled') : (t('settings.ssoDisabled') || 'SSO Disabled')}</Label>
                    </div>
                  </div>

                  {/* SSO-only toggle */}
                  <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <Switch
                      id="sso-only"
                      checked={ssoConfig.sso_only}
                      onCheckedChange={(v) => setSsoConfig({ ...ssoConfig, sso_only: v })}
                    />
                    <div>
                      <Label htmlFor="sso-only" className="font-medium">{t('settings.ssoOnly') || 'SSO Only Mode'}</Label>
                      <p className="text-micro text-muted-foreground">{t('settings.ssoOnlyDesc') || 'Block password login for all users — they must authenticate via SSO.'}</p>
                    </div>
                  </div>

                  {/* SAML fields */}
                  {ssoConfig.provider === 'saml' && (
                    <div className="space-y-4">
                      <h3 className="font-medium">IdP Configuration</h3>
                      {([
                        { key: 'idp_entity_id', label: 'IdP Entity ID', placeholder: 'https://idp.example.com/metadata' },
                        { key: 'idp_sso_url',   label: 'IdP SSO URL',   placeholder: 'https://idp.example.com/sso/saml' },
                        { key: 'idp_slo_url',   label: 'IdP SLO URL (optional)', placeholder: 'https://idp.example.com/slo' },
                      ] as const).map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <Label>{label}</Label>
                          <Input
                            className="mt-1 font-mono text-sm"
                            placeholder={placeholder}
                            value={(ssoConfig.config[key] as string) || ''}
                            onChange={(e) => setSsoConfig({ ...ssoConfig, config: { ...ssoConfig.config, [key]: e.target.value } })}
                          />
                        </div>
                      ))}
                      <div>
                        <Label>IdP X.509 Certificate</Label>
                        <textarea
                          rows={6}
                          className="mt-1 w-full font-mono text-xs border rounded-md p-3 bg-background resize-y"
                          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                          value={(ssoConfig.config.idp_cert as string) || ''}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, config: { ...ssoConfig.config, idp_cert: e.target.value } })}
                        />
                      </div>
                      <div>
                        <Label>{t('settings.samlRoleMapping') || 'Role Mapping (JSON)'}</Label>
                        <textarea
                          rows={4}
                          className="mt-1 w-full font-mono text-xs border rounded-md p-3 bg-background resize-y"
                          placeholder='{"BillingTool-Admin": "admin", "BillingTool-Member": "member"}'
                          value={typeof ssoConfig.config.role_mapping === 'object'
                            ? JSON.stringify(ssoConfig.config.role_mapping, null, 2)
                            : (ssoConfig.config.role_mapping as string) || ''}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setSsoConfig({ ...ssoConfig, config: { ...ssoConfig.config, role_mapping: parsed } });
                            } catch {
                              setSsoConfig({ ...ssoConfig, config: { ...ssoConfig.config, role_mapping: e.target.value } });
                            }
                          }}
                        />
                      </div>
                      {/* SP Metadata download */}
                      {ssoConfig.sp_metadata_url && (
                        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                          <ExternalLink className="h-4 w-4 text-purple-600 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{t('settings.spMetadata') || 'SP Metadata URL'}</p>
                            <p className="text-micro text-muted-foreground font-mono">{ssoConfig.sp_metadata_url}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open(ssoConfig.sp_metadata_url, '_blank')}>
                            {t('settings.downloadMetadata') || 'Open'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* OIDC fields */}
                  {ssoConfig.provider === 'oidc' && (
                    <div className="space-y-4">
                      <h3 className="font-medium">OIDC Configuration</h3>
                      <div>
                        <Label>Issuer URL</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            className="font-mono text-sm flex-1"
                            placeholder="https://accounts.example.com"
                            value={(ssoConfig.config.issuer_url as string) || ''}
                            onChange={(e) => setSsoConfig({ ...ssoConfig, config: { ...ssoConfig.config, issuer_url: e.target.value } })}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={oidcTesting}
                            onClick={async () => {
                              setOidcTesting(true);
                              try {
                                const res = await ssoSettingsService.testDiscovery((ssoConfig.config.issuer_url as string) || '');
                                if (res.success) toast.success('Discovery successful — OIDC endpoints found.');
                                else toast.error('Discovery failed.');
                              } catch {
                                toast.error('Discovery failed. Check the issuer URL.');
                              } finally {
                                setOidcTesting(false);
                              }
                            }}
                          >
                            {oidcTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : (t('settings.testConnection') || 'Test')}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Client ID</Label>
                        <Input
                          className="mt-1 font-mono text-sm"
                          placeholder="your-client-id"
                          value={(ssoConfig.config.client_id as string) || ''}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, config: { ...ssoConfig.config, client_id: e.target.value } })}
                        />
                      </div>
                      <div>
                        <Label>Client Secret</Label>
                        <Input
                          className="mt-1 font-mono text-sm"
                          type="password"
                          placeholder="••••••••"
                          value={(ssoConfig.config.client_secret as string) || ''}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, config: { ...ssoConfig.config, client_secret: e.target.value } })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      disabled={ssoConfigSaving}
                      onClick={async () => {
                        setSsoConfigSaving(true);
                        try {
                          await ssoSettingsService.update(ssoConfig);
                          toast.success(t('settings.ssoSaved') || 'SSO configuration saved.');
                        } catch {
                          toast.error(t('settings.ssoSaveFailed') || 'Failed to save SSO configuration.');
                        } finally {
                          setSsoConfigSaving(false);
                        }
                      }}
                    >
                      {ssoConfigSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {t('settings.saveChanges') || 'Save SSO Settings'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        )}

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
