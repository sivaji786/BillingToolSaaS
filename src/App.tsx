import { useState, Suspense, lazy, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice, InvoiceTemplate } from './types/invoice';
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
const Signup = lazy(() => import('./components/screens/Signup').then(module => ({ default: module.Signup })));
const Billing = lazy(() => import('./components/screens/Billing').then(module => ({ default: module.Billing })));
const LandingPage = lazy(() => import('./components/screens/LandingPage').then(module => ({ default: module.LandingPage })));

// Admin Portal Components
const SALogin = lazy(() => import('./components/screens/Admin/SALogin').then(module => ({ default: module.SALogin })));
const SAdashboard = lazy(() => import('./components/screens/Admin/SAdashboard').then(module => ({ default: module.SAdashboard })));
const SApackages = lazy(() => import('./components/screens/Admin/SApackages').then(module => ({ default: module.SApackages })));
const SAPackageForm = lazy(() => import('./components/screens/Admin/SAPackageForm').then(module => ({ default: module.SAPackageForm })));
const SAASusers = lazy(() => import('./components/screens/Admin/SAASusers').then(module => ({ default: module.SAASusers })));
const SAUserDetails = lazy(() => import('./components/screens/Admin/SAUserDetails').then(module => ({ default: module.SAUserDetails })));
const SAbilling = lazy(() => import('./components/screens/Admin/SAbilling').then(module => ({ default: module.SAbilling })));
const SAusage = lazy(() => import('./components/screens/Admin/SAusage').then(module => ({ default: module.SAusage })));
const SAsettings = lazy(() => import('./components/screens/Admin/SAsettings').then(module => ({ default: module.SAsettings })));
const SAInvoiceForm = lazy(() => import('./components/screens/Admin/SAInvoiceForm').then(module => ({ default: module.SAInvoiceForm })));


import { TicketingWidget } from './components/TicketingWidget';
import { GlobalAIAssistant } from './components/GlobalAIAssistant';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/layout/AppSidebar';
import { Separator } from './components/ui/separator';
import { QueryProvider } from './providers/QueryProvider';
import { useAdminStore } from './stores/adminStore';
import { useAuthStore } from './stores/authStore';
import { AdminLayout as AdminLayoutWrapper } from './components/admin/AdminLayout';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb"

import { Toaster } from './components/ui/sonner';
// Button removed as unused
// Unused imports removed
import {
  invoiceTemplateService,
  companyProfileService,
  auditLogService,
} from './services/api';
import { getApiBaseUrl } from './utils/config';
import { calculateInvoiceTotals } from './utils/invoice-calculations';
import { toast } from 'sonner';
import { authService, invoiceService } from './services/api';
// hasPermissionSync removed

type Screen = 'landing' | 'login' | 'dashboard' | 'invoices' | 'editor' | 'preview' | 'templates' | 'templateEditor' | 'designLayout' | 'activity' | 'settings' | 'admin' | 'signup' | 'billing' | 'SALogin' | 'SAdashboard' | 'SApackages' | 'SAPackageForm' | 'SAASusers' | 'SAUserDetails' | 'SAbilling' | 'SAusage' | 'SAsettings' | 'SAInvoiceForm';
type EditorMode = 'invoice' | 'template';

