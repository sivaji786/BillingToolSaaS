import { useQuery } from '@tanstack/react-query';
import { customerService } from '../../../services/customerApi';
import { useAuthStore } from '../../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { CreditCard, FileText, Package, TrendingUp, Database, Zap, Activity, Users } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';
import { format } from 'date-fns';

interface CustomerDashboardProps {
    onNavigate: (screen: string) => void;
}

export function CustomerDashboard({ onNavigate }: CustomerDashboardProps) {
    const token = useAuthStore((state) => state.token);

    const { data, isLoading } = useQuery({
        queryKey: ['customer-dashboard'],
        queryFn: () => customerService.getDashboard(token!),
        enabled: !!token,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-32 w-full" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getUsagePercentage = (used: number, limit: number) => {
        return Math.round((used / limit) * 100);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back! Here's an overview of your account.
                </p>
            </div>

            {/* Subscription Card */}
            <Card className="border-2 border-primary/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                {data?.plan?.name || 'No Plan'}
                            </CardTitle>
                            <CardDescription>
                                {data?.subscription?.status === 'active' ? 'Active Subscription' : 'Inactive'}
                            </CardDescription>
                        </div>
                        <Badge variant={data?.subscription?.status === 'active' ? 'default' : 'secondary'}>
                            {data?.subscription?.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold">€{data?.plan?.price}/mo</p>
                            <p className="text-sm text-muted-foreground">
                                {data?.subscription?.trial_ends_at && new Date(data.subscription.trial_ends_at) > new Date()
                                    ? `Trial ends ${format(new Date(data.subscription.trial_ends_at), 'MMM dd, yyyy')}`
                                    : `Next billing: ${format(new Date(), 'MMM dd, yyyy')}`}
                            </p>
                        </div>
                        <Button onClick={() => onNavigate('subscription')}>
                            Manage Subscription
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Usage Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatBytes(data?.usage?.storage?.used || 0)}
                        </div>
                        <Progress
                            value={getUsagePercentage(data?.usage?.storage?.used || 0, data?.usage?.storage?.limit || 1)}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            of {formatBytes(data?.usage?.storage?.limit || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(data?.usage?.api_calls?.used || 0).toLocaleString()}
                        </div>
                        <Progress
                            value={getUsagePercentage(data?.usage?.api_calls?.used || 0, data?.usage?.api_calls?.limit || 1)}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            of {(data?.usage?.api_calls?.limit || 0).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatBytes(data?.usage?.bandwidth?.used || 0)}
                        </div>
                        <Progress
                            value={getUsagePercentage(data?.usage?.bandwidth?.used || 0, data?.usage?.bandwidth?.limit || 1)}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            of {formatBytes(data?.usage?.bandwidth?.limit || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.usage?.users?.used || 0}
                        </div>
                        <Progress
                            value={getUsagePercentage(data?.usage?.users?.used || 0, data?.usage?.users?.limit || 1)}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            of {data?.usage?.users?.limit || 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Invoices */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Invoices</CardTitle>
                            <CardDescription>Your latest billing history</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => onNavigate('invoices')}>
                            View All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {data?.recentInvoices && data.recentInvoices.length > 0 ? (
                        <div className="space-y-4">
                            {data.recentInvoices.map((invoice: any) => (
                                <div key={invoice.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{invoice.invoice_number}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">€{invoice.total || 0}</p>
                                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                                            {invoice.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            No invoices yet
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="cursor-pointer hover:bg-accent" onClick={() => onNavigate('invoices')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            View Invoices
                        </CardTitle>
                        <CardDescription>
                            Access all your billing documents
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card className="cursor-pointer hover:bg-accent" onClick={() => onNavigate('subscription')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Upgrade Plan
                        </CardTitle>
                        <CardDescription>
                            Get more features and resources
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Card className="cursor-pointer hover:bg-accent" onClick={() => onNavigate('settings')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment Settings
                        </CardTitle>
                        <CardDescription>
                            Manage billing and payment methods
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
