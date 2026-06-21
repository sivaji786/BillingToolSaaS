import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../../hooks/useDebounce';
import { adminBillingService, adminSettingsService } from '../../../services/adminApi';
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
import { generateInvoicePDF } from '../../../utils/invoice-pdf';
import { Invoice as FullInvoice } from '../../../types/invoice';

export function SAbilling() {
    const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, limit: 10 });
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 400);

    useEffect(() => {
        setFilters(prev => ({ ...prev, page: 1 }));
    }, [debouncedSearch]);

    const activeFilters = { ...filters, search: debouncedSearch || undefined };

    const { data: invoicesData, isLoading } = useQuery({
        queryKey: ['invoices', activeFilters],
        queryFn: () => adminBillingService.getInvoices(activeFilters),
    });

    const { data: revenueData } = useQuery({
        queryKey: ['revenue', 'monthly'],
        queryFn: () => adminBillingService.getRevenue('monthly'),
    });

    const { data: settings } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: () => adminSettingsService.getSettings(),
        staleTime: 60 * 60 * 1000,
    });

    const handleDownloadPdf = async (invoiceId: string) => {
        const invoice = invoicesData?.data.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        const cd = settings?.companyDetails;

        try {
            const toastId = toast.loading('Generating PDF...');

            // Map simplified admin Invoice to the FullInvoice format required by the PDF generator
            const fullInvoice: FullInvoice = {
                id: String(invoice.id),
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                currency: invoice.currency,
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
                    name: invoice.userName,
                    address: { street: "", city: "", postalCode: "", country: "" },
                    contactEmail: invoice.userEmail
                },
                lines: [
                    {
                        id: '1',
                        description: `Subscription - ${invoice.invoiceNumber}`,
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
                status: invoice.status === 'paid' ? 'paid' : 'sent',
                note: "Generated via Super Admin Portal"
            };

            await generateInvoicePDF(fullInvoice);
            toast.dismiss(toastId);
            toast.success('Invoice generated and downloaded');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF');
        }
    };



    return (
        <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-body font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-heading-1 font-medium">
                            €{revenueData?.totalRevenue?.toLocaleString() || '0'}
                        </div>
                        <p className="text-micro text-muted-foreground">
                            <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
                            {revenueData?.growth || '+0%'} from last period
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-body font-medium">Paid Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-heading-1 font-medium">{revenueData?.paidInvoices || 0}</div>
                        <p className="text-micro text-muted-foreground">Last 6 months</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-body font-medium">Pending Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-heading-1 font-medium">{revenueData?.pendingInvoices || 0}</div>
                        <p className="text-micro text-muted-foreground">Awaiting payment</p>
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
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value: string) =>
                                setFilters({ ...filters, status: value === 'all' ? undefined : value as InvoiceFilters['status'], page: 1 })
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
                            onValueChange={(value: string) => setFilters({ ...filters, sortBy: value as InvoiceFilters['sortBy'] })}
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
                                                    <p className="text-body text-muted-foreground">{invoice.userEmail}</p>
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
                            <p className="text-body text-muted-foreground">
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
