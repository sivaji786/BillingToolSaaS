import { useState, Suspense, lazy } from 'react';
import { Invoice, InvoiceTemplate, CompanyProfile, AuditLogEntry } from './types/invoice';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Loader2 } from 'lucide-react';

// Lazy load screen components
const Login = lazy(() => import('./components/screens/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./components/screens/Dashboard').then(module => ({ default: module.Dashboard })));
const InvoiceEditor = lazy(() => import('./components/screens/InvoiceEditor').then(module => ({ default: module.InvoiceEditor })));
const InvoicePreview = lazy(() => import('./components/screens/InvoicePreview').then(module => ({ default: module.InvoicePreview })));
const InvoiceList = lazy(() => import('./components/screens/InvoiceList').then(module => ({ default: module.InvoiceList })));
const TemplateLibrary = lazy(() => import('./components/screens/TemplateLibrary').then(module => ({ default: module.TemplateLibrary })));
const TemplateEditor = lazy(() => import('./components/invoice/TemplateEditor').then(module => ({ default: module.TemplateEditor })));
const DesignLayoutPage = lazy(() => import('./pages/DesignLayoutPage').then(module => ({ default: module.DesignLayoutPage })));
const ActivityLog = lazy(() => import('./components/screens/ActivityLog').then(module => ({ default: module.ActivityLog })));
const Settings = lazy(() => import('./components/screens/Settings').then(module => ({ default: module.Settings })));
const AdminLayout = lazy(() => import('./components/screens/Admin/AdminLayout').then(module => ({ default: module.AdminLayout })));

import { TicketingWidget } from './components/TicketingWidget';
import { GlobalAIAssistant } from './components/GlobalAIAssistant';

