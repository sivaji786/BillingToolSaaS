import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUserService } from '../../../services/adminApi';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { ArrowLeft, Mail, Calendar, Activity, Ban, CheckCircle, Bell, FileText, Download, Key } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';

import { format } from 'date-fns';
import { toast } from 'sonner';
import { adminBillingService, adminSettingsService } from '../../../services/adminApi';
import { generateInvoicePDF } from '../../../utils/invoice-pdf';
import { Invoice as FullInvoice } from '../../../types/invoice';

interface SAUserDetailsProps {
    userId: string;
    onNavigate: (screen: string) => void;
}


export function SAUserDetails({ userId, onNavigate }: SAUserDetailsProps) {
    // All hooks must be called unconditionally at the top
    const { data: user, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => adminUserService.getById(userId),
    });

    const { data: invoicesData } = useQuery({
        queryKey: ['user-invoices', userId],
        queryFn: async () => {
            return adminBillingService.getInvoices({ userId, limit: 10 });
        },
        enabled: !!userId,
    });

    const { data: settings } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: adminSettingsService.getSettings,
    });

    const queryClient = useQueryClient();

    const suspendMutation = useMutation({
        mutationFn: (userId: string) => adminUserService.suspend(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', userId] });
            toast.success('User suspended successfully');
        },
    });

    const activateMutation = useMutation({
        mutationFn: (userId: string) => adminUserService.activate(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', userId] });
            toast.success('User activated successfully');
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: (userId: string) => adminUserService.resetPassword(userId),
        onSuccess: () => {
            toast.success('Password reset to "password123" successfully');
        },
        onError: () => {
            toast.error('Failed to reset password');
        }
    });

    const invoices = invoicesData?.data || [];

    // Now conditional returns are safe
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

    const handleSendReminder = () => {
        toast.success('Payment reminder sent successfully');
    };

    const handleSuspend = () => {
        suspendMutation.mutate(userId);
    };

    const handleActivate = () => {
        activateMutation.mutate(userId);
    };

    const handleDownloadPdf = async (invoice: any) => {
        try {
            const toastId = toast.loading('Generating PDF...');

            const cd = settings?.companyDetails;

            const fullInvoice: FullInvoice = {
                id: String(invoice.id),
                invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
                issueDate: invoice.issueDate || new Date().toISOString(),
                dueDate: invoice.dueDate,
                currency: invoice.currency || 'EUR',
                seller: {
                    name: cd?.name || "BillingTool Platform",
                    address: {
                        street: cd?.address?.street || "123 Business Avenue",
                        city: cd?.address?.city || "Antwerp",
                        postalCode: cd?.address?.postalCode || "2000",
                        country: cd?.address?.country || "BE"
                    },
                    contactEmail: cd?.email,
                    contactPhone: cd?.phone,
                    vatId: cd?.vatId
                },
                buyer: {
                    name: user.name,
                    address: { street: "", city: "", postalCode: "", country: "" },
                    contactEmail: user.email
                },
                lines: [
                    {
                        id: '1',
                        description: `Subscription Fee - ${invoice.invoiceNumber || invoice.id}`,
                        quantity: 1,
                        unitCode: 'EA',
                        unitPrice: invoice.amount,
                        taxCategory: 'S',
                        taxPercent: 0
                    }
                ],
                taxTotals: [],
                lineExtensionAmount: invoice.amount,
                taxExclusiveAmount: invoice.amount,
                taxInclusiveAmount: invoice.amount,
                payableAmount: invoice.amount,
                paymentMeans: cd?.bankDetails ? {
                    type: 'BankTransfer',
                    iban: cd.bankDetails.iban,
                    bic: cd.bankDetails.bic,
                    accountName: cd.bankDetails.accountName,
                } : undefined,
                status: invoice.status === 'paid' ? 'paid' : 'sent'
            };

            await generateInvoicePDF(fullInvoice);
            toast.dismiss(toastId);
            toast.success('Invoice downloaded successfully');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF');
        }
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to reset the tenant admin password to "password123"?')) {
                                resetPasswordMutation.mutate(user.id);
                            }
                        }}
                    >
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                    </Button>
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
                                    {user.joinedDate ? format(new Date(user.joinedDate), 'MMM dd, yyyy') : 'N/A'}
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
                    <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <p className="text-lg font-semibold text-muted-foreground">Coming Soon</p>
                            <p className="text-sm text-muted-foreground mt-1">Subscription details will be available soon</p>
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
                <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <p className="text-lg font-semibold text-muted-foreground">Coming Soon</p>
                        <p className="text-sm text-muted-foreground mt-1">Payment information will be available soon</p>
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
                            {invoices.map((invoice: any) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.invoiceNumber || invoice.id}</TableCell>
                                    <TableCell>
                                        {(invoice.issueDate || invoice.date)
                                            ? format(new Date(invoice.issueDate || invoice.date), 'MMM dd, yyyy')
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell>€{invoice.amount}</TableCell>
                                    <TableCell>
                                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPdf(invoice)}>
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                    <CardDescription>Storage, API calls, and bandwidth metrics</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <p className="text-lg font-semibold text-muted-foreground">Coming Soon</p>
                        <p className="text-sm text-muted-foreground mt-1">Usage statistics will be available soon</p>
                    </div>
                </CardContent>
            </Card>

            {/* Usage Charts */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage Trends</CardTitle>
                    <CardDescription>Storage and API usage over time</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <p className="text-lg font-semibold text-muted-foreground">Coming Soon</p>
                        <p className="text-sm text-muted-foreground mt-1">Usage trend charts will be available soon</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
