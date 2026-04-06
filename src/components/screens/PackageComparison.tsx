import { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Check, X, ArrowLeft, FileText, Globe, Shield, LayoutTemplate } from 'lucide-react';
import { billingService } from '../../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface PackageComparisonProps {
    onBack: () => void;
    onSignup: (planId?: string) => void;
}

interface Plan {
    id: string;
    name: string;
    price: string;
    description: string;
    features: any[];
    duration: string;
}

interface ServiceColumn {
    id: string;
    name: string;
    type: string;
    description: string;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
    }
};

export function PackageComparison({ onBack, onSignup }: PackageComparisonProps) {
    const { t } = useLanguage();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [columns, setColumns] = useState<ServiceColumn[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansData, columnsData] = await Promise.all([
                    billingService.getPlans(),
                    billingService.getPackageServices()
                ]);
                
                // Ensure features are parsed if they come as a JSON string
                const parsedPlans = plansData.map((plan: any) => {
                    let features = plan.features;
                    if (typeof features === 'string') {
                        try {
                            features = JSON.parse(features);
                        } catch (e) {
                            features = [];
                        }
                    }
                    return { ...plan, features };
                });
                
                setPlans(parsedPlans);
                setColumns(columnsData);
            } catch (error) {
                console.error('Failed to fetch comparison data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getFeatureValue = (plan: Plan, colType: string, colName: string) => {
        if (!plan.features || !Array.isArray(plan.features)) return <X className="h-4 w-4 text-red-400 mx-auto" />;
        
        const feature = plan.features.find(f => 
            (f.type === colType && f.name === colName) || 
            (f.type === colType && !f.name) ||
            (!f.type && f.name === colName)
        );

        if (!feature) return <X className="h-4 w-4 text-red-400 mx-auto" />;
        
        const val = String(feature.value || '').toLowerCase();
        if (val === 'yes' || val === 'true' || val === 'unlimited' || val === 'included') {
            return <Check className="h-5 w-5 text-green-500 mx-auto" />;
        }
        if (val === 'no' || val === 'false' || val === 'none' || val === '') {
            return <X className="h-4 w-4 text-red-400 mx-auto" />;
        }
        
        return <span className="font-medium text-slate-700 dark:text-slate-300">{feature.value}</span>;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Simple Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur py-4">
                <div className="container flex items-center justify-between px-4 md:px-6">
                    <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        {t('common.back') || 'Back'}
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600">
                            {t('appName') || 'BillingTool'}
                        </span>
                    </div>
                    <div className="w-24"></div> {/* Spacer */}
                </div>
            </header>

            <main className="container px-4 md:px-6 pt-12">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="space-y-12"
                >
                    <div className="text-center space-y-4">
                        <motion.h1 variants={itemVariants} className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                            {t('landing.pricing.compareTitle') || 'Compare our plans'}
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-xl text-slate-500 max-w-2xl mx-auto">
                            {t('landing.pricing.compareSubtitle') || 'Find the perfect fit for your business needs'}
                        </motion.p>
                    </div>

                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b-2">
                                    <TableRow>
                                        <TableHead className="w-[300px] py-8 px-6 text-lg font-bold">
                                            {t('landing.pricing.features') || 'Features'}
                                        </TableHead>
                                        {plans.map(plan => (
                                            <TableHead key={plan.id} className="text-center py-8 min-w-[200px]">
                                                <div className="space-y-2">
                                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</div>
                                                    <div className="text-purple-600 font-extrabold text-xl">
                                                        {parseFloat(plan.price) === 0 ? 'Free' : `€${plan.price}`}
                                                        <span className="text-sm font-normal text-slate-400 ml-1">/mo</span>
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        className="mt-4 bg-purple-600 hover:bg-purple-700 w-full"
                                                        onClick={() => onSignup(plan.id)}
                                                    >
                                                        {t('landing.hero.getStarted') || 'Get Started'}
                                                    </Button>
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {columns.map(col => (
                                        <TableRow key={col.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors">
                                            <TableCell className="py-6 px-6 font-semibold text-slate-800 dark:text-slate-200">
                                                <div>
                                                    <div>{col.name}</div>
                                                    {col.description && (
                                                        <p className="text-xs font-normal text-slate-400 mt-1">{col.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {plans.map(plan => (
                                                <TableCell key={`${plan.id}-${col.id}`} className="text-center">
                                                    {getFeatureValue(plan, col.type, col.name)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </motion.div>
                    
                    {/* FAQ/Trust Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                         {[
                             { icon: <Shield className="text-green-500" />, title: 'Highly Secure', desc: 'Enterprise-grade encryption for all your data.' },
                             { icon: <Globe className="text-blue-500" />, title: 'Go Global', desc: 'Multi-currency and multi-language support included.' },
                             { icon: <LayoutTemplate className="text-purple-500" />, title: 'Customizable', desc: 'Design templates that match your brand identity.' }
                         ].map((item, i) => (
                             <Card key={i} className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur">
                                 <CardHeader className="flex flex-row items-center gap-4">
                                     <div className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                                         {item.icon}
                                     </div>
                                     <CardTitle className="text-lg">{item.title}</CardTitle>
                                 </CardHeader>
                                 <CardContent>
                                     <p className="text-slate-500 text-sm">{item.desc}</p>
                                 </CardContent>
                             </Card>
                         ))}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
