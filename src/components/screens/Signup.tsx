import { useState, FormEvent, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    FileText, Mail, Lock, Building2, Globe, Eye, EyeOff,
    CheckCircle2, MailCheck, RefreshCw, ArrowLeft,
    ShieldCheck, Zap, BarChart3, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { onboardingService, billingService, publicCmsService } from '../../services/api';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey, getErrorMessage } from '../../utils/config';
import { useAuthStore } from '../../stores/authStore';
import { InlineEditableText } from '../cms/InlineEditableText';

interface SignupProps {
    initialPlan?: string;
}

type Stage = 'form' | 'verify';

const FEATURES = [
    { icon: Zap         },
    { icon: BarChart3   },
    { icon: Users       },
    { icon: ShieldCheck },
];

const CMS_SLUG = 'signup-panel';

const DEFAULT_CMS = {
    heading:    "The smarter way\nto manage invoices",
    subheading: 'Create, send and track professional invoices — all in one place.',
    feature_0:  'EN 16931 compliant invoices in seconds',
    feature_1:  'Real-time revenue & payment tracking',
    feature_2:  'Multi-user with role-based access control',
    feature_3:  'Bank-grade security & full audit trail',
    badge_text: 'No credit card required',
};

export function Signup({ initialPlan }: SignupProps) {
    const { t, language } = useLanguage();
    const login = useAuthStore(s => s.login);

    const [stage, setStage] = useState<Stage>('form');
    const [isLoading, setIsLoading]     = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [plans, setPlans]             = useState<any[]>([]);
    const [pendingEmail, setPendingEmail]           = useState('');
    const [verificationCode, setVerificationCode]   = useState('');
    const [resendCooldown, setResendCooldown]       = useState(0);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [formData, setFormData] = useState({
        company_name:  '',
        workspace_url: '',
        email:         '',
        password:      '',
        plan_id:       initialPlan || '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [subdomainStatus, setSubdomainStatus] =
        useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [isWorkspaceManual, setIsWorkspaceManual] = useState(false);

    const [cmsContent, setCmsContent] = useState<typeof DEFAULT_CMS>(DEFAULT_CMS);

    useEffect(() => {
        publicCmsService.getPage(CMS_SLUG, language)
            .then(res => {
                if (res.success && res.data?.content_structured) {
                    setCmsContent({ ...DEFAULT_CMS, ...res.data.content_structured });
                }
            })
            .catch(() => { /* fallback to defaults */ });
    }, [language]);

    // Keep hash in sync so refresh stays on signup
    useEffect(() => {
        if (window.location.hash.replace(/^#/, '') !== 'signup') {
            window.location.hash = 'signup';
        }
    }, []);

    useEffect(() => { loadPlans(); }, [language]);

    const loadPlans = async () => {
        try {
            const data = await billingService.getPlans();
            setPlans(data);
            if (data.length > 0 && !formData.plan_id) {
                setFormData(prev => ({ ...prev, plan_id: String(data[0].id) }));
            }
        } catch (e) { console.error('Failed to load plans', e); }
    };

    // Auto-generate workspace slug from company name
    useEffect(() => {
        if (isWorkspaceManual) return;
        const slug = formData.company_name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (slug.length >= 3) {
            setFormData(prev => ({ ...prev, workspace_url: slug }));
            checkSubdomain(slug);
        } else {
            setFormData(prev => ({ ...prev, workspace_url: '' }));
            setSubdomainStatus('idle');
        }
    }, [formData.company_name]);

    const checkSubdomain = async (sub: string) => {
        if (sub.length < 3) return;
        setSubdomainStatus('checking');
        try {
            const r = await onboardingService.checkSubdomain(sub);
            setSubdomainStatus(r.available ? 'available' : 'taken');
        } catch { setSubdomainStatus('idle'); }
    };

    const handleWorkspaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsWorkspaceManual(true);
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setFormData(prev => ({ ...prev, workspace_url: val }));
        if (val.length >= 3) setTimeout(() => checkSubdomain(val), 400);
        else setSubdomainStatus('idle');
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await onboardingService.signup({
                company_name:  formData.company_name,
                subdomain:     formData.workspace_url,
                email:         formData.email,
                password:      formData.password,
                plan_id:       formData.plan_id,
                phone:         '',
                city:          '',
                country:       'DE',
            });
            if (res.success && res.needs_verification) {
                setPendingEmail(formData.email);
                setStage('verify');
                startCooldown(60);
                toast.success(t('signup.accountCreated'), {
                    description: t('signup.checkInboxDesc'),
                });
            } else if (res.success && res.redirect_url) {
                window.location.href = res.redirect_url;
            }
        } catch (err: unknown) {
            toast.error(t('signup.signupFailed'), {
                description: getErrorMessage(err, t('common.error')),
            });
        } finally { setIsLoading(false); }
    };

    // ── Verify ─────────────────────────────────────────────────────────────────

    const handleVerify = async (e: FormEvent) => {
        e.preventDefault();
        if (verificationCode.length !== 6) return;
        setIsVerifying(true);
        try {
            const res = await onboardingService.verifyEmail({
                email: pendingEmail,
                code:  verificationCode,
            });
            if (res.success) {
                toast.success(t('signup.emailVerified'), {
                    description: t('signup.redirectingDashboard'),
                });
                login(res.token, res.user, res.tenant || {});
                setTimeout(() => { window.location.href = res.redirect_url; }, 1200);
            }
        } catch (err: unknown) {
            toast.error(t('signup.invalidCode'), {
                description: getErrorMessage(err, t('common.error')),
            });
        } finally { setIsVerifying(false); }
    };

    const startCooldown = (s: number) => {
        setResendCooldown(s);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || isResending) return;
        setIsResending(true);
        try {
            await onboardingService.resendVerification({ email: pendingEmail });
            toast.success(t('signup.codeResent'));
            startCooldown(60);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, t('common.error')));
        } finally { setIsResending(false); }
    };

    const goHome = (e: React.MouseEvent) => {
        e.preventDefault();
        window.location.hash = 'landing';
    };

    const domain = t('signup.workspaceDomain');

    // ─────────────────────────────────────────────────────────────────────────
    // Shared two-panel shell
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen flex">

            {/* ── Left branding panel ─────────────────────────────────────── */}
            <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col bg-gradient-to-br from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] relative overflow-hidden">

                {/* decorative blobs */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col h-full p-10">

                    {/* Logo + home link */}
                    <a href="#" onClick={goHome} className="flex items-center gap-2.5 group w-fit">
                        <div className="w-9 h-9 rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors flex items-center justify-center">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-white font-medium text-heading-2 tracking-tight">BillingTool</span>
                    </a>

                    {/* Hero copy — CMS-managed, live-editable by SA admins */}
                    <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-heading-1 font-medium text-white leading-snug whitespace-pre-line">
                                <InlineEditableText
                                    slug={CMS_SLUG}
                                    field="heading"
                                    lang={language}
                                    value={cmsContent.heading}
                                    multiline
                                    className="text-heading-1 font-medium text-white leading-snug whitespace-pre-line"
                                />
                            </h2>
                            <p className="mt-3 text-[rgba(255,255,255,0.8)] text-heading-2 leading-relaxed max-w-xs">
                                <InlineEditableText
                                    slug={CMS_SLUG}
                                    field="subheading"
                                    lang={language}
                                    value={cmsContent.subheading}
                                    multiline
                                    className="text-[rgba(255,255,255,0.8)] text-heading-2 leading-relaxed"
                                />
                            </p>
                        </div>

                        {/* Feature list */}
                        <ul className="space-y-3.5">
                            {FEATURES.map(({ icon: Icon }, i) => {
                                const fieldKey = `feature_${i}` as keyof typeof cmsContent;
                                return (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Icon className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <InlineEditableText
                                            slug={CMS_SLUG}
                                            field={fieldKey}
                                            lang={language}
                                            value={cmsContent[fieldKey]}
                                            className="text-white text-body leading-relaxed"
                                        />
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Trust badge */}
                        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            <InlineEditableText
                                slug={CMS_SLUG}
                                field="badge_text"
                                lang={language}
                                value={cmsContent.badge_text}
                                className="text-white text-micro font-medium"
                            />
                        </div>
                    </div>
                    </div>
                </div>
            </div>

            {/* ── Right panel ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-white overflow-y-auto">

                {/* Top nav */}
                <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-100">
                    {/* Mobile logo */}
                    <a href="#" onClick={goHome} className="flex items-center gap-2 lg:hidden group">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#3d5a80] flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">BillingTool</span>
                    </a>
                    {/* Home link (desktop) */}
                    <a
                        href="#"
                        onClick={goHome}
                        className="hidden lg:flex items-center gap-1.5 text-body text-gray-500 hover:text-gray-800 transition-colors group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        Back to home
                    </a>
                    <div className="ml-auto flex items-center gap-3">
                        <span className="hidden sm:block text-body text-gray-500">
                            {t('signup.alreadyHaveAccount')}
                        </span>
                        <a
                            href="#login"
                            onClick={e => { e.preventDefault(); window.location.hash = 'login'; }}
                            className="text-body font-medium text-[#2a8fbd] hover:text-[#1e3a5f] transition-colors"
                        >
                            {t('signup.login')}
                        </a>
                        <LanguageSwitcher variant="login" />
                    </div>
                </div>

                {/* Form area */}
                <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
                    <div className="w-full max-w-md">

                        {stage === 'form' ? (
                            <>
                                {/* Page heading */}
                                <div className="mb-8">
                                    <h1 className="text-heading-1 font-medium text-gray-900">{t('signup.getStarted')}</h1>
                                    <p className="text-body text-gray-500 mt-1">{t('signup.subtitle')}</p>
                                </div>

                                <form onSubmit={handleSignup} className="space-y-5">

                                    {/* Plan selection */}
                                    <div className="space-y-2">
                                        <Label className="text-body font-medium text-gray-700">
                                            {t('signup.selectedPlan')}
                                        </Label>
                                        <div className="space-y-2">
                                            {plans.map(plan => {
                                                const active = String(plan.id) === formData.plan_id;
                                                return (
                                                    <label
                                                        key={plan.id}
                                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                                                            active
                                                                ? 'border-[#f08a3c] bg-[#f0f6ff]'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                                active ? 'border-[#f08a3c]' : 'border-gray-300'
                                                            }`}>
                                                                {active && <div className="w-2 h-2 rounded-full bg-[#f0f6ff]0" />}
                                                            </div>
                                                            <div>
                                                                <span className="text-body font-medium text-gray-800">{plan.name}</span>
                                                                {plan.description && (
                                                                    <p className="text-micro text-gray-400 mt-0.5">{plan.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={`text-body font-medium whitespace-nowrap ml-3 ${active ? 'text-[#2a8fbd]' : 'text-gray-600'}`}>
                                                            {plan.currency === 'USD' ? '$' : '€'}{plan.price}
                                                            <span className="text-micro font-normal text-gray-400">{t('billing.perMonth')}</span>
                                                        </span>
                                                        <input
                                                            type="radio" name="plan" value={plan.id}
                                                            checked={active}
                                                            onChange={e => setFormData(prev => ({ ...prev, plan_id: e.target.value }))}
                                                            className="sr-only"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100" />

                                    {/* Company name */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="company_name" className="text-body font-medium text-gray-700">
                                            {t('signup.companyName')} <span className="text-red-400">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="company_name"
                                                placeholder={t('signup.companyPlaceholder')}
                                                className="pl-10 h-11 border-gray-200 focus-visible:ring-[#f08a3c]"
                                                value={formData.company_name}
                                                onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                                                required
                                            />
                                        </div>

                                        {/* Workspace URL inline preview */}
                                        {formData.company_name && (
                                            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-micro mt-1 transition-colors ${
                                                subdomainStatus === 'available' ? 'border-green-200 bg-green-50' :
                                                subdomainStatus === 'taken'     ? 'border-red-200 bg-red-50'   :
                                                                                   'border-gray-200 bg-gray-50'
                                            }`}>
                                                <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    aria-label={t('signup.workspaceUrl')}
                                                    className="flex-1 bg-transparent outline-none font-mono text-gray-700 min-w-0"
                                                    value={formData.workspace_url}
                                                    onChange={handleWorkspaceChange}
                                                    placeholder="your-workspace"
                                                />
                                                <span className="text-gray-400 flex-shrink-0">.{domain}</span>
                                                {subdomainStatus === 'available' && (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                )}
                                                {subdomainStatus === 'checking' && (
                                                    <RefreshCw className="h-3.5 w-3.5 text-gray-400 animate-spin flex-shrink-0" />
                                                )}
                                                {subdomainStatus === 'taken' && (
                                                    <span className="text-red-500 font-medium flex-shrink-0">✗</span>
                                                )}
                                            </div>
                                        )}
                                        {!isWorkspaceManual && formData.company_name && (
                                            <p className="text-micro text-gray-400 ml-1">{t('signup.workspaceOptional')}</p>
                                        )}
                                        {subdomainStatus === 'taken' && (
                                            <p className="text-micro text-red-500 ml-1">{t('signup.taken')} — {t('signup.tryAnother')}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-body font-medium text-gray-700">
                                            {t('signup.email')} <span className="text-red-400">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder={t('signup.emailPlaceholder')}
                                                className="pl-10 h-11 border-gray-200 focus-visible:ring-[#f08a3c]"
                                                value={formData.email}
                                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password" className="text-body font-medium text-gray-700">
                                            {t('signup.password')} <span className="text-red-400">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder={t('signup.passwordPlaceholder') || 'Min. 8 characters'}
                                                className="pl-10 pr-10 h-11 border-gray-200 focus-visible:ring-[#f08a3c]"
                                                minLength={8}
                                                value={formData.password}
                                                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {formData.password.length > 0 && (
                                            <PasswordStrength password={formData.password} />
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-gradient-to-r from-[#1e3a5f] to-[#3d5a80] hover:from-[#e07530] hover:to-[#e07530] text-white font-medium shadow-md shadow-[rgba(30,58,95,0.10)] mt-2"
                                        disabled={isLoading || subdomainStatus === 'taken'}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                {t('signup.creatingAccount')}
                                            </span>
                                        ) : t('signup.getStarted')}
                                    </Button>

                                    <p className="text-center text-micro text-gray-400">
                                        {t('signup.trialNote')}
                                    </p>
                                </form>
                            </>
                        ) : (

                            /* ── Email verification ─────────────────────────── */
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f0f6ff] mb-4">
                                        <MailCheck className="h-8 w-8 text-[#2a8fbd]" />
                                    </div>
                                    <h1 className="text-heading-1 font-medium text-gray-900">{t('signup.verifyEmailTitle')}</h1>
                                    <p className="text-body text-gray-500 mt-2 leading-relaxed">
                                        {t('signup.verifyEmailDesc')}{' '}
                                        <span className="font-medium text-gray-800 break-all">{pendingEmail}</span>
                                    </p>
                                </div>

                                <form onSubmit={handleVerify} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-body font-medium text-gray-700">
                                            {t('signup.verificationCode')}
                                        </Label>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            placeholder="000000"
                                            className="h-14 text-center text-heading-1 font-medium tracking-[0.6em] border-2 border-gray-200 focus-visible:ring-[#f08a3c]"
                                            value={verificationCode}
                                            onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-gradient-to-r from-[#1e3a5f] to-[#3d5a80] hover:from-[#e07530] hover:to-[#e07530] text-white font-medium shadow-md shadow-[rgba(30,58,95,0.10)]"
                                        disabled={isVerifying || verificationCode.length !== 6}
                                    >
                                        {isVerifying ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                {t('signup.verifying')}
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" />
                                                {t('signup.verifyButton')}
                                            </span>
                                        )}
                                    </Button>
                                </form>

                                <div className="text-center space-y-2">
                                    <p className="text-body text-gray-500">
                                        {t('signup.didntReceiveCode')}{' '}
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={resendCooldown > 0 || isResending}
                                            className="text-[#2a8fbd] hover:text-[#1e3a5f] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isResending
                                                ? t('signup.resending')
                                                : resendCooldown > 0
                                                ? `${t('signup.resendCode')} (${resendCooldown}s)`
                                                : t('signup.resendCode')}
                                        </button>
                                    </p>
                                    <p className="text-micro text-gray-400">{t('signup.verifyEmailNote')}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStage('form')}
                                    className="flex items-center gap-1.5 text-body text-gray-400 hover:text-gray-600 transition-colors mx-auto"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Back to registration
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33%       { transform: translate(20px, -30px) scale(1.05); }
                    66%       { transform: translate(-15px, 15px) scale(0.95); }
                }
            `}</style>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}

// ── Password strength bar ──────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
    const score = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;

    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const texts  = ['text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'];

    return (
        <div className="flex items-center gap-2 mt-1.5">
            <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-gray-200'}`}
                    />
                ))}
            </div>
            <span className={`text-micro font-medium ${texts[score - 1]}`}>{labels[score - 1]}</span>
        </div>
    );
}
