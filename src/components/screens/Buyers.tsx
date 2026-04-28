import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { buyerService } from '../../services/api';
import { Buyer } from '../../types/invoice';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
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
    Search,
    Plus,
    Edit,
    Trash2,
    User,
    Mail,
    MapPin,
    RefreshCw,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function Buyers() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [columnFilters, setColumnFilters] = useState({
        name: '',
        vatId: '',
        email: '',
        address: ''
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDelDialogOpen, setIsDelDialogOpen] = useState(false);
    const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
    const [formData, setFormData] = useState<Partial<Buyer>>({
        name: '',
        vatId: '',
        legalOrganizationId: '',
        contactEmail: '',
        contactPhone: '',
        address: {
            street: '',
            city: '',
            postalCode: '',
            country: '',
        },
    });

    const { data: buyers = [], isLoading } = useQuery({
        queryKey: ['buyers'],
        queryFn: () => buyerService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (newBuyer: any) => buyerService.create(newBuyer),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buyers'] });
            toast.success(t('buyers.buyerCreated'));
            setIsDialogOpen(false);
        },
        onError: () => toast.error(t('common.error')),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, buyer }: { id: string; buyer: any }) => buyerService.update(id, buyer),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buyers'] });
            toast.success(t('buyers.buyerUpdated'));
            setIsDialogOpen(false);
        },
        onError: () => toast.error(t('common.error')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => buyerService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buyers'] });
            toast.success(t('buyers.buyerDeleted'));
            setIsDelDialogOpen(false);
        },
        onError: () => toast.error(t('common.error')),
    });

    const handleOpenAdd = () => {
        setSelectedBuyer(null);
        setFormData({
            name: '',
            vatId: '',
            legalOrganizationId: '',
            contactEmail: '',
            contactPhone: '',
            address: {
                street: '',
                city: '',
                postalCode: '',
                country: '',
            },
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (buyer: Buyer) => {
        setSelectedBuyer(buyer);
        setFormData({
            name: buyer.name,
            vatId: buyer.vatId,
            legalOrganizationId: buyer.legalOrganizationId,
            contactEmail: buyer.contactEmail,
            contactPhone: buyer.contactPhone,
            address: {
                street: buyer.address?.street || '',
                city: buyer.address?.city || '',
                postalCode: buyer.address?.postalCode || '',
                country: buyer.address?.country || '',
            },
        });
        setIsDialogOpen(true);
    };

    const handleOpenDelete = (buyer: Buyer) => {
        setSelectedBuyer(buyer);
        setIsDelDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Transform formData to match service expectations if needed
        const payload = {
            name: formData.name,
            vatId: formData.vatId,
            legalOrganizationId: formData.legalOrganizationId,
            contact: {
                email: formData.contactEmail,
                phone: formData.contactPhone
            },
            address: formData.address
        };

        if (selectedBuyer?.id) {
            updateMutation.mutate({ id: selectedBuyer.id, buyer: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />;
        return <ArrowDown className="ml-2 h-4 w-4" />;
    };

    let processedBuyers = [...buyers];

    // Global Search
    if (searchQuery) {
        processedBuyers = processedBuyers.filter(buyer =>
            buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            buyer.vatId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            buyer.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Column Filters
    if (columnFilters.name) {
        processedBuyers = processedBuyers.filter(buyer => 
            buyer.name.toLowerCase().includes(columnFilters.name.toLowerCase())
        );
    }
    if (columnFilters.vatId) {
        processedBuyers = processedBuyers.filter(buyer => 
            (buyer.vatId || '').toLowerCase().includes(columnFilters.vatId.toLowerCase())
        );
    }
    if (columnFilters.email) {
        processedBuyers = processedBuyers.filter(buyer => 
            (buyer.contactEmail || '').toLowerCase().includes(columnFilters.email.toLowerCase())
        );
    }
    if (columnFilters.address) {
        processedBuyers = processedBuyers.filter(buyer => {
            const addressString = buyer.address ? `${buyer.address.city} ${buyer.address.country} ${buyer.address.street} ${buyer.address.postalCode}`.toLowerCase() : '';
            return addressString.includes(columnFilters.address.toLowerCase());
        });
    }

    // Sorting
    if (sortConfig !== null) {
        processedBuyers.sort((a, b) => {
            let valA = '';
            let valB = '';
            
            if (sortConfig.key === 'name') { valA = a.name; valB = b.name; }
            if (sortConfig.key === 'vatId') { valA = a.vatId || ''; valB = b.vatId || ''; }
            if (sortConfig.key === 'email') { valA = a.contactEmail || ''; valB = b.contactEmail || ''; }
            if (sortConfig.key === 'address') { 
                valA = a.address ? `${a.address.city} ${a.address.country}` : '';
                valB = b.address ? `${b.address.city} ${b.address.country}` : '';
            }

            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    // Pagination
    const totalPages = Math.ceil(processedBuyers.length / itemsPerPage);
    const paginatedBuyers = processedBuyers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-purple-900 dark:text-purple-100 mb-1">{t('buyers.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('buyers.subtitle')}</p>
                </div>
                <Button
                    onClick={handleOpenAdd}
                    className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/20"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('buyers.addBuyer')}
                </Button>
            </div>

            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('buyers.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </Card>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('name')}>
                                <div className="flex items-center">{t('buyers.name')} <SortIcon columnKey="name" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('vatId')}>
                                <div className="flex items-center">{t('buyers.vatId')} <SortIcon columnKey="vatId" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('email')}>
                                <div className="flex items-center">{t('buyers.email')} <SortIcon columnKey="email" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort('address')}>
                                <div className="flex items-center">{t('buyers.address')} <SortIcon columnKey="address" /></div>
                            </TableHead>
                            <TableHead className="text-right">{t('invoiceList.actions')}</TableHead>
                        </TableRow>
                        <TableRow className="bg-gray-50/30">
                            <TableHead className="p-2">
                                <Input 
                                    className="h-8 text-xs font-normal" 
                                    placeholder="Filter Name..." 
                                    value={columnFilters.name}
                                    onChange={(e) => setColumnFilters({...columnFilters, name: e.target.value})}
                                />
                            </TableHead>
                            <TableHead className="p-2">
                                <Input 
                                    className="h-8 text-xs font-normal" 
                                    placeholder="Filter VAT..." 
                                    value={columnFilters.vatId}
                                    onChange={(e) => setColumnFilters({...columnFilters, vatId: e.target.value})}
                                />
                            </TableHead>
                            <TableHead className="p-2">
                                <Input 
                                    className="h-8 text-xs font-normal" 
                                    placeholder="Filter Email..." 
                                    value={columnFilters.email}
                                    onChange={(e) => setColumnFilters({...columnFilters, email: e.target.value})}
                                />
                            </TableHead>
                            <TableHead className="p-2">
                                <Input 
                                    className="h-8 text-xs font-normal" 
                                    placeholder="Filter Address..." 
                                    value={columnFilters.address}
                                    onChange={(e) => setColumnFilters({...columnFilters, address: e.target.value})}
                                />
                            </TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                                        <p className="text-sm text-gray-500">{t('common.loading')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : processedBuyers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <User className="h-12 w-12 text-gray-300" />
                                        <h3 className="text-gray-900 dark:text-gray-100">{t('buyers.noBuyers')}</h3>
                                        <p className="text-sm text-gray-500">{t('buyers.noBuyersDesc')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedBuyers.map((buyer) => (
                                <TableRow key={buyer.id}>
                                    <TableCell className="font-medium">{buyer.name}</TableCell>
                                    <TableCell>{buyer.vatId || '-'}</TableCell>
                                    <TableCell>
                                        {buyer.contactEmail && (
                                            <div className="flex items-center gap-1">
                                                <Mail className="h-3 w-3 text-gray-400" />
                                                <span>{buyer.contactEmail}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {buyer.address && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <MapPin className="h-3 w-3" />
                                                <span>{`${buyer.address.city}, ${buyer.address.country}`}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(buyer)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleOpenDelete(buyer)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {processedBuyers.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{t('invoiceList.showing')}</span>
                            <span className="font-medium">
                                {(currentPage - 1) * itemsPerPage + 1}
                            </span>
                            <span>{t('invoiceList.paginationTo')}</span>
                            <span className="font-medium">
                                {Math.min(currentPage * itemsPerPage, processedBuyers.length)}
                            </span>
                            <span>{t('invoiceList.of')}</span>
                            <span className="font-medium">{processedBuyers.length}</span>
                            <span>{t('invoiceList.results')}</span>
                        </div>

                        <div className="flex items-center gap-4">
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

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{selectedBuyer ? t('buyers.editBuyer') : t('buyers.newBuyer')}</DialogTitle>
                            <DialogDescription>{t('buyers.buyerDetails')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-medium">{t('buyers.name')}</label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('buyers.vatId')}</label>
                                    <Input
                                        value={formData.vatId}
                                        onChange={(e) => setFormData({ ...formData, vatId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('buyers.legalOrgId')}</label>
                                    <Input
                                        value={formData.legalOrganizationId}
                                        onChange={(e) => setFormData({ ...formData, legalOrganizationId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('buyers.email')}</label>
                                    <Input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('buyers.phone')}</label>
                                    <Input
                                        value={formData.contactPhone}
                                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {t('buyers.address')}
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-sm font-medium">{t('buyers.street')}</label>
                                        <Input
                                            value={formData.address?.street}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address!, street: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('buyers.city')}</label>
                                        <Input
                                            value={formData.address?.city}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address!, city: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('buyers.postalCode')}</label>
                                        <Input
                                            value={formData.address?.postalCode}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address!, postalCode: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('buyers.country')}</label>
                                        <Input
                                            placeholder="e.g. IN, DE, FR"
                                            value={formData.address?.country}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                address: { ...formData.address!, country: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                                {t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDelDialogOpen} onOpenChange={setIsDelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('buyers.deleteConfirm')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('common.deleteAria', { index: selectedBuyer?.name || '' })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => selectedBuyer?.id && deleteMutation.mutate(selectedBuyer.id)}
                        >
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
