import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsService } from '../../../services/adminApi';
import { StatsCard } from '../../admin/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Users, CreditCard, Euro, Activity, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';

interface SAdashboardProps {
    onNavigate: (screen: string) => void;
}

export function SAdashboard({ onNavigate }: SAdashboardProps) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: adminAnalyticsService.getDashboardStats,
    });



    return (
        <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <Button onClick={() => onNavigate('SApackages')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Package
                </Button>
                <Button onClick={() => onNavigate('SAASusers')} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add User
                </Button>
                <Button onClick={() => onNavigate('SAInvoiceForm')} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate Invoice
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    icon={Users}
                    trend={stats?.userTrend}
                    loading={isLoading}
                    onClick={() => onNavigate('SAASusers')}
                />
                <StatsCard
                    title="Active Subscriptions"
                    value={stats?.activeSubscriptions || 0}
                    icon={CreditCard}
                    trend={stats?.subscriptionTrend}
                    loading={isLoading}
                    onClick={() => onNavigate('SAbilling')}
                />
                <StatsCard
                    title="Monthly Revenue"
                    value={`€${stats?.monthlyRevenue?.toLocaleString() || '0'}`}
                    icon={Euro}
                    trend={stats?.revenueTrend}
                    loading={isLoading}
                    onClick={() => onNavigate('SAbilling')}
                />
                <StatsCard
                    title="API Calls"
                    value={stats?.apiCalls?.toLocaleString() || '0'}
                    icon={Activity}
                    trend={stats?.apiCallsTrend}
                    loading={isLoading}
                    onClick={() => onNavigate('SAusage')}
                />
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Revenue Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Monthly revenue for the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stats?.revenueHistory || []}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="month" className="text-micro" />
                                    <YAxis className="text-micro" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                        }}
                                    />
                                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* User Growth Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                        <CardDescription>New users over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={stats?.userGrowthHistory || []}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="month" className="text-micro" />
                                    <YAxis className="text-micro" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="users"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ fill: 'hsl(var(--primary))' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest events and actions in your platform</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                        <div className="space-y-4">
                            {stats.recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                                    <div className="h-10 w-10 rounded-full bg-[#f0f6ff] dark:bg-[#1e3a5f]/30 flex items-center justify-center shrink-0">
                                        <TrendingUp className="h-5 w-5 text-[#2a8fbd] dark:text-[#3d5a80]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-medium">{activity.description}</p>
                                        {activity.userName && (
                                            <p className="text-micro text-muted-foreground mt-1">{activity.userName}</p>
                                        )}
                                        <p className="text-micro text-muted-foreground mt-1">
                                            {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-body text-muted-foreground text-center py-8">
                            No recent activity to display
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
