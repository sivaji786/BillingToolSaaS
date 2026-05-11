import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    FileText,
    Download,
    Save,
    Plus,
    Trash2,
    Edit2,
    LogIn,
    Send,
    Loader2,
    HelpCircle,
    Code,
    QrCode,
    Lock,
    Lightbulb,
    CheckCircle2,
    ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Invoice, InvoiceLine } from '../../types/invoice';
import { formatCurrency, calculateInvoiceTotals } from '../../utils/invoice-calculations';
import { InlineQuickAccess } from '../invoice/InlineQuickAccess';
import { PreviewModal } from '../invoice/PreviewModal';
import { QuickAccessTour } from './QuickAccessTour';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { invoiceService } from '../../services/api';
import { getApiBaseUrl } from '../../utils/config';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';

const DRAFT_KEY = 'qa_draft';
const PENDING_ACTION_KEY = 'qa_pending_action';

type GatedAction = 'save' | 'download' | 'send' | 'export' | null;

function buildDraftInvoice(): Invoice {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (!parsed.lines) parsed.lines = [];
            return parsed;
        } catch {/* ignore */ }
    }

    const today = new Date().toISOString().split('T')[0];
    return {
        id: `new_qa_${Date.now()}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-00001`,
        issueDate: today,
        currency: 'EUR',
        seller: {
            name: '',
            vatId: '',
            address: { street: '', city: '', postalCode: '', country: '' },
        },
        buyer: {
            name: '',
            address: { street: '', city: '', postalCode: '', country: '' },
        },
        lines: [
            {
                id: `line_${Date.now()}`,
                description: 'Demo Service Item 1',
                quantity: 5,
                unitCode: 'EA',
                unitPrice: 18.2,
                taxCategory: 'S',
                taxPercent: 19,
            },
            {
                id: `line_${Date.now() + 1}`,
                description: 'Demo Service Item 2',
                quantity: 4,
                unitCode: 'EA',
                unitPrice: 22.75,
                taxPercent: 19,
                taxCategory: 'S',
            },
        ],
        taxTotals: [],
        lineExtensionAmount: 0,
        taxExclusiveAmount: 0,
        taxInclusiveAmount: 0,
        payableAmount: 0,
        status: 'draft',
        signed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

interface QuickAccessInvoiceProps {
    onLogin: () => void;
    onComplete: () => void;
    onNavigate?: (screen: string) => void;
}

export function QuickAccessInvoice({ onLogin, onComplete, onNavigate }: QuickAccessInvoiceProps) {
    const [invoice, setInvoice] = useState<Invoice>(() => buildDraftInvoice());
    const [editingField, setEditingField] = useState<string | null>(null);
    const [gatedAction, setGatedAction] = useState<GatedAction>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRestoringFromToken, setIsRestoringFromToken] = useState(false);
    const [startTour, setStartTour] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTab, setPreviewTab] = useState<'pdf' | 'ubl'>('pdf');
    const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
    // Pending action set by the post-login redirect from InlineQuickAccess
    const [pendingPostLoginAction, setPendingPostLoginAction] = useState<string | null>(null);
    const { t } = useLanguage();

    const { login, isAuthenticated } = useAuthStore();
    const calculated = calculateInvoiceTotals(invoice);

    // On mount: check for ?qa_token= in URL and restore draft from backend (cross-device)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const qaToken = params.get('qa_token');
        if (!qaToken) return;

        setIsRestoringFromToken(true);
        const apiBase = getApiBaseUrl();
        fetch(`${apiBase}/auth/quick-access/draft?token=${encodeURIComponent(qaToken)}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.success && data.invoice_draft) {
                    setInvoice({ ...buildDraftInvoice(), ...data.invoice_draft });
                    toast.success(t('quickAccess.invoiceRestored'), {
                        description: t('quickAccess.invoiceRestoredDesc'),
                    });
                }
            })
            .catch(() => {
                toast.error(t('quickAccess.restoreFailed'));
            })
            .finally(() => setIsRestoringFromToken(false));
    }, []);

    // Persist draft to localStorage on every change
    useEffect(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(invoice));
    }, [invoice]);

    // On mount: read any pending action from localStorage (set by email-check redirect)
    useEffect(() => {
        const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
        if (raw) {
            try {
                const { action, draft } = JSON.parse(raw);
                // Restore the draft if provided
                if (draft) {
                    setInvoice((prev) => ({ ...prev, ...draft }));
                }
                setPendingPostLoginAction(action);
            } catch { /* ignore */ }
            sessionStorage.removeItem(PENDING_ACTION_KEY);
        }
    }, []);

    // Execute the pending action once the user is authenticated
    useEffect(() => {
        if (!isAuthenticated || !pendingPostLoginAction) return;
        executePendingAction(pendingPostLoginAction);
        setPendingPostLoginAction(null);
    }, [isAuthenticated, pendingPostLoginAction]);

    // Auto-save draft: if user is ALREADY authenticated on mount (returned from login),
    // and the draft hasn't been saved yet (qa_draft still in localStorage), save it now.
    useEffect(() => {
        if (!isAuthenticated) return;
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;

        // Only auto-save if the draft looks real (was explicitly built, not just empty defaults)
        // We use a flag so this only fires once on mount
        const alreadySaved = sessionStorage.getItem('qa_draft_auto_saved');
        if (alreadySaved) return;
        sessionStorage.setItem('qa_draft_auto_saved', '1');

        (async () => {
            try {
                const { id, ...invoiceData } = invoice;
                await invoiceService.create(invoiceData as Invoice);
                localStorage.removeItem(DRAFT_KEY);
                toast.success(t('quickAccess.invoiceSaved') || 'Invoice saved!', {
                    description: t('quickAccess.invoiceSavedDesc') || 'Your invoice is now in your dashboard.',
                });
            } catch {
                // Silent fail — draft stays, user can save manually
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    // Show loading overlay while restoring from token
    if (isRestoringFromToken) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-sm text-gray-500">{t('quickAccess.restoring')}</p>
            </div>
        );
    }

    /**
     * executePendingAction — called when an authenticated user returns from login
     * with a pending Quick Access action stored in localStorage.
     */
    const executePendingAction = (action: string) => {
        switch (action) {
            case 'download':
            case 'pdf':
                // Open the PDF preview modal
                setPreviewTab('pdf');
                setIsPreviewOpen(true);
                toast.success(t('quickAccess.actionResumed') || 'Resuming — generating your PDF…');
                break;
            case 'export':
            case 'einvoice':
                // Open the UBL/e-invoice preview
                setPreviewTab('ubl');
                setIsPreviewOpen(true);
                toast.success(t('quickAccess.actionResumed') || 'Resuming — generating your E-Invoice…');
                break;
            case 'send':
                // Trigger the send flow — same as clicking Send button
                setGatedAction('send');
                toast.success(t('quickAccess.actionResumed') || 'Resuming — opening send dialog…');
                break;
            case 'save':
            default:
                // Invoice will be saved as part of handleAuth when new user, 
                // for existing returning user just show success
                toast.success(t('quickAccess.invoiceSaved') || 'Invoice ready!', {
                    description: t('quickAccess.invoiceSavedDesc'),
                });
                break;
        }
    };

    const handleFieldChange = useCallback((path: string, value: string | number) => {
        setInvoice((prev) => {
            const updated = { ...prev };
            const keys = path.split('.');
            let current: any = updated;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return updated;
        });
    }, []);

    const handleLineChange = useCallback((lineId: string, field: keyof InvoiceLine, value: any) => {
        setInvoice((prev) => ({
            ...prev,
            lines: prev.lines.map((l) => (l.id === lineId ? { ...l, [field]: value } : l)),
        }));
    }, []);

    const handleAddLine = () => {
        const newLine: InvoiceLine = {
            id: `line_${Date.now()}`,
            description: '',
            quantity: 1,
            unitCode: 'EA',
            unitPrice: 0,
            taxCategory: 'S',
            taxPercent: 19,
        };
        setInvoice((prev) => ({ ...prev, lines: [...prev.lines, newLine] }));
    };

    const handleRemoveLine = (lineId: string) => {
        setInvoice((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== lineId) }));
    };

    const handleBlur = () => setEditingField(null);

    const renderField = (
        fieldName: string,
        value: string | number,
        onChange: (val: string) => void,
        className = '',
        multiline = false,
        placeholder = 'Click to add',
        fieldKey?: string    // key to check against invalidFields
    ) => {
        const isInvalid = fieldKey ? invalidFields.has(fieldKey) : false;
        const invalidClass = isInvalid ? 'ring-2 ring-red-400 rounded bg-red-50' : '';
        if (editingField === fieldName) {
            return multiline ? (
                <Textarea
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={handleBlur}
                    autoFocus
                    className={`${className} ${invalidClass} min-h-[60px]`}
                />
            ) : (
                <Input
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={handleBlur}
                    autoFocus
                    className={`${className} ${invalidClass}`}
                />
            );
        }
        return (
            <div
                onDoubleClick={() => setEditingField(fieldName)}
                onClick={() => setEditingField(fieldName)}
                className={`${className} ${invalidClass} cursor-pointer hover:bg-purple-50 rounded px-1 transition-colors group relative`}
                title="Click to edit"
                data-invalid={isInvalid ? 'true' : undefined}
            >
                {value || <span className="text-gray-400 italic text-sm">{placeholder}</span>}
                <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-40 text-purple-600" />
            </div>
        );
    };

    const validateInvoice = (): string[] => {
        const errors: string[] = [];
        const newInvalidFields = new Set<string>();

        if (!invoice.seller.name.trim()) {
            errors.push(t('quickAccess.validation.sellerNameRequired'));
            newInvalidFields.add('seller.name');
        }
        if (!invoice.buyer.name.trim()) {
            errors.push(t('quickAccess.validation.buyerNameRequired'));
            newInvalidFields.add('buyer.name');
        }
        if (invoice.lines.length === 0) {
            errors.push(t('quickAccess.validation.atLeastOneItem'));
        } else {
            invoice.lines.forEach((line) => {
                if (!line.description.trim()) {
                    errors.push(t('quickAccess.validation.itemDescriptionRequired'));
                    newInvalidFields.add(`line.${line.id}.description`);
                }
                if (line.unitPrice <= 0) {
                    errors.push(t('quickAccess.validation.itemPriceRequired'));
                    newInvalidFields.add(`line.${line.id}.unitPrice`);
                }
            });
        }

        setInvalidFields(newInvalidFields);
        return errors;
    };

    const triggerGatedAction = (action: GatedAction) => {
        const errors = validateInvoice();
        if (errors.length > 0) {
            // Show up to 2 specific errors + a fix-it note
            const displayed = errors.slice(0, 2);
            if (errors.length > 2) displayed.push(`+${errors.length - 2} more issues`);
            toast.error(t('quickAccess.validation.fixErrors'), {
                description: displayed.join(' · '),
                duration: 5000,
            });
            // Scroll to first invalid field
            setTimeout(() => {
                const firstInvalid = document.querySelector('[data-invalid="true"]');
                firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return;
        }
        setGatedAction(action);
    };

    const handleAuth = async (token: string, user: any, tenant: any) => {
        setIsSaving(true);
        const savingToastId = toast.loading(t('quickAccess.savingInvoice') || 'Saving your invoice…');
        try {
            login(token, user, tenant);
            // Save invoice to backend
            const { id, ...invoiceData } = calculated;
            let saveSucceeded = false;
            try {
                await invoiceService.create(invoiceData as Invoice);
                saveSucceeded = true;
            } catch (saveErr) {
                // Save failed – keep draft in localStorage so user can recover
                log: console.warn('[QuickAccess] Invoice save failed:', saveErr);
            }

            toast.dismiss(savingToastId);

            if (saveSucceeded) {
                localStorage.removeItem(DRAFT_KEY);
                toast.success(t('quickAccess.invoiceSaved'), {
                    description: t('quickAccess.invoiceSavedDesc'),
                    duration: 4000,
                });
            } else {
                toast.warning(t('quickAccess.invoiceSaveWarning') || 'Account created, but invoice save failed. Your draft is still stored locally.', {
                    duration: 7000,
                });
            }

            setTimeout(() => onComplete(), 500);
        } catch (err) {
            toast.dismiss(savingToastId);
            toast.error('Something went wrong. Please try again.');
            console.error('[QuickAccess] handleAuth error:', err);
            setTimeout(() => onComplete(), 500);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header with full navigation */}
            <header className="bg-white border-b px-4 py-2.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                {/* Logo */}
                <button onClick={() => onNavigate?.('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
                        <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">BillingTool</span>
                    <span className="ml-2 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 font-medium hidden sm:inline">
                        {t('quickAccess.title')}
                    </span>
                </button>

                {/* Nav items */}
                <nav className="flex items-center gap-1">
                    {/* Desktop nav links */}
                    {/* <div className="hidden md:flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-xs text-gray-600"
                            onClick={() => onNavigate?.('landing')}>
                            {t('landing.aboutUs')}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs text-gray-600"
                            onClick={() => onNavigate?.('landing')}>
                            {t('nav.products')}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs text-gray-600"
                            onClick={() => onNavigate?.('impressum')}>
                            {t('landing.footer.impressum')}
                        </Button>
                    </div> */}

                    {/* Auto-save note */}
                    <span className="text-xs text-gray-400 hidden lg:inline mx-2">
                        {t('quickAccess.autoSavedLocally')}
                    </span>

                    {/* Guide tour button */}
                    <Button variant="outline" size="sm" onClick={() => setStartTour(true)}
                        className="gap-1.5 text-xs text-purple-600 border-purple-200 hover:bg-purple-50">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('quickAccess.guide')}</span>
                    </Button>
                    <LanguageSwitcher variant="login" />
                    {/* Login */}
                    <Button variant="outline" size="sm" onClick={onLogin} className="gap-1.5 text-xs">
                        <LogIn className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('landing.login')}</span>
                    </Button>

                    {/* Language switcher */}

                </nav>
            </header>

            {/* Main content — invoice + right guide panel */}
            <div className="flex-1 flex gap-6 py-6 px-4 justify-center items-start">

                {/* Invoice column */}
                <div className="w-full max-w-4xl flex-shrink-0">
                    {/* Top action bar */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-semibold text-gray-800">{t('quickAccess.newInvoice')}</h1>
                            <p className="text-xs text-gray-500">{t('quickAccess.editInvoiceNoAccount')}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                id="tour-btn-download"
                                variant="outline"
                                size="sm"
                                onClick={() => triggerGatedAction('download')}
                                className="gap-1.5 text-xs"
                            >
                                <Download className="h-3.5 w-3.5" />
                                {t('quickAccess.pdf')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setPreviewTab('ubl');
                                    setIsPreviewOpen(true);
                                }}
                                className="gap-1.5 text-xs"
                            >
                                <Code className="h-3.5 w-3.5" />
                                {t('quickAccess.eInvoice')}
                            </Button>
                            <Button
                                id="tour-btn-send"
                                variant="outline"
                                size="sm"
                                onClick={() => triggerGatedAction('send')}
                                className="gap-1.5 text-xs"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {t('quickAccess.send')}
                            </Button>
                            <Button
                                id="tour-btn-save"
                                size="sm"
                                onClick={() => triggerGatedAction('save')}
                                className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 text-xs shadow-md"
                            >
                                <Save className="h-3.5 w-3.5" />
                                {t('quickAccess.saveDraft')}
                            </Button>
                        </div>
                    </div>

                    {/* Invoice card — PDF preview style */}
                    <div className="w-full max-w-4xl">
                        <Card className="p-0 overflow-hidden shadow-lg border border-gray-200">
                            <div className="bg-white p-10 md:p-14">
                                <div className="max-w-3xl mx-auto space-y-10">

                                    {/* ── Header ── */}
                                    <div className="flex justify-between items-start pb-8 border-b-2 border-purple-200">
                                        <div className="flex-1">
                                            <div id="tour-seller-name" className="text-4xl font-light text-purple-700 w-max">
                                                {renderField(
                                                    'seller.name',
                                                    invoice.seller.name,
                                                    (v) => handleFieldChange('seller.name', v),
                                                    '',
                                                    false,
                                                    t('quickAccess.yourCompanyName')
                                                )}
                                            </div>
                                            <div id="tour-invoice-number" className="mt-2 text-base text-gray-500 w-max">
                                                {renderField(
                                                    'invoiceNumber',
                                                    invoice.invoiceNumber,
                                                    (v) => handleFieldChange('invoiceNumber', v),
                                                    '',
                                                    false,
                                                    t('quickAccess.invoiceNumber')
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right space-y-2 shrink-0 ml-6">
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('quickAccess.issueDate')}</p>
                                            <div className="text-base">
                                                {renderField(
                                                    'issueDate',
                                                    invoice.issueDate,
                                                    (v) => handleFieldChange('issueDate', v)
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Quick Access panel (inline) ── */}
                                    <AnimatePresence>
                                        {gatedAction && (
                                            <InlineQuickAccess
                                                sellerName={invoice.seller.name || undefined}
                                                invoiceDraft={invoice as unknown as Record<string, unknown>}
                                                triggerReason={gatedAction}
                                                onAuth={handleAuth}
                                                onDismiss={() => setGatedAction(null)}
                                            />
                                        )}
                                    </AnimatePresence>

                                    {/* ── Parties ── */}
                                    <div className="grid grid-cols-2 gap-10">
                                        {/* Bill To */}
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('quickAccess.billTo')}</p>
                                            <div className="space-y-1 text-sm">
                                                <div id="tour-buyer-name" className="font-medium w-max">
                                                    {renderField(
                                                        'buyer.name',
                                                        invoice.buyer.name,
                                                        (v) => handleFieldChange('buyer.name', v),
                                                        'text-base',
                                                        false,
                                                        t('quickAccess.clientCompanyName'),
                                                        'buyer.name'
                                                    )}
                                                </div>
                                                {renderField(
                                                    'buyer.vatId',
                                                    invoice.buyer.vatId || '',
                                                    (v) => handleFieldChange('buyer.vatId', v),
                                                    'text-gray-500',
                                                    false,
                                                    t('quickAccess.clientVatId')
                                                )}
                                                {renderField(
                                                    'buyer.address.street',
                                                    invoice.buyer.address.street,
                                                    (v) => handleFieldChange('buyer.address.street', v),
                                                    'block text-gray-500',
                                                    false,
                                                    t('quickAccess.streetAddress')
                                                )}
                                                <div>
                                                    {renderField(
                                                        'buyer.address.postalCode',
                                                        invoice.buyer.address.postalCode,
                                                        (v) => handleFieldChange('buyer.address.postalCode', v),
                                                        'inline-block mr-1 text-gray-500',
                                                        false,
                                                        t('quickAccess.zip')
                                                    )}
                                                    {renderField(
                                                        'buyer.address.city',
                                                        invoice.buyer.address.city,
                                                        (v) => handleFieldChange('buyer.address.city', v),
                                                        'inline-block text-gray-500',
                                                        false,
                                                        t('quickAccess.city')
                                                    )}
                                                </div>
                                                {renderField(
                                                    'buyer.address.country',
                                                    invoice.buyer.address.country,
                                                    (v) => handleFieldChange('buyer.address.country', v),
                                                    'block text-gray-500',
                                                    false,
                                                    t('quickAccess.country')
                                                )}
                                            </div>
                                        </div>

                                        {/* From */}
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('quickAccess.from')}</p>
                                            <div className="space-y-1 text-sm">
                                                <div className="font-medium">
                                                    {renderField(
                                                        'seller.name2',
                                                        invoice.seller.name,
                                                        (v) => handleFieldChange('seller.name', v),
                                                        'text-base',
                                                        false,
                                                        t('quickAccess.yourCompanyName'),
                                                        'seller.name'
                                                    )}
                                                </div>
                                                {renderField(
                                                    'seller.vatId',
                                                    invoice.seller.vatId || '',
                                                    (v) => handleFieldChange('seller.vatId', v),
                                                    'text-gray-500',
                                                    false,
                                                    t('quickAccess.vatId')
                                                )}
                                                {renderField(
                                                    'seller.address.street',
                                                    invoice.seller.address.street,
                                                    (v) => handleFieldChange('seller.address.street', v),
                                                    'block text-gray-500',
                                                    false,
                                                    t('quickAccess.streetAddress')
                                                )}
                                                <div>
                                                    {renderField(
                                                        'seller.address.postalCode',
                                                        invoice.seller.address.postalCode,
                                                        (v) => handleFieldChange('seller.address.postalCode', v),
                                                        'inline-block mr-1 text-gray-500',
                                                        false,
                                                        t('quickAccess.zip')
                                                    )}
                                                    {renderField(
                                                        'seller.address.city',
                                                        invoice.seller.address.city,
                                                        (v) => handleFieldChange('seller.address.city', v),
                                                        'inline-block text-gray-500',
                                                        false,
                                                        t('quickAccess.city')
                                                    )}
                                                </div>
                                                {renderField(
                                                    'seller.address.country',
                                                    invoice.seller.address.country,
                                                    (v) => handleFieldChange('seller.address.country', v),
                                                    'block text-gray-500',
                                                    false,
                                                    t('quickAccess.country')
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Line Items ── */}
                                    <div id="tour-line-items">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{t('quickAccess.items')}</h3>
                                        <div className="border rounded-xl overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-purple-50 text-gray-500">
                                                    <tr>
                                                        <th className="text-center p-3 w-8">#</th>
                                                        <th className="text-left p-3">{t('quickAccess.description')}</th>
                                                        <th className="text-right p-3">{t('quickAccess.qty')}</th>
                                                        <th className="text-right p-3">{t('quickAccess.unitPrice')}</th>
                                                        <th className="text-right p-3">{t('quickAccess.tax')}</th>
                                                        <th className="text-right p-3">{t('quickAccess.amount')}</th>
                                                        <th className="w-8" />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {invoice.lines.map((line, index) => {
                                                        const lineTotal = line.quantity * line.unitPrice;
                                                        return (
                                                            <tr key={line.id} className="border-t hover:bg-gray-50">
                                                                <td className="p-3 text-center text-gray-400">{index + 1}</td>
                                                                <td className="p-3">
                                                                    {editingField === `line.${line.id}.description` ? (
                                                                        <Textarea
                                                                            value={line.description}
                                                                            onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                                                                            onBlur={handleBlur}
                                                                            autoFocus
                                                                            className="min-h-[48px] text-sm"
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            onClick={() => setEditingField(`line.${line.id}.description`)}
                                                                            data-invalid={invalidFields.has(`line.${line.id}.description`) ? 'true' : undefined}
                                                                            className={`cursor-pointer hover:bg-purple-50 rounded px-1 min-h-[32px] flex items-center group relative ${invalidFields.has(`line.${line.id}.description`) ? 'ring-2 ring-red-400 bg-red-50' : ''
                                                                                }`}
                                                                        >
                                                                            {line.description || <span className="text-gray-400 italic">{t('quickAccess.description')}</span>}
                                                                            <Edit2 className="h-3 w-3 absolute right-1 top-1 opacity-0 group-hover:opacity-40 text-purple-600" />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    {editingField === `line.${line.id}.quantity` ? (
                                                                        <Input
                                                                            type="number"
                                                                            value={line.quantity}
                                                                            onChange={(e) => handleLineChange(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                                            onBlur={handleBlur}
                                                                            autoFocus
                                                                            className="text-right w-20"
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            onClick={() => setEditingField(`line.${line.id}.quantity`)}
                                                                            className="cursor-pointer hover:bg-purple-50 rounded px-1 text-right group relative"
                                                                        >
                                                                            {line.quantity}
                                                                            <Edit2 className="h-3 w-3 absolute right-0 top-0.5 opacity-0 group-hover:opacity-40 text-purple-600" />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    {editingField === `line.${line.id}.unitPrice` ? (
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={line.unitPrice}
                                                                            onChange={(e) => handleLineChange(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                            onBlur={handleBlur}
                                                                            autoFocus
                                                                            className="text-right w-28"
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            onClick={() => setEditingField(`line.${line.id}.unitPrice`)}
                                                                            data-invalid={invalidFields.has(`line.${line.id}.unitPrice`) ? 'true' : undefined}
                                                                            className={`cursor-pointer hover:bg-purple-50 rounded px-1 text-right group relative ${invalidFields.has(`line.${line.id}.unitPrice`) ? 'ring-2 ring-red-400 bg-red-50' : ''
                                                                                }`}
                                                                        >
                                                                            {formatCurrency(line.unitPrice, invoice.currency)}
                                                                            <Edit2 className="h-3 w-3 absolute right-0 top-0.5 opacity-0 group-hover:opacity-40 text-purple-600" />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    {editingField === `line.${line.id}.taxPercent` ? (
                                                                        <Input
                                                                            type="number"
                                                                            step="1"
                                                                            min="0"
                                                                            max="100"
                                                                            value={line.taxPercent}
                                                                            onChange={(e) => handleLineChange(line.id, 'taxPercent', parseFloat(e.target.value) || 0)}
                                                                            onBlur={handleBlur}
                                                                            autoFocus
                                                                            className="text-right w-20"
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            onClick={() => setEditingField(`line.${line.id}.taxPercent`)}
                                                                            className="cursor-pointer hover:bg-purple-50 rounded px-1 text-right text-gray-500 group relative"
                                                                            title="Click to edit tax %"
                                                                        >
                                                                            {line.taxPercent}%
                                                                            <Edit2 className="h-3 w-3 absolute right-0 top-0.5 opacity-0 group-hover:opacity-40 text-purple-600" />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right font-medium">
                                                                    {formatCurrency(lineTotal, invoice.currency)}
                                                                </td>
                                                                <td className="p-3">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleRemoveLine(line.id)}
                                                                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddLine}
                                            className="mt-3 gap-1.5 text-xs border-dashed"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            {t('quickAccess.addLineItem')}
                                        </Button>
                                    </div>

                                    {/* ── Totals ── */}
                                    <div className="flex justify-between items-start mt-8">
                                        {/* Fake Giro Code */}
                                        <div id="tour-giro" className="w-1/3 rounded-xl p-4 bg-gray-50/50 border border-gray-100 flex items-start gap-4 mt-2">
                                            <div className="relative">
                                                <QrCode className="h-28 w-28 text-gray-300 blur-[1px]" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Lock className="h-9 w-9 text-purple-500 bg-white/90 rounded-full p-[3px] shadow-sm" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-700">{t('quickAccess.giroTitle')}</p>
                                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                    {t('quickAccess.giroNote')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Real Totals */}
                                        <div className="flex justify-end">
                                            <div className="w-72 space-y-2 text-sm">
                                                <div className="flex justify-between text-gray-500">
                                                    <span>{t('quickAccess.subtotal')}</span>
                                                    <span>{formatCurrency(calculated.lineExtensionAmount, invoice.currency)}</span>
                                                </div>
                                                {calculated.taxTotals.map((tax, i) => (
                                                    <div key={i} className="flex justify-between text-gray-500">
                                                        <span>{t('quickAccess.vat')} ({tax.taxPercent}%)</span>
                                                        <span>{formatCurrency(tax.taxAmount, invoice.currency)}</span>
                                                    </div>
                                                ))}
                                                <div className="border-t-2 border-purple-200 pt-3 flex justify-between text-lg font-semibold">
                                                    <span>{t('quickAccess.total')}</span>
                                                    <span className="text-purple-700">
                                                        {formatCurrency(calculated.payableAmount, invoice.currency)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Bottom CTA ── */}
                                    <div id="tour-actions" className="flex flex-col items-center gap-3 pt-10 border-t mt-10">
                                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                            <Button
                                                size="lg"
                                                onClick={() => triggerGatedAction('save')}
                                                disabled={isSaving}
                                                className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white min-w-[220px] shadow-xl hover:shadow-purple-300 transition-shadow text-base"
                                            >
                                                <Save className="h-5 w-5 mr-2" />
                                                {isSaving ? t('quickAccess.saving') : t('quickAccess.saveInvoice')}
                                            </Button>
                                        </motion.div>
                                        <p className="text-xs text-gray-400">
                                            {t('quickAccess.freeNote')}
                                        </p>
                                    </div>

                                </div>
                            </div>
                        </Card>
                    </div>

                    <PreviewModal
                        invoice={calculated as Invoice}
                        open={isPreviewOpen}
                        onOpenChange={setIsPreviewOpen}
                        defaultTab={previewTab}
                        hideTabs={previewTab === 'ubl'}
                        onCopyUBL={() => {
                            setIsPreviewOpen(false);
                            triggerGatedAction('export');
                        }}
                        onDownloadUBL={() => {
                            setIsPreviewOpen(false);
                            triggerGatedAction('download');
                        }}
                    />

                    {/* Bottom note */}
                    <p className="text-xs text-gray-400 mt-6 text-center max-w-lg">
                        {t('quickAccess.bottomNote')}
                    </p>
                    <QuickAccessTour forceShow={startTour} onClose={() => setStartTour(false)} />
                </div>{/* end invoice column */}

                {/* ── Right Guide Panel ── */}
                <div className="hidden xl:flex flex-col gap-4 w-72 flex-shrink-0 sticky top-24">
                    <div className="bg-white rounded-2xl border border-purple-100 shadow-md overflow-hidden">
                        {/* Panel header */}
                        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-white/90" />
                            <span className="text-sm font-semibold text-white">{t('quickAccess.guidePanel.title')}</span>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {[
                                {
                                    id: 'seller',
                                    icon: '🏢',
                                    title: t('quickAccess.guidePanel.seller.title'),
                                    desc: t('quickAccess.guidePanel.seller.desc'),
                                    active: !!editingField?.startsWith('seller'),
                                },
                                {
                                    id: 'buyer',
                                    icon: '👤',
                                    title: t('quickAccess.guidePanel.buyer.title'),
                                    desc: t('quickAccess.guidePanel.buyer.desc'),
                                    active: !!editingField?.startsWith('buyer'),
                                },
                                {
                                    id: 'lines',
                                    icon: '📋',
                                    title: t('quickAccess.guidePanel.lines.title'),
                                    desc: t('quickAccess.guidePanel.lines.desc'),
                                    active: false,
                                },
                                {
                                    id: 'totals',
                                    icon: '🧾',
                                    title: t('quickAccess.guidePanel.totals.title'),
                                    desc: t('quickAccess.guidePanel.totals.desc'),
                                    active: false,
                                },
                                {
                                    id: 'giro',
                                    icon: '📲',
                                    title: t('quickAccess.guidePanel.giro.title'),
                                    desc: t('quickAccess.guidePanel.giro.desc'),
                                    active: false,
                                },
                            ].map((step) => (
                                <div
                                    key={step.id}
                                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${step.active ? 'bg-purple-50 border-l-2 border-purple-500' : 'border-l-2 border-transparent'
                                        }`}
                                >
                                    <span className="text-xl leading-none mt-0.5 flex-shrink-0">{step.icon}</span>
                                    <div>
                                        <p className={`text-xs font-semibold mb-0.5 ${step.active ? 'text-purple-700' : 'text-gray-700'
                                            }`}>{step.title}</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                                    </div>
                                    {step.active && <ChevronRight className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5 ml-auto" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick tip card */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                        <span className="text-base">💡</span>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-semibold">{t('quickAccess.guidePanel.tipLabel')}</span>{' '}
                            {t('quickAccess.guidePanel.tipText')}
                        </p>
                    </div>

                    {/* Save CTA */}
                    <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-purple-100 rounded-xl px-4 py-4 text-center">
                        <CheckCircle2 className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-700 mb-1">{t('quickAccess.guidePanel.ctaTitle')}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{t('quickAccess.guidePanel.ctaDesc')}</p>
                        <button
                            onClick={() => triggerGatedAction('save')}
                            className="mt-3 w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 transition-all"
                        >
                            {t('quickAccess.guidePanel.ctaButton')}
                        </button>
                    </div>
                </div>{/* end guide panel */}

            </div>{/* end flex-1 row */}
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}

