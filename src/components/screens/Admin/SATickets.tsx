import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTicketService } from '../../../services/adminApi';
import { Card, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { format } from 'date-fns';
import { Loader2, Search, ExternalLink, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, CheckSquare, X } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/config';
import { Ticket } from '../../../types/admin';
import { useLanguage } from '../../../contexts/LanguageContext';
import { toast } from 'sonner';

type SortColumn = 'created_at' | 'subject' | 'description' | 'client_ip' | 'status' | 'priority';
type SortDirection = 'asc' | 'desc';

interface SATicketsProps {
    onNavigate: (screen: string, params?: { ticketId?: string }) => void;
}

export function SATickets({ onNavigate }: SATicketsProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { t } = useLanguage();

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ['admin-tickets'],
        queryFn: adminTicketService.getTickets,
    });

    const { data: adminStaff = [] } = useQuery({
        queryKey: ['admin-staff'],
        queryFn: adminTicketService.getAdminStaff,
    });

    const bulkMutation = useMutation({
        mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
            adminTicketService.bulkUpdateTickets(ids, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
            setSelectedIds(new Set());
            toast.success('Tickets updated successfully');
        },
        onError: () => toast.error('Failed to update tickets'),
    });

    const getAssigneeName = (assignedTo?: number | null) => {
        if (!assignedTo) return null;
        return adminStaff.find(a => a.id === assignedTo)?.name ?? null;
    };

    // 1. Filter
    const filteredTickets = tickets.filter(ticket =>
        ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.client_ip?.includes(searchQuery) ||
        ticket.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.priority?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Sort
    const sortedTickets = [...filteredTickets].sort((a, b) => {
        const valA: string = (a[sortColumn] as string) || '';
        const valB: string = (b[sortColumn] as string) || '';
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // 3. Paginate
    const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);
    const paginatedTickets = sortedTickets.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc'
            ? <ArrowUp className="inline ml-1 h-4 w-4" />
            : <ArrowDown className="inline ml-1 h-4 w-4" />;
    };

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = getApiBaseUrl().replace(/\/index\.php\/?$/, '');
        return `${baseUrl}/${path.replace(/^\//, '')}`;
    };

    const handleRowClick = (ticket: Ticket) => {
        onNavigate('SATicketDetails', { ticketId: ticket.id });
    };

    // Selection helpers
    const isAllSelected = paginatedTickets.length > 0 &&
        paginatedTickets.every(t => selectedIds.has(t.id));
    const isIndeterminate = paginatedTickets.some(t => selectedIds.has(t.id)) && !isAllSelected;

    const toggleAll = () => {
        if (isAllSelected) {
            const next = new Set(selectedIds);
            paginatedTickets.forEach(t => next.delete(t.id));
            setSelectedIds(next);
        } else {
            const next = new Set(selectedIds);
            paginatedTickets.forEach(t => next.add(t.id));
            setSelectedIds(next);
        }
    };

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleBulk = (status: string) => {
        bulkMutation.mutate({ ids: Array.from(selectedIds), status });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('tickets.title')}</h2>
                    <p className="text-muted-foreground">{t('tickets.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('tickets.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-8"
                        />
                    </div>
                </div>
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                        {t('tickets.bulk.selected').replace('{count}', String(selectedIds.size))}
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulk('resolved')}
                            disabled={bulkMutation.isPending}
                        >
                            {bulkMutation.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                : null}
                            {t('tickets.bulk.markResolved')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulk('closed')}
                            disabled={bulkMutation.isPending}
                        >
                            {t('tickets.bulk.markClosed')}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            <X className="h-3.5 w-3.5 mr-1" />
                            {t('tickets.bulk.clearSelection')}
                        </Button>
                    </div>
                </div>
            )}

            <Card>
                <CardContent className="p-0 flex flex-col min-h-[500px]">
                    <div className="flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={isIndeterminate ? 'indeterminate' : isAllSelected}
                                            onCheckedChange={toggleAll}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[60px]">{t('tickets.columns.sno')}</TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('subject')}>
                                        {t('tickets.columns.subject')} <SortIcon column="subject" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('status')}>
                                        {t('tickets.columns.status')} <SortIcon column="status" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('priority')}>
                                        {t('tickets.columns.priority')} <SortIcon column="priority" />
                                    </TableHead>
                                    <TableHead>{t('tickets.assignee')}</TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('description')}>
                                        {t('tickets.columns.description')} <SortIcon column="description" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('client_ip')}>
                                        {t('tickets.columns.ip')} <SortIcon column="client_ip" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('created_at')}>
                                        {t('tickets.columns.date')} <SortIcon column="created_at" />
                                    </TableHead>
                                    <TableHead>{t('tickets.columns.screenshot')}</TableHead>
                                    <TableHead className="text-right">{t('tickets.columns.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedTickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center">
                                            {t('tickets.ticketNotFound')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedTickets.map((ticket, index) => (
                                        <TableRow
                                            key={ticket.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleRowClick(ticket)}
                                            data-state={selectedIds.has(ticket.id) ? 'selected' : undefined}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.has(ticket.id)}
                                                    onCheckedChange={() => toggleOne(ticket.id)}
                                                    aria-label={`Select ticket ${ticket.id}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[180px] truncate" title={ticket.subject}>
                                                {ticket.subject}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'in_progress' ? 'secondary' : 'outline'} className="capitalize">
                                                    {ticket.status ? t(`tickets.status.${ticket.status}`) : t('tickets.status.open')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ticket.priority === 'critical' || ticket.priority === 'high' ? 'destructive' : ticket.priority === 'low' ? 'outline' : 'secondary'} className="capitalize">
                                                    {ticket.priority ? t(`tickets.priority.${ticket.priority}`) : t('tickets.priority.medium')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {getAssigneeName(ticket.assigned_to) ?? (
                                                        <span className="italic opacity-50">{t('tickets.unassigned')}</span>
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[260px] whitespace-normal break-words text-muted-foreground" title={ticket.description}>
                                                {ticket.description}
                                            </TableCell>
                                            <TableCell>{ticket.client_ip || 'N/A'}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {ticket.created_at ? format(new Date(ticket.created_at), 'PPp') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {ticket.screenshot_path ? (
                                                    <a
                                                        href={getImageUrl(ticket.screenshot_path)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-purple-600 hover:text-purple-800"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                        View
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">None</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRowClick(ticket);
                                                    }}
                                                >
                                                    {t('tickets.viewDetails')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {!isLoading && sortedTickets.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t">
                            <div className="flex items-center space-x-4">
                                <div className="text-sm text-muted-foreground">
                                    {t('tickets.pagination.showing')} {((currentPage - 1) * itemsPerPage) + 1} {t('tickets.pagination.to')} {Math.min(currentPage * itemsPerPage, sortedTickets.length)} {t('tickets.pagination.of')} {sortedTickets.length} {t('tickets.pagination.entries')}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('tickets.pagination.rowsPerPage')}</span>
                                    <Select
                                        value={itemsPerPage.toString()}
                                        onValueChange={(val) => {
                                            setItemsPerPage(Number(val));
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-[70px]">
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
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    {t('tickets.pagination.previous')}
                                </Button>
                                <div className="text-sm font-medium">
                                    {t('tickets.pagination.page')} {currentPage} {t('tickets.pagination.of')} {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    {t('tickets.pagination.next')}
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
