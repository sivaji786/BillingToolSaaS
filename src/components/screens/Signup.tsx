import { useState, FormEvent } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { FileText, Mail, Lock, Building2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { onboardingService } from '../../services/api';

interface SignupProps {
    initialPlan?: string;
}

export function Signup({ initialPlan }: SignupProps) {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        subdomain: '',
        email: '',
        password: '',
        confirmPassword: '',
        plan_id: initialPlan || 'free'
    });
    const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

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
        // lowercase, alphanumeric and hyphen only
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setFormData({ ...formData, subdomain: val });
        if (val.length >= 3) {
            setTimeout(() => checkSubdomain(val), 500); // Debounce
        } else {
            setSubdomainStatus('idle');
        }
    };

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (subdomainStatus === 'taken') {
            toast.error('Subdomain is taken');
            return;
        }

        setIsLoading(true);

        try {
            const response = await onboardingService.signup({
                company_name: formData.company_name,
                subdomain: formData.subdomain,
                email: formData.email,
                password: formData.password,
                plan_id: formData.plan_id // Pass the selected plan
            });

            if (response.success) {
                toast.success('Account created!', {
                    description: 'Redirecting you to your new account...'
                });
                // Redirect to new subdomain URL
                setTimeout(() => {
                    window.location.href = response.redirect_url;
                }, 1500);
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Signup failed', {
                description: error.response?.data?.messages?.error || 'Please try again'
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated gradient background from Login.tsx */}
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
                            {formData.plan_id !== 'free' ? `Start ${formData.plan_id.charAt(0).toUpperCase() + formData.plan_id.slice(1)} Plan` : 'Start Free Trial'}
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            Create your account in seconds. No card required.
                        </p>
                    </div>

                    <Card className="border-2 shadow-xl backdrop-blur-sm bg-white/80">
                        <CardHeader className="space-y-1">
                            <CardTitle>Account Details</CardTitle>
                            <CardDescription>
                                Enter your company information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSignup} className="space-y-4">
                                {/* Plan Selection Display (Hidden input for logic, potential dropdown for user change) */}
                                <div className="space-y-2">
                                    <Label>Selected Plan</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.plan_id}
                                        onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                                    >
                                        <option value="free">Free (€0/mo)</option>
                                        <option value="starter">Starter (€9/mo)</option>
                                        <option value="pro">Pro (€29/mo)</option>
                                        <option value="enterprise">Enterprise (Custom)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Acme Corp"
                                            className="pl-10"
                                            value={formData.company_name}
                                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Workspace URL</Label>
                                    <div className="relative flex items-center">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                        <Input
                                            placeholder="acme"
                                            className={`pl-10 pr-24 ${subdomainStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : subdomainStatus === 'taken' ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            value={formData.subdomain}
                                            onChange={handleSubdomainChange}
                                            required
                                        />
                                        <span className="absolute right-3 text-sm text-muted-foreground opacity-70">.billingtool.com</span>
                                    </div>
                                    {subdomainStatus === 'available' && <p className="text-xs text-green-600">✓ Available</p>}
                                    {subdomainStatus === 'taken' && <p className="text-xs text-red-600">✗ Already taken</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder="you@company.com"
                                            className="pl-10"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="password"
                                                className="pl-10"
                                                minLength={8}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirm</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="password"
                                                className="pl-10"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white shadow-lg mt-4"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Creating Account...' : 'Get Started'}
                                </Button>

                                <p className="text-center text-sm text-muted-foreground mt-4">
                                    Already have an account? <a href="#" className="text-purple-600 hover:underline" onClick={(e) => { e.preventDefault(); window.location.hash = 'login'; window.location.reload(); }}>Log in</a>
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
        </div>
    );
}
