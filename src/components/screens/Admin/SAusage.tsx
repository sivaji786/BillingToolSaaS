import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsService } from '../../../services/adminApi';
import { UsageFilters } from '../../../types/admin';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Download, Database, Zap, Activity, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../../ui/skeleton';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SAusage() {
    const [filters, setFilters] = useState<UsageFilters>({ period: 'monthly' });

    const { data, isLoading } = useQuery({
        queryKey: ['usage-metrics', filters],
        queryFn: () => adminAnalyticsService.getUsageMetrics(filters),
    });

    const handleExportCsv = async () => {
        try {
            const blob = await adminAnalyticsService.exportUsageCsv(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usage-analytics-${new Date().toISOString()}.csv`;
            a.click();
            toast.success('Usage data exported successfully');
        } catch (error) {
            toast.error('Failed to export usage data');
        }
    };

    // Extract chart data from API response
    const storageData = data?.historicalData?.map((item: any) => ({
        date: item.date,
        value: item.storage
    })) || [];

    const apiCallsData = data?.historicalData?.map((item: any) => ({
        date: item.date,
        value: item.apiCalls
    })) || [];

    const bandwidthData = data?.historicalData?.map((item: any) => ({
        date: item.date,
        value: item.bandwidth
    })) || [];

    const activeSessionsData = data?.historicalData?.map((item: any) => ({
        date: item.date,
        value: item.sessions
    })) || [];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage Analytics</CardTitle>
                    <CardDescription>Monitor platform resource usage and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <Select
                            value={filters.period || 'monthly'}
                            onValueChange={(value: string) => setFilters({ ...filters, period: value as 'daily' | 'weekly' | 'monthly' | 'yearly' })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Time Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button onClick={handleExportCsv} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.storageUsed?.toFixed(2) || '0'} GB</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.storageUsed && data?.storageLimit
                                ? `${((data.storageUsed / data.storageLimit) * 100).toFixed(1)}% of ${data.storageLimit} GB`
                                : 'Loading...'}
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
                            {data?.apiCalls ? (data.apiCalls >= 1000 ? `${(data.apiCalls / 1000).toFixed(0)}K` : data.apiCalls) : '0'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data?.apiCalls && data?.apiCallsLimit
                                ? `${((data.apiCalls / data.apiCallsLimit) * 100).toFixed(1)}% of limit`
                                : 'Loading...'}
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
                            {data?.bandwidthUsed ? `${data.bandwidthUsed.toFixed(2)} GB` : '0 GB'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data?.bandwidthUsed && data?.bandwidthLimit
                                ? `${((data.bandwidthUsed / data.bandwidthLimit) * 100).toFixed(1)}% of ${data.bandwidthLimit} GB`
                                : 'Loading...'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.activeSessions || '0'}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.activeSessions && data?.activeSessionsLimit
                                ? `${((data.activeSessions / data.activeSessionsLimit) * 100).toFixed(1)}% of limit`
                                : 'Loading...'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Storage Usage */}
                <Card>
                    <CardHeader>
                        <CardTitle>Storage Usage</CardTitle>
                        <CardDescription>Total storage consumption over time (GB)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={storageData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(var(--primary))"
                                        fill="hsl(var(--primary))"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* API Calls */}
                <Card>
                    <CardHeader>
                        <CardTitle>API Calls</CardTitle>
                        <CardDescription>Total API requests over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={apiCallsData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ fill: 'hsl(var(--primary))' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Bandwidth */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bandwidth Usage</CardTitle>
                        <CardDescription>Total bandwidth consumption over time (GB)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={bandwidthData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#10b981"
                                        fill="#10b981"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Active Sessions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Active Sessions</CardTitle>
                        <CardDescription>Concurrent active user sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={activeSessionsData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={{ fill: '#f59e0b' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
