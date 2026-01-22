import { useQuery } from '@tanstack/react-query';
import { adminUserService } from '../../../services/adminApi';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { ArrowLeft, Mail, Calendar, CreditCard, Database, Zap, Activity, Ban, CheckCircle, Bell, FileText, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SAUserDetailsProps {
    userId: string;
    onNavigate: (screen: string) => void;
}

export function SAUserDetails({ userId, onNavigate }: SAUserDetailsProps) {
    const { data: user, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => adminUserService.getById(userId),
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => onNavigate('SAASusers')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => onNavigate('SAASusers')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-2xl font-bold">User Not Found</h2>
                </div>
            </div>
        );
    }

    // Mock data
    const usageData = [
        { date: '2024-01', storage: 2.1, apiCalls: 1200, bandwidth: 45 },
        { date: '2024-02', storage: 2.8, apiCalls: 1500, bandwidth: 52 },
        { date: '2024-03', storage: 3.2, apiCalls: 1800, bandwidth: 58 },
        { date: '2024-04', storage: 3.5, apiCalls: 2100, bandwidth: 65 },
        { date: '2024-05', storage: 4.2, apiCalls: 2400, bandwidth: 72 },
        { date: '2024-06', storage: 4.8, apiCalls: 2800, bandwidth: 78 },
    ];

    const invoices = [
        { id: 'INV-001', date: '2024-06-01', amount: 29.99, status: 'paid' },
        { id: 'INV-002', date: '2024-05-01', amount: 29.99, status: 'paid' },
        { id: 'INV-003', date: '2024-04-01', amount: 29.99, status: 'paid' },
        { id: 'INV-004', date: '2024-03-01', amount: 29.99, status: 'overdue' },
    ];

    const handleSendReminder = () => {
        toast.success('Payment reminder sent successfully');
    };

    const handleSuspend = () => {
        toast.success('User suspended successfully');
    };

    const handleActivate = () => {
        toast.success('User activated successfully');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => onNavigate('SAASusers')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <p className="text-sm text-muted-foreground">Complete user profile and billing information</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSendReminder}>
                        <Bell className="h-4 w-4 mr-2" />
                        Send Reminder
                    </Button>
                    {user.status === 'active' ? (
                        <Button variant="outline" size="sm" onClick={handleSuspend}>
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleActivate}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Activate
                        </Button>
                    )}
                </div>
            </div>

            {/* User Information & Subscription */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>User Information</CardTitle>
                        <CardDescription>Basic account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Joined Date</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(user.joinedDate), 'MMM dd, yyyy')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Status</p>
                                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                    {user.status}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Subscription Details</CardTitle>
                        <CardDescription>Current package and billing cycle</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Current Package</p>
                                <p className="text-sm text-muted-foreground">{user.packageId || 'Starter Plan'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Subscription Start</p>
                                <p className="text-sm text-muted-foreground">Jan 15, 2024</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Next Billing Date</p>
                                <p className="text-sm text-muted-foreground">Jul 15, 2024</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Monthly Amount</p>
                                <p className="text-sm font-bold">€29.99</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Information</CardTitle>
                    <CardDescription>Billing details and payment method</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm font-medium mb-1">Payment Method</p>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Visa ending in 4242</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">Billing Email</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">Auto-Renewal</p>
                            <Badge variant="default">Enabled</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Invoice History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Invoice History</CardTitle>
                            <CardDescription>Past billing and payment records</CardDescription>
                        </div>
                        <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            Export All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.id}</TableCell>
                                    <TableCell>{format(new Date(invoice.date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell>€{invoice.amount}</TableCell>
                                    <TableCell>
                                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Usage Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.8 GB</div>
                        <p className="text-xs text-muted-foreground">of 10 GB limit</p>
                        <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: '48%' }} />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">2,847</div>
                        <p className="text-xs text-muted-foreground">this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">78 GB</div>
                        <p className="text-xs text-muted-foreground">this month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Usage Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Storage Usage Trend</CardTitle>
                        <CardDescription>Storage consumption over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={usageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="storage" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>API Calls Trend</CardTitle>
                        <CardDescription>API usage over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={usageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="apiCalls" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
