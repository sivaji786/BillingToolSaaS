import { useState, FormEvent, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { FileText, Mail, Lock, ArrowLeft, Info, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';
import { authService } from '../../services/api';

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

  useEffect(() => {
    // Pre-fill email if redirected from Quick Access
    const prefillEmail = localStorage.getItem('qa_login_email');
    if (prefillEmail) {
      setEmail(prefillEmail);
      localStorage.removeItem('qa_login_email');
    }
    const pending = sessionStorage.getItem('qa_pending_action');
    setHasPendingAction(!!pending);
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (email && password) {
      await onLogin(email, password);
      setIsLoading(false);
    } else {
      toast.error(t('login.loginFailed'), {
        description: t('login.loginFailedDesc'),
      });
      setIsLoading(false);
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
        console.log('Test URL:', response.test_url); // Only for local testing
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
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.1),transparent_50%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-violet-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
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
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
              onClick={onGoHome}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('login.backToHome')}
            </Button>
            <LanguageSwitcher variant="login" />
          </div>

          {/* Logo and Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/50 mb-6">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
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
              <div className="mx-6 mt-4 mb-0 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
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
                      className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-purple-500/30"
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
                        className="text-sm font-medium text-violet-600 hover:text-violet-500"
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
                          className="text-xs font-medium text-violet-600 hover:text-violet-500"
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
                      className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-purple-500/30"
                      disabled={isLoading}
                    >
                      {isLoading ? t('login.loggingIn') : t('login.signIn')}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              {t('login.footer1')}
            </p>
            <p>
              {t('login.footer2')}
            </p>
            {onSignup && (
              <div className="mt-6 pt-6 border-t border-violet-100">
                <p className="text-muted-foreground">
                  {t('login.noAccount')}{' '}
                  <button
                    onClick={onSignup}
                    className="text-violet-600 font-semibold hover:text-violet-700 transition-colors"
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
