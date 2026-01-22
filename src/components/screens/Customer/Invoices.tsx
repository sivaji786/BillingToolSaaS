import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '../../../services/customerApi';
import { useAuthStore } from '../../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Search, Download, FileText } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';
import { format } from 'date-fns';
import { generateInvoicePDF } from '../../../utils/invoice-pdf';
import { toast } from 'sonner';
import { useLanguage } from '../../../contexts/LanguageContext';

interface CustomerInvoicesProps {
    onNavigate: (screen: string, params?: { invoiceId?: string }) => void;
}

export function CustomerInvoices({ onNavigate }: CustomerInvoicesProps) {
    const { t } = useLanguage();
    const token = useAuthStore((state) => state.token);
    const [filters, setFilters] = useState({ page: 1, limit: 10, status: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['customer-invoices', filters],
        queryFn: () => customerService.getInvoices(token!, filters),
        enabled: !!token,
    });

    const handleDownload = async (invoiceId: string) => {
        try {
            toast.loading(t('common.generatingPdf') || 'Generating PDF...');
            const fullInvoice = await customerService.getInvoice(token!, invoiceId);

            // Generate PDF with the improved styling
            await generateInvoicePDF(fullInvoice, undefined, undefined);
            // Note: Template and Profile can be fetched if needed, but for customer view, 
            // often the invoice object itself contains necessary embedded details or we rely on defaults.
            // If the invoice lacks seller/buyer info, we might need a fallback, but getInvoice usually returns full graph.

            toast.dismiss();
            toast.success(t('common.downloaded') || 'Invoice downloaded');
        } catch (error) {
            console.error('Download error:', error);
            toast.dismiss();
            toast.error(t('common.error') || 'Failed to download invoice');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Invoices</h1>
                <p className="text-muted-foreground">
                    View and download your billing history
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>All Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoices..."
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value: string) =>
                                setFilters({ ...filters, status: value === 'all' ? '' : value, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
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
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.data && data.data.length > 0 ? (
                                            data.data.map((invoice: any) => (
                                                <TableRow key={invoice.id}>
                                                    <TableCell className="font-medium">
                                                        {invoice.invoice_number}
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                                                    </TableCell>
                                                    <TableCell>
                                                        €{invoice.total || 0}
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
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onNavigate('invoice-detail', { invoiceId: invoice.id })}
                                                            >
                                                                <FileText className="h-4 w-4 mr-1" />
                                                                View
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDownload(invoice.id)}
                                                            >
                                                                <Download className="h-4 w-4 mr-1" />
                                                                PDF
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No invoices found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {data?.pagination && data.pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Page {data.pagination.currentPage} of {data.pagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={data.pagination.currentPage === 1}
                                            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={data.pagination.currentPage === data.pagination.totalPages}
                                            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
