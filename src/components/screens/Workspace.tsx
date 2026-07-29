import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    Folder,
    File,
    FileText,
    Image as ImageIcon,
    Video,
    MoreVertical,
    Trash2,
    Download,
    Upload,
    Plus,
    Search,
    ChevronRight,
    Home,
    Loader2,
    FileArchive,
    Zap,
    RotateCw,
    ArrowUp,
    ArrowDown,
    Edit2,
    Sparkles,
    History
} from 'lucide-react';
import { workspaceService } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';

interface WorkspaceItem {
    name: string;
    isDir: boolean;
    size: number;
    mtime: number;
    type: string;
}

export function Workspace() {
    const { t } = useLanguage();
    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState<WorkspaceItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMkdirOpen, setIsMkdirOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [sortColumn, setSortColumn] = useState<keyof WorkspaceItem>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState('');
    const [newNameItem, setNewNameItem] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    // AI Search state
    const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Server-side "search everywhere" state — a distinct, explicit broadening of scope,
    // separate from the live client-side narrowing done by typing in the search box.
    const [isServerSearchActive, setIsServerSearchActive] = useState(false);
    const [isServerSearchLoading, setIsServerSearchLoading] = useState(false);

    const loadItems = async (path: string) => {
        setIsLoading(true);
        try {
            const data = await workspaceService.list(path);
            setItems(data.items);
            setCurrentPath(data.path);
        } catch (error) {
            console.error('Failed to load workspace items:', error);
            toast.error('Failed to load workspace');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkPendingSearch = async () => {
            const pending = sessionStorage.getItem('pendingAiSearch');
            if (pending) {
                sessionStorage.removeItem('pendingAiSearch');
                try {
                    const data = JSON.parse(pending);
                    setSearchMode('ai');
                    setSearchQuery(data.prompt);
                    setCurrentPath(data.path);

                    setIsAiLoading(true);
                    setIsLoading(true);
                    try {
                        const searchData = await workspaceService.aiSearch(data.prompt, data.path);
                        setItems(searchData.items);
                    } catch (error: unknown) {
                        const message = error.response?.data?.message || 'AI search failed';
                        toast.error(message);
                    } finally {
                        setIsAiLoading(false);
                        setIsLoading(false);
                    }
                } catch (e) {
                    loadItems(currentPath);
                }
            } else {
                loadItems(currentPath);
            }
        };

        checkPendingSearch();
    }, []);

    const handleFolderClick = (folderName: string) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        setSelectedItems([]);
        setIsServerSearchActive(false);
        loadItems(newPath);
    };

    const handleBreadcrumbClick = (index: number) => {
        const parts = currentPath.split('/').filter(Boolean);
        const newPath = parts.slice(0, index + 1).join('/');
        setSelectedItems([]);
        setIsServerSearchActive(false);
        loadItems(newPath);
    };

    const handleGoHome = () => {
        setSelectedItems([]);
        setIsServerSearchActive(false);
        loadItems('');
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const files = Array.from(e.target.files);
        const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

        const largeFiles = files.filter(file => file.size > MAX_FILE_SIZE);
        if (largeFiles.length > 0) {
            toast.error(`Some files are too large. Max size is 100MB. (${largeFiles.map(f => f.name).join(', ')})`);
            if (e.target) e.target.value = '';
            return;
        }

        try {
            setUploadProgress(0);
            await workspaceService.upload(currentPath, e.target.files, (progressEvent) => {
                if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            setUploadProgress(null);
            toast.success('Files uploaded successfully');
            loadItems(currentPath);
            if (e.target) e.target.value = '';
        } catch (error: unknown) {
            setUploadProgress(null);
            if (e.target) e.target.value = '';
            const message = error.response?.data?.message || 'Failed to upload files';
            toast.error(message);
        }
    };

    const handleMkdir = async () => {
        if (!newFolderName) return;
        try {
            await workspaceService.mkdir(currentPath, newFolderName);
            toast.success('Folder created');
            setIsMkdirOpen(false);
            setNewFolderName('');
            loadItems(currentPath);
        } catch (error) {
            toast.error('Failed to create folder');
        }
    };

    const handleDelete = async (name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            await workspaceService.delete(currentPath, [name]);
            toast.success('Deleted successfully');
            setSelectedItems(prev => prev.filter(item => item !== name));
            loadItems(currentPath);
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    const handleRename = async () => {
        if (!newNameItem || newNameItem === renameTarget) return;
        try {
            await workspaceService.rename(currentPath, renameTarget, newNameItem);
            toast.success('Renamed successfully');
            setIsRenameOpen(false);
            setRenameTarget('');
            setNewNameItem('');
            loadItems(currentPath);
        } catch (error: unknown) {
            const message = error.response?.data?.message || 'Failed to rename item';
            toast.error(message);
        }
    };

    const handleOpen = async (name: string) => {
        const loadingToast = toast.loading(`Opening ${name}...`);
        try {
            await workspaceService.open(currentPath, name);
            toast.success('Opened successfully', { id: loadingToast });
        } catch (error: unknown) {
            const message = error.response?.data?.message || 'Failed to open file locally';
            toast.error(message, { id: loadingToast });
        }
    };

    const handleDownload = async (name: string) => {
        try {
            await workspaceService.download(currentPath, name);
        } catch (error) {
            toast.error('Failed to download file');
        }
    };

    const handleExtractZip = async (name: string, toFolder: boolean, deleteSource: boolean) => {
        const loadingToast = toast.loading(`Extracting ${name}...`);
        try {
            await workspaceService.extractZip(currentPath, name, toFolder, deleteSource);
            toast.success('Successfully extracted zip', { id: loadingToast });
            loadItems(currentPath);
        } catch (error) {
            toast.error('Failed to extract zip', { id: loadingToast });
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '-';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString() + ' ' + new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getFileIcon = (item: WorkspaceItem) => {
        if (item.isDir) return <Folder className="h-5 w-5 text-blue-500 fill-blue-500/20" />;
        const ext = item.name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'svg': return <ImageIcon className="h-5 w-5 text-green-500" />;
            case 'mp4':
            case 'mov':
            case 'avi': return <Video className="h-5 w-5 text-[#2a8fbd]" />;
            case 'zip':
            case 'rar':
            case '7z': return <FileArchive className="h-5 w-5 text-yellow-600" />;
            default: return <File className="h-5 w-5 text-gray-400" />;
        }
    };

    const filteredItems = items.filter(item => {
        if (searchMode === 'ai') return true;
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }).sort((a, b) => {
        let valueA: any = a[sortColumn];
        let valueB: any = b[sortColumn];

        if (sortColumn === 'type') {
            valueA = a.isDir ? 'Folder' : (a.type || 'File');
            valueB = b.isDir ? 'Folder' : (b.type || 'File');
        }

        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (column: keyof WorkspaceItem) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: keyof WorkspaceItem }) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc' ? <ArrowUp className="inline ml-1 h-4 w-4" /> : <ArrowDown className="inline ml-1 h-4 w-4" />;
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedItems(filteredItems.map(item => item.name));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (name: string, checked: boolean) => {
        if (checked) {
            setSelectedItems(prev => [...prev, name]);
        } else {
            setSelectedItems(prev => prev.filter(item => item !== name));
        }
    };

    const handleBulkDownload = async () => {
        if (selectedItems.length === 0) return;
        const loadingToast = toast.loading('Preparing ZIP download...');
        try {
            await workspaceService.downloadZip(currentPath, selectedItems);
            toast.success('Download started', { id: loadingToast });
            setSelectedItems([]);
        } catch (error) {
            toast.error('Failed to download ZIP', { id: loadingToast });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) return;
        try {
            await workspaceService.delete(currentPath, selectedItems);
            toast.success('Deleted successfully');
            setSelectedItems([]);
            loadItems(currentPath);
        } catch (error) {
            toast.error('Failed to delete items');
        }
    };

    // Explicit, separately-labeled action: a real server-side search across the whole
    // workspace (all subfolders, file contents included), not just a refinement of what's
    // currently on screen. Distinct from the live client-side filter that runs as you type.
    const handleSearchEverywhere = async () => {
        if (!searchQuery.trim()) return;
        setIsServerSearchLoading(true);
        setIsLoading(true);
        try {
            const data = await workspaceService.search(searchQuery, currentPath);
            setItems(data);
            setIsServerSearchActive(true);
        } catch (error) {
            toast.error('Search failed');
        } finally {
            setIsServerSearchLoading(false);
            setIsLoading(false);
        }
    };

    const handleExitServerSearch = () => {
        setIsServerSearchActive(false);
        loadItems(currentPath);
    };

    const handleAiSearch = async () => {
        if (!searchQuery.trim()) {
            loadItems(currentPath);
            return;
        }
        setIsAiLoading(true);
        setIsLoading(true); // show loader in table
        try {
            const data = await workspaceService.aiSearch(searchQuery, currentPath);
            // AI search returns flattened search results, so we'll just set them into the item list
            // For simplicity, we can just replace the current table contents with the search results.
            setItems(data.items);
            // We intentionally don't clear path here as the user might want to stay in context
        } catch (error: unknown) {
            const message = error.response?.data?.message || 'AI search failed';
            toast.error(message);
        } finally {
            setIsAiLoading(false);
            setIsLoading(false);
        }
    };

    const pathParts = currentPath.split('/').filter(Boolean);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-heading-1 font-medium text-[#1e3a5f] dark:text-white">{t('nav.workspace')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your project files and folders</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => loadItems(currentPath)} disabled={isLoading}>
                        <RotateCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={() => setIsMkdirOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Folder
                    </Button>

                    <div className="relative">
                        <Input
                            type="file"
                            multiple
                            className="hidden"
                            id="file-upload"
                            onChange={handleUpload}
                            disabled={uploadProgress !== null}
                        />
                        <Button asChild className={`bg-[#f08a3c] hover:bg-[#e07530] ${uploadProgress !== null ? 'opacity-70 pointer-events-none' : ''}`}>
                            <label htmlFor="file-upload" className="cursor-pointer flex items-center">
                                {uploadProgress !== null ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading {uploadProgress}%
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Files
                                    </>
                                )}
                            </label>
                        </Button>
                    </div>
                    <Button variant="outline" onClick={() => window.location.hash = 'aiHistory'}>
                        <History className="h-4 w-4 mr-2" />
                        AI history
                    </Button>
                </div>
            </div>

            {uploadProgress !== null && (
                <Card className="p-4 border-[rgba(30,58,95,0.15)] bg-[#f0f6ff]/50">
                    <div className="space-y-2">
                        <div className="flex justify-between text-body font-medium text-[#1e3a5f]">
                            <span>Uploading files to {currentPath || 'workspace root'}...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-[#dbe8f7] rounded-full h-2 overflow-hidden">
                            <div className="bg-[#f08a3c] h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-body text-gray-500 overflow-x-auto pb-2">
                            <Button variant="ghost" size="icon" onClick={handleGoHome} aria-label={t('nav.home')}>
                                <Home className="h-4 w-4" />
                            </Button>
                            {pathParts.length > 0 && <ChevronRight className="h-4 w-4" />}
                            {pathParts.map((part, i) => (
                                <React.Fragment key={i}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleBreadcrumbClick(i)}
                                        className="h-8 px-2"
                                    >
                                        {part}
                                    </Button>
                                    {i < pathParts.length - 1 && <ChevronRight className="h-4 w-4" />}
                                </React.Fragment>
                            ))}
                        </div>

                        {selectedItems.length > 0 && (
                            <div className="flex items-center gap-2 bg-[#f0f6ff] px-3 py-1.5 rounded-lg border border-[rgba(30,58,95,0.10)]">
                                <span className="text-body font-medium text-[#1e3a5f] mr-2">
                                    {selectedItems.length} selected
                                </span>
                                <Button variant="outline" size="sm" className="h-8 shadow-sm" onClick={handleBulkDownload}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download ZIP
                                </Button>
                                <Button variant="destructive" size="sm" className="h-8 shadow-sm" onClick={handleBulkDelete}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-2">
                            <button
                                onClick={() => { setSearchMode('standard'); loadItems(currentPath); }}
                                className={`px-4 py-1.5 rounded-md text-body font-medium transition-all ${searchMode === 'standard'
                                    ? 'bg-white shadow-sm text-gray-900'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Standard Search
                            </button>
                            <button
                                onClick={() => setSearchMode('ai')}
                                className={`px-4 py-1.5 rounded-md text-body font-medium transition-all flex items-center gap-1 ${searchMode === 'ai'
                                    ? 'bg-[#f0f6ff] shadow-sm text-[#1e3a5f]'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Sparkles className="h-4 w-4" />
                                AI Search
                            </button>
                        </div>

                        <div className="relative flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${searchMode === 'ai' ? 'text-[#3d5a80]' : 'text-gray-400'}`} />
                                <Input
                                    placeholder={searchMode === 'ai' ? "Ask AI to find files... (e.g. 'show me invoices from 2024')" : "Search files..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchMode === 'ai') {
                                            handleAiSearch();
                                        }
                                        // Standard mode: Enter intentionally does nothing extra here —
                                        // typing already narrows the currently-loaded items live (see
                                        // filteredItems below). A fresh, unscoped server query is a
                                        // separate action — the "Search everywhere" button.
                                    }}
                                    className={`pl-10 ${searchMode === 'ai' ? 'border-[rgba(30,58,95,0.20)] focus:border-[#f08a3c] focus:ring-[#f08a3c] bg-[#f0f6ff] dark:bg-[#1e3a5f]/10' : ''}`}
                                />
                            </div>
                            {searchMode === 'ai' && (
                                <Button
                                    className="bg-[#f08a3c] hover:bg-[#e07530] whitespace-nowrap"
                                    onClick={handleAiSearch}
                                    disabled={isAiLoading || !searchQuery.trim()}
                                >
                                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                    Ask AI
                                </Button>
                            )}
                            {searchMode === 'standard' && (
                                <Button
                                    variant="outline"
                                    className="whitespace-nowrap"
                                    onClick={handleSearchEverywhere}
                                    disabled={isServerSearchLoading || !searchQuery.trim()}
                                    title={t('workspace.searchEverywhereHint') || 'Search all subfolders and file contents, not just this folder'}
                                >
                                    {isServerSearchLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                    {t('workspace.searchEverywhere') || 'Search everywhere'}
                                </Button>
                            )}
                        </div>

                        {isServerSearchActive && (
                            <div className="flex items-center justify-between gap-2 text-body bg-[#f0f6ff] border border-[rgba(30,58,95,0.15)] rounded-lg px-3 py-2">
                                <span className="text-[#1e3a5f]">
                                    {t('workspace.searchEverywhereActive', { query: searchQuery }) || `Showing results for "${searchQuery}" from your entire workspace`}
                                </span>
                                <Button variant="ghost" size="sm" onClick={handleExitServerSearch} className="h-7">
                                    {t('workspace.backToFolder') || 'Back to folder'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="w-[45%] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleSort('name')}>
                                Name <SortIcon column="name" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleSort('type')}>
                                Type <SortIcon column="type" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleSort('size')}>
                                Size <SortIcon column="size" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => handleSort('mtime')}>
                                Last Modified <SortIcon column="mtime" />
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#2a8fbd]" />
                                        <p className="text-body text-gray-500">Loading workspace...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Folder className="h-12 w-12 text-gray-200" />
                                        <p className="text-heading-3 font-medium text-gray-500">This folder is empty</p>
                                        <p className="text-body text-gray-500">Upload files or create a new folder to get started</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow
                                    key={item.name}
                                    className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    onClick={() => item.isDir ? handleFolderClick(item.name) : handleOpen(item.name)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedItems.includes(item.name)}
                                            onCheckedChange={(checked) => handleSelectItem(item.name, !!checked)}
                                            aria-label={`Select ${item.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {getFileIcon(item)}
                                            <span className="font-medium truncate max-w-[300px]">{item.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize text-gray-500">
                                        {item.isDir ? 'Folder' : (item.type || 'File')}
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {formatSize(item.size)}
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {formatDate(item.mtime)}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64">
                                                {!item.isDir && (
                                                    <DropdownMenuItem onClick={() => handleDownload(item.name)}>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Download
                                                    </DropdownMenuItem>
                                                )}

                                                {!item.isDir && item.name.toLowerCase().endsWith('.zip') && (
                                                    <>
                                                        <div className="h-px bg-gray-100 my-1" />
                                                        <DropdownMenuItem onClick={() => handleExtractZip(item.name, false, false)}>
                                                            <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                                                            Extract zip file here
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleExtractZip(item.name, true, false)}>
                                                            <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                                                            Extract zip to folder
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleExtractZip(item.name, false, true)}>
                                                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                                            Extract and delete zip
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleExtractZip(item.name, true, true)}>
                                                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                                            Extract to folder and delete zip
                                                        </DropdownMenuItem>
                                                        <div className="h-px bg-gray-100 my-1" />
                                                    </>
                                                )}

                                                <DropdownMenuItem onClick={() => { setRenameTarget(item.name); setNewNameItem(item.name); setIsRenameOpen(true); }}>
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(item.name)}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {!isLoading && items.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t text-body text-gray-600">
                        <span>
                            {t('workspace.showingCount', { shown: String(filteredItems.length), total: String(items.length) })
                                || `Showing ${filteredItems.length} of ${items.length}`}
                        </span>
                    </div>
                )}
            </Card>

            <Dialog open={isMkdirOpen} onOpenChange={setIsMkdirOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new folder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMkdir()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMkdirOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-[#f08a3c] hover:bg-[#e07530]"
                            onClick={handleMkdir}
                            disabled={!newFolderName}
                        >
                            Create Folder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Item</DialogTitle>
                        <DialogDescription>
                            Enter a new name for "{renameTarget}".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="New Name"
                            value={newNameItem}
                            onChange={(e) => setNewNameItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-[#f08a3c] hover:bg-[#e07530]"
                            onClick={handleRename}
                            disabled={!newNameItem || newNameItem === renameTarget}
                        >
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
