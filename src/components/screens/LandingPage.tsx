import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Check, FileText, Globe, Shield, LayoutTemplate, Sparkles, ArrowRight, Star, Plus, Minus, MessageSquare, Menu, X } from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { billingService, publicCmsService } from '../../services/api';
import { TicketingWidget } from '../TicketingWidget';
import { getTicketingApiKey } from '../../utils/config';
import { InlineEditableText } from '../cms/InlineEditableText';
import { InlineEditableRich } from '../cms/InlineEditableRich';
import { InlineImagePicker } from '../cms/InlineImagePicker';
import { useAdminStore } from '../../stores/adminStore';
import { DesktopDropdown, MobileAccordion } from '../NavDropdown';
import type { CmsNavItem } from '../../services/adminApi';

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


export function LandingPage({ onLogin, onSignup, onTryNow, onNavigate }: LandingPageProps) {
    const { t, language } = useLanguage();
    const isAdminAuthenticated = useAdminStore((s) => s.isAuthenticated);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [cmsContent, setCmsContent] = useState<any>(null);
    const [topNav, setTopNav] = useState<CmsNavItem[]>([]);
    const [bottomNav, setBottomNav] = useState<CmsNavItem[]>([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        const fetchCms = async () => {
            try {
                const response = await publicCmsService.getPage('home', language);
                if (response.success && response.data.content_structured) {
                    setCmsContent(response.data.content_structured);
                }
            } catch (error) {
                console.error('Failed to fetch CMS content:', error);
            }
        };

        const fetchNavPages = async () => {
            try {
                const nav = await publicCmsService.getNav(language);
                setTopNav(nav.top);
                setBottomNav(nav.bottom);
            } catch {
                // nav pages are optional, silently ignore
            }
        };

        fetchPlans();
        fetchCms();
        fetchNavPages();
    }, [language]);

    const featureIcons = [
        <FileText className="h-6 w-6 text-[#2a8fbd]" />,
        <LayoutTemplate className="h-6 w-6 text-pink-600" />,
        <Globe className="h-6 w-6 text-blue-600" />,
        <Shield className="h-6 w-6 text-green-600" />,
    ];

    const defaultFeatures = [
        { title: t('landing.features.smartInvoicing.title'), description: t('landing.features.smartInvoicing.desc') },
        { title: t('landing.features.customTemplates.title'), description: t('landing.features.customTemplates.desc') },
        { title: t('landing.features.multiLanguage.title'), description: t('landing.features.multiLanguage.desc') },
        { title: t('landing.features.secureCompliant.title'), description: t('landing.features.secureCompliant.desc') },
    ];

    const features = (cmsContent?.features?.length ? cmsContent.features : defaultFeatures).map(
        (f: any, i: number) => ({ icon: featureIcons[i], title: f.title, description: f.desc ?? f.description })
    );

    const defaultSteps = [
        { title: t('landing.howItWorks.step1.title'), desc: t('landing.howItWorks.step1.desc') },
        { title: t('landing.howItWorks.step2.title'), desc: t('landing.howItWorks.step2.desc') },
        { title: t('landing.howItWorks.step3.title'), desc: t('landing.howItWorks.step3.desc') },
    ];
    const howItWorksSteps: { title: string; desc: string }[] = cmsContent?.how_it_works_steps?.length ? cmsContent.how_it_works_steps : defaultSteps;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08a3c]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#3d5a80]">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-heading-2 font-medium bg-clip-text text-transparent bg-gradient-to-r from-[#1e3a5f] to-[#3d5a80]">
                            {t('appName') || 'BillingTool'}
                        </span>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
                            {t('landing.aboutUs')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onNavigate('packageComparison')}>
                            {t('nav.products')}
                        </Button>
                        {topNav.map(item => (
                            <DesktopDropdown
                                key={item.id}
                                item={item}
                                onNavigate={(screen, slug) => onNavigate(slug ? `cms/${slug}` : screen)}
                            />
                        ))}
                    </nav>

                    {/* Desktop actions */}
                    <div className="hidden md:flex items-center gap-2">
                        {isAdminAuthenticated ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-[rgba(30,58,95,0.25)] text-[#1e3a5f] hover:bg-[#f0f6ff]"
                                onClick={() => { window.location.hash = '#/SAdashboard'; }}
                            >
                                ← Back to Admin Portal
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" size="sm" onClick={onLogin}>
                                    {t('landing.login')}
                                </Button>
                                <Button size="sm" onClick={() => onSignup()}>
                                    {t('landing.signup')}
                                </Button>
                            </>
                        )}
                        <LanguageSwitcher variant="login" />
                    </div>

                    {/* Mobile: hamburger + language */}
                    <div className="flex md:hidden items-center gap-2">
                        <LanguageSwitcher variant="login" />
                        <button
                            type="button"
                            aria-label="Toggle menu"
                            onClick={() => setMobileMenuOpen(o => !o)}
                            className="p-2 rounded-md hover:bg-accent transition-colors"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile drawer */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t bg-background animate-in slide-in-from-top-2">
                        <div className="py-2">
                            <button
                                className="block w-full text-left px-4 py-3 text-heading-3 font-medium hover:bg-accent transition-colors"
                                onClick={() => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
                            >
                                {t('landing.aboutUs')}
                            </button>
                            <button
                                className="block w-full text-left px-4 py-3 text-heading-3 font-medium hover:bg-accent transition-colors"
                                onClick={() => { onNavigate('packageComparison'); setMobileMenuOpen(false); }}
                            >
                                {t('nav.products')}
                            </button>
                            {topNav.map(item => (
                                <MobileAccordion
                                    key={item.id}
                                    item={item}
                                    onNavigate={(screen, slug) => onNavigate(slug ? `cms/${slug}` : screen)}
                                    onClose={() => setMobileMenuOpen(false)}
                                />
                            ))}
                            <div className="border-t mt-2 pt-2 px-4 flex gap-2">
                                {isAdminAuthenticated ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-[rgba(30,58,95,0.25)] text-[#1e3a5f]"
                                        onClick={() => { window.location.hash = '#/SAdashboard'; setMobileMenuOpen(false); }}
                                    >
                                        Admin Portal
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => { onLogin(); setMobileMenuOpen(false); }}>
                                            {t('landing.login')}
                                        </Button>
                                        <Button size="sm" onClick={() => { onSignup(); setMobileMenuOpen(false); }}>
                                            {t('landing.signup')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
                            <motion.div variants={itemVariants} className="inline-flex items-center rounded-full border px-4 py-1.5 text-micro font-medium border-[rgba(30,58,95,0.10)] bg-[#f0f6ff]/50 text-[#1e3a5f] backdrop-blur-sm shadow-sm transition-all hover:bg-[#f0f6ff]/50">
                                <Sparkles className="mr-2 h-3.5 w-3.5 text-[#2a8fbd]" />
                                <InlineEditableText slug="home" field="hero_badge" lang={language} value={cmsContent?.hero_badge || t('landing.hero.badge')} />
                            </motion.div>
                            <motion.h1 variants={itemVariants} className="text-5xl font-medium tracking-tight lg:text-6xl xl:text-7xl max-w-4xl text-slate-900 dark:text-white pb-2 leading-[1.1]">
                                <InlineEditableText slug="home" field="hero_title" lang={language} value={cmsContent?.hero_title || t('landing.hero.title')} />{' '}
                                <br className="hidden sm:inline" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a5f] to-[#3d5a80]">
                                    <InlineEditableText slug="home" field="hero_title_accent" lang={language} value={cmsContent?.hero_title_accent || t('landing.hero.titleAccent')} />
                                </span>{' '}
                                <InlineEditableText slug="home" field="hero_title_suffix" lang={language} value={cmsContent?.hero_title_suffix || t('landing.hero.titleSuffix')} />
                            </motion.h1>
                            <motion.p variants={itemVariants} className="mx-auto max-w-[700px] text-gray-500 md:text-heading-2 dark:text-gray-400">
                                <InlineEditableText slug="home" field="hero_subtitle" lang={language} value={cmsContent?.hero_subtitle || t('landing.hero.subtitle')} multiline />
                            </motion.p>
                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 min-w-[300px] justify-center pt-4">
                                <Button size="lg" className="bg-gradient-to-r from-[#1e3a5f] to-[#3d5a80] hover:from-[#e07530] hover:to-[#e07530] h-12 px-8 text-heading-3 shadow-xl shadow-[rgba(30,58,95,0.10)] dark:shadow-none" onClick={() => onSignup()}>
                                    {t('landing.hero.getStarted')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                {onTryNow && (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-12 px-8 text-heading-3 border-2 border-[rgba(30,58,95,0.20)] hover:border-[#f08a3c] hover:bg-[#f0f6ff] text-[#1e3a5f] font-medium gap-2 shadow-md"
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

                {/* Trusted By Marquee */}
                <section className="py-10 border-y bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
                    <div className="container px-4 md:px-6">
                        <p className="text-center text-body font-medium text-muted-foreground mb-6">
                            <InlineEditableText slug="home" field="trusted_by" lang={language} value={cmsContent?.trusted_by || t('landing.trustedBy')} />
                        </p>
                        <div className="flex justify-center flex-wrap gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            {['[mn]medianet', 'Voicepoint', 'Highgo', 'digitalks.in', 'we4service'].map((partner, i) => (
                                <div key={i} className="flex items-center gap-2 text-heading-2 font-medium text-slate-800 dark:text-slate-200">
                                    <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-200 dark:from-slate-600 dark:to-slate-800" />
                                    </div> 
                                    {partner}
                                </div>
                            ))}
                        </div>
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
                            <motion.h2 variants={itemVariants} className="text-heading-1 font-medium tracking-tighter sm:text-display md:text-5xl">
                                <InlineEditableText slug="home" field="features_tag" lang={language} value={cmsContent?.features_tag || t('landing.features.tag')} />
                            </motion.h2>
                            <motion.p variants={itemVariants} className="mx-auto max-w-[700px] text-gray-500 md:text-heading-2/relaxed lg:text-heading-2/relaxed xl:text-heading-2/relaxed dark:text-gray-400 mt-4">
                                <InlineEditableText slug="home" field="features_subtitle" lang={language} value={cmsContent?.features_subtitle || t('landing.features.subtitle')} multiline />
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
                                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#f0f6ff] dark:bg-[#1e3a5f]/20">
                                                {feature.icon}
                                            </div>
                                            <CardTitle className="text-heading-2">{feature.title}</CardTitle>
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

                {/* How it Works */}
                <section className="py-12 md:py-24 lg:py-32">
                    <div className="container px-4 md:px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-heading-1 font-medium tracking-tighter sm:text-display md:text-5xl">
                                <InlineEditableText slug="home" field="how_it_works_tag" lang={language} value={cmsContent?.how_it_works_tag || t('landing.howItWorks.tag')} />
                            </h2>
                            <p className="mx-auto max-w-[700px] text-gray-500 md:text-heading-2 dark:text-gray-400 mt-4">
                                <InlineEditableText slug="home" field="how_it_works_subtitle" lang={language} value={cmsContent?.how_it_works_subtitle || t('landing.howItWorks.subtitle')} multiline />
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                            {/* Connecting Line */}
                            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-[rgba(30,58,95,0.12)] via-[rgba(30,58,95,0.18)] to-[rgba(30,58,95,0.12)] dark:from-[#1e3a5f] dark:via-[#3d5a80] dark:to-[#1e3a5f] z-0" />

                            {howItWorksSteps.map((step, idx) => (
                                <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-full bg-background border-4 border-[rgba(30,58,95,0.10)] dark:border-[rgba(30,58,95,0.30)] flex items-center justify-center text-heading-1 font-medium text-[#2a8fbd] shadow-xl mb-6">
                                        {idx + 1}
                                    </div>
                                    <h3 className="text-heading-2 font-medium mb-2">{step.title}</h3>
                                    <p className="text-muted-foreground">{step.desc}</p>
                                </div>
                            ))}
                        </div>
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
                                <motion.h2 variants={itemVariants} className="text-heading-1 font-medium tracking-tighter sm:text-display md:text-5xl mb-6">
                                    <InlineEditableText slug="home" field="about_title" lang={language} value={cmsContent?.about_title || t('landing.aboutUs')} />
                                </motion.h2>
                                <motion.div variants={itemVariants} className="space-y-4 text-gray-500 md:text-heading-3 dark:text-gray-400">
                                    <InlineEditableRich slug="home" field="about_text" lang={language} value={cmsContent?.about_text || t('landing.about.desc1')} />
                                    <InlineEditableRich slug="home" field="about_text2" lang={language} value={cmsContent?.about_text2 || t('landing.about.desc2')} />
                                    <div className="flex gap-4 pt-4">
                                        <div className="flex flex-col">
                                            <span className="text-heading-1 font-medium text-[#2a8fbd]">10k+</span>
                                            <span className="text-body">
                                                <InlineEditableText slug="home" field="about_stat1_label" lang={language} value={cmsContent?.about_stat1_label || t('landing.about.activeUsers')} />
                                            </span>
                                        </div>
                                        <div className="border-l pl-4 flex flex-col">
                                            <span className="text-heading-1 font-medium text-[#2a8fbd]">500k+</span>
                                            <span className="text-body">
                                                <InlineEditableText slug="home" field="about_stat2_label" lang={language} value={cmsContent?.about_stat2_label || t('landing.about.invoicesSent')} />
                                            </span>
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
                                {cmsContent?.about_image ? (
                                    <InlineImagePicker
                                        slug="home"
                                        field="about_image"
                                        lang={language}
                                        src={cmsContent.about_image}
                                        alt={cmsContent?.about_title || 'About Us'}
                                        imgClassName="w-full h-auto object-cover rounded-2xl shadow-2xl"
                                    />
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#f08a3c]/20 to-[#3d5a80]/20 z-10" />
                                        <div className="relative w-full aspect-[4/3] bg-slate-900 flex flex-col">
                                            {/* Mockup Header */}
                                            <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                            </div>
                                            {/* Mockup Body */}
                                            <div className="flex-1 p-6 relative overflow-hidden flex flex-col gap-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="h-8 w-32 bg-slate-700/50 rounded-md" />
                                                    <div className="h-8 w-24 bg-[#f08a3c]/80 rounded-md" />
                                                </div>
                                                {/* Chart Mock */}
                                                <div className="h-24 w-full bg-slate-800/80 rounded-lg flex items-end px-4 gap-2 pb-2">
                                                    {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                                        <div key={i} className="flex-1 bg-gradient-to-t from-[#f08a3c] to-[#ff9d52] rounded-t-sm opacity-80" style={{ height: `${h}%` }} />
                                                    ))}
                                                </div>
                                                {/* Lists Mock */}
                                                <div className="flex-1 flex gap-4 mt-2">
                                                    <div className="flex-1 bg-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
                                                        <div className="h-4 w-20 bg-slate-700/80 rounded mb-2" />
                                                        <div className="h-6 w-full bg-slate-700/30 rounded" />
                                                        <div className="h-6 w-[80%] bg-slate-700/30 rounded" />
                                                    </div>
                                                    <div className="flex-1 bg-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
                                                        <div className="h-4 w-20 bg-slate-700/80 rounded mb-2" />
                                                        <div className="h-6 w-full bg-slate-700/30 rounded" />
                                                        <div className="h-6 w-[60%] bg-slate-700/30 rounded" />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Glass reflection */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                        </div>
                                    </>
                                )}
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
                            <motion.h2 variants={itemVariants} className="text-heading-1 font-medium tracking-tighter sm:text-display md:text-5xl">
                                <InlineEditableText slug="home" field="pricing_tag" lang={language} value={cmsContent?.pricing_tag || t('landing.pricing.tag')} />
                            </motion.h2>
                            <motion.p variants={itemVariants} className="mx-auto max-w-[700px] text-gray-500 md:text-heading-2/relaxed lg:text-heading-2/relaxed xl:text-heading-2/relaxed dark:text-gray-400 mt-4">
                                <InlineEditableText slug="home" field="pricing_subtitle" lang={language} value={cmsContent?.pricing_subtitle || t('landing.pricing.subtitle')} multiline />
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
                                    <Card className={`flex flex-col h-full relative ${plan.highlight ? 'border-[#f08a3c] shadow-xl scale-105 z-10' : 'border-slate-200'}`}>
                                        {plan.highlight && (
                                            <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                                <span className="bg-[#f08a3c] text-white px-3 py-1 rounded-full text-micro font-medium uppercase tracking-wide shadow-md">
                                                    {t('landing.pricing.popular')}
                                                </span>
                                            </div>
                                        )}
                                        <CardHeader>
                                            <CardTitle className="text-heading-1">{plan.name}</CardTitle>
                                            <CardDescription>{plan.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <div className="mb-6">
                                                <span className="text-display font-medium">{plan.price}</span>
                                                {plan.price !== 'Custom' && <span className="text-muted-foreground">{t('billing.perMonth')}</span>}
                                            </div>
                                            <ul className="space-y-3 text-body">
                                                {plan.features.map((feature: string, i: number) => (
                                                    <li key={i} className="flex items-center">
                                                        <Check className="mr-2 h-4 w-4 text-[#2a8fbd]" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                        <CardFooter>
                                            <Button
                                                className={`w-full ${plan.highlight ? 'bg-[#f08a3c] hover:bg-[#e07530]' : ''}`}
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

                {/* Testimonials */}
                <section className="py-12 md:py-24 lg:py-32 bg-slate-50 dark:bg-slate-900/50">
                    <div className="container px-4 md:px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-heading-1 font-medium tracking-tighter sm:text-display md:text-5xl">
                                <InlineEditableText slug="home" field="testimonials_tag" lang={language} value={cmsContent?.testimonials_tag || t('landing.testimonials.tag')} />
                            </h2>
                            <p className="mx-auto max-w-[700px] text-gray-500 md:text-heading-2 dark:text-gray-400 mt-4">
                                <InlineEditableText slug="home" field="testimonials_subtitle" lang={language} value={cmsContent?.testimonials_subtitle || t('landing.testimonials.subtitle')} multiline />
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {(cmsContent?.testimonials || [1, 2, 3]).map((testi: any, idx: number) => {
                                const isCms = cmsContent?.testimonials;
                                const name = isCms ? testi.name : t(`landing.testimonials.t${testi}.name`);
                                const role = isCms ? testi.role : t(`landing.testimonials.t${testi}.role`);
                                const text = isCms ? testi.text : t(`landing.testimonials.t${testi}.text`);

                                return (
                                    <Card key={idx} className="bg-background border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <MessageSquare className="w-24 h-24 text-[#2a8fbd]" />
                                        </div>
                                        <CardContent className="pt-8 relative z-10">
                                            <div className="flex gap-1 mb-6 text-amber-400">
                                                <Star fill="currentColor" className="w-5 h-5" />
                                                <Star fill="currentColor" className="w-5 h-5" />
                                                <Star fill="currentColor" className="w-5 h-5" />
                                                <Star fill="currentColor" className="w-5 h-5" />
                                                <Star fill="currentColor" className="w-5 h-5" />
                                            </div>
                                            <p className="text-heading-3 italic text-slate-700 dark:text-slate-300 mb-8 min-h-[100px]">
                                                "{text}"
                                            </p>
                                            <div className="flex items-center gap-4 border-t pt-4 border-slate-100 dark:border-slate-800">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#3d5a80] flex items-center justify-center text-white font-medium text-heading-3 shadow-inner">
                                                    {name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{name}</h4>
                                                    <p className="text-body text-muted-foreground">{role}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="py-12 md:py-24 lg:py-32">
                    <div className="container px-4 md:px-6 max-w-3xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-heading-1 font-medium tracking-tighter sm:text-display md:text-5xl">
                                <InlineEditableText slug="home" field="faq_tag" lang={language} value={cmsContent?.faq_tag || t('landing.faq.tag')} />
                            </h2>
                            <p className="mx-auto max-w-[700px] text-gray-500 md:text-heading-2 dark:text-gray-400 mt-4">
                                <InlineEditableText slug="home" field="faq_subtitle" lang={language} value={cmsContent?.faq_subtitle || t('landing.faq.subtitle')} multiline />
                            </p>
                        </div>
                        <div className="space-y-4">
                            {(cmsContent?.faqs || [1, 2, 3, 4]).map((faqItem: any, idx: number) => {
                                const isCms = cmsContent?.faqs;
                                const question = isCms ? faqItem.q : t(`landing.faq.q${faqItem}.q`);
                                const answer = isCms ? faqItem.a : t(`landing.faq.q${faqItem}.a`);

                                return (
                                    <details key={idx} className="group bg-slate-50 dark:bg-slate-900/50 rounded-xl open:bg-white dark:open:bg-slate-900 border border-transparent open:border-[rgba(30,58,95,0.10)] dark:open:border-[rgba(30,58,95,0.30)] transition-all duration-300 open:shadow-md">
                                        <summary className="flex items-center justify-between font-medium cursor-pointer p-6 list-none [&::-webkit-details-marker]:hidden">
                                            <span className="text-heading-3 pr-4">{question}</span>
                                            <span className="transition-transform duration-300 group-open:rotate-180 flex-shrink-0 bg-[#f0f6ff] dark:bg-[#1e3a5f]/30 p-2 rounded-full text-[#2a8fbd]">
                                                <Plus className="w-4 h-4 block group-open:hidden" />
                                                <Minus className="w-4 h-4 hidden group-open:block" />
                                            </span>
                                        </summary>
                                        <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                                            {answer}
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Bottom CTA */}
                <section className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#3d5a80] z-0" />
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay z-0" />
                    <div className="container px-4 md:px-6 relative z-10 text-center text-white flex flex-col items-center">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-display font-medium tracking-tighter sm:text-5xl md:text-6xl mb-6">
                                <InlineEditableText slug="home" field="cta_title" lang={language} value={cmsContent?.cta_title || t('landing.bottomCta.title')} />
                            </h2>
                            <p className="text-white text-heading-3 md:text-heading-2 mb-10 max-w-[600px] mx-auto">
                                <InlineEditableText slug="home" field="cta_subtitle" lang={language} value={cmsContent?.cta_subtitle || t('landing.bottomCta.subtitle')} multiline />
                            </p>
                            <Button size="lg" className="bg-white !text-[#1e3a5f] hover:bg-slate-50 h-14 px-10 text-heading-3 shadow-2xl rounded-full transition-transform hover:scale-105" onClick={() => onSignup()}>
                                {t('landing.hero.getStarted')}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                            <p className="mt-6 text-[rgba(255,255,255,0.8)] text-body font-medium">
                                <InlineEditableText slug="home" field="cta_context" lang={language} value={cmsContent?.cta_context || t('landing.bottomCta.ctaContext')} />
                            </p>
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t bg-slate-50 dark:bg-slate-950 py-12">
                <div className="container px-4 md:px-6">
                    {/* Grouped footer columns from CMS */}
                    {bottomNav.length > 0 && (() => {
                        // Build column map: group → items. Ungrouped items go to a "More" bucket.
                        const groups: Record<string, CmsNavItem[]> = {};
                        for (const item of bottomNav) {
                            const key = item.footer_group || '__other__';
                            if (!groups[key]) groups[key] = [];
                            groups[key].push(item);
                        }

                        const renderLink = (item: CmsNavItem) => {
                            const linkClass = "block text-heading-3 text-muted-foreground hover:text-primary transition-colors";
                            if (item.link_url) {
                                return (
                                    <a key={item.id} href={item.link_url} target={item.link_target ?? '_self'} rel={item.link_target === '_blank' ? 'noopener noreferrer' : undefined} className={linkClass}>
                                        {item.nav_label || item.title}
                                    </a>
                                );
                            }
                            return (
                                <button key={item.id} onClick={() => onNavigate(`cms/${item.slug}`)} className={linkClass}>
                                    {item.nav_label || item.title}
                                </button>
                            );
                        };

                        return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                                {Object.entries(groups).map(([group, items]) => (
                                    <div key={group}>
                                        {group !== '__other__' && (
                                            <p className="text-body font-medium uppercase tracking-wider text-foreground mb-3">{group}</p>
                                        )}
                                        <div className="space-y-2">
                                            {items.map(renderLink)}
                                            {/* Children (submenu) rendered as sub-links */}
                                            {items.flatMap(item => item.children ?? []).map(renderLink)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Bottom bar */}
                    <div className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#2a8fbd]" />
                            <span className="text-heading-3 font-medium text-foreground">BillingTool</span>
                        </div>
                        <p className="text-body text-muted-foreground">
                            © 2026 BillingTool Inc. {t('landing.footer.rights')}
                        </p>
                        {/* Fallback legal links — only shown if CMS has no bottom nav items */}
                        {bottomNav.length === 0 && (
                            <div className="flex flex-wrap gap-4">
                                <button onClick={() => onNavigate('impressum')} className="text-body text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.impressum')}</button>
                                <button onClick={() => onNavigate('privacyPolicy')} className="text-body text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.privacy')}</button>
                                <button onClick={() => onNavigate('termsAndConditions')} className="text-body text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.terms')}</button>
                                <button onClick={() => onNavigate('cookiePolicy')} className="text-body text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.cookies')}</button>
                                <button onClick={() => onNavigate('mockups')} className="text-body text-muted-foreground hover:text-primary transition-colors">{t('legal.footer.mockups')}</button>
                            </div>
                        )}
                    </div>
                </div>
            </footer>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div >
    );
}
