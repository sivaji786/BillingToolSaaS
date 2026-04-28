import { useState, Suspense, lazy, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Invoice, InvoiceTemplate, TemplateType } from './types/invoice';
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
const QuickAccessInvoice = lazy(() => import('./components/screens/QuickAccessInvoice').then(module => ({ default: module.QuickAccessInvoice })));
const ResetPassword = lazy(() => import('./components/screens/ResetPassword'));
const Impressum = lazy(() => import('./components/screens/Impressum').then(module => ({ default: module.Impressum })));
const PrivacyPolicy = lazy(() => import('./components/screens/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsAndConditions = lazy(() => import('./components/screens/TermsAndConditions').then(module => ({ default: module.TermsAndConditions })));
const CookiePolicy = lazy(() => import('./components/screens/CookiePolicy').then(module => ({ default: module.CookiePolicy })));
const Buyers = lazy(() => import('./components/screens/Buyers').then(module => ({ default: module.Buyers })));
const Workspace = lazy(() => import('./components/screens/Workspace').then(module => ({ default: module.Workspace })));
const AIHistory = lazy(() => import('./components/screens/AIHistory').then(module => ({ default: module.AIHistory })));
const PackageComparison = lazy(() => import('./components/screens/PackageComparison').then(module => ({ default: module.PackageComparison })));
const LetterList = lazy(() => import('./components/screens/LetterList').then(module => ({ default: module.LetterList })));
const LetterEditor = lazy(() => import('./components/screens/LetterEditor').then(module => ({ default: module.LetterEditor })));
const LetterPreview = lazy(() => import('./components/screens/LetterPreview').then(module => ({ default: module.LetterPreview })));

// Admin Portal Components
const SALogin = lazy(() => import('./components/screens/Admin/SALogin').then(module => ({ default: module.SALogin })));
const SAdashboard = lazy(() => import('./components/screens/Admin/SAdashboard').then(module => ({ default: module.SAdashboard })));
const SApackages = lazy(() => import('./components/screens/Admin/SApackages').then(module => ({ default: module.SApackages })));
const SAPackageServices = lazy(() => import('./components/screens/Admin/SAPackageServices').then(module => ({ default: module.SAPackageServices })));
const SAPackageForm = lazy(() => import('./components/screens/Admin/SAPackageForm').then(module => ({ default: module.SAPackageForm })));
const SAASusers = lazy(() => import('./components/screens/Admin/SAASusers').then(module => ({ default: module.SAASusers })));
const SAUserDetails = lazy(() => import('./components/screens/Admin/SAUserDetails').then(module => ({ default: module.SAUserDetails })));
const SAbilling = lazy(() => import('./components/screens/Admin/SAbilling').then(module => ({ default: module.SAbilling })));
const SAusage = lazy(() => import('./components/screens/Admin/SAusage').then(module => ({ default: module.SAusage })));
const SAsettings = lazy(() => import('./components/screens/Admin/SAsettings').then(module => ({ default: module.SAsettings })));
const SAInvoiceForm = lazy(() => import('./components/screens/Admin/SAInvoiceForm').then(module => ({ default: module.SAInvoiceForm })));
const SATickets = lazy(() => import('./components/screens/Admin/SATickets').then(module => ({ default: module.SATickets })));
const SATicketDetails = lazy(() => import('./components/screens/Admin/SATicketDetails').then(module => ({ default: module.SATicketDetails })));
const SAWiki = lazy(() => import('./components/screens/Admin/SAWiki').then(module => ({ default: module.SAWiki })));
const SAPages = lazy(() => import('./components/screens/Admin/SAPages').then(module => ({ default: module.SAPages })));


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
import { getApiBaseUrl, getTicketingApiKey } from './utils/config';
import { calculateInvoiceTotals, generateInvoiceNumber } from './utils/invoice-calculations';
import { toast } from 'sonner';
import { authService, invoiceService, letterService } from './services/api';
import { PLATFORM_TEMPLATES } from './utils/invoice-templates-defaults';
// hasPermissionSync removed

type Screen = 'landing' | 'login' | 'dashboard' | 'invoices' | 'letters' | 'editor' | 'preview' | 'templates' | 'templateEditor' | 'designLayout' | 'activity' | 'settings' | 'admin' | 'signup' | 'billing' | 'buyers' | 'workspace' | 'SALogin' | 'SAdashboard' | 'SApackages' | 'SAPackageServices' | 'SAPackageForm' | 'SAASusers' | 'SAUserDetails' | 'SAbilling' | 'SAusage' | 'SAsettings' | 'SAPages' | 'SAInvoiceForm' | 'SATickets' | 'SATicketDetails' | 'SAWiki' | 'aiHistory' | 'quickAccess' | 'impressum' | 'privacyPolicy' | 'termsAndConditions' | 'cookiePolicy' | 'packageComparison' | 'resetPassword';
type EditorMode = 'invoice' | 'template';

function AppContent() {
  const { t } = useLanguage();
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash && ['landing', 'login', 'dashboard', 'invoices', 'letters', 'templates', 'activity', 'settings', 'designLayout', 'admin', 'SAWiki', 'signup', 'buyers', 'workspace', 'aiHistory', 'quickAccess', 'impressum', 'privacyPolicy', 'termsAndConditions', 'cookiePolicy', 'packageComparison'].includes(hash)) {
        return hash as Screen;
      }
      // Handle parameterized routes like designLayout/123 or reset-password/123
      if (hash.startsWith('designLayout/')) {
        return 'designLayout';
      }
      if (hash.startsWith('reset-password/')) {
        return 'resetPassword';
      }
    }
    return 'landing';
  });
  const [previousScreen, setPreviousScreen] = useState<Screen>('dashboard');
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('invoice');
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | undefined>(undefined);
  const [newTemplateType, setNewTemplateType] = useState<TemplateType>('invoice');
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
      const isLogout = urlParams.get('logout') === 'true';

      if (isLogout) {
        console.log('Logout parameter detected, clearing main domain session');
        useAuthStore.getState().clearAuth();
        // Clean up URL without page reload
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
        setIsCheckingAuth(false);
        return;
      }

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
          // Don't logout/redirect if we're on the reset password page
          if (!window.location.hash.includes('reset-password')) {
            logout();
          } else {
            // Just clear the invalid token from state but stay on page
            useAuthStore.setState({ token: null, isAuthenticated: false });
          }
        }
      }
      setIsCheckingAuth(false);
    };
    checkAuth();

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      console.log('Hash changed:', hash);
      if (hash && [
        'landing', 'login', 'dashboard', 'invoices', 'letters', 'templates', 'activity', 'settings', 'designLayout', 'admin', 'SAWiki', 'signup', 'buyers', 'workspace', 'aiHistory', 'quickAccess', 'impressum', 'privacyPolicy', 'termsAndConditions', 'cookiePolicy', 'packageComparison', 'SAPages'
      ].includes(hash)) {
        console.log('Setting screen from hash change:', hash);
        setCurrentScreen(hash as Screen);
      } else if (hash.startsWith('reset-password/')) {
        console.log('Setting screen to resetPassword from parameterized route');
        setCurrentScreen('resetPassword');
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
      'dashboard', 'invoices', 'letters', 'templates', 'activity', 'settings', 'admin', 'workspace', 'aiHistory', 'packageComparison'
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

  const { data: userTemplates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => invoiceTemplateService.getAll(),
    enabled: isAuthenticated
  });

  const templates = [...PLATFORM_TEMPLATES, ...userTemplates];

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

      // Check if the user was redirected here from Quick Access with a pending action
      const pendingAction = localStorage.getItem('qa_pending_action');
      if (pendingAction) {
        // Send them back to quickAccess which will auto-execute the pending action
        toast.success(t('login.success') || 'Login successful!', {
          description: t('login.resumingAction') || 'Resuming your invoice action…',
        });
        setCurrentScreen('quickAccess');
        return;
      }

      setCurrentScreen('dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      // Requirement: form should inform "email/ password wrong" on incorrect credentials
      const errorMessage = error.response?.status === 401 
        ? "email/ password wrong" 
        : (t('login.failed') || 'Login failed');
      
      toast.error(errorMessage);
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
      invoiceNumber: generateInvoiceNumber(profile?.invoiceNumberFormat || 'INV-{YYYY}-{NNNNN}', invoices.length),
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + (profile?.paymentTermsDays ?? 30) * 86400000).toISOString().split('T')[0],
      currency: profile?.defaultCurrency || 'EUR',
      seller: {
        name: profile?.name || '',
        vatId: profile?.vatId || '',
        legalOrganizationId: profile?.legalOrganizationId,
        address: profile?.address || { street: '', city: '', postalCode: '', country: '' },
        contactEmail: profile?.email,
        contactPhone: profile?.phone,
      },
      templateId: profile?.defaultTemplateId,
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
          taxCategory: profile?.defaultTaxRate === 0 ? 'Z' : 'S',
          taxPercent: profile?.defaultTaxRate ?? 19,
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

  const handleNewBusinessLetter = () => {
    const letterTemplate = templates.find(t => t.templateType === 'business_letter') || PLATFORM_TEMPLATES.find(t => t.templateType === 'business_letter');
    
    const newLetter: Invoice = {
      id: `new_${Date.now()}`,
      templateType: 'business_letter',
      templateId: letterTemplate?.id,
      invoiceNumber: generateInvoiceNumber(profile?.letterNumberFormat || 'LTR-{YYYY}-{NNNNN}', invoices.filter(inv => inv.templateType === 'business_letter').length),
      issueDate: new Date().toISOString().split('T')[0],
      currency: profile?.defaultCurrency || 'EUR',
      seller: {
        name: profile?.name || '',
        address: profile?.address || { street: '', city: '', postalCode: '', country: '' },
        contactEmail: profile?.email,
        contactPhone: profile?.phone,
      },
      buyer: {
        name: '',
        address: { street: '', city: '', postalCode: '', country: '' },
      },
      lines: [],
      taxTotals: [],
      lineExtensionAmount: 0,
      taxExclusiveAmount: 0,
      taxInclusiveAmount: 0,
      payableAmount: 0,
      salutation: 'Dear Sir/Madam,',
      body: '',
      closing: 'Yours sincerely,',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentInvoice(newLetter);
    setPreviousScreen(currentScreen);
    setCurrentScreen('preview');
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
        if (calculated.id && !String(calculated.id).startsWith('new_')) {
          // Update existing
          await invoiceService.update(String(calculated.id), calculated);
        } else {
          // Create new
          // Remove temporary ID
          const { id, ...invoiceData } = calculated;
          const response = await invoiceService.create(invoiceData as Invoice);
          savedInvoice = { ...calculated, id: String(response.id) };
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
      templateId: template.id || profile?.defaultTemplateId || PLATFORM_TEMPLATES[0].id,
      invoiceNumber: generateInvoiceNumber(profile?.invoiceNumberFormat || 'INV-{YYYY}-{NNNNN}', invoices.length),
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + (profile?.paymentTermsDays ?? 30) * 86400000).toISOString().split('T')[0],
      currency: template.defaultCurrency || 'EUR',
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
    refetchProfile(); // Refresh profile to get updated defaultTemplateId
  };

  const handleOpenLetter = async (letter: Invoice) => {
    if (!letter.id) return;
    try {
      const fullLetter = await letterService.getById(String(letter.id));
      setCurrentInvoice(fullLetter);
      setPreviousScreen(currentScreen);
      setCurrentScreen('editor');
    } catch (error) {
      console.error('Failed to load letter:', error);
      toast.error(t('common.error') || 'Failed to load letter');
    }
  };

  const handleSelectLetter = async (letter: Invoice) => {
    if (!letter.id) return;
    try {
      const fullLetter = await letterService.getById(String(letter.id));
      setCurrentInvoice(fullLetter);
      setPreviousScreen(currentScreen);
      setCurrentScreen('preview');
    } catch (error) {
      console.error('Failed to load letter:', error);
      toast.error(t('common.error') || 'Failed to load letter');
    }
  };

  const handlePreviewLetter = (letter: Invoice) => {
    setCurrentInvoice(letter);
    setPreviousScreen(currentScreen);
    setCurrentScreen('preview');
  };

  const handleSaveLetter = async (letter: Invoice) => {
    try {
      let savedLetter = letter;
      if (letter.id && !String(letter.id).startsWith('new_')) {
        await letterService.update(String(letter.id), letter);
      } else {
        const { id, ...letterData } = letter;
        const response = await letterService.create(letterData as Invoice);
        savedLetter = { ...letter, id: String(response.id) };
      }
      setCurrentInvoice(savedLetter);
      return savedLetter;
    } catch (error) {
      console.error('Failed to save letter:', error);
      toast.error(t('previewModal.letterSaveFailed') || 'Failed to save letter');
      throw error;
    }
  };

  const handleNewTemplate = (type: TemplateType = 'invoice') => {
    setNewTemplateType(type);
    setEditingTemplate(undefined);
    setCurrentScreen('templateEditor');
  };

  const handleEditTemplate = (template: InvoiceTemplate) => {
    if (PLATFORM_TEMPLATES.some(t => t.id === template.id)) {
      toast.error('Platform templates cannot be edited directly.');
      return;
    }
    setEditingTemplate(template);
    setCurrentScreen('templateEditor');
  };

  const handleSaveTemplate = async (template: InvoiceTemplate) => {
    try {
      if (template.id && !String(template.id).includes('.') && !String(template.id).startsWith('new_')) { // Checking if it's likely a database ID
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
    if (PLATFORM_TEMPLATES.some(t => t.id === template.id)) {
      toast.error('Platform templates cannot be deleted.');
      return;
    }
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

  // Public legal pages — no auth required
  const navigate = (screen: string) => setCurrentScreen(screen as Screen);

  if (currentScreen === 'impressum') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
        <Impressum onBack={() => setCurrentScreen('landing')} onNavigate={navigate} />
      </Suspense>
    );
  }
  if (currentScreen === 'privacyPolicy') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
        <PrivacyPolicy onBack={() => setCurrentScreen('landing')} onNavigate={navigate} />
      </Suspense>
    );
  }
  if (currentScreen === 'termsAndConditions') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
        <TermsAndConditions onBack={() => setCurrentScreen('landing')} onNavigate={navigate} />
      </Suspense>
    );
  }
  if (currentScreen === 'cookiePolicy') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
        <CookiePolicy onBack={() => setCurrentScreen('landing')} onNavigate={navigate} />
      </Suspense>
    );
  }

  // Show login/signup/landing if not authenticated
  if (!isAuthenticated) {
    if (currentScreen === 'resetPassword') {
      const parts = window.location.hash.split('/');
      const token = parts[parts.length - 1] || '';
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
          <ResetPassword token={token} onComplete={() => setCurrentScreen('login')} />
          <Toaster />
        </Suspense>
      );
    }
    
    if (currentScreen === 'quickAccess') {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
          <QuickAccessInvoice
            onLogin={() => setCurrentScreen('login')}
            onComplete={() => setCurrentScreen('dashboard')}
            onNavigate={(screen) => setCurrentScreen(screen as Parameters<typeof setCurrentScreen>[0])}
          />
          <Toaster />
        </Suspense>
      );
    }

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
        {currentScreen === 'packageComparison' ? (
          <PackageComparison
            onBack={() => setCurrentScreen('landing')}
            onSignup={(planId) => {
              setSelectedPlan(planId);
              setCurrentScreen('signup');
            }}
          />
        ) : (
          <LandingPage
            onLogin={() => setCurrentScreen('login')}
            onSignup={(planId) => {
              setSelectedPlan(planId);
              setCurrentScreen('signup');
            }}
            onTryNow={() => setCurrentScreen('quickAccess')}
            onNavigate={navigate}
          />
        )}
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
        {currentScreen !== 'designLayout' && (
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
        )}
        <div className={`flex flex-1 flex-col gap-4 ${currentScreen === 'designLayout' ? 'p-0' : 'p-4 pt-0'}`}>
          <Suspense fallback={
            <div className="flex h-[50vh] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-sm text-gray-500">Loading module...</p>
              </div>
            </div>
          }>
            {currentScreen === 'editor' && currentInvoice ? (
              currentInvoice.templateType === 'business_letter' ? (
                <LetterEditor
                  letter={currentInvoice}
                  onSave={handleSaveLetter}
                  onBack={handleBackToDashboard}
                  onPreview={handlePreviewLetter}
                  profile={profile}
                />
              ) : (
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
                      templateId: template.id,
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
              )
            ) : currentScreen === 'preview' && currentInvoice ? (
              currentInvoice.templateType === 'business_letter' ? (
                <LetterPreview
                  letter={currentInvoice}
                  onBack={handleBackToDashboard}
                  onSave={(letter) => setCurrentInvoice(letter)}
                  template={templates.find(t => t.id === currentInvoice.templateId)}
                  allTemplates={templates}
                  onTemplateChange={(templateId) => {
                    setCurrentInvoice(prev => prev ? ({ ...prev, templateId }) : null);
                  }}
                  profile={profile}
                />
              ) : (
                <InvoicePreview
                  invoice={currentInvoice}
                  onBack={handleBackToEditor}
                  onSave={handleSaveFromPreview}
                  template={templates.find(t => t.id === currentInvoice.templateId) ||
                            templates.find(t => t.id === profile?.defaultTemplateId) ||
                            templates[0]}
                  allTemplates={templates}
                  onTemplateChange={(templateId) => {
                    setCurrentInvoice(prev => prev ? ({ ...prev, templateId }) : null);
                  }}
                  profile={profile}
                />
              )
            ) : currentScreen === 'templateEditor' ? (
              <TemplateEditor
                template={editingTemplate}
                profile={profile}
                onSave={handleSaveTemplate}
                onCancel={handleCancelTemplateEdit}
                initialTemplateType={newTemplateType}
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
                    templateType="invoice"
                  />
                )}

                {currentScreen === 'letters' && (
                  <LetterList
                    onSelectLetter={handleSelectLetter}
                    onEditLetter={handleOpenLetter}
                    onNewLetter={handleNewBusinessLetter}
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

                {currentScreen === 'SAWiki' && <SAWiki />}

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

                {currentScreen === 'buyers' && <Buyers />}
                {currentScreen === 'workspace' && <Workspace />}
                {currentScreen === 'aiHistory' && <AIHistory />}

              </div>
            )}
          </Suspense>
        </div>

        <GlobalAIAssistant
          onGenerateInvoiceNumber={() => generateInvoiceNumber(profile?.invoiceNumberFormat || 'INV-{YYYY}-{NNNNN}', invoices.length)}
          onGenerateLetterNumber={() => generateInvoiceNumber(profile?.letterNumberFormat || 'LTR-{YYYY}-{NNNNN}', invoices.filter(inv => inv.templateType === 'business_letter').length)}
          currentInvoice={currentInvoice}
          currentScreen={currentScreen}
          templateType={currentScreen === 'letters' || currentInvoice?.templateType === 'business_letter' ? 'business_letter' : 'invoice'}
          onUpdateInvoice={(updatedInvoice) => {
            setCurrentInvoice(updatedInvoice);
            if (currentScreen === 'preview') {
              const invoiceDataStr = encodeURIComponent(JSON.stringify(updatedInvoice));
              window.location.hash = `#preview?data=${invoiceDataStr}`;
            }
          }}
          onCreateLetter={(letter) => {
            setCurrentInvoice(letter);
            setPreviousScreen(currentScreen);
            setCurrentScreen('preview');
          }}
        />
        <TicketingWidget
          apiKey={getTicketingApiKey()}
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
      if (hash && ['SALogin', 'SAdashboard', 'SApackages', 'SAPackageServices', 'SAPackageForm', 'SAASusers', 'SAUserDetails', 'SAbilling', 'SAusage', 'SAsettings', 'SAInvoiceForm', 'SATickets', 'SATicketDetails', 'SAWiki', 'SAPages'].includes(hash)) {
        return hash as Screen;
      }
    }
    return 'landing';
  });

  const [navigationParams, setNavigationParams] = useState<{ packageId?: string; userId?: string; ticketId?: string }>({});

  const { isAuthenticated: isAdminAuth, _hasHydrated } = useAdminStore();

  useEffect(() => {
    // Only handle routes after hydration
    if (!_hasHydrated) return;
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').replace(/^\//, ''); // Remove # and leading /
      if (hash && ['SALogin', 'SAdashboard', 'SApackages', 'SAPackageServices', 'SAPackageForm', 'SAASusers', 'SAUserDetails', 'SAbilling', 'SAusage', 'SAsettings', 'SAInvoiceForm', 'SATickets', 'SATicketDetails', 'SAWiki', 'SAPages'].includes(hash)) {
        setCurrentScreen(hash as Screen);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (screen: string, params?: { packageId?: string; userId?: string; ticketId?: string }) => {
    setCurrentScreen(screen as Screen);
    setNavigationParams(params || {});
    window.location.hash = `#/${screen}`;
  };

  // Admin Portal Routes
  const isAdminRoute = ['SALogin', 'SAdashboard', 'SApackages', 'SAPackageServices', 'SAPackageForm', 'SAASusers', 'SAUserDetails', 'SAbilling', 'SAusage', 'SAsettings', 'SAInvoiceForm', 'SATickets', 'SATicketDetails', 'SAWiki', 'SAPages'].includes(currentScreen);

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
          {currentScreen === 'SAPackageServices' && <SAPackageServices onNavigate={handleNavigate} />}
          {currentScreen === 'SAPackageForm' && <SAPackageForm packageId={navigationParams.packageId} onNavigate={handleNavigate} />}
          {currentScreen === 'SAASusers' && <SAASusers onNavigate={handleNavigate} />}
          {currentScreen === 'SAUserDetails' && <SAUserDetails userId={navigationParams.userId || ''} onNavigate={handleNavigate} />}
          {currentScreen === 'SAbilling' && <SAbilling />}
          {currentScreen === 'SAInvoiceForm' && <SAInvoiceForm onNavigate={handleNavigate} />}
          {currentScreen === 'SATickets' && <SATickets onNavigate={handleNavigate} />}
          {currentScreen === 'SATicketDetails' && <SATicketDetails ticketId={navigationParams.ticketId || ''} onNavigate={handleNavigate} />}
          {currentScreen === 'SAusage' && <SAusage onNavigate={handleNavigate} />}
          {currentScreen === 'SAsettings' && <SAsettings />}
          {currentScreen === 'SAWiki' && <SAWiki />}
          {currentScreen === 'SAPages' && <SAPages />}
        </AdminLayoutWrapper>
        <Toaster />
      </Suspense>
    );
  }

  // Regular app routes
  return <AppContent />;
}

