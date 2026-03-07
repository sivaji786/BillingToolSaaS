import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, KeyRound, Loader2, CheckCircle2, X, Zap, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { getApiBaseUrl } from '../../utils/config';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuickAccessUser {
    id: string;
    email: string;
    name?: string;
}

interface QuickAccessTenant {
    id: string;
    name?: string;
}

interface InlineQuickAccessProps {
    sellerName?: string;
    invoiceDraft?: Record<string, unknown>;
    onAuth: (token: string, user: QuickAccessUser, tenant: QuickAccessTenant) => void;
    onDismiss?: () => void;
    triggerReason?: 'save' | 'download' | 'send' | 'export';
}

type Step = 'email' | 'otp' | 'password' | 'success';

export function InlineQuickAccess({
    sellerName,
    invoiceDraft,
    onAuth,
    onDismiss,
    triggerReason = 'save',
}: InlineQuickAccessProps) {
    const { t } = useLanguage();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [sessionToken, setSessionToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [authToken, setAuthToken] = useState('');
    const [authUser, setAuthUser] = useState<QuickAccessUser | null>(null);
    const [authTenant, setAuthTenant] = useState<QuickAccessTenant | null>(null);
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const reasonLabels: Record<string, string> = {
        save: t('inlineQuickAccess.reasons.save'),
        download: t('inlineQuickAccess.reasons.download'),
        send: t('inlineQuickAccess.reasons.send'),
        export: t('inlineQuickAccess.reasons.export'),
    };

    const reasonLabel = reasonLabels[triggerReason] ?? 'continue';

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error(t('inlineQuickAccess.toast.invalidEmail'));
            return;
        }

        setIsLoading(true);
        try {
            const apiBase = getApiBaseUrl();

            // Step 1: Check if email already has an account
            let emailExists = false;
            try {
                const checkRes = await fetch(`${apiBase}/auth/check-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    emailExists = checkData.exists === true;
                }
            } catch {
                // If check fails, continue with OTP flow (safe fallback)
                emailExists = false;
            }

            if (emailExists) {
                // Existing user → store pending action, redirect to login
                localStorage.setItem('qa_login_email', email);
                if (triggerReason) {
                    localStorage.setItem('qa_pending_action', JSON.stringify({
                        action: triggerReason,
                        draft: invoiceDraft ?? null,
                    }));
                }
                toast.info(t('inlineQuickAccess.toast.existingAccount') || 'Account found! Please log in to continue.', {
                    duration: 4000,
                });
                // Small delay to show toast, then navigate to login
                setTimeout(() => {
                    window.location.hash = 'login';
                    onDismiss?.();
                }, 1200);
                return;
            }

            // Step 2: New user → send OTP
            const res = await fetch(`${apiBase}/auth/quick-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, invoice_draft: invoiceDraft ?? null }),
            });

            if (!res.ok) throw new Error('Failed to send verification code');

            const data = await res.json();
            setSessionToken(data.session_token || '');
            setStep('otp');
            toast.success(t('inlineQuickAccess.toast.checkEmail'), {
                description: t('inlineQuickAccess.toast.codeSent').replace('{email}', email),
            });
        } catch {
            // Fallback: simulate for dev/demo
            setSessionToken(`demo_session_${Date.now()}`);
            setStep('otp');
            toast.info(t('inlineQuickAccess.toast.demoMode'), {
                description: t('inlineQuickAccess.toast.demoNoEmail'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length < 4) {
            toast.error(t('inlineQuickAccess.toast.enterFullCode'));
            return;
        }

        setIsLoading(true);
        try {
            const apiBase = getApiBaseUrl();
            const res = await fetch(`${apiBase}/auth/quick-access/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_token: sessionToken, otp }),
            });

            if (!res.ok) throw new Error('Invalid code');

            const data = await res.json();
            const newUser = data.is_new_user === true;

            setAuthToken(data.token);
            setAuthUser(data.user);
            setAuthTenant(data.tenant || { id: '' });
            // newUser flag drives which step to show next

            if (newUser) {
                // New user: offer password setup before completing
                setStep('password');
            } else {
                // Returning user: skip straight to success
                setStep('success');
                setTimeout(() => {
                    onAuth(data.token, data.user, data.tenant || { id: '' });
                }, 900);
            }
        } catch {
            // Demo fallback: any code works
            if (sessionToken.startsWith('demo_session_')) {
                const demoUser: QuickAccessUser = {
                    id: `demo_${Date.now()}`,
                    email,
                    name: sellerName || email.split('@')[0],
                };
                setAuthToken(`demo_token_${Date.now()}`);
                setAuthUser(demoUser);
                setAuthTenant({ id: 'demo_tenant', name: sellerName });
                // new user in demo mode — show password step
                setStep('password');
            } else {
                toast.error(t('inlineQuickAccess.toast.invalidCode'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            toast.error(t('inlineQuickAccess.toast.passwordTooShort') || 'Password must be at least 8 characters');
            return;
        }
        if (password !== passwordConfirm) {
            toast.error(t('inlineQuickAccess.toast.passwordMismatch') || 'Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const apiBase = getApiBaseUrl();
            const res = await fetch(`${apiBase}/profile/set-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ password, password_confirm: passwordConfirm }),
            });

            if (!res.ok) throw new Error('Failed to set password');
            toast.success(t('inlineQuickAccess.toast.passwordSet') || 'Password set successfully!');
        } catch {
            toast.warning(t('inlineQuickAccess.toast.passwordSetFailed') || 'Could not set password — you can set it later in your profile.');
        } finally {
            setIsLoading(false);
            completeAuth();
        }
    };

    const completeAuth = () => {
        setStep('success');
        if (authToken && authUser && authTenant) {
            setTimeout(() => {
                onAuth(authToken, authUser, authTenant);
            }, 900);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -16, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -12, scaleY: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative my-6 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 shadow-lg overflow-hidden"
                style={{ transformOrigin: 'top center' }}
            >
                {/* Decorative stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 via-purple-500 to-fuchsia-500 rounded-l-xl" />

                <div className="pl-6 pr-5 py-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-sm">
                                <Zap className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="font-semibold text-sm text-purple-900 tracking-tight">{t('inlineQuickAccess.title')}</span>
                        </div>
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="text-gray-400 hover:text-gray-600 transition-colors rounded-md p-0.5 hover:bg-gray-100"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Step: Email */}
                    {step === 'email' && (
                        <motion.div
                            key="email"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                        >
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                {t('inlineQuickAccess.emailPrompt').split('{reason}')[0]}
                                <span className="font-medium text-purple-700">{reasonLabel}</span>
                                {t('inlineQuickAccess.emailPrompt').split('{reason}')[1]}
                                {sellerName && (
                                    <>
                                        {' '}
                                        {t('inlineQuickAccess.companyDetailsNote').split('{sellerName}')[0]}
                                        <span className="font-medium text-purple-700">{sellerName}</span>
                                        {t('inlineQuickAccess.companyDetailsNote').split('{sellerName}')[1]}
                                    </>
                                )}
                            </p>
                            <form onSubmit={handleEmailSubmit} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('inlineQuickAccess.emailPlaceholder')}
                                        className="pl-9 border-purple-200 focus-visible:ring-purple-400 bg-white text-sm"
                                        autoFocus
                                        required
                                        id="qa-email"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-sm shrink-0"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('inlineQuickAccess.continue')}
                                </Button>
                            </form>
                            <p className="text-xs text-gray-400 mt-2">
                                {t('inlineQuickAccess.noPasswordNote')}{' '}
                                <span className="text-purple-500 cursor-pointer hover:text-purple-700 font-medium">
                                    {t('inlineQuickAccess.alreadyHaveAccount')}
                                </span>
                            </p>
                        </motion.div>
                    )}

                    {/* Step: OTP */}
                    {step === 'otp' && (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                        >
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                {t('inlineQuickAccess.otpPrompt').split('{email}')[0]}
                                <span className="font-medium text-purple-700">{email}</span>
                                {t('inlineQuickAccess.otpPrompt').split('{email}')[1]}
                            </p>
                            <form onSubmit={handleOtpSubmit} className="flex gap-2">
                                <div className="relative flex-1">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        className="pl-9 border-purple-200 focus-visible:ring-purple-400 bg-white text-sm tracking-widest font-mono"
                                        autoFocus
                                        required
                                        id="qa-otp"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isLoading || otp.length < 4}
                                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-sm shrink-0"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('inlineQuickAccess.verify')}
                                </Button>
                            </form>
                            <button
                                onClick={() => setStep('email')}
                                className="text-xs text-gray-400 hover:text-purple-600 mt-2 transition-colors"
                            >
                                {t('inlineQuickAccess.changeEmail')}
                            </button>
                        </motion.div>
                    )}

                    {/* Step: Password Setup (new users only) */}
                    {step === 'password' && (
                        <motion.div
                            key="password"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </div>
                                <p className="text-sm font-semibold text-green-700">{t('inlineQuickAccess.accountCreated')}</p>
                            </div>
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                {t('inlineQuickAccess.passwordSetupPrompt') || 'Set a password for quick login next time. You can always skip and use email + OTP instead.'}
                            </p>
                            <form onSubmit={handlePasswordSubmit} className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t('inlineQuickAccess.passwordPlaceholder') || 'New password (min. 8 chars)'}
                                        className="pl-9 pr-9 border-purple-200 focus-visible:ring-purple-400 bg-white text-sm"
                                        autoFocus
                                        id="qa-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordConfirm}
                                        onChange={(e) => setPasswordConfirm(e.target.value)}
                                        placeholder={t('inlineQuickAccess.passwordConfirmPlaceholder') || 'Confirm password'}
                                        className="pl-9 border-purple-200 focus-visible:ring-purple-400 bg-white text-sm"
                                        id="qa-password-confirm"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-sm text-sm"
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (t('inlineQuickAccess.setPassword') || 'Set Password')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={completeAuth}
                                        disabled={isLoading}
                                        className="text-sm border-gray-200 text-gray-500 hover:text-gray-700"
                                    >
                                        {t('inlineQuickAccess.skipForNow') || 'Skip'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-3 py-2"
                        >
                            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm text-green-700">{t('inlineQuickAccess.accountCreated')}</p>
                                <p className="text-xs text-gray-500">{t('inlineQuickAccess.savingRedirecting')}</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
