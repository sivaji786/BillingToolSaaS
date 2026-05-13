import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPackageServicesService } from '../../../services/adminApi';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Plus, Edit, Trash2, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft } from 'lucide-react';
import { SearchBar } from '../../ui/SearchBar';
import { usePagination } from '../../../hooks/usePagination';
import { toast } from 'sonner';
import { Skeleton } from '../../ui/skeleton';

interface SAPackageServicesProps {
    onNavigate: (screen: string) => void;
}

export function SAPackageServices({ onNavigate }: SAPackageServicesProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isEditing, setIsEditing] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);
    const queryClient = useQueryClient();

    // Data Table State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'displayOrder', direction: 'asc' });

    const { data: services, isLoading } = useQuery({
        queryKey: ['package-services'],
        queryFn: () => adminPackageServicesService.getAll(),
        staleTime: 30 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: adminPackageServicesService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['package-services'] });
            toast.success('Service created successfully');
            closeForm();
        },
        onError: () => {
            toast.error('Failed to create service');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => adminPackageServicesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['package-services'] });
            toast.success('Service updated successfully');
            closeForm();
        },
        onError: () => {
            toast.error('Failed to update service');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: adminPackageServicesService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['package-services'] });
            toast.success('Service deleted successfully');
            
            // Adjust current page if last item on page is deleted
            if (paginatedServices.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        },
        onError: () => {
            toast.error('Failed to delete service');
        },
    });

    const closeForm = () => {
        setIsEditing(false);
        setEditingService(null);
    };

    const handleEdit = (service: any) => {
        setEditingService(service);
        setIsEditing(true);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const data = {
            name: formData.get('name') as string,
            type: formData.get('type') as string,
            displayOrder: parseInt(formData.get('displayOrder') as string) || 0,
            description: formData.get('description') as string,
            isActive: formData.get('isActive') === 'true',
        };

        if (editingService) {
            updateMutation.mutate({ id: editingService.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const renderSortIcon = (key: string) => {
        if (sortConfig.key !== key) {
            return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground opacity-50" />;
        }
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    };

    // Derived State
    const processedServices = useMemo(() => {
        if (!services) return [];
        return [...services]
            .filter((srv) =>
                srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                srv.type.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
    }, [services, searchQuery, sortConfig]);

    const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedServices, pageSize, setPageSize } = usePagination(processedServices);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    if (isEditing) {
        return (
            <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">{editingService ? 'Edit Service Column' : 'Add Service Column'}</h2>
                        <p className="text-muted-foreground">Define what columns will show up in package creation</p>
                    </div>
                </div>

                <Card>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Service Name *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={editingService?.name || ''}
                                    placeholder="e.g., File Storage, Active Users"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="type">Internal Type Key *</Label>
                                <Select name="type" defaultValue={editingService?.type || 'custom'}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="storage">Storage</SelectItem>
                                        <SelectItem value="users">Users</SelectItem>
                                        <SelectItem value="api_calls">API Calls</SelectItem>
                                        <SelectItem value="bandwidth">Bandwidth</SelectItem>
                                        <SelectItem value="invoices">Invoices</SelectItem>
                                        <SelectItem value="projects">Projects</SelectItem>
                                        <SelectItem value="custom">Custom Feature</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    defaultValue={editingService?.description || ''}
                                    placeholder="Optional brief description"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="displayOrder">Display Order</Label>
                                <Input
                                    id="displayOrder"
                                    name="displayOrder"
                                    type="number"
                                    defaultValue={editingService?.displayOrder ?? 10}
                                    placeholder="e.g. 10"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="isActive">Status</Label>
                                <Select name="isActive" defaultValue={editingService?.isActive === false ? 'false' : 'true'}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {editingService ? 'Save Changes' : 'Create Service'}
                                </Button>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => onNavigate('SApackages')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">Package Columns</h2>
                    <p className="text-muted-foreground">Manage the columns available for packages</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-1 items-center gap-4 max-w-md">
                    <SearchBar
                        value={searchQuery}
                        onChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                        placeholder="Search by name or type..."
                        className="flex-1"
                    />
                    <div className="flex border rounded-md">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('list')}
                            className="rounded-r-none h-10 w-10"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('grid')}
                            className="rounded-l-none h-10 w-10"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Button onClick={() => setIsEditing(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service Column
                </Button>
            </div>

            {isLoading ? (
                viewMode === 'grid' ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-6 w-32 mb-2" />
                                    <Skeleton className="h-4 w-full" />
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="border rounded-md bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Service Name</TableHead>
                                    <TableHead>Type Key</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[1, 2, 3].map((i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )
            ) : (
                <div className="space-y-4">
                    {viewMode === 'grid' ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {paginatedServices.map((srv) => (
                                <Card key={srv.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-xl">{srv.name}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    Order: {srv.displayOrder} • {srv.description}
                                                </CardDescription>
                                            </div>
                                            <Badge variant={srv.isActive ? 'default' : 'secondary'}>
                                                {srv.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="text-sm font-mono bg-muted p-2 rounded-md">
                                                Type Key: {srv.type}
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleEdit(srv)}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-red-600 hover:text-red-700"
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this service column?')) {
                                                            deleteMutation.mutate(srv.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="border rounded-md bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead onClick={() => handleSort('name')} className="cursor-pointer select-none">
                                            <div className="flex items-center">
                                                Service Name
                                                {renderSortIcon('name')}
                                            </div>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('type')} className="cursor-pointer select-none">
                                            <div className="flex items-center">
                                                Type Key
                                                {renderSortIcon('type')}
                                            </div>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('displayOrder')} className="cursor-pointer select-none">
                                            <div className="flex items-center">
                                                Order
                                                {renderSortIcon('displayOrder')}
                                            </div>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('isActive')} className="cursor-pointer select-none">
                                            <div className="flex items-center">
                                                Status
                                                {renderSortIcon('isActive')}
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedServices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No services found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedServices.map((srv) => (
                                            <TableRow key={srv.id}>
                                                <TableCell>
                                                    <div className="font-medium text-base">{srv.name}</div>
                                                    <div className="text-sm text-muted-foreground mt-1">{srv.description}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded inline-block">
                                                        {srv.type}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {srv.displayOrder}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={srv.isActive ? 'default' : 'secondary'}>
                                                        {srv.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Edit"
                                                            onClick={() => handleEdit(srv)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Delete"
                                                            className="text-red-500 hover:text-red-700"
                                                            onClick={() => {
                                                                if (confirm('Are you sure you want to delete this service column?')) {
                                                                    deleteMutation.mutate(srv.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    
                    {/* Pagination Options */}
                    {processedServices.length > 0 && (
                        <div className="flex items-center justify-between px-2 pt-4">
                            <div className="hidden sm:flex flex-1 text-sm text-muted-foreground">
                                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedServices.length)} of {processedServices.length} entries
                            </div>
                            <div className="flex items-center space-x-6 lg:space-x-8">
                                <div className="flex items-center space-x-2">
                                    <p className="hidden sm:block text-sm font-medium">Rows per page</p>
                                    <Select
                                        value={`${pageSize}`}
                                        onValueChange={(value) => {
                                            setPageSize(Number(value));
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-[70px]">
                                            <SelectValue placeholder={pageSize} />
                                        </SelectTrigger>
                                        <SelectContent side="top">
                                            {[5, 10, 20, 50].map((size) => (
                                                <SelectItem key={size} value={`${size}`}>
                                                    {size}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                                    Page {currentPage} of {totalPages || 1}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                    >
                                        <span className="sr-only">Go to first page</span>
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <span className="sr-only">Go to previous page</span>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <span className="sr-only">Go to next page</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <span className="sr-only">Go to last page</span>
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
