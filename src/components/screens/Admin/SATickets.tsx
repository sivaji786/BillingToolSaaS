import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminTicketService } from '../../../services/adminApi';
import { Card, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../ui/table';
import { format } from 'date-fns';
import { Loader2, Search, ExternalLink, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/config';
import { Ticket } from '../../../types/admin';

type SortColumn = 'created_at' | 'subject' | 'description' | 'client_ip' | 'status' | 'priority';
type SortDirection = 'asc' | 'desc';

interface SATicketsProps {
    onNavigate: (screen: string, params?: { ticketId?: string }) => void;
}

export function SATickets({ onNavigate }: SATicketsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ['admin-tickets'],
        queryFn: adminTicketService.getTickets,
    });

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
        let valA: any = a[sortColumn] || '';
        let valB: any = b[sortColumn] || '';

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
        return sortDirection === 'asc' ? <ArrowUp className="inline ml-1 h-4 w-4" /> : <ArrowDown className="inline ml-1 h-4 w-4" />;
    };

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${getApiBaseUrl()}/${path.replace(/^\//, '')}`;
    };

    const handleRowClick = (ticket: Ticket) => {
        onNavigate('SATicketDetails', { ticketId: ticket.id });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
                    <p className="text-muted-foreground">Manage and view user support and bug tickets.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tickets..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="pl-8"
                        />
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-0 flex flex-col min-h-[500px]">
                    <div className="flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">S.No</TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('subject')}>
                                        Subject <SortIcon column="subject" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('status')}>
                                        Status <SortIcon column="status" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('priority')}>
                                        Priority <SortIcon column="priority" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('description')}>
                                        Description <SortIcon column="description" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('client_ip')}>
                                        IP Address <SortIcon column="client_ip" />
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('created_at')}>
                                        Date <SortIcon column="created_at" />
                                    </TableHead>
                                    <TableHead>Screenshot</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedTickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            No tickets found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedTickets.map((ticket, index) => (
                                        <TableRow
                                            key={ticket.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleRowClick(ticket)}
                                        >
                                            <TableCell>
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[200px] truncate" title={ticket.subject}>
                                                {ticket.subject}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'in_progress' ? 'secondary' : 'outline'} className="capitalize">
                                                    {ticket.status || 'Open'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ticket.priority === 'critical' || ticket.priority === 'high' ? 'destructive' : ticket.priority === 'low' ? 'outline' : 'secondary'} className="capitalize">
                                                    {ticket.priority || 'Medium'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[200px]" title={ticket.description}>
                                                {ticket.description && ticket.description.length > 50 ? (
                                                    <span>
                                                        {ticket.description.substring(0, 50)}
                                                        <span
                                                            className="text-blue-500 hover:underline cursor-pointer ml-1 whitespace-nowrap"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRowClick(ticket);
                                                            }}
                                                        >
                                                            ...more
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="truncate block w-full">{ticket.description}</span>
                                                )}
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
                                                        onClick={(e) => e.stopPropagation()} // Prevent row click
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
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Pagination Controls */}
                    {!isLoading && sortedTickets.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedTickets.length)} of {sortedTickets.length} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="text-sm font-medium">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
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