import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import {
  LayoutDashboard,
  FileText,
  LayoutTemplate,
  Activity,
  Settings as SettingsIcon,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import {
  invoiceTemplateService,
  companyProfileService,
  auditLogService,
} from './services/api';
import { calculateInvoiceTotals } from './utils/invoice-calculations';
import { toast } from 'sonner';
import { authService, invoiceService } from './services/api';
import { useEffect } from 'react';
import { hasPermissionSync } from './hooks/usePermission';

type Screen = 'dashboard' | 'invoices' | 'editor' | 'preview' | 'templates' | 'templateEditor' | 'designLayout' | 'activity' | 'settings' | 'admin';
type EditorMode = 'invoice' | 'template';

function AppContent() {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['dashboard', 'invoices', 'templates', 'activity', 'settings', 'designLayout', 'admin', 'wiki'].includes(hash)) {
        return hash as Screen;
      }
      // Handle parameterized routes like designLayout/123
      if (hash.startsWith('designLayout/')) {
        return 'designLayout';
      }
    }
    return 'dashboard';
  });
  const [previousScreen, setPreviousScreen] = useState<Screen>('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [logEntries, setLogEntries] = useState<AuditLogEntry[]>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>('invoice');
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and get fresh user data including rights
          const userData = await authService.me();
          localStorage.setItem('user', JSON.stringify(userData));
          setIsAuthenticated(true);
          loadData();
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsCheckingAuth(false);
    };
    checkAuth();

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      console.log('Hash changed:', hash);
      if (hash && ['dashboard', 'invoices', 'templates', 'activity', 'settings', 'designLayout', 'admin', 'wiki'].includes(hash)) {
        console.log('Setting screen from hash change:', hash);
        setCurrentScreen(hash as Screen);
      } else if (hash.startsWith('designLayout/')) {
        console.log('Setting screen to designLayout from parameterized route');
        setCurrentScreen('designLayout');
      } else if (hash.startsWith('editor?data=')) {
        console.log('Setting screen to editor from parameterized route');
        try {
          const dataStr = hash.split('data=')[1];
          const invoiceData = JSON.parse(decodeURIComponent(dataStr));
          setCurrentInvoice(invoiceData);
          setEditorMode('invoice');
          setCurrentScreen('editor');
        } catch (e) {
          console.error('Failed to parse invoice data from URL', e);
          toast.error('Failed to load invoice data');
        }
      } else if (hash.startsWith('preview?data=')) {
        console.log('Setting screen to preview from parameterized route');
        try {
          const dataStr = hash.split('data=')[1];
          const invoiceData = JSON.parse(decodeURIComponent(dataStr));
          setCurrentInvoice(invoiceData);
          setCurrentScreen('preview');
        } catch (e) {
          console.error('Failed to parse invoice data for preview', e);
          toast.error('Failed to load invoice data');
          setCurrentScreen('dashboard');
        }
      } else if (!hash) {
        console.log('Empty hash, defaulting to dashboard');
        setCurrentScreen('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when screen changes
  useEffect(() => {
    if (['dashboard', 'invoices', 'templates', 'activity', 'settings', 'admin'].includes(currentScreen)) {
      if (window.location.hash.replace('#', '') !== currentScreen) {
        window.location.hash = currentScreen;
      }
    }
  }, [currentScreen]);

  const loadData = async () => {
    try {
      const [invoicesData, templatesData, profilesData, logsData] = await Promise.all([
        invoiceService.getAll(),
        invoiceTemplateService.getAll(),
        companyProfileService.getAll(),
        auditLogService.getAll(),
      ]);
      setInvoices(invoicesData);
      setTemplates(templatesData);
      setProfile(profilesData[0] || null);
      setLogEntries(logsData);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      await authService.login(email, password);
      setIsAuthenticated(true);
      loadData();
    } catch (error) {
      toast.error(t('login.failed') || 'Login failed');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentScreen('dashboard');
    setCurrentInvoice(null);
    toast.success(t('login.loggedOut'), {
      description: t('login.loggedOutDesc'),
    });
  };

  const handleNewInvoice = () => {
    const newInvoice: Invoice = {
      id: `new_${Date.now()}`,
      invoiceNumber: `INV-2025-${String(invoices.length + 1).padStart(5, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      currency: 'EUR',
      seller: {
        name: profile?.name || '',
        vatId: profile?.vatId || '',
        legalOrganizationId: profile?.legalOrganizationId,
        address: profile?.address || { street: '', city: '', postalCode: '', country: '' },
        contactEmail: profile?.email,
        contactPhone: profile?.phone,
      },
      buyer: {
        name: '',
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: '',
        },
      },
      lines: [],
      taxTotals: [],
      lineExtensionAmount: 0,
      taxExclusiveAmount: 0,
      taxInclusiveAmount: 0,
      payableAmount: 0,
      paymentMeans: profile?.bankAccount ? {
        type: 'BankTransfer',
        iban: profile.bankAccount.iban,
        bic: profile.bankAccount.bic,
        accountName: profile.bankAccount.accountName,
      } : undefined,
      status: 'draft',
      signed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentInvoice(newInvoice);
    setEditorMode('invoice');
    setPreviousScreen(currentScreen);
    setCurrentScreen('editor');
  };

  const handleOpenInvoice = async (invoice: Invoice) => {
    if (!invoice.id) return;

    try {
      const fullInvoice = await invoiceService.getById(invoice.id);
      setCurrentInvoice(fullInvoice);
      setEditorMode('invoice');
      setPreviousScreen(currentScreen);
      setCurrentScreen('editor');
    } catch (error) {
      console.error('Failed to load invoice:', error);
      toast.error(t('common.error') || 'Failed to load invoice details');
    }
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    if (editorMode === 'template') {
      // Save as template
      const newTemplate: InvoiceTemplate = {
        id: String(Date.now()),
        name: invoice.invoiceNumber.replace('TEMPLATE-', 'Template '),
        description: invoice.note || 'Custom invoice template',
        seller: {
          name: invoice.seller.name,
          vatId: invoice.seller.vatId,
          address: invoice.seller.address,
        },
        defaultCurrency: invoice.currency,
        defaultTaxCategory: invoice.lines[0]?.taxCategory || 'S',
        defaultTaxPercent: invoice.lines[0]?.taxPercent || 20,
        defaultPaymentTerms: invoice.paymentTerms,
      };

      setTemplates([newTemplate, ...templates]);
      toast.success(t('templates.templateSaved') || 'Template saved', {
        description: t('templates.templateSavedDesc') || 'Template has been saved to your library',
      });
      setCurrentScreen('templates');
      setCurrentInvoice(null);
    } else {
      // Save as invoice
      const calculated = calculateInvoiceTotals(invoice);

      const savePromise = async () => {
        try {
          let savedInvoice: Invoice;
          if (calculated.id && !calculated.id.startsWith('new_')) {
            // Update existing
            await invoiceService.update(calculated.id, calculated);
            savedInvoice = calculated;
          } else {
            // Create new
            // Remove temporary ID
            const { id, ...invoiceData } = calculated;
            const response = await invoiceService.create(invoiceData as Invoice);
            savedInvoice = { ...calculated, id: response.id };
          }

          const existingIndex = invoices.findIndex((inv) => inv.id === savedInvoice.id);
          if (existingIndex >= 0) {
            const newInvoices = [...invoices];
            newInvoices[existingIndex] = savedInvoice;
            setInvoices(newInvoices);
          } else {
            setInvoices([savedInvoice, ...invoices]);
          }

          setCurrentInvoice(savedInvoice);
          toast.success(t('editor.invoiceSaved') || 'Invoice saved successfully');
        } catch (error) {
          console.error('Failed to save invoice:', error);
          toast.error(t('common.error') || 'Failed to save invoice');
        }
      };

      savePromise();
    }
  };

  const handleSelectTemplate = (template: InvoiceTemplate) => {
    const newInvoice: Invoice = {
      id: String(Date.now()),
      invoiceNumber: `INV-2025-${String(invoices.length + 1).padStart(5, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      currency: template.defaultCurrency,
      seller: {
        name: template.seller.name || profile?.name || '',
        vatId: template.seller.vatId || profile?.vatId || '',
        address: template.seller.address || profile?.address || { street: '', city: '', postalCode: '', country: '' },
      },
      buyer: {
        name: '',
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: '',
        },
      },
      lines: [
        {
          id: '1',
          description: '',
          quantity: 1,
          unitCode: 'EA',
          unitPrice: 0,
          taxCategory: template.defaultTaxCategory as any,
          taxPercent: template.defaultTaxPercent,
        },
      ],
      taxTotals: [],
      lineExtensionAmount: 0,
      taxExclusiveAmount: 0,
      taxInclusiveAmount: 0,
      payableAmount: 0,
      paymentMeans: profile?.bankAccount ? {
        type: 'BankTransfer',
        iban: profile.bankAccount.iban,
        bic: profile.bankAccount.bic,
        accountName: profile.bankAccount.accountName,
      } : undefined,
      paymentTerms: template.defaultPaymentTerms,
      status: 'draft',
      signed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentInvoice(newInvoice);
    setEditorMode('invoice');
    setPreviousScreen(currentScreen);
    setCurrentScreen('editor');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen(previousScreen);
    setCurrentInvoice(null);
  };

  const handlePreviewInvoice = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setCurrentScreen('preview');
  };

  const handleBackToEditor = () => {
    setCurrentScreen('editor');
  };

  const handleSaveFromPreview = async (invoice: Invoice) => {
    const calculated = calculateInvoiceTotals(invoice);

    try {
      if (calculated.id && !calculated.id.startsWith('new_')) {
        await invoiceService.update(calculated.id, calculated);

        const existingIndex = invoices.findIndex((inv) => inv.id === calculated.id);
        if (existingIndex >= 0) {
          const newInvoices = [...invoices];
          newInvoices[existingIndex] = calculated;
          setInvoices(newInvoices);
        } else {
          setInvoices([calculated, ...invoices]);
        }

        setCurrentInvoice(calculated);
        toast.success(t('common.saved'), {
          description: t('invoiceList.invoiceUpdated') || 'Invoice updated successfully',
        });
      }
    } catch (error) {
      console.error('Failed to update invoice:', error);
      toast.error(t('common.error') || 'Failed to update invoice');
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(undefined);
    setCurrentScreen('templateEditor');
  };

  const handleEditTemplate = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    setCurrentScreen('templateEditor');
  };

  const handleSaveTemplate = async (template: InvoiceTemplate) => {
    try {
      if (template.id && !template.id.includes('.')) { // Checking if it's likely a database ID
        await invoiceTemplateService.update(template.id, template);
        toast.success(t('templates.templateUpdated') || 'Template updated', {
          description: template.name,
        });
      } else {
        await invoiceTemplateService.create(template);
        toast.success(t('templates.templateSaved') || 'Template saved', {
          description: template.name,
        });
      }
      // Reload templates from API
      const templatesData = await invoiceTemplateService.getAll();
      setTemplates(templatesData);
      setCurrentScreen('templates');
      setEditingTemplate(undefined);
    } catch (error) {
      toast.error('Failed to save template');
      console.error('Template save error:', error);
    }
  };

  const handleCancelTemplateEdit = () => {
    setCurrentScreen('templates');
    setEditingTemplate(undefined);
  };

  const handleDeleteTemplate = async (template: InvoiceTemplate) => {
    if (!template.id) return;
    try {
      await invoiceTemplateService.delete(template.id);
      toast.success(t('templates.templateDeleted') || 'Template deleted', {
        description: template.name,
      });
      // Reload templates from API
      const templatesData = await invoiceTemplateService.getAll();
      setTemplates(templatesData);
    } catch (error) {
      toast.error('Failed to delete template');
      console.error('Template delete error:', error);
    }
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
        <Toaster />
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-fit">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">{t('appName')}</h1>
                <p className="text-xs text-white/80">
                  {t('appSubtitle')}
                </p>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 flex justify-center max-w-7xl overflow-x-auto no-scrollbar">
              <nav className="flex items-center gap-6">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
                  { id: 'invoices', icon: FileText, label: t('invoiceList.title'), permission: 'invoices.read' },
                  { id: 'templates', icon: LayoutTemplate, label: t('nav.templates'), permission: 'company_profiles.read' },
                  { id: 'activity', icon: Activity, label: t('nav.activity'), permission: 'audit_logs.read' },
                  { id: 'admin', icon: ShieldAlert, label: 'Admin', permission: ['users.manage', 'roles.manage'] },
                  { id: 'settings', icon: SettingsIcon, label: t('nav.settings'), permission: 'company_profiles.read' },
                ]
                  .filter(item => {
                    if (!item.permission) return true;
                    if (Array.isArray(item.permission)) return item.permission.some(p => hasPermissionSync(p));
                    return hasPermissionSync(item.permission);
                  })
                  .map((item) => {
                    const isActive = currentScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentScreen(item.id as Screen)}
                        className={`
                        group relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-300 whitespace-nowrap
                        ${isActive
                            ? 'text-white'
                            : 'text-white/80 hover:text-white'
                          }
                      `}
                      >
                        {/* Active indicator - bottom border */}
                        <div className={`
                        absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full transition-all duration-300
                        ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0 group-hover:opacity-50 group-hover:scale-x-75'}
                      `} />

                        {/* Hover background glow */}
                        <div className={`
                        absolute inset-0 rounded-lg bg-white/10 backdrop-blur-sm transition-all duration-300
                        ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'}
                      `} />

                        {/* Content */}
                        <item.icon className={`
                        h-4 w-4 relative z-10 transition-transform duration-300
                        ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                      `} />
                        <span className="relative z-10">{item.label}</span>

                        {/* Active pill background */}
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/5 rounded-lg border border-white/30 shadow-lg" />
                        )}
                      </button>
                    );
                  })}
              </nav>
            </div>

            <div className="flex items-center gap-3 min-w-fit">
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-sm"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Suspense fallback={
          <div className="flex h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-sm text-gray-500">Loading module...</p>
            </div>
          </div>
        }>
          {currentScreen === 'editor' && currentInvoice ? (
            <InvoiceEditor
              invoice={currentInvoice}
              profile={profile}
              onSave={handleSaveInvoice}
              onBack={handleBackToDashboard}
              onPreview={handlePreviewInvoice}
              mode={editorMode}
              templates={templates}
              onLoadTemplate={(template) => {
                const updatedInvoice = {
                  ...currentInvoice,
                  currency: template.defaultCurrency,
                  seller: {
                    name: template.seller.name || currentInvoice.seller.name,
                    vatId: template.seller.vatId || currentInvoice.seller.vatId,
                    address: template.seller.address || currentInvoice.seller.address,
                    contactEmail: currentInvoice.seller.contactEmail,
                    contactPhone: currentInvoice.seller.contactPhone,
                  },
                  paymentTerms: template.defaultPaymentTerms,
                  lines: currentInvoice.lines.length > 0 ? currentInvoice.lines : [{
                    id: '1',
                    description: '',
                    quantity: 1,
                    unitCode: 'EA',
                    unitPrice: 0,
                    taxCategory: template.defaultTaxCategory as any,
                    taxPercent: template.defaultTaxPercent,
                  }],
                };
                setCurrentInvoice(updatedInvoice);
                toast.success(t('templates.templateLoaded') || 'Template loaded', {
                  description: template.name,
                });
              }}
            />
          ) : currentScreen === 'preview' && currentInvoice ? (
            <InvoicePreview
              invoice={currentInvoice}
              onBack={handleBackToEditor}
              onSave={handleSaveFromPreview}
              template={templates.find(t => t.seller.name === currentInvoice.seller.name)}
              profile={profile}
            />
          ) : currentScreen === 'templateEditor' ? (
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={handleCancelTemplateEdit}
            />
          ) : currentScreen === 'designLayout' ? (
            <DesignLayoutPage />
          ) : (
            <div>
              {currentScreen === 'dashboard' && (
                <Dashboard
                  invoices={invoices}
                  onNewInvoice={handleNewInvoice}
                  onOpenInvoice={handleOpenInvoice}
                />
              )}

              {currentScreen === 'invoices' && (
                <InvoiceList
                  onSelectInvoice={handleOpenInvoice}
                  onEditInvoice={handleOpenInvoice}
                />
              )}

              {currentScreen === 'templates' && (
                <TemplateLibrary
                  templates={templates}
                  onSelectTemplate={handleSelectTemplate}
                  onNewTemplate={handleNewTemplate}
                  onEditTemplate={handleEditTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                />
              )}

              {currentScreen === 'activity' && <ActivityLog entries={logEntries} />}

              {currentScreen === 'admin' && <AdminLayout />}

              {currentScreen === 'settings' && profile && (
                <Settings
                  profile={profile}
                  onUpdateProfile={async (updatedProfile) => {
                    try {
                      if (updatedProfile.id) {
                        await companyProfileService.update(updatedProfile.id, updatedProfile);
                        setProfile(updatedProfile);
                        toast.success(t('settings.settingsSaved') || 'Settings saved successfully');
                      }
                    } catch (error) {
                      console.error('Failed to update profile:', error);
                      toast.error(t('common.error') || 'Failed to save settings');
                      throw error; // Re-throw to let Settings component know it failed
                    }
                  }}
                />
              )}
            </div>
          )}
        </Suspense>
      </div>

      <GlobalAIAssistant
        onGenerateInvoiceNumber={() => `INV-2025-${String(invoices.length + 1).padStart(5, '0')}`}
      />
      <TicketingWidget apiKey="billtool_test_key" apiBaseUrl="http://localhost:8081" />
      <Toaster />
    </div >
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
