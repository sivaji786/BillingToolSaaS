import { useState, FormEvent, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { FileText, Mail, Lock, ArrowLeft, Info, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';
import { authService } from '../../services/api';

const SSO_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  github: 'GitHub',
  saml: 'SSO',
  oidc: 'SSO',
};

function SsoProviderIcon({ provider }: { provider: string }) {
  if (provider === 'google') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    );
  }
  if (provider === 'microsoft') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
        <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
        <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
        <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
      </svg>
    );
  }
  if (provider === 'github') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }
  if (provider === 'saml' || provider === 'oidc') {
    return <Shield className="h-4 w-4 text-[#2a8fbd]" />;
  }
  return null;
}

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  onSignup?: () => void;
  onGoHome?: () => void;
}

export function Login({ onLogin, onSignup, onGoHome }: LoginProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPendingAction, setHasPendingAction] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<string[]>([]);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [ssoRequiredProviders, setSsoRequiredProviders] = useState<string[]>([]);

  useEffect(() => {
    // Pre-fill email if redirected from Quick Access
    const prefillEmail = localStorage.getItem('qa_login_email');
    if (prefillEmail) {
      setEmail(prefillEmail);
      localStorage.removeItem('qa_login_email');
    }
    const pending = sessionStorage.getItem('qa_pending_action');
    setHasPendingAction(!!pending);

    authService.getSsoProviders().then(setSsoProviders).catch(() => {});
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (email && password) {
      try {
        await onLogin(email, password);
      } catch (err: any) {
        const data = err?.response?.data;
        if (data?.error === 'sso_required' && Array.isArray(data?.providers)) {
          setSsoRequiredProviders(data.providers);
        }
      }
      setIsLoading(false);
    } else {
      toast.error(t('login.loginFailed'), {
        description: t('login.loginFailedDesc'),
      });
      setIsLoading(false);
    }
  };

  const handleSsoLogin = (provider: string) => {
    setSsoLoading(provider);
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/api\/?$/, '');
    const parts = window.location.hostname.split('.');
    const subdomain = parts.length >= 3 ? parts[0] : '';

    if (provider === 'saml') {
      window.location.href = `${base}/auth/saml/login${subdomain ? `?tenant=${subdomain}` : ''}`;
    } else if (provider === 'oidc') {
      window.location.href = `${base}/auth/oidc/redirect${subdomain ? `?tenant=${subdomain}` : ''}`;
    } else {
      // OAuth providers: navigate directly — backend sets session cookie + 302s to IdP
      window.location.href = `${base}/auth/sso/${provider}/redirect`;
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email first.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      if (response.test_url) {
      }
      toast.success(response.message || 'Reset link sent if the account exists.');
      setIsForgotPasswordMode(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f6ff] via-[#dbe8f7] to-[#f0f6ff]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.1),transparent_50%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#dbe8f7] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-[#dbe8f7] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-[#dbe8f7] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Language Switcher */}
          {/* Language Switcher and Wiki Link */}
          <div className="flex justify-between gap-2 items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#2a8fbd] hover:text-[#1e3a5f] hover:bg-[#f0f6ff]"
              onClick={onGoHome}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('login.backToHome')}
            </Button>
            <LanguageSwitcher variant="login" />
          </div>

          {/* Logo and Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] shadow-lg shadow-[rgba(30,58,95,0.25)] mb-6">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] bg-clip-text text-transparent">
              {t('appName')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-2 shadow-xl backdrop-blur-sm bg-white/80">
            {/* Card Header + optional pending action banner */}
            {hasPendingAction && (
              <div className="mx-6 mt-4 mb-0 flex items-start gap-2 rounded-lg border border-[rgba(30,58,95,0.15)] bg-[#f0f6ff] px-3 py-2 text-body text-[#1e3a5f]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2a8fbd]" />
                <span>{t('login.pendingActionBanner') || 'Account found! Log in below to continue with your invoice.'}</span>
              </div>
            )}
            {isForgotPasswordMode ? (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle>Reset Password</CardTitle>
                  <CardDescription>
                    Enter your email to receive a password reset link.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('login.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-white"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] hover:from-[#e07530] hover:via-[#f08a3c] hover:to-[#e07530] text-white shadow-lg shadow-[rgba(30,58,95,0.15)]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordMode(false)}
                        className="text-body font-medium text-[#2a8fbd] hover:text-[#2a8fbd]"
                      >
                        Back to login
                      </button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="space-y-1">
                  <CardTitle>{t('login.title')}</CardTitle>
                  <CardDescription>
                    {t('login.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('login.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@medianet-home.de"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-white"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('login.password')}</Label>
                        <button
                          type="button"
                          onClick={() => setIsForgotPasswordMode(true)}
                          className="text-micro font-medium text-[#2a8fbd] hover:text-[#2a8fbd]"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 bg-white"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] hover:from-[#e07530] hover:via-[#f08a3c] hover:to-[#e07530] text-white shadow-lg shadow-[rgba(30,58,95,0.15)]"
                      disabled={isLoading}
                    >
                      {isLoading ? t('login.loggingIn') : t('login.signIn')}
                    </Button>

                    {/* SSO-required banner */}
                    {ssoRequiredProviders.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body text-amber-800">
                        {t('login.ssoRequired') || 'This account requires SSO login. Please use one of the options below.'}
                      </div>
                    )}

                    {/* Social login buttons */}
                    {(ssoProviders.length > 0 || ssoRequiredProviders.length > 0) && (
                      <div className="space-y-2">
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                          </div>
                          <div className="relative flex justify-center text-micro uppercase">
                            <span className="bg-white px-2 text-muted-foreground">
                              {t('login.orContinueWith') || 'or continue with'}
                            </span>
                          </div>
                        </div>
                        {(ssoRequiredProviders.length > 0 ? ssoRequiredProviders : ssoProviders).map((provider) => (
                          <Button
                            key={provider}
                            type="button"
                            variant="outline"
                            className="w-full flex items-center gap-2 border-slate-200 hover:bg-slate-50"
                            disabled={ssoLoading !== null}
                            onClick={() => handleSsoLogin(provider)}
                          >
                            {ssoLoading === provider ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SsoProviderIcon provider={provider} />
                            )}
                            {ssoLoading === provider
                              ? (t('login.redirecting') || 'Redirecting…')
                              : `${t('login.continueWith') || 'Continue with'} ${SSO_PROVIDER_LABELS[provider] ?? provider}`}
                          </Button>
                        ))}
                      </div>
                    )}
                  </form>
                </CardContent>
              </>
            )}
          </Card>

          {/* Footer */}
          <div className="text-center text-body text-muted-foreground">
            <p>
              {t('login.footer1')}
            </p>
            <p>
              {t('login.footer2')}
            </p>
            {onSignup && (
              <div className="mt-6 pt-6 border-t border-[rgba(30,58,95,0.10)]">
                <p className="text-muted-foreground">
                  {t('login.noAccount')}{' '}
                  <button
                    onClick={onSignup}
                    className="text-[#2a8fbd] font-medium hover:text-[#1e3a5f] transition-colors"
                  >
                    {t('login.signup')}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
          animation-delay: 4s;
        }
      `}</style>
      <TicketingWidget apiKey={getTicketingApiKey()} />
    </div >
  );
}
