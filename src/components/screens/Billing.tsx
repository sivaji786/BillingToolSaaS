import { useState, useEffect } from 'react';
import { billingService } from '../../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Check, Download, Loader2, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/invoice-calculations'; // Trying invoice-calculations or will inline

export const Billing = () => {
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
            toast.error('Failed to load billing details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (planId: number) => {
        try {
            setUpgrading(planId);
            await billingService.upgradePlan(planId);
            toast.success('Plan upgraded successfully');
            loadBillingData(); // Reload to show new plan
        } catch (error) {
            toast.error('Upgrade failed');
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
    const usage = data?.usage?.invoices || { used: 0, limit: 0, percentage: 0 };

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
                <p className="text-muted-foreground">Manage your plan, limits, and billing history.</p>
            </div>

            {/* Usage Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Usage</CardTitle>
                    <CardDescription>Your usage for the current billing period.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Invoices Generated</span>
                            <span className="text-muted-foreground">
                                {usage.used} / {usage.limit === -1 ? 'Unlimited' : usage.limit}
                            </span>
                        </div>
                        <Progress value={usage.percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right">
                            {usage.limit === -1 ? 'You have unlimited invoices!' : `${usage.limit - usage.used} invoices remaining`}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Plans Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan: any) => {
                    const isCurrent = plan.id === currentPlanId;
                    let features: [string, any][] = [];
                    try {
                        const parsed = JSON.parse(plan.features);
                        if (Array.isArray(parsed)) {
                            // Features are stored as array of objects: [{name: "Storage", type: "storage", value: "5GB"}, ...]
                            features = parsed.map(item => [item.name || 'Feature', item.value || 'Included']);
                        } else if (typeof parsed === 'object' && parsed !== null) {
                            // Fallback for simple key-value object format
                            features = Object.entries(parsed);
                        }
                    } catch (e) {
                        console.error("Error parsing plan features", e);
                    }

                    return (
                        <Card key={plan.id} className={`flex flex-col relative ${isCurrent ? 'border-primary border-2 shadow-lg' : ''}`}>
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Current Plan
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-3xl font-bold">{formatCurrency(Number(plan.price), 'EUR')}</span>
                                    <span className="text-muted-foreground text-sm">/month</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3 pt-0">
                                <hr className="border-border/50" />
                                <ul className="space-y-2 text-sm">
                                    {features.map(([key, value], index) => (
                                        <li key={`${key}-${index}`} className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                                            <span className="text-muted-foreground">
                                                {key}: <span className="text-foreground font-medium">{String(value === -1 || value === 'unlimited' ? 'Unlimited' : value)}</span>
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
                                    {isCurrent ? 'Current Plan' : 'Upgrade'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* History Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>View your recent payments and download invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Invoice ID</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Amount</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium">{item.id}</td>
                                        <td className="px-4 py-3">{item.date}</td>
                                        <td className="px-4 py-3">{formatCurrency(item.amount, 'EUR')}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
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
