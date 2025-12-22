import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Invoice } from '../../types/invoice';
import { invoiceService } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Calendar } from '../ui/calendar';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Download,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  X,
  Upload,
  FileUp,
  CalendarIcon,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';

interface InvoiceListProps {
  onSelectInvoice?: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

type SortOption = 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc' | 'numberDesc' | 'numberAsc';
type DateFilter = 'anyDate' | 'last7Days' | 'last30Days' | 'last90Days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'customRange';

export function InvoiceList({ onSelectInvoice, onEditInvoice }: InvoiceListProps) {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('anyDate');
  const [sortBy, setSortBy] = useState<SortOption>('dateDesc');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'ubl-xml' | 'json' | 'csv'>('pdf');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<'draft' | 'validated' | 'sent' | 'paid' | 'cancelled'>('draft');

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await invoiceService.getAll({
        search: searchQuery,
        status: statusFilter,
        dateFilter: dateFilter,
        sort: sortBy,
      });
      setInvoices(data);
    } catch (error) {
      toast.error(t('common.error'), {
        description: 'Failed to fetch invoices',
      });
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [searchQuery, statusFilter, dateFilter, sortBy]);

  // Filter and sort invoices
  // Filter and sort invoices
  // Note: Filtering and sorting are now handled by the backend, but we keep this for client-side pagination if needed
  // or we can remove it if backend handles pagination too.
  // For now, we'll use the fetched invoices directly as they are already filtered/sorted by backend
  const filteredAndSortedInvoices = invoices;

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredAndSortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = () => {
    if (selectedInvoices.size === paginatedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(paginatedInvoices.map((inv) => inv.id!).filter(Boolean)));
    }
  };

  const handleSelectInvoice = (id: string | undefined) => {
    if (!id) return;
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedInvoices(newSelection);
  };

  const handleBulkExport = async () => {
    const count = selectedInvoices.size;
    const selectedInvoicesList = invoices.filter(inv => inv.id && selectedInvoices.has(inv.id));

    try {
      const { exportInvoicesBulk } = await import('../../utils/invoice-export');
      await exportInvoicesBulk(selectedInvoicesList, exportFormat);

      toast.success(t('invoiceList.invoicesExported'), {
        description: t('invoiceList.invoicesExportedDesc', { count: count.toString() }),
      });
      setSelectedInvoices(new Set());
      setShowExportDialog(false);
    } catch (error) {
      toast.error(t('common.error'), {
        description: 'Failed to export invoices',
      });
      console.error('Bulk export error:', error);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedInvoices.size;
    setIsLoading(true);
    try {
      await Promise.all(
        Array.from(selectedInvoices).map(id => invoiceService.delete(id))
      );
      toast.success(t('invoiceList.invoicesDeleted'), {
        description: t('invoiceList.invoicesDeletedDesc', { count: count.toString() }),
      });
      setSelectedInvoices(new Set());
      setShowDeleteDialog(false);
      await fetchInvoices();
    } catch (error) {
      toast.error(t('common.error'), {
        description: 'Failed to delete some invoices',
      });
      console.error('Bulk delete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkStatusChange = () => {
    const count = selectedInvoices.size;
    setInvoices(invoices.map((inv) =>
      inv.id && selectedInvoices.has(inv.id)
        ? { ...inv, status: newStatus, updatedAt: new Date().toISOString() }
        : inv
    ));
    toast.success(t('invoiceList.statusChanged') || 'Status changed successfully', {
      description: `${count} ${t('invoiceList.invoices') || 'invoices'} ${t('invoiceList.statusChangedTo') || 'changed to'} ${t(`status.${newStatus}`)}`,
    });
    setSelectedInvoices(new Set());
    setShowStatusChangeDialog(false);
  };

  const handleDuplicate = (invoice: Invoice) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: Math.random().toString(36).substring(7),
      invoiceNumber: `${invoice.invoiceNumber}-COPY`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvoices([newInvoice, ...invoices]);
    toast.success(t('common.success'), {
      description: `Invoice ${invoice.invoiceNumber} duplicated`,
    });
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!invoice.id) return;
    setIsLoading(true);
    try {
      await invoiceService.delete(invoice.id);
      toast.success(t('common.success'), {
        description: `Invoice ${invoice.invoiceNumber} deleted`,
      });
      await fetchInvoices();
    } catch (error) {
      toast.error(t('common.error'), {
        description: `Failed to delete invoice ${invoice.invoiceNumber}`,
      });
      console.error('Delete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportInvoice = async (invoice: Invoice) => {
    try {
      const { exportInvoice } = await import('../../utils/invoice-export');
      // Default to PDF for quick export
      await exportInvoice(invoice, { format: 'pdf' });
      toast.success(t('common.success'), {
        description: `Invoice ${invoice.invoiceNumber} exported as PDF`,
      });
    } catch (error) {
      toast.error(t('common.error'), {
        description: 'Failed to export invoice',
      });
      console.error('Export error:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error(t('common.error'), {
        description: t('invoiceList.selectFile'),
      });
      return;
    }

    setIsImporting(true);

    try {
      const { importInvoices } = await import('../../utils/invoice-import');
      const { calculateInvoiceTotals } = await import('../../utils/invoice-calculations');

      const result = await importInvoices(selectedFile);

      if (!result.success) {
        toast.error(t('invoiceList.importFailed'), {
          description: result.errors.join(', '),
        });
        setIsImporting(false);
        return;
      }

      // Calculate totals for imported invoices
      const calculatedInvoices = result.invoices.map(inv => calculateInvoiceTotals(inv));

      // Add to existing invoices
      setInvoices([...calculatedInvoices, ...invoices]);

      toast.success(t('invoiceList.importSuccess'), {
        description: t('invoiceList.importSuccessDesc', { count: result.invoices.length.toString() }),
      });

      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.warning(t('common.warning'), {
            description: warning,
          });
        });
      }

      setShowImportDialog(false);
      setSelectedFile(null);
    } catch (error) {
      toast.error(t('invoiceList.importFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const { downloadImportTemplate } = require('../../utils/invoice-import');
    downloadImportTemplate();
    toast.success(t('common.success'), {
      description: 'CSV template downloaded',
    });
  };

  const handleDownloadJSONTemplate = () => {
    const { downloadJSONTemplate } = require('../../utils/invoice-import');
    downloadJSONTemplate();
    toast.success(t('common.success'), {
      description: 'JSON template downloaded',
    });
  };

  const handleDownloadUBLXMLTemplate = () => {
    const { downloadUBLXMLTemplate } = require('../../utils/invoice-import');
    downloadUBLXMLTemplate();
    toast.success(t('common.success'), {
      description: 'UBL XML template downloaded',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'validated':
        return 'outline';
      case 'draft':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-purple-900 dark:text-purple-100 mb-1">{t('invoiceList.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('invoiceList.subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowImportDialog(true)}
          className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          {t('invoiceList.importFile')}
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('invoiceList.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('invoiceList.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('invoiceList.allStatuses')}</SelectItem>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="validated">{t('status.validated')}</SelectItem>
              <SelectItem value="sent">{t('status.sent')}</SelectItem>
              <SelectItem value="paid">{t('status.paid')}</SelectItem>
              <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(value: string) => {
            setDateFilter(value as DateFilter);
          }}>
            <SelectTrigger>
              <SelectValue placeholder={t('invoiceList.filterByDate')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anyDate">{t('invoiceList.anyDate')}</SelectItem>
              <SelectItem value="last7Days">{t('invoiceList.last7Days')}</SelectItem>
              <SelectItem value="last30Days">{t('invoiceList.last30Days')}</SelectItem>
              <SelectItem value="last90Days">{t('invoiceList.last90Days')}</SelectItem>
              <SelectItem value="thisMonth">{t('invoiceList.thisMonth')}</SelectItem>
              <SelectItem value="lastMonth">{t('invoiceList.lastMonth')}</SelectItem>
              <SelectItem value="thisYear">{t('invoiceList.thisYear')}</SelectItem>
              <SelectItem value="customRange">{t('invoiceList.customRange')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'customRange' && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t('invoiceList.from') || 'From'}:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {customDateFrom ? customDateFrom.toLocaleDateString() : t('invoiceList.selectDate') || 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t('invoiceList.to') || 'To'}:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {customDateTo ? customDateTo.toLocaleDateString() : t('invoiceList.selectDate') || 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(customDateFrom || customDateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomDateFrom(undefined);
                    setCustomDateTo(undefined);
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  {t('common.clear') || 'Clear'}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('invoiceList.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateDesc">{t('invoiceList.dateDesc')}</SelectItem>
              <SelectItem value="dateAsc">{t('invoiceList.dateAsc')}</SelectItem>
              <SelectItem value="amountDesc">{t('invoiceList.amountDesc')}</SelectItem>
              <SelectItem value="amountAsc">{t('invoiceList.amountAsc')}</SelectItem>
              <SelectItem value="numberDesc">{t('invoiceList.numberDesc')}</SelectItem>
              <SelectItem value="numberAsc">{t('invoiceList.numberAsc')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Bulk Actions */}
          {selectedInvoices.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedInvoices.size} {t('invoiceList.selected')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusChangeDialog(true)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t('invoiceList.changeStatus') || 'Change Status'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                {t('invoiceList.exportSelected')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {t('invoiceList.deleteSelected')}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedInvoices.size === paginatedInvoices.length && paginatedInvoices.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>{t('editor.invoiceNumber')}</TableHead>
              <TableHead>{t('editor.buyer')}</TableHead>
              <TableHead>{t('editor.issueDate')}</TableHead>
              <TableHead>{t('dashboard.due')}</TableHead>
              <TableHead>{t('editor.amount')}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">{t('invoiceList.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Filter className="h-12 w-12 text-gray-300" />
                    <h3 className="text-gray-900 dark:text-gray-100">{t('invoiceList.noInvoicesFound')}</h3>
                    <p className="text-sm text-gray-500">{t('invoiceList.noInvoicesFoundDesc')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.id || Math.random()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell>
                    <Checkbox
                      checked={invoice.id ? selectedInvoices.has(invoice.id) : false}
                      onCheckedChange={() => handleSelectInvoice(invoice.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => onSelectInvoice?.(invoice)}
                      className="font-medium text-purple-600 hover:text-purple-700 hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </button>
                  </TableCell>
                  <TableCell>{invoice.buyer.name}</TableCell>
                  <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.payableAmount, invoice.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.status || 'draft')}>
                      {t(`status.${invoice.status || 'draft'}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelectInvoice?.(invoice)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('invoiceList.view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditInvoice?.(invoice)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(invoice)}>
                          <Copy className="h-4 w-4 mr-2" />
                          {t('invoiceList.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportInvoice(invoice)}>
                          <Download className="h-4 w-4 mr-2" />
                          {t('editor.export')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(invoice)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredAndSortedInvoices.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{t('invoiceList.showing')}</span>
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>
              <span>{t('invoiceList.paginationTo')}</span>
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredAndSortedInvoices.length)}
              </span>
              <span>{t('invoiceList.of')}</span>
              <span className="font-medium">{filteredAndSortedInvoices.length}</span>
              <span>{t('invoiceList.results')}</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Items per page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('invoiceList.rowsPerPage')}:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value: string) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  {t('invoiceList.page')} {currentPage} {t('invoiceList.of')} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{t('invoiceList.bulkImport')}</DialogTitle>
            <DialogDescription>
              {t('invoiceList.bulkImportDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('invoiceList.selectFile')}</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".json,.csv,.xml"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {selectedFile && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FileUp className="h-3 w-3" />
                    {selectedFile.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Format Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('invoiceList.supportedFormats')}:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
                <li><strong>JSON</strong> - Single invoice object or array of invoices</li>
                <li><strong>CSV</strong> - Invoice line items with metadata (headers required)</li>
                <li><strong>UBL XML</strong> - EN 16931 compliant XML format</li>
              </ul>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-2">
              <p className="text-sm font-medium">{t('invoiceList.importInstructions')}:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('invoiceList.importInstructionsText')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadJSONTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  JSON Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadUBLXMLTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  UBL XML Template
                </Button>
              </div>
            </div>

            {/* Progress Indicator */}
            {isImporting && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md">
                <p className="text-sm text-purple-800 dark:text-purple-200 flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                  {t('invoiceList.processingFile')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setSelectedFile(null);
              }}
              disabled={isImporting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  {t('invoiceList.validating')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('invoiceList.importFile')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Format Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoiceList.bulkExport')}</DialogTitle>
            <DialogDescription>
              {t('invoiceList.bulkExportDesc', { count: selectedInvoices.size.toString() })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF - Human readable documents</SelectItem>
                  <SelectItem value="ubl-xml">UBL XML - EN 16931 compliant</SelectItem>
                  <SelectItem value="json">JSON - Structured data</SelectItem>
                  <SelectItem value="csv">CSV - Spreadsheet format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Each invoice will be downloaded as a separate file.
                Please allow multiple downloads in your browser.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleBulkExport}>
              <Download className="h-4 w-4 mr-2" />
              Export {selectedInvoices.size} Invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invoiceList.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoiceList.confirmDeleteDesc', { count: selectedInvoices.size.toString() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={showStatusChangeDialog} onOpenChange={setShowStatusChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoiceList.changeStatus') || 'Change Invoice Status'}</DialogTitle>
            <DialogDescription>
              {t('invoiceList.changeStatusDesc') || `Change the status of ${selectedInvoices.size} selected invoice(s)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('invoiceList.newStatus') || 'New Status'}</label>
              <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="validated">{t('status.validated')}</SelectItem>
                  <SelectItem value="sent">{t('status.sent')}</SelectItem>
                  <SelectItem value="paid">{t('status.paid')}</SelectItem>
                  <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>{t('common.note') || 'Note'}:</strong> {t('invoiceList.statusChangeNote') || 'This will update the status of all selected invoices. This action can be reverted by changing the status again.'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusChangeDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('invoiceList.updateStatus') || 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
