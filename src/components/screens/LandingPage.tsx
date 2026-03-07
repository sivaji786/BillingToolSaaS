import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Check, FileText, Globe, Shield, LayoutTemplate, Sparkles, ArrowRight } from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { billingService } from '../../services/api';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';

interface LandingPageProps {
    onLogin: () => void;
    onSignup: (planId?: string) => void;
    onTryNow: () => void;
    onNavigate: (screen: string) => void;
}

interface Plan {
    id: string;
    name: string;
    price: string;
    description: string;
    features: string[];
    highlight?: boolean;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" }
    }
};

const fadeInVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.8, ease: "easeInOut" }
    }
};

export function LandingPage({ onLogin, onSignup, onTryNow, onNavigate }: LandingPageProps) {
    const { t } = useLanguage();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await billingService.getPlans();
                // Transform API data to match UI format
                const transformedPlans = data.map((plan: any, index: number) => {
                    let parsedFeatures: string[] = [];
                    try {
                        let featuresData = plan.features;

                        // Try to parse if it's a JSON string
                        if (typeof featuresData === 'string' && (featuresData.startsWith('[') || featuresData.startsWith('{'))) {
                            try {
                                featuresData = JSON.parse(featuresData);
                            } catch (e) {
                                // Fallback to raw string handling
                            }
                        }

                        if (Array.isArray(featuresData)) {
                            parsedFeatures = featuresData.map((f: any) => {
                                if (typeof f === 'object' && f !== null) {
                                    return f.value ? `${f.name}: ${f.value}` : (f.name || JSON.stringify(f));
                                }
                                return String(f);
                            });
                        } else if (typeof featuresData === 'object' && featuresData !== null) {
                            // Handle object format {"users": 1, "support": "email"}
                            parsedFeatures = Object.entries(featuresData).map(([key, value]) => {
                                const humanKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                return `${humanKey}: ${value}`;
                            });
                        } else if (typeof plan.features === 'string' && plan.features) {
                            // Handle comma-separated string
                            parsedFeatures = plan.features.split(',').map((f: string) => f.trim());
                        }
                    } catch (e) {
                        console.error('Error parsing features:', e);
                        parsedFeatures = [];
                    }

                    return {
                        id: plan.id?.toString() || plan.slug || plan.name.toLowerCase(),
                        name: plan.name,
                        price: plan.price === 0 || plan.price === "0.00" ? '€0' : plan.price ? `€${plan.price}` : 'Custom',
                        description: plan.description || '',
                        features: parsedFeatures,
                        highlight: index === 1 // Highlight the second plan
                    };
                });
                setPlans(transformedPlans);
            } catch (error) {
                console.error('Failed to fetch plans:', error);
                // Fallback to default plans if API fails
                setPlans([
                    {
                        id: "free",
                        name: "Free",
                        price: "€0",
                        description: "Perfect for freelancers just starting out",
                        features: ["5 Invoices/month", "Basic Templates", "PDF Export", "Single User"],
                        highlight: false
                    },
                    {
                        id: "starter",
                        name: "Starter",
                        price: "€9",
                        description: "For growing small businesses",
                        features: ["50 Invoices/month", "Custom Branding", "Multi-currency", "3 Users", "Email Support"],
                        highlight: true
                    },
                    {
                        id: "pro",
                        name: "Pro",
                        price: "€29",
                        description: "For scaling teams and agencies",
                        features: ["Unlimited Invoices", "Advanced Analytics", "API Access", "10 Users", "Priority Support", "White Labeling"],
                        highlight: false
                    },
                    {
                        id: "enterprise",
                        name: "Enterprise",
                        price: "Custom",
                        description: "For large organizations",
                        features: ["Unlimited Everything", "SSO & SAML", "Dedicated Manager", "SLA", "Custom Integration"],
                        highlight: false
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, []);

    const features = [
        {
            icon: <FileText className="h-6 w-6 text-purple-600" />,
            title: t('landing.features.smartInvoicing.title'),
            description: t('landing.features.smartInvoicing.desc')
        },
        {
            icon: <LayoutTemplate className="h-6 w-6 text-pink-600" />,
            title: t('landing.features.customTemplates.title'),
            description: t('landing.features.customTemplates.desc')
        },
        {
            icon: <Globe className="h-6 w-6 text-blue-600" />,
            title: t('landing.features.multiLanguage.title'),
            description: t('landing.features.multiLanguage.desc')
        },
        {
            icon: <Shield className="h-6 w-6 text-green-600" />,
            title: t('landing.features.secureCompliant.title'),
            description: t('landing.features.secureCompliant.desc')
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
                            {t('appName') || 'BillingTool'}
                        </span>
                    </div>
                    <nav className="flex items-center gap-4">
                        <div className="hidden md:flex gap-4">
                            <Button variant="ghost" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
                                {t('landing.aboutUs')}
                            </Button>
                            <Button variant="ghost" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                                {t('nav.products')}
                            </Button>
                            {/* <Button variant="ghost" onClick={() => onNavigate('impressum')} className="text-muted-foreground">
                                {t('legal.footer.impressum')}
                            </Button> */}
                            <Button variant="ghost" onClick={onLogin}>
                                {t('landing.login')}
                            </Button>
                            <Button onClick={() => onSignup()}>
                                {t('landing.signup')}
                            </Button>
                        </div>
                        <LanguageSwitcher variant="login" />
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden py-20 md:py-32 lg:py-40">
                    <div
                        className="absolute inset-0 z-0"
                        style={{
                            backgroundImage: 'url(/images/landing_bg.png)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                    {/* Overlay removed — landing_bg shows at full opacity */}

                    <div className="container px-4 md:px-6 relative z-10">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={containerVariants}
                            className="flex flex-col items-center space-y-6 text-center"
                        >
                            <motion.div variants={itemVariants} className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-semibold border-purple-100 bg-purple-50/50 text-purple-700 backdrop-blur-sm shadow-sm transition-all hover:bg-purple-100/50">
                                <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-600" />
                                {t('landing.hero.badge')}
                            </motion.div>
                            <motion.h1 variants={itemVariants} className="text-5xl font-extrabold tracking-tight lg:text-6xl xl:text-7xl max-w-4xl text-slate-900 dark:text-white pb-2 leading-[1.1]">
                                {t('landing.hero.title')} <br className="hidden sm:inline" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">{t('landing.hero.titleAccent')}</span> {t('landing.hero.titleSuffix')}
                            </motion.h1>
                            <motion.p variants={itemVariants} className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                                {t('landing.hero.subtitle')}
                            </motion.p>
                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 min-w-[300px] justify-center pt-4">
                                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 h-12 px-8 text-lg shadow-xl shadow-purple-200 dark:shadow-none" onClick={() => onSignup()}>
                                    {t('landing.hero.getStarted')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                {onTryNow && (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-12 px-8 text-lg border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 text-purple-700 font-semibold gap-2 shadow-md"
                                        onClick={onTryNow}
                                        id="hero-try-now"
                                    >
                                        <FileText className="h-5 w-5" />
                                        {t('landing.hero.tryNow')}
                                    </Button>
                                )}
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900/50">
                    <div className="container px-4 md:px-6">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={containerVariants}
                            className="text-center mb-16"
                        >
                            <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{t('landing.features.tag')}</motion.h2>
                            <motion.p variants={itemVariants} className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400 mt-4">
                                {t('landing.features.subtitle')}
                            </motion.p>
                        </motion.div>
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={containerVariants}
                            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
                        >
                            {features.map((feature: { icon: React.ReactNode; title: string; description: string }, index: number) => (
                                <motion.div key={index} variants={itemVariants}>
                                    <Card className="h-full border-none shadow-lg bg-background/60 backdrop-blur hover:bg-background transition-colors hover:scale-[1.02] duration-300">
                                        <CardHeader>
                                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                                                {feature.icon}
                                            </div>
                                            <CardTitle className="text-xl">{feature.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground">{feature.description}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* About Us Section */}
                <section id="about" className="py-12 md:py-24 lg:py-32">
                    <div className="container px-4 md:px-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={containerVariants}
                            >
                                <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-6">
                                    {t('landing.aboutUs')}
                                </motion.h2>
                                <motion.div variants={itemVariants} className="space-y-4 text-gray-500 md:text-lg dark:text-gray-400">
                                    <p>
                                        {t('landing.about.desc1')}
                                    </p>
                                    <p>
                                        {t('landing.about.desc2')}
                                    </p>
                                    <div className="flex gap-4 pt-4">
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold text-purple-600">10k+</span>
                                            <span className="text-sm">{t('landing.about.activeUsers')}</span>
                                        </div>
                                        <div className="border-l pl-4 flex flex-col">
                                            <span className="text-2xl font-bold text-purple-600">500k+</span>
                                            <span className="text-sm">{t('landing.about.invoicesSent')}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="relative rounded-2xl overflow-hidden shadow-2xl"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-fuchsia-600/20 z-10" />
                                <img
                                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800"
                                    alt="About Our Team"
                                    className="w-full h-auto object-cover"
                                />
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-12 md:py-24 lg:py-32">
                    <div className="container px-4 md:px-6">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={containerVariants}
                            className="text-center mb-16"
                        >
                            <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{t('landing.pricing.tag')}</motion.h2>
                            <motion.p variants={itemVariants} className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400 mt-4">
                                {t('landing.pricing.subtitle')}
                            </motion.p>
                        </motion.div>
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={containerVariants}
                            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
                        >
                            {plans.map((plan: Plan) => (
                                <motion.div key={plan.id} variants={itemVariants}>
                                    <Card className={`flex flex-col h-full relative ${plan.highlight ? 'border-purple-600 shadow-xl scale-105 z-10' : 'border-slate-200'}`}>
                                        {plan.highlight && (
                                            <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shadow-md">
                                                    {t('landing.pricing.popular')}
                                                </span>
                                            </div>
                                        )}
                                        <CardHeader>
                                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                            <CardDescription>{plan.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <div className="mb-6">
                                                <span className="text-4xl font-bold">{plan.price}</span>
                                                {plan.price !== 'Custom' && <span className="text-muted-foreground">{t('billing.perMonth')}</span>}
                                            </div>
                                            <ul className="space-y-3 text-sm">
                                                {plan.features.map((feature: string, i: number) => (
                                                    <li key={i} className="flex items-center">
                                                        <Check className="mr-2 h-4 w-4 text-purple-600" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                        <CardFooter>
                                            <Button
                                                className={`w-full ${plan.highlight ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                                                variant={plan.highlight ? 'default' : 'outline'}
                                                onClick={() => onSignup(plan.id)}
                                            >
                                                {plan.price === 'Custom' ? t('landing.pricing.contactSales') : t('landing.hero.getStarted')}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t bg-slate-50 dark:bg-slate-950 py-12">
                <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <span className="text-lg font-bold text-foreground">BillingTool</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © 2026 BillingTool Inc. {t('landing.footer.rights')}
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => onNavigate('impressum')} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.impressum')}</button>
                        <button onClick={() => onNavigate('privacyPolicy')} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.privacy')}</button>
                        <button onClick={() => onNavigate('termsAndConditions')} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.terms')}</button>
                        <button onClick={() => onNavigate('cookiePolicy')} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.cookies')}</button>
                    </div>
                </div>
            </footer>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div >
    );
}
