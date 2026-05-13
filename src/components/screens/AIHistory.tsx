import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { TableEmptyState } from '../ui/TableEmptyState';
import { SearchBar } from '../ui/SearchBar';
import { workspaceService } from '../../services/api';
import { useSorting } from '../../hooks/useSorting';
import { usePagination } from '../../hooks/usePagination';
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

    useEffect(() => {
        workspaceService.getAiHistory()
            .then(response => { if (response.success) setEntries(response.data); })
            .catch(() => toast.error('Failed to load AI query history'))
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (!searchQuery) return entries;
        const q = searchQuery.toLowerCase();
        return entries.filter(e =>
            e.prompt.toLowerCase().includes(q) ||
            (e.folder_path && e.folder_path.toLowerCase().includes(q))
        );
    }, [entries, searchQuery]);

    const { sorted, sortColumn, sortDirection, handleSort } = useSorting(filtered, 'created_at', 'desc');
    const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedEntries, pageSize } = usePagination(sorted);

    const SortIcon = ({ column }: { column: keyof AIHistoryEntry }) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc'
            ? <ArrowUp className="inline ml-1 h-3 w-3" />
            : <ArrowDown className="inline ml-1 h-3 w-3" />;
    };

    const handlePromptClick = (entry: AIHistoryEntry) => {
        sessionStorage.setItem('pendingAiSearch', JSON.stringify({
            prompt: entry.prompt,
            path: entry.folder_path || '',
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
                <div className="mb-4">
                    <SearchBar
                        value={searchQuery}
                        onChange={q => { setSearchQuery(q); setCurrentPage(1); }}
                        placeholder="Search prompt or query..."
                        className="max-w-md"
                    />
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[10%] text-gray-500">Sl.No.</TableHead>
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
                            {isLoading || paginatedEntries.length === 0 ? (
                                <TableEmptyState
                                    colSpan={4}
                                    isLoading={isLoading}
                                    emptyMessage="No AI query history found."
                                />
                            ) : (
                                paginatedEntries.map((entry, index) => (
                                    <TableRow key={entry.id}>
                                        <TableHead className="text-gray-500 text-sm font-normal">
                                            {(currentPage - 1) * pageSize + index + 1}
                                        </TableHead>
                                        <TableHead
                                            className="font-medium cursor-pointer text-purple-600 hover:text-purple-800 hover:underline"
                                            onClick={() => handlePromptClick(entry)}
                                        >
                                            {entry.prompt}
                                        </TableHead>
                                        <TableHead className="text-gray-500 font-mono text-sm font-normal">
                                            {entry.folder_path || '/'}
                                        </TableHead>
                                        <TableHead className="text-right text-gray-500 font-normal">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </TableHead>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-500">
                            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} entries
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>Previous</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
