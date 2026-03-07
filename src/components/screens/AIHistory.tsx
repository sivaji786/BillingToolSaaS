import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { workspaceService } from '../../services/api';
import { toast } from 'sonner';

interface AIHistoryEntry {
    id: string;
    prompt: string;
    sql_query: string;
    folder_path: string;
    created_at: string;
}

export function AIHistory() {
    const [entries, setEntries] = useState<AIHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortColumn, setSortColumn] = useState<keyof AIHistoryEntry>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await workspaceService.getAiHistory();
                if (response.success) {
                    setEntries(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch AI history", error);
                toast.error("Failed to load AI query history");
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const filteredAndSortedEntries = useMemo(() => {
        let result = entries;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(entry =>
                entry.prompt.toLowerCase().includes(lowerQuery) ||
                (entry.folder_path && entry.folder_path.toLowerCase().includes(lowerQuery))
            );
        }

        result = [...result].sort((a, b) => {
            const aVal = String(a[sortColumn] || '');
            const bVal = String(b[sortColumn] || '');

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [entries, searchQuery, sortColumn, sortDirection]);

    const totalPages = Math.ceil(filteredAndSortedEntries.length / itemsPerPage);
    const paginatedEntries = filteredAndSortedEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (column: keyof AIHistoryEntry) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: keyof AIHistoryEntry }) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc' ? <ArrowUp className="inline ml-1 h-3 w-3" /> : <ArrowDown className="inline ml-1 h-3 w-3" />;
    };

    const handlePromptClick = (entry: AIHistoryEntry) => {
        sessionStorage.setItem('pendingAiSearch', JSON.stringify({
            prompt: entry.prompt,
            path: entry.folder_path || ''
        }));
        window.location.hash = 'workspace';
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => window.location.hash = 'workspace'}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-purple-900 dark:text-purple-100">AI Query History</h1>
                    <p className="text-gray-600 dark:text-gray-400">View your past AI queries within the workspace</p>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search prompt or query..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[10%] text-gray-500">
                                    Sl.No.
                                </TableHead>
                                <TableHead className="w-1/2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('prompt')}>
                                    Prompt <SortIcon column="prompt" />
                                </TableHead>
                                <TableHead className="w-1/4 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('folder_path')}>
                                    Folder Path <SortIcon column="folder_path" />
                                </TableHead>
                                <TableHead className="w-1/4 cursor-pointer hover:bg-gray-50 text-right" onClick={() => handleSort('created_at')}>
                                    Date <SortIcon column="created_at" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                                            <p className="text-sm text-gray-500">Loading history...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-12 w-12 text-gray-200" />
                                            <p className="text-lg font-medium text-gray-400">No history found</p>
                                            <p className="text-sm text-gray-500">Your AI query history will appear here</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedEntries.map((entry, index) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-gray-500 text-sm">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </TableCell>
                                        <TableCell
                                            className="font-medium cursor-pointer text-purple-600 hover:text-purple-800 hover:underline"
                                            onClick={() => handlePromptClick(entry)}
                                        >
                                            {entry.prompt}
                                        </TableCell>
                                        <TableCell className="text-gray-500 font-mono text-sm">
                                            {entry.folder_path || '/'}
                                        </TableCell>
                                        <TableCell className="text-right text-gray-500">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedEntries.length)} of {filteredAndSortedEntries.length} entries
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