function AppContent() {
  const { t } = useLanguage();
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['landing', 'login', 'dashboard', 'invoices', 'templates', 'activity', 'settings', 'designLayout', 'admin', 'wiki', 'signup'].includes(hash)) {
        return hash as Screen;
      }
      // Handle parameterized routes like designLayout/123
      if (hash.startsWith('designLayout/')) {
        return 'designLayout';
      }
    }
    return 'landing';
  });
  const [previousScreen, setPreviousScreen] = useState<Screen>('dashboard');
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('invoice');
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | undefined>(undefined);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Get token from store
      let token = useAuthStore.getState().token;

      // 2. Migration: Check raw localStorage for legacy token
      const legacyToken = localStorage.getItem('token');
      if (!token && legacyToken) {
        console.log('Migrating legacy token to authStore');
        token = legacyToken;
        // Temporarily set token so authService.me() can use it
        useAuthStore.setState({ token: legacyToken });
      }

      // 3. Clean up legacy keys anyway
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // 4. Handle token from URL (redirection)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      if (tokenFromUrl) {
        console.log('Token found in URL, updating store');
        token = tokenFromUrl;
        useAuthStore.setState({ token: tokenFromUrl });
        // Clean up URL without page reload
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }

      if (token) {
        try {
          // Verify token and get fresh user data including rights
          const userData = await authService.me();

          // Update store with full user/tenant data
          login(token, userData, userData.tenant || {} as any);

          // If we were on landing or login, go to dashboard
          if (currentScreen === 'landing' || currentScreen === 'login') {
            setCurrentScreen('dashboard');
          }
        } catch (e) {
          console.error('Auth check failed:', e);
          logout();
        }
      }
      setIsCheckingAuth(false);
    };
    checkAuth();

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      console.log('Hash changed:', hash);
      if (hash && [
        'landing', 'login', 'dashboard', 'invoices', 'templates', 'activity', 'settings', 'designLayout', 'admin', 'wiki', 'signup'
      ].includes(hash)) {
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
          // Ensure lines property exists
          if (!invoiceData.lines) invoiceData.lines = [];

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
          // Ensure lines property exists
          if (!invoiceData.lines) invoiceData.lines = [];

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
    if ([
      'dashboard', 'invoices', 'templates', 'activity', 'settings', 'admin'
    ].includes(currentScreen)) {
      if (window.location.hash.replace('#', '') !== currentScreen) {
        window.location.hash = currentScreen;
      }
    }
  }, [currentScreen]);

  // React Query for data fetching
  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceService.getAll(),
    enabled: isAuthenticated
  });

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => invoiceTemplateService.getAll(),
    enabled: isAuthenticated
  });

  const { data: companyProfiles = [], refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => companyProfileService.getAll(),
    enabled: isAuthenticated
  });

  const { data: logEntries = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditLogService.getAll(),
    enabled: isAuthenticated
  });

  const profile = companyProfiles[0] || null;

  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await authService.login(email, password);

      const targetUrl = new URL(data.redirect_url);
      const isSameHost = targetUrl.host === window.location.host;

      // Always update state first
      login(data.token, data.user, data.tenant || {} as any);

      if (data.redirect_url && !isSameHost) {
        toast.success(t('login.success') || 'Login successful', {
          description: t('login.redirecting') || 'Redirecting to your workspace...'
        });
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 800);
        return;
      }

      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('login.failed') || 'Login failed');
    }
  };

  const handleLogout = () => {
    authService.logout();
    useAuthStore.getState().logout();
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


  const handleSaveInvoice = async (invoice: Invoice) => {
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

      try {
        await invoiceTemplateService.create(newTemplate);
        refetchTemplates();
        toast.success(t('templates.templateSaved') || 'Template saved', {
          description: t('templates.templateSavedDesc') || 'Template has been saved to your library',
        });
        setCurrentScreen('templates');
        setCurrentInvoice(null);
        return newTemplate;
      } catch (error) {
        console.error('Failed to save template:', error);
        toast.error(t('common.error') || 'Failed to save template');
        throw error;
      }
    } else {
      // Save as invoice
      const calculated = calculateInvoiceTotals(invoice);

      try {
        let savedInvoice: Invoice = calculated;
        if (calculated.id && !calculated.id.startsWith('new_')) {
          // Update existing
          await invoiceService.update(calculated.id, calculated);
        } else {
          // Create new
          // Remove temporary ID
          const { id, ...invoiceData } = calculated;
          const response = await invoiceService.create(invoiceData as Invoice);
          savedInvoice = { ...calculated, id: response.id };
        }

        refetchInvoices();
        setCurrentInvoice(savedInvoice);
        return savedInvoice;
      } catch (error) {
        console.error('Failed to save invoice:', error);
        toast.error(t('common.error') || 'Failed to save invoice');
        throw error;
      }
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

  const handlePreviewInvoice = async (invoice: Invoice) => {
    if (!invoice.id) return;
    try {
      const fullInvoice = await invoiceService.getById(invoice.id);
      setCurrentInvoice(fullInvoice);
      setPreviousScreen(currentScreen);
      setCurrentScreen('preview');
    } catch (error) {
      console.error('Failed to load invoice for preview:', error);
      toast.error(t('common.error') || 'Failed to load invoice details');
    }
  };

  const handleBackToEditor = () => {
    setCurrentScreen('editor');
  };

  const handleSaveFromPreview = async (invoice: Invoice) => {
    // The InvoicePreview component handles its own database save logic
    // We just need to update the app-level state and refresh the invoice list
    setCurrentInvoice(invoice);
    refetchInvoices();
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
      if (template.id && !template.id.includes('.') && !template.id.startsWith('new_')) { // Checking if it's likely a database ID
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
      refetchTemplates();
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
      refetchTemplates();
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
  // Show login/signup/landing if not authenticated
  if (!isAuthenticated) {
    if (currentScreen === 'signup') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
          <Signup initialPlan={selectedPlan} />
          <Toaster />
        </Suspense>
      );
    }

    if (currentScreen === 'login') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
          <Login
            onLogin={handleLogin}
            onSignup={() => setCurrentScreen('signup')}
            onGoHome={() => setCurrentScreen('landing')}
          />
          <Toaster />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
        <LandingPage
          onLogin={() => setCurrentScreen('login')}
          onSignup={(planId) => {
            setSelectedPlan(planId);
            setCurrentScreen('signup');
          }}
        />
        <Toaster />
      </Suspense>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen as Screen)}
        onLogout={handleLogout}
        user={user}
        profile={profile}
        side="left"
        variant="sidebar"
        collapsible="icon"
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-data-[collapsible=icon]:h-16 sticky top-0 bg-purple-600 text-white z-10 shadow-md">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 text-white hover:bg-white/10 hover:text-white" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-white/30" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#" onClick={() => setCurrentScreen('dashboard')} className="text-white/90 hover:text-white">
                    {t('appName')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="capitalize text-white font-semibold">{currentScreen === 'invoices' ? 'Invoices' : currentScreen}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
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
                    onOpenInvoice={handlePreviewInvoice}
                  />
                )}

                {currentScreen === 'invoices' && (
                  <InvoiceList
                    onSelectInvoice={handlePreviewInvoice}
                    onEditInvoice={handleOpenInvoice}
                    onNewInvoice={handleNewInvoice}
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
                          refetchProfile();
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

                {currentScreen === 'billing' && <Billing />}

              </div>
            )}
          </Suspense>
        </div>

        <GlobalAIAssistant
          onGenerateInvoiceNumber={() => `INV-2025-${String(invoices.length + 1).padStart(5, '0')}`}
          currentInvoice={currentInvoice}
          currentScreen={currentScreen}
          onUpdateInvoice={(updatedInvoice) => {
            setCurrentInvoice(updatedInvoice);
            // If in preview mode, ensure we update the hash data to reflect changes
            if (currentScreen === 'preview') {
              const invoiceDataStr = encodeURIComponent(JSON.stringify(updatedInvoice));
              window.location.hash = `#preview?data=${invoiceDataStr}`;
            }
          }}
        />
        <TicketingWidget
          apiKey="billtool_test_key"
          apiBaseUrl={getApiBaseUrl()}
          userId={user?.id}
        />
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <LanguageProvider>
        <AdminPortalRouter />
      </LanguageProvider>
    </QueryProvider>
  );
}

