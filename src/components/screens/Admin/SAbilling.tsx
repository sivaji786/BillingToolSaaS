import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminBillingService } from '../../../services/adminApi';
import { InvoiceFilters } from '../../../types/admin';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Search, Download, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../../ui/skeleton';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SAbilling() {
    const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, limit: 10 });

    const { data: invoicesData, isLoading } = useQuery({
        queryKey: ['invoices', filters],
        queryFn: () => adminBillingService.getInvoices(filters),
    });

    const { data: revenueData } = useQuery({
        queryKey: ['revenue', 'monthly'],
        queryFn: () => adminBillingService.getRevenue('monthly'),
    });

    const handleDownloadPdf = async (invoiceId: string) => {
        try {
            const blob = await adminBillingService.downloadPdf(invoiceId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${invoiceId}.pdf`;
            a.click();
            toast.success('Invoice downloaded successfully');
        } catch (error) {
            toast.error('Failed to download invoice');
        }
    };



    return (
        <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            €{revenueData?.totalRevenue?.toLocaleString() || '0'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
                            {revenueData?.growth || '+0%'} from last period
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{revenueData?.paidInvoices || 0}</div>
                        <p className="text-xs text-muted-foreground">Last 6 months</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{revenueData?.pendingInvoices || 0}</div>
                        <p className="text-xs text-muted-foreground">Awaiting payment</p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                    <CardDescription>Monthly revenue over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueData?.monthlyData || []}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis className="text-xs" />
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
                </CardContent>
            </Card>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoices..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value) =>
                                setFilters({ ...filters, status: value === 'all' ? undefined : value as any, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.sortBy || 'issueDate'}
                            onValueChange={(value) => setFilters({ ...filters, sortBy: value as any })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="invoiceNumber">Invoice Number</SelectItem>
                                <SelectItem value="amount">Amount</SelectItem>
                                <SelectItem value="issueDate">Issue Date</SelectItem>
                                <SelectItem value="dueDate">Due Date</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Invoices Table */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Issue Date</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoicesData?.data.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{invoice.userName}</p>
                                                    <p className="text-sm text-muted-foreground">{invoice.userEmail}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                €{invoice.amount.toFixed(2)} {invoice.currency}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        invoice.status === 'paid'
                                                            ? 'default'
                                                            : invoice.status === 'overdue'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                    }
                                                >
                                                    {invoice.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(invoice.issueDate), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownloadPdf(invoice.id)}
                                                >
                                                    <Download className="h-4 w-4 mr-1" />
                                                    PDF
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {invoicesData && invoicesData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Page {invoicesData.pagination.currentPage} of {invoicesData.pagination.totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={invoicesData.pagination.currentPage === 1}
                                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={invoicesData.pagination.currentPage === invoicesData.pagination.totalPages}
                                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
