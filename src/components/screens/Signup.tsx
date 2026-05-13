import { useState, FormEvent, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { FileText, Mail, Lock, Building2, Globe, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { onboardingService, billingService } from '../../services/api';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey, getErrorMessage } from '../../utils/config';

interface SignupProps {
    initialPlan?: string;
}

export function Signup({ initialPlan }: SignupProps) {
    const { t, language } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        company_name: '',
        website: '',
        subdomain: '',
        email: '',
        password: '',
        confirmPassword: '',
        plan_id: initialPlan || '',
        phone: '',
        address: '',
        city: '',
        country: '',
        postal_code: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [isSubdomainManual, setIsSubdomainManual] = useState(false);

    useEffect(() => {
        loadData();
    }, [language]);

    const loadData = async () => {
        try {
            const [plansData, countriesData] = await Promise.all([
                billingService.getPlans(),
                onboardingService.getCountries(language)
            ]);
            setPlans(plansData);
            setCountries(countriesData);

            if (plansData.length > 0 && !formData.plan_id) {
                setFormData(prev => ({ ...prev, plan_id: String(plansData[0].id) }));
            }
            if (countriesData.length > 0 && !formData.country) {
                const defaultCountry = countriesData.find((c: any) => c.code === 'DE') || countriesData[0];
                setFormData(prev => ({ ...prev, country: defaultCountry.code }));
            }
        } catch (error) {
            console.error('Failed to load signup data', error);
        }
    };

    const generateSubdomain = (name: string, website: string) => {
        if (isSubdomainManual) return;

        let base = name;
        if (website) {
            try {
                const url = new URL(website.startsWith('http') ? website : `https://${website}`);
                base = url.hostname.split('.')[0];
            } catch (e) {
                // Ignore invalid URL
            }
        }

        const slug = base.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        if (slug.length >= 3) {
            setFormData(prev => ({ ...prev, subdomain: slug }));
            checkSubdomain(slug);
        }
    };

    useEffect(() => {
        generateSubdomain(formData.company_name, formData.website);
    }, [formData.company_name, formData.website]);

    const checkSubdomain = async (sub: string) => {
        if (sub.length < 3) return;
        setSubdomainStatus('checking');
        try {
            const result = await onboardingService.checkSubdomain(sub);
            setSubdomainStatus(result.available ? 'available' : 'taken');
        } catch (e) {
            setSubdomainStatus('idle');
        }
    };

    const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsSubdomainManual(true);
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setFormData({ ...formData, subdomain: val });
        if (val.length >= 3) {
            setTimeout(() => checkSubdomain(val), 500);
        } else {
            setSubdomainStatus('idle');
        }
    };

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error(t('signup.passwordsMismatch'));
            return;
        }
        if (subdomainStatus === 'taken') {
            toast.error(t('signup.subdomainTaken'));
            return;
        }

        setIsLoading(true);

        try {
            const response = await onboardingService.signup({
                company_name: formData.company_name,
                website: formData.website,
                subdomain: formData.subdomain,
                email: formData.email,
                password: formData.password,
                plan_id: formData.plan_id,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                country: formData.country,
                postal_code: formData.postal_code
            });

            if (response.success) {
                toast.success(t('signup.accountCreated'), {
                    description: t('signup.redirecting')
                });
                setTimeout(() => {
                    window.location.href = response.redirect_url;
                }, 1500);
            }
        } catch (error: unknown) {
            toast.error(t('signup.signupFailed'), {
                description: getErrorMessage(error, t('common.error'))
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.1),transparent_50%)]" />
                <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
                <div className="absolute top-40 right-20 w-72 h-72 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
            </div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="flex justify-end gap-2 items-center mb-6">
                        <LanguageSwitcher variant="login" />
                    </div>

                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/50 mb-6">
                            <FileText className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent text-3xl font-bold">
                            {t('signup.getStarted')}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            {t('signup.subtitle')}
                        </p>
                    </div>

                    <Card className="border-2 shadow-xl backdrop-blur-sm bg-white/80">
                        <CardHeader className="space-y-1">
                            <CardTitle>{t('signup.accountDetails')}</CardTitle>
                            <CardDescription>
                                {t('signup.companyInfo')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSignup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('signup.selectedPlan')}</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.plan_id}
                                        onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>{t('signup.selectPlan')}</option>
                                        {plans.map(plan => (
                                            <option key={plan.id} value={plan.id}>
                                                {plan.name} ({plan.currency === 'USD' ? '$' : '€'}{plan.price}{t('billing.perMonth')})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('signup.companyName')}</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('signup.companyPlaceholder')}
                                            className="pl-10"
                                            value={formData.company_name}
                                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('signup.website')}</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('signup.websitePlaceholder')}
                                            className="pl-10"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('signup.workspaceUrl')}</Label>
                                    <div className="relative flex items-center">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                        <Input
                                            placeholder={t('signup.workspacePlaceholder')}
                                            className={`pl-10 pr-24 ${subdomainStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : subdomainStatus === 'taken' ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            value={formData.subdomain}
                                            onChange={handleSubdomainChange}
                                            required
                                        />
                                        <span className="absolute right-3 text-sm text-muted-foreground opacity-70">.{t('signup.workspaceDomain')}</span>
                                    </div>
                                    {subdomainStatus === 'available' && <p className="text-xs text-green-600">✓ {t('signup.available')}</p>}
                                    {subdomainStatus === 'taken' && <p className="text-xs text-red-600">✗ {t('signup.taken')}</p>}
                                    {!isSubdomainManual && formData.subdomain && (
                                        <p className="text-xs text-muted-foreground italic">{t('signup.subdomainAutoGenerated')}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('signup.city')}</Label>
                                        <Input
                                            placeholder={t('signup.cityPlaceholder')}
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('signup.country')}</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            required
                                        >
                                            <option value="" disabled>{t('signup.selectCountry')}</option>
                                            {countries.map(c => (
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('signup.phone')}</Label>
                                    <Input
                                        type="tel"
                                        placeholder={t('signup.phonePlaceholder')}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('signup.address')}</Label>
                                        <Input
                                            placeholder={t('signup.addressPlaceholder')}
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('signup.postalCode')}</Label>
                                        <Input
                                            placeholder={t('signup.postalPlaceholder')}
                                            value={formData.postal_code}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('signup.email')}</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder={t('signup.emailPlaceholder')}
                                            className="pl-10"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('signup.password')}</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                className="pl-10 pr-10"
                                                minLength={8}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('signup.confirmPassword')}</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className="pl-10 pr-10"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg mt-4"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('signup.creatingAccount') : t('signup.getStarted')}
                                </Button>

                                <p className="text-center text-sm text-muted-foreground mt-4">
                                    {t('signup.alreadyHaveAccount')} <a href="#" className="text-purple-600 hover:underline" onClick={(e) => { e.preventDefault(); window.location.hash = 'login'; window.location.reload(); }}>{t('signup.login')}</a>
                                </p>

                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}