// Admin Portal Router - handles admin routes separately
function AdminPortalRouter() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').replace(/^\//, ''); // Remove # and leading /
      // Check if it's an admin route
      if (hash && ['SALogin', 'SAdashboard', 'SApackages', 'SAPackageForm', 'SAASusers', 'SAUserDetails', 'SAbilling', 'SAusage', 'SAsettings', 'SAInvoiceForm'].includes(hash)) {
        return hash as Screen;
      }
    }
    return 'landing';
  });

  const [navigationParams, setNavigationParams] = useState<{ packageId?: string; userId?: string }>({});

  const { isAuthenticated: isAdminAuth, _hasHydrated } = useAdminStore();

  useEffect(() => {
    // Only handle routes after hydration
    if (!_hasHydrated) return;
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').replace(/^\//, ''); // Remove # and leading /
      if (hash && ['SALogin', 'SAdashboard', 'SApackages', 'SAPackageForm', 'SAASusers', 'SAUserDetails', 'SAbilling', 'SAusage', 'SAsettings', 'SAInvoiceForm'].includes(hash)) {
        setCurrentScreen(hash as Screen);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (screen: string, params?: { packageId?: string; userId?: string }) => {
    setCurrentScreen(screen as Screen);
    setNavigationParams(params || {});
    window.location.hash = `#/${screen}`;
  };

  // Admin Portal Routes
  const isAdminRoute = ['SALogin', 'SAdashboard', 'SApackages', 'SAPackageForm', 'SAASusers', 'SAUserDetails', 'SAbilling', 'SAusage', 'SAsettings', 'SAInvoiceForm'].includes(currentScreen);

  if (isAdminRoute) {
    // Wait for hydration before checking auth
    if (!_hasHydrated) {
      return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    // Show admin login if not authenticated
    if (!isAdminAuth && currentScreen !== 'SALogin') {
      window.location.hash = '#/SALogin';
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
          <SALogin onLoginSuccess={() => setCurrentScreen('SAdashboard')} />
          <Toaster />
        </Suspense>
      );
    }

    if (currentScreen === 'SALogin') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
          <SALogin onLoginSuccess={() => {
            setCurrentScreen('SAdashboard');
            window.location.hash = '#/SAdashboard';
          }} />
          <Toaster />
        </Suspense>
      );
    }

    // Admin Portal Layout
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
        <AdminLayoutWrapper
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            setCurrentScreen(screen as Screen);
            window.location.hash = `#/${screen}`;
          }}
          onLogout={() => {
            useAdminStore.getState().logout();
            setCurrentScreen('SALogin');
            window.location.hash = '#/SALogin';
          }}
        >
          {currentScreen === 'SAdashboard' && <SAdashboard onNavigate={(screen) => {
            setCurrentScreen(screen as Screen);
            window.location.hash = `#/${screen}`;
          }} />}
          {currentScreen === 'SApackages' && <SApackages onNavigate={handleNavigate} />}
          {currentScreen === 'SAPackageForm' && <SAPackageForm packageId={navigationParams.packageId} onNavigate={handleNavigate} />}
          {currentScreen === 'SAASusers' && <SAASusers onNavigate={handleNavigate} />}
          {currentScreen === 'SAUserDetails' && <SAUserDetails userId={navigationParams.userId || ''} onNavigate={handleNavigate} />}
          {currentScreen === 'SAbilling' && <SAbilling />}
          {currentScreen === 'SAInvoiceForm' && <SAInvoiceForm onNavigate={handleNavigate} />}
          {currentScreen === 'SAusage' && <SAusage />}
          {currentScreen === 'SAsettings' && <SAsettings />}
        </AdminLayoutWrapper>
        <Toaster />
      </Suspense>
    );
  }

  // Regular app routes
  return <AppContent />;
}

