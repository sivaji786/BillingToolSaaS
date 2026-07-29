import { useState, useEffect, memo } from 'react';
import { Invoice } from '../../types/invoice';
import { letterService } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { hasPermissionSync } from '../../hooks/usePermission';
import { usePagination } from '../../hooks/usePagination';
import { useSelection } from '../../hooks/useSelection';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { SearchBar } from '../ui/SearchBar';
import { TableEmptyState } from '../ui/TableEmptyState';
import { ConfirmDeleteDialog } from '../ui/ConfirmDeleteDialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Plus, MoreVertical, Eye, Edit, Trash2, Download,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportInvoicesBulk } from '../../utils/invoice-export';

interface LetterListProps {
  onSelectLetter?: (letter: Invoice) => void;
  onEditLetter?: (letter: Invoice) => void;
  onNewLetter?: () => void;
}

type SortOption = 'dateDesc' | 'dateAsc' | 'numberDesc' | 'numberAsc';

export function LetterList({ onSelectLetter, onEditLetter, onNewLetter }: LetterListProps) {
  const { t } = useLanguage();
  const [letters, setLetters] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('anyDate');
  const [sortOption, setSortOption] = useState<SortOption>('dateDesc');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedLetters, pageSize: itemsPerPage, setPageSize: setItemsPerPage } = usePagination(letters);
  const paginatedIds = paginatedLetters.map(l => l.id!).filter(Boolean);
  const { selectedIds: selectedLetters, toggleOne, toggleAll: handleSelectAll, clearAll, isAllSelected, isSomeSelected } = useSelection(paginatedIds);
  const handleSelectLetter = (id: string | undefined) => { if (id) toggleOne(id); };

  const fetchLetters = async () => {
    setIsLoading(true);
    try {
      const data = await letterService.getAll({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dateFilter: dateFilter !== 'anyDate' ? dateFilter : undefined,
        sort: sortOption,
      });
      setLetters(data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch letters:', err);
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLetters(); }, [searchQuery, statusFilter, dateFilter, sortOption]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await letterService.delete(deleteTarget.id);
      toast.success(t('common.deleted') || 'Letter deleted');
      setDeleteTarget(null);
      fetchLetters();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleExportSelected = async () => {
    const toExport = letters.filter(l => l.id && selectedLetters.has(l.id));
    if (toExport.length === 0) return;
    try {
      await exportInvoicesBulk(toExport, 'csv');
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleBulkDelete = async () => {
    if (!hasPermissionSync('invoices.delete')) {
      toast.error(t('common.noPermission') || 'No permission');
      return;
    }
    try {
      await Promise.all([...selectedLetters].map(id => letterService.delete(id)));
      toast.success(`${selectedLetters.size} letter(s) deleted`);
      clearAll();
      fetchLetters();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'validated': return 'default';
      case 'sent':      return 'secondary';
      case 'paid':      return 'outline';
      case 'cancelled': return 'destructive';
      default:          return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 font-medium">{t('invoiceList.lettersTitle') || 'Business Letters'}</h1>
          <p className="text-body text-muted-foreground mt-1">
            {t('invoiceList.lettersSubtitle') || 'View and manage all your business letters'}
          </p>
        </div>
        <Button onClick={onNewLetter} className="bg-gradient-to-r from-[#1e3a5f] to-[#f08a3c] text-white gap-2">
          <Plus className="h-4 w-4" />
          {t('editor.newLetter') || 'New Letter'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('invoiceList.searchLetterPlaceholder') || 'Search letters by number, recipient...'}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" aria-label={t('invoiceList.allStatuses') || 'Filter by status'}>
              <SelectValue placeholder={t('invoiceList.allStatuses') || 'All Statuses'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('invoiceList.allStatuses') || 'All Statuses'}</SelectItem>
              <SelectItem value="draft">{t('status.draft')}</SelectItem>
              <SelectItem value="sent">{t('status.sent')}</SelectItem>
              <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]" aria-label={t('invoiceList.anyDate') || 'Filter by date'}>
              <SelectValue placeholder={t('invoiceList.anyDate') || 'Any Date'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anyDate">{t('invoiceList.anyDate') || 'Any Date'}</SelectItem>
              <SelectItem value="last7Days">{t('invoiceList.last7Days') || 'Last 7 days'}</SelectItem>
              <SelectItem value="last30Days">{t('invoiceList.last30Days') || 'Last 30 days'}</SelectItem>
              <SelectItem value="thisMonth">{t('invoiceList.thisMonth') || 'This month'}</SelectItem>
              <SelectItem value="thisYear">{t('invoiceList.thisYear') || 'This year'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOption} onValueChange={v => setSortOption(v as SortOption)}>
            <SelectTrigger className="w-[180px]" aria-label={t('invoiceList.sortBy') || 'Sort letters'}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateDesc">{t('invoiceList.dateDesc') || 'Date (Newest)'}</SelectItem>
              <SelectItem value="dateAsc">{t('invoiceList.dateAsc') || 'Date (Oldest)'}</SelectItem>
              <SelectItem value="numberDesc">{t('invoiceList.numberDesc') || 'Number (Z-A)'}</SelectItem>
              <SelectItem value="numberAsc">{t('invoiceList.numberAsc') || 'Number (A-Z)'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isSomeSelected && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
            <span className="text-body text-muted-foreground">{selectedLetters.size} selected</span>
            <Button variant="outline" size="sm" onClick={handleExportSelected}>
              <Download className="h-4 w-4 mr-2" /> {t('invoiceList.exportSelected') || 'Export Selected'}
            </Button>
            {hasPermissionSync('invoices.delete') && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label={t('invoiceList.selectAll') || 'Select all letters'} />
              </TableHead>
              <TableHead>{t('editor.letterNumber') || 'Letter Number'}</TableHead>
              <TableHead>{t('editor.recipient') || 'Recipient (To)'}</TableHead>
              <TableHead>{t('editor.letterDate') || 'Issue Date'}</TableHead>
              <TableHead>{t('invoiceList.status') || 'Status'}</TableHead>
              <TableHead className="text-right">{t('invoiceList.actions') || 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || paginatedLetters.length === 0 ? (
              <TableEmptyState colSpan={6} isLoading={isLoading} emptyMessage={t('invoiceList.noLettersFound') || 'No letters found'} />
            ) : (
              paginatedLetters.map(letter => (
                <LetterRow
                  key={letter.id}
                  letter={letter}
                  t={t}
                  isSelected={letter.id ? selectedLetters.has(letter.id) : false}
                  onSelect={handleSelectLetter}
                  onView={() => onSelectLetter?.(letter)}
                  onEdit={() => onEditLetter?.(letter)}
                  onDelete={() => setDeleteTarget(letter)}
                  hasDeletePermission={hasPermissionSync('invoices.delete')}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                />
              ))
            )}
          </TableBody>
        </Table>

        {letters.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-2 text-body text-muted-foreground">
              <span>{t('invoiceList.showing') || 'Showing'}</span>
              <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              <span>{t('invoiceList.paginationTo') || 'to'}</span>
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, letters.length)}</span>
              <span>{t('invoiceList.of') || 'of'}</span>
              <span className="font-medium">{letters.length}</span>
              <span>{t('invoiceList.results') || 'results'}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-body text-muted-foreground">{t('invoiceList.rowsPerPage') || 'Rows per page'}:</span>
                <Select value={itemsPerPage.toString()} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-body text-muted-foreground">
                {t('invoiceList.page') || 'Page'} {currentPage} {t('invoiceList.of') || 'of'} {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete') || 'Delete Letter'}
        description={t('invoiceList.confirmDeleteDesc') || 'This action cannot be undone.'}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}

const LetterRow = memo(function LetterRow({ letter, t, isSelected, onSelect, onView, onEdit, onDelete, hasDeletePermission, getStatusBadgeVariant }: {
  letter: Invoice;
  t: (key: string) => string;
  isSelected: boolean;
  onSelect: (id: string | undefined) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  hasDeletePermission: boolean;
  getStatusBadgeVariant: (status: string) => any;
}) {
  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={() => onSelect(letter.id)} />
      </TableCell>
      <TableCell>
        <button onClick={onView} className="font-medium text-[#2a8fbd] hover:text-[#1e3a5f] hover:underline text-left">
          {letter.invoiceNumber || <span className="text-muted-foreground italic font-normal">No number</span>}
        </button>
      </TableCell>
      <TableCell>{letter.buyer?.name || '—'}</TableCell>
      <TableCell>{letter.issueDate ? new Date(letter.issueDate).toLocaleDateString() : '—'}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(letter.status || 'draft')}>
          {t(`status.${letter.status || 'draft'}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />{t('invoiceList.view')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />{t('common.edit')}
            </DropdownMenuItem>
            {hasDeletePermission && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />{t('common.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
