import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useLanguage } from '../../contexts/LanguageContext';
import { Invoice } from '../../types/invoice';
import { invoiceService } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { useSelection } from '../../hooks/useSelection';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { hasPermissionSync } from '../../hooks/usePermission';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { SearchBar } from '../ui/SearchBar';
import { TableEmptyState } from '../ui/TableEmptyState';
import { ConfirmDeleteDialog } from '../ui/ConfirmDeleteDialog';
import { memo } from 'react';
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
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Download,
  Copy,
  Share2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Upload,
  Plus,
  FileUp,
  CalendarIcon,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';


interface InvoiceListProps {
  onSelectInvoice?: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onNewInvoice?: () => void;
  templateType?: 'invoice' | 'business_letter';
}

type SortOption = 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc' | 'numberDesc' | 'numberAsc';
type DateFilter = 'anyDate' | 'last7Days' | 'last30Days' | 'last90Days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'customRange';

export function InvoiceList({ onSelectInvoice, onEditInvoice, onNewInvoice, templateType }: InvoiceListProps) {
  const { t } = useLanguage();
  const isLetter = templateType === 'business_letter';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'workhub' | 'manual'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('anyDate');
  const [sortBy, setSortBy] = useState<SortOption>('dateDesc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'ubl-xml' | 'json' | 'csv'>('pdf');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<'draft' | 'validated' | 'sent' | 'paid' | 'cancelled' | 'overdue'>('draft');

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await invoiceService.getAll({
        search: debouncedSearch,
        status: statusFilter,
        dateFilter: dateFilter,
        ...(dateFilter === 'customRange' && customDateFrom && { customDateFrom: customDateFrom.toISOString().split('T')[0] }),
        ...(dateFilter === 'customRange' && customDateTo   && { customDateTo:   customDateTo.toISOString().split('T')[0] }),
        sort: sortBy,
        templateType: templateType,
        ...(sourceFilter !== 'all' && { source: sourceFilter }),
      });
      setInvoices(data);
    } catch (error) {
      toast.error(t('common.error'), {
        description: t('invoiceList.fetchError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearch, statusFilter, sourceFilter, dateFilter, customDateFrom, customDateTo, sortBy, templateType]);

  const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedInvoices, pageSize: itemsPerPage, setPageSize: setItemsPerPage } = usePagination(invoices);
  const paginatedIds = paginatedInvoices.map(inv => inv.id!).filter(Boolean);
  const { selectedIds: selectedInvoices, toggleOne, toggleAll: handleSelectAll, clearAll: clearSelection, isAllSelected, isSomeSelected } = useSelection(paginatedIds);
  const handleSelectInvoice = (id: string | undefined) => { if (id) toggleOne(id); };

  const handleBulkExport = async () => {
    const count = selectedInvoices.size;
    const selectedInvoicesList = invoices.filter(inv => inv.id && selectedInvoices.has(inv.id));

    try {
      const { exportInvoicesBulk } = await import('../../utils/invoice-export');
      await exportInvoicesBulk(selectedInvoicesList, exportFormat);

      toast.success(t('invoiceList.invoicesExported'), {
        description: t('invoiceList.invoicesExportedDesc', { count: count.toString() }),
      });
      clearSelection();
      setShowExportDialog(false);
    } catch (error) {
      toast.error(t('common.error'), {
        description: t('invoiceList.exportError'),
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
      clearSelection();
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

  const handleBulkStatusChange = async () => {
    const count = selectedInvoices.size;
    const selectedList = invoices.filter(inv => inv.id && selectedInvoices.has(inv.id));
    setIsLoading(true);
    try {
      await Promise.all(
        selectedList.map(inv => invoiceService.update(inv.id!, { ...inv, status: newStatus }))
      );
      toast.success(t('invoiceList.statusChanged'), {
        description: t('invoiceList.statusChangedDesc', {
          count: count.toString(),
          status: t(`status.${newStatus}`)
        }),
      });
      clearSelection();
      setShowStatusChangeDialog(false);
      await fetchInvoices();
    } catch {
      toast.error(t('common.error'), {
        description: 'Failed to update status for some invoices',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (invoice: Invoice) => {
    try {
      const { shareUrl } = await invoiceService.generateShareLink(invoice.id);
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard', { description: shareUrl });
    } catch {
      toast.error('Failed to generate share link');
    }
  };

  const handleDuplicate = async (invoice: Invoice) => {
    const copy: Invoice = {
      ...invoice,
      id: undefined as any,
      invoiceNumber: `${invoice.invoiceNumber}-COPY-${String(Date.now()).slice(-6)}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await invoiceService.create(copy);
      toast.success(t('common.success'), {
        description: `Invoice ${invoice.invoiceNumber} duplicated`,
      });
      await fetchInvoices();
    } catch {
      toast.error(t('common.error'), {
        description: `Failed to duplicate invoice ${invoice.invoiceNumber}`,
      });
    }
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
        description: `Failed to delete invoice ${invoice.invoiceNumber} `,
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

      // Persist each invoice to the DB
      const failed: string[] = [];
      for (const inv of calculatedInvoices) {
        try {
          await invoiceService.create(inv);
        } catch {
          failed.push(inv.invoiceNumber || 'Unknown');
        }
      }

      const savedCount = calculatedInvoices.length - failed.length;
      toast.success(t('invoiceList.importSuccess'), {
        description: t('invoiceList.importSuccessDesc', { count: savedCount.toString() }),
      });

      if (failed.length > 0) {
        toast.warning(t('common.warning'), {
          description: `${failed.length} invoice(s) failed to save: ${failed.join(', ')}`,
        });
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.warning(t('common.warning'), {
            description: warning,
          });
        });
      }

      setShowImportDialog(false);
      setSelectedFile(null);
      await fetchInvoices();
    } catch (error) {
      toast.error(t('invoiceList.importFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const { downloadImportTemplate } = await import('../../utils/invoice-import');
    downloadImportTemplate();
    toast.success(t('common.success'), { description: 'CSV template downloaded' });
  };

  const handleDownloadJSONTemplate = async () => {
    const { downloadJSONTemplate } = await import('../../utils/invoice-import');
    downloadJSONTemplate();
    toast.success(t('common.success'), { description: 'JSON template downloaded' });
  };

  const handleDownloadUBLXMLTemplate = async () => {
    const { downloadUBLXMLTemplate } = await import('../../utils/invoice-import');
    downloadUBLXMLTemplate();
    toast.success(t('common.success'), { description: 'UBL XML template downloaded' });
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
          <h1 className="text-purple-900 dark:text-purple-100 mb-1">
            {t(isLetter ? 'invoiceList.lettersTitle' : 'invoiceList.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t(isLetter ? 'invoiceList.lettersSubtitle' : 'invoiceList.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onNewInvoice}
            className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t(isLetter ? 'editor.newLetter' : 'dashboard.newInvoice')}
          </Button>
          {!isLetter && (
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('invoiceList.importFile')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t(isLetter ? 'invoiceList.searchLetterPlaceholder' : 'invoiceList.searchPlaceholder')}
              className="w-full"
            />
          </div>

          {/* Source Filter — WH-060 */}
          {!isLetter && (
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as 'all' | 'workhub' | 'manual')}>
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="workhub">WorkHub</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          )}

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
              <SelectItem value="overdue">{t('status.overdue')}</SelectItem>
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
                <label className="text-body font-medium">{t('invoiceList.from')}:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {customDateFrom ? customDateFrom.toLocaleDateString() : t('invoiceList.selectDate')}
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
                <label className="text-body font-medium">{t('invoiceList.to')}:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {customDateTo ? customDateTo.toLocaleDateString() : t('invoiceList.selectDate')}
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
                  {t('common.clear')}
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
              <span className="text-body text-gray-600">
                {selectedInvoices.size} {t('invoiceList.selected')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusChangeDialog(true)}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t('invoiceList.changeStatus')}
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
              <TableHead>{isLetter ? t('editor.letterNumber') : t('editor.invoiceNumber')}</TableHead>
              <TableHead>{isLetter ? t('editor.recipient') : t('editor.buyer')}</TableHead>
              <TableHead>{t('editor.issueDate')}</TableHead>
              <TableHead>{t('dashboard.due')}</TableHead>
              <TableHead>{t('editor.amount')}</TableHead>
              <TableHead>{t('editor.status')}</TableHead>
              <TableHead className="text-right">{t('invoiceList.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-body text-gray-500">{t('common.loading')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Filter className="h-12 w-12 text-gray-300" />
                    <h3 className="text-gray-900 dark:text-gray-100">
                      {t(isLetter ? 'invoiceList.noLettersFound' : 'invoiceList.noInvoicesFound')}
                    </h3>
                    <p className="text-body text-gray-500">
                      {t(isLetter ? 'invoiceList.noLettersFoundDesc' : 'invoiceList.noInvoicesFoundDesc')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id ?? invoice.invoiceNumber ?? String(invoice.issueDate) + String(invoice.buyer?.name)}
                  invoice={invoice}
                  t={t}
                  isSelected={invoice.id ? selectedInvoices.has(invoice.id) : false}
                  onSelect={(id) => handleSelectInvoice(id)}
                  onView={() => onSelectInvoice?.(invoice)}
                  onEdit={() => onEditInvoice?.(invoice)}
                  onDuplicate={() => handleDuplicate(invoice)}
                  onShare={() => handleShare(invoice)}
                  onExport={() => handleExportInvoice(invoice)}
                  onDelete={() => handleDelete(invoice)}
                  hasDeletePermission={hasPermissionSync('invoices.delete')}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  formatCurrency={formatCurrency}
                />
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {invoices.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-2 text-body text-gray-600">
              <span>{t('invoiceList.showing')}</span>
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>
              <span>{t('invoiceList.paginationTo')}</span>
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, invoices.length)}
              </span>
              <span>{t('invoiceList.of')}</span>
              <span className="font-medium">{invoices.length}</span>
              <span>{t('invoiceList.results')}</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Items per page */}
              <div className="flex items-center gap-2">
                <span className="text-body text-gray-600">{t('invoiceList.rowsPerPage')}:</span>
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
                <span className="text-body text-gray-600">
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
              <label className="text-body font-medium">{t('invoiceList.selectFile')}</label>
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
              <p className="text-body font-medium text-blue-900 dark:text-blue-100">
                {t('invoiceList.supportedFormats')}:
              </p>
              <ul className="text-body text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
                <li><strong>JSON</strong> - Single invoice object or array of invoices</li>
                <li><strong>CSV</strong> - Invoice line items with metadata (headers required)</li>
                <li><strong>UBL XML</strong> - EN 16931 compliant XML format</li>
              </ul>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-2">
              <p className="text-body font-medium">{t('invoiceList.importInstructions')}:</p>
              <p className="text-body text-gray-600 dark:text-gray-400">
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
                <p className="text-body text-purple-800 dark:text-purple-200 flex items-center gap-2">
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
              <label className="text-body font-medium">Export Format</label>
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

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-body">
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
              Export {selectedInvoices.size} {isLetter ? 'Letters' : 'Invoices'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleBulkDelete}
        title={t('invoiceList.confirmDelete')}
        description={t('invoiceList.confirmDeleteDesc', { count: selectedInvoices.size.toString() })}
        confirmLabel={t('common.delete')}
      />

      {/* Bulk Status Change Dialog */}
      <Dialog open={showStatusChangeDialog} onOpenChange={setShowStatusChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isLetter ? 'Change Letter Status' : (t('invoiceList.changeStatus') || 'Change Invoice Status')}
            </DialogTitle>
            <DialogDescription>
              {`Change the status of ${selectedInvoices.size} selected ${isLetter ? 'letter(s)' : 'invoice(s)'}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-body font-medium">{t('invoiceList.newStatus') || 'New Status'}</label>
              <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="validated">{t('status.validated')}</SelectItem>
                  <SelectItem value="sent">{t('status.sent')}</SelectItem>
                  <SelectItem value="overdue">{t('status.overdue')}</SelectItem>
                  <SelectItem value="paid">{t('status.paid')}</SelectItem>
                  <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-body">
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

const InvoiceRow = memo(({
  invoice,
  t,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDuplicate,
  onShare,
  onExport,
  onDelete,
  hasDeletePermission,
  getStatusBadgeVariant,
  formatCurrency
}: {
  invoice: Invoice;
  t: (key: string) => string;
  isSelected: boolean;
  onSelect: (id: string | undefined) => void;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onExport: () => void;
  onDelete: () => void;
  hasDeletePermission: boolean;
  getStatusBadgeVariant: (status: string) => any;
  formatCurrency: (amount: number, currency: string) => string;
}) => {
  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(invoice.id)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            onClick={invoice.templateType === 'business_letter' ? onEdit : onView}
            className="font-medium text-purple-600 hover:text-purple-700 hover:underline text-left"
          >
            {invoice.invoiceNumber || <span className="text-muted-foreground italic font-normal">No number</span>}
          </button>
          {(invoice as any).source === 'workhub' && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-caption px-1.5 py-0">
              WorkHub
            </Badge>
          )}
        </div>
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
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              {t('invoiceList.view')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              {t('invoiceList.duplicate')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share (copy link)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              {t('editor.export')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {hasDeletePermission && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
