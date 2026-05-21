import { useState, useEffect } from 'react';
import { billingService } from '../../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Check, Download, Loader2, ShieldCheck, AlertTriangle, FileText, HardDrive, Zap } from 'lucide-react';
import { formatCurrency } from '../../utils/invoice-calculations';
import { useLanguage } from '../../contexts/LanguageContext';

// ── Usage bar with colour-coded warning states ────────────────────────────────
function UsageBar({ label, icon: Icon, used, limit, unit = '' }: {
    label: string; icon: React.ElementType;
    used: number; limit: number; unit?: string;
}) {
    const unlimited = limit === -1;
    const pct = unlimited ? 0 : limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const warning = !unlimited && pct >= 80 && pct < 100;
    const exceeded = !unlimited && pct >= 100;

    const barColor = exceeded ? 'bg-red-500' : warning ? 'bg-amber-500' : 'bg-violet-500';
    const trackColor = exceeded ? 'bg-red-100' : warning ? 'bg-amber-100' : 'bg-gray-100';

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${exceeded ? 'text-red-500' : warning ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span className="text-body font-medium text-gray-700">{label}</span>
                    {warning && (
                        <span className="inline-flex items-center gap-1 text-micro font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="h-3 w-3" /> Approaching limit
                        </span>
                    )}
                    {exceeded && (
                        <span className="inline-flex items-center gap-1 text-micro font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="h-3 w-3" /> Limit reached
                        </span>
                    )}
                </div>
                <span className="text-body text-gray-500 tabular-nums">
                    {unlimited
                        ? <span className="text-violet-600 font-medium">Unlimited</span>
                        : <>{used}{unit} <span className="text-gray-400">/</span> {limit}{unit}</>}
                </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${trackColor}`}>
                <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: unlimited ? '0%' : `${pct}%` }}
                />
            </div>
        </div>
    );
}

export const Billing = () => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [upgrading, setUpgrading] = useState<number | null>(null);

    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        try {
            setLoading(true);
            const [subData, historyData, plansData] = await Promise.all([
                billingService.getSubscription(),
                billingService.getHistory(),
                billingService.getPlans()
            ]);
            setData(subData);
            setHistory(historyData);
            setPlans(plansData);
        } catch (error) {
            console.error('Failed to load billing data', error);
            toast.error(t('billing.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (planId: number) => {
        try {
            setUpgrading(planId);
            const response = await billingService.upgradePlan(planId);

            if (response.checkoutUrl) {
                window.location.href = response.checkoutUrl;
            } else {
                toast.success(t('billing.upgradeSuccess'));
                loadBillingData(); // Reload to show new plan
            }
        } catch (error) {
            toast.error(t('billing.upgradeFailed'));
        } finally {
            setUpgrading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const currentPlanId = data?.subscription?.plan_id;
    const invoiceUsage  = data?.usage?.invoices  || { used: 0, limit: 0, percentage: 0 };
    const storageUsage  = data?.usage?.storage   || { used: 0, limit: 0, percentage: 0 };
    const apiUsage      = data?.usage?.api_calls || { used: 0, limit: 0, percentage: 0 };

    const anyNearLimit  = [invoiceUsage, storageUsage, apiUsage].some(u => u.limit !== -1 && u.limit > 0 && (u.used / u.limit) >= 0.8);
    const anyExceeded   = [invoiceUsage, storageUsage, apiUsage].some(u => u.limit !== -1 && u.limit > 0 && u.used >= u.limit);

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-heading-1 font-bold tracking-tight">{t('billing.title')}</h1>
                <p className="text-muted-foreground">{t('billing.subtitle')}</p>
            </div>

            {/* Usage limit warning banner */}
            {(anyNearLimit || anyExceeded) && (
                <div className={`flex items-start gap-3 rounded-xl border px-5 py-4 ${
                    anyExceeded
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 bg-amber-50'
                }`}>
                    <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${anyExceeded ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                        <p className={`text-body font-semibold ${anyExceeded ? 'text-red-800' : 'text-amber-800'}`}>
                            {anyExceeded ? 'Usage limit reached' : 'You\'re approaching your plan limits'}
                        </p>
                        <p className={`text-body mt-0.5 ${anyExceeded ? 'text-red-700' : 'text-amber-700'}`}>
                            {anyExceeded
                                ? 'Some features are now restricted. Upgrade your plan to continue.'
                                : 'Upgrade to avoid interruptions as you approach your limits.'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className={`flex-shrink-0 ${anyExceeded ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'} text-white`}
                        onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        View Plans
                    </Button>
                </div>
            )}

            {/* Usage Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('billing.currentUsage')}</CardTitle>
                    <CardDescription>Usage is measured against your current plan's limits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <UsageBar label="Invoices" icon={FileText}
                        used={invoiceUsage.used} limit={invoiceUsage.limit} />
                    <UsageBar label="Storage" icon={HardDrive}
                        used={Number(storageUsage.used.toFixed(2))} limit={storageUsage.limit} unit=" GB" />
                    <UsageBar label="AI Queries" icon={Zap}
                        used={apiUsage.used} limit={apiUsage.limit} />
                </CardContent>
            </Card>

            {/* Plans Section */}
            <div id="plans-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan: any) => {
                    const isCurrent = plan.id === currentPlanId;
                    let features: [string, any][] = [];
                    try {
                        const parsed = JSON.parse(plan.features);
                        if (Array.isArray(parsed)) {
                            features = parsed.map(item => [item.name || t('billing.feature'), item.value || t('billing.included')]);
                        } else if (typeof parsed === 'object' && parsed !== null) {
                            features = Object.entries(parsed);
                        }
                    } catch (e) {
                        console.error("Error parsing plan features", e);
                    }

                    return (
                        <Card key={plan.id} className={`flex flex-col relative ${isCurrent ? 'border-primary border-2 shadow-lg' : ''}`}>
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-micro font-bold flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> {t('billing.currentPlan')}
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-heading-1 font-bold">{formatCurrency(Number(plan.price), 'EUR')}</span>
                                    <span className="text-muted-foreground text-body">{t('billing.perMonth')}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3 pt-0">
                                <hr className="border-border/50" />
                                <ul className="space-y-2 text-body">
                                    {features.map(([key, value], index) => (
                                        <li key={`${key}-${index}`} className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                                            <span className="text-muted-foreground">
                                                {key}: <span className="text-foreground font-medium">{String(value === -1 || value === 'unlimited' ? t('billing.unlimited') : value)}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={isCurrent ? "outline" : "default"}
                                    disabled={isCurrent || upgrading === plan.id}
                                    onClick={() => handleUpgrade(plan.id)}
                                >
                                    {upgrading === plan.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {isCurrent ? t('billing.currentPlan') : t('billing.upgrade')}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* History Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('billing.paymentHistory')}</CardTitle>
                    <CardDescription>{t('billing.historyDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-body text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">{t('billing.invoiceId')}</th>
                                    <th className="px-4 py-3 font-medium">{t('billing.date')}</th>
                                    <th className="px-4 py-3 font-medium">{t('billing.amount')}</th>
                                    <th className="px-4 py-3 font-medium">{t('billing.status')}</th>
                                    <th className="px-4 py-3 font-medium text-right">{t('billing.action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium">{item.id}</td>
                                        <td className="px-4 py-3">{item.date}</td>
                                        <td className="px-4 py-3">{formatCurrency(item.amount, 'EUR')}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-micro font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
