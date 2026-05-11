import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsService } from '../../../services/adminApi';
import { StatsCard } from '../../admin/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { 
    Activity, 
    Database, 
    Zap, 
    Users, 
    Download, 
    Calendar,
    ArrowUpRight,
    TrendingUp
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../ui/select";
import { Badge } from '../../ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../ui/table";
import { Eye } from 'lucide-react';

interface SAusageProps {
    onNavigate?: (screen: string, params?: any) => void;
}

export function SAusage({ onNavigate }: SAusageProps) {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await adminAnalyticsService.exportUsageCsv();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usage-export-${new Date().toISOString().slice(0, 7)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // silent — blob errors are non-critical
        } finally {
            setExporting(false);
        }
    };

    const { data: metrics, isLoading } = useQuery({
        queryKey: ['usage-metrics', period],
        queryFn: () => adminAnalyticsService.getUsageMetrics({ period }),
    });

    const { data: tenantUsages, isLoading: isTenantLoading } = useQuery({
        queryKey: ['tenant-usage'],
        queryFn: adminAnalyticsService.getTenantUsage,
    });

    const formatBytes = (gb: number) => {
        if (gb === 0) return '0 B';
        const bytes = gb * 1024 * 1024 * 1024; // Convert GB to Bytes
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        // Clamp i to stay within sizes array
        const index = Math.max(0, Math.min(i, sizes.length - 1));
        return parseFloat((bytes / Math.pow(k, index)).toFixed(2)) + ' ' + sizes[index];
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usage Analytics</h1>
                    <p className="text-muted-foreground">Monitor platform resource usage and performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Last 24 Hours</SelectItem>
                            <SelectItem value="weekly">Last 7 Days</SelectItem>
                            <SelectItem value="monthly">Last 30 Days</SelectItem>
                            <SelectItem value="yearly">Last Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={handleExport} disabled={exporting} title="Export CSV">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Metric Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="API Calls"
                    value={isLoading ? '...' : formatNumber(metrics?.apiCalls || 0)}
                    icon={Zap}
                    loading={isLoading}
                    trend={{ value: 12, isPositive: true }}
                />
                <StatsCard
                    title="Storage Used"
                    value={isLoading ? '...' : formatBytes(metrics?.storageUsed || 0)}
                    icon={Database}
                    loading={isLoading}
                    trend={{ value: 5, isPositive: true }}
                />
                <StatsCard
                    title="Bandwidth"
                    value={isLoading ? '...' : formatBytes(metrics?.bandwidthUsed || 0)}
                    icon={Activity}
                    loading={isLoading}
                    trend={{ value: 8, isPositive: false }}
                />
                <StatsCard
                    title="Active Sessions"
                    value={isLoading ? '...' : formatNumber(metrics?.activeSessions || 0)}
                    icon={Users}
                    loading={isLoading}
                    trend={{ value: 15, isPositive: true }}
                />
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Usage Trend */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Usage Trends
                        </CardTitle>
                        <CardDescription>
                            Historical resource consumption over the selected period
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics?.historicalData || []}>
                                        <defs>
                                            <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                        <XAxis 
                                            dataKey="date" 
                                            className="text-xs" 
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis 
                                            className="text-xs" 
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => value > 1000 ? `${(value/1000).toFixed(1)}k` : value}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px'
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="apiCalls" 
                                            stroke="hsl(var(--primary))" 
                                            fillOpacity={1} 
                                            fill="url(#colorUsage)" 
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Resource Distribution */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpRight className="h-5 w-5 text-primary" />
                            Bandwidth Consumption
                        </CardTitle>
                        <CardDescription>
                            Data transfer volume by day
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics?.historicalData || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                        <XAxis 
                                            dataKey="date" 
                                            className="text-xs"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis 
                                            className="text-xs"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px'
                                            }}
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                        />
                                        <Bar 
                                            dataKey="bandwidth" 
                                            fill="hsl(var(--primary))" 
                                            radius={[4, 4, 0, 0]} 
                                            maxBarSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quota Usage */}
            <Card>
                <CardHeader>
                    <CardTitle>System Quota Monitor</CardTitle>
                    <CardDescription>Current utilization against global platform limits</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {[
                            { label: 'Total Storage', used: metrics?.storageUsed || 0, limit: metrics?.storageLimit || 1000, color: 'bg-blue-500' },
                            { label: 'Monthly API Requests', used: metrics?.apiCalls || 0, limit: metrics?.apiCallsLimit || 1000000, color: 'bg-purple-500' },
                            { label: 'Global Bandwidth', used: metrics?.bandwidthUsed || 0, limit: metrics?.bandwidthLimit || 10000, color: 'bg-green-500' },
                        ].map((quota) => {
                            const percentage = Math.min(Math.round((quota.used / quota.limit) * 100), 100);
                            return (
                                <div key={quota.label} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{quota.label}</span>
                                            <Badge variant={percentage > 80 ? "destructive" : "secondary"}>
                                                {percentage}%
                                            </Badge>
                                        </div>
                                        <span className="text-muted-foreground">
                                            {quota.label.includes('Storage') || quota.label.includes('Bandwidth') 
                                                ? `${formatBytes(quota.used)} / ${formatBytes(quota.limit)}`
                                                : `${formatNumber(quota.used)} / ${formatNumber(quota.limit)}`}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                        <div 
                                            className={`h-full ${quota.color} transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Tenant Usage Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Tenant Usage Breakdown</CardTitle>
                    <CardDescription>Individual resource consumption per tenant</CardDescription>
                </CardHeader>
                <CardContent>
                    {isTenantLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tenant</TableHead>
                                        <TableHead>Admin</TableHead>
                                        <TableHead className="text-right">Storage</TableHead>
                                        <TableHead className="text-right">API Calls</TableHead>
                                        <TableHead className="text-right">Bandwidth</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tenantUsages?.map((tenant) => (
                                        <TableRow key={tenant.tenantId}>
                                            <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{tenant.adminName}</span>
                                                    <span className="text-xs text-muted-foreground">{tenant.adminEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatBytes(tenant.storageUsed)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(tenant.apiCalls)}</TableCell>
                                            <TableCell className="text-right">{formatBytes(tenant.bandwidthUsed)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => onNavigate?.('SAUserDetails', { userId: String(tenant.userId) })}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!tenantUsages || tenantUsages.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                No tenant usage data available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
