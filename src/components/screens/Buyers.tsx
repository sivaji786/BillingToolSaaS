import * as React from 'react';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { buyerService } from '../../services/api';
import { Buyer } from '../../types/invoice';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../ui/dialog';
import { ConfirmDeleteDialog } from '../ui/ConfirmDeleteDialog';
import { SearchBar } from '../ui/SearchBar';
import { TableEmptyState } from '../ui/TableEmptyState';
import { usePagination } from '../../hooks/usePagination';
import {
    Plus, Edit, Trash2, User, Mail, MapPin, RefreshCw,
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
    Download, Upload, AlertTriangle, CheckCircle2, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_HEADERS = ['Name', 'VAT ID', 'Legal Org ID', 'Email', 'Phone', 'Street', 'City', 'Postal Code', 'Country'];

function exportCSV(buyers: Buyer[]) {
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = [CSV_HEADERS.join(',')];
    for (const b of buyers) {
        rows.push([
            b.name,
            b.vatId ?? '',
            b.legalOrganizationId ?? '',
            b.contactEmail ?? '',
            b.contactPhone ?? '',
            b.address?.street ?? '',
            b.address?.city ?? '',
            b.address?.postalCode ?? '',
            b.address?.country ?? '',
        ].map(escape).join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'buyers.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function downloadTemplate() {
    const sample = [
        CSV_HEADERS.join(','),
        'Acme GmbH,DE123456789,HRB 12345,billing@acme.de,+49301234567,Musterstraße 1,Berlin,10115,DE',
        'Global Corp,,,,info@globalcorp.com,,New York,10001,US',
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'buyers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') { inQuotes = false; }
                else { cur += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { result.push(cur.trim()); cur = ''; }
                else { cur += ch; }
            }
        }
        result.push(cur.trim());
        return result;
    };

    const headerRow  = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
    const colMap: Record<string, number> = {};
    const aliases: Record<string, string[]> = {
        name:                ['name'],
        vatid:               ['vatid', 'vat', 'vatid', 'taxid'],
        legalorgid:          ['legalorgid', 'legalorganizationid', 'orgid'],
        email:               ['email', 'contactemail', 'e-mail'],
        phone:               ['phone', 'contactphone', 'telephone'],
        street:              ['street', 'address', 'streetaddress'],
        city:                ['city'],
        postalcode:          ['postalcode', 'zip', 'zipcode'],
        country:             ['country'],
    };
    for (const [key, alts] of Object.entries(aliases)) {
        const idx = headerRow.findIndex(h => alts.includes(h));
        if (idx !== -1) colMap[key] = idx;
    }

    return lines.slice(1).filter(l => l.trim()).map(line => {
        const cells = parseLine(line);
        const row: Record<string, string> = {};
        for (const [key, idx] of Object.entries(colMap)) {
            row[key] = cells[idx] ?? '';
        }
        return row;
    });
}

interface ImportRow {
    raw: Record<string, string>;
    status: 'new' | 'dup-email' | 'dup-vat' | 'error';
    reason?: string;
}

// ── Duplicate check helpers ─────────────────────────────────────────────────

function checkDuplicate(
    buyers: Buyer[],
    email: string,
    vatId: string,
    excludeId?: string,
): { dupEmail: boolean; dupVat: boolean } {
    const others = excludeId ? buyers.filter(b => b.id !== excludeId) : buyers;
    const e = email.trim().toLowerCase();
    const v = vatId.trim().toLowerCase();
    return {
        dupEmail: !!e && others.some(b => (b.contactEmail ?? '').toLowerCase() === e),
        dupVat:   !!v && others.some(b => (b.vatId ?? '').toLowerCase() === v),
    };
}

// ─────────────────────────────────────────────────────────────────────────────

export function Buyers() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Table state
    const [searchQuery, setSearchQuery]   = useState('');
    const [sortConfig, setSortConfig]     = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [columnFilters, setColumnFilters] = useState({ name: '', vatId: '', email: '', address: '' });

    // Dialog state
    const [isDialogOpen, setIsDialogOpen]     = useState(false);
    const [isDelDialogOpen, setIsDelDialogOpen] = useState(false);
    const [selectedBuyer, setSelectedBuyer]   = useState<Buyer | null>(null);
    const [formData, setFormData] = useState<Partial<Buyer>>({
        name: '', vatId: '', legalOrganizationId: '', contactEmail: '', contactPhone: '',
        address: { street: '', city: '', postalCode: '', country: '' },
    });

    // Import state
    const [importRows, setImportRows]       = useState<ImportRow[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting]         = useState(false);

    const { data: buyers = [], isLoading } = useQuery({
        queryKey: ['buyers'],
        queryFn: () => buyerService.getAll(),
        staleTime: 2 * 60 * 1000,
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

    // ── Duplicate detection for form ──────────────────────────────────────────
    const { dupEmail: formDupEmail, dupVat: formDupVat } = checkDuplicate(
        buyers,
        formData.contactEmail ?? '',
        formData.vatId ?? '',
        selectedBuyer?.id,
    );

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleOpenAdd = () => {
        setSelectedBuyer(null);
        setFormData({ name: '', vatId: '', legalOrganizationId: '', contactEmail: '', contactPhone: '',
            address: { street: '', city: '', postalCode: '', country: '' } });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (buyer: Buyer) => {
        setSelectedBuyer(buyer);
        setFormData({
            name: buyer.name, vatId: buyer.vatId, legalOrganizationId: buyer.legalOrganizationId,
            contactEmail: buyer.contactEmail, contactPhone: buyer.contactPhone,
            address: { street: buyer.address?.street ?? '', city: buyer.address?.city ?? '',
                postalCode: buyer.address?.postalCode ?? '', country: buyer.address?.country ?? '' },
        });
        setIsDialogOpen(true);
    };

    const handleOpenDelete = (buyer: Buyer) => { setSelectedBuyer(buyer); setIsDelDialogOpen(true); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formData.name, vatId: formData.vatId,
            legalOrganizationId: formData.legalOrganizationId,
            contact: { email: formData.contactEmail, phone: formData.contactPhone },
            address: formData.address,
        };
        if (selectedBuyer?.id) updateMutation.mutate({ id: selectedBuyer.id, buyer: payload });
        else createMutation.mutate(payload);
    };

    const handleSort = (key: string) => {
        setSortConfig(prev =>
            prev?.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        );
    };

    // ── CSV Export ────────────────────────────────────────────────────────────
    const handleExport = () => {
        if (!buyers.length) { toast.error('No buyers to export'); return; }
        exportCSV(buyers);
        toast.success(`Exported ${buyers.length} buyer${buyers.length !== 1 ? 's' : ''}`);
    };

    // ── CSV Import ────────────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const parsed = parseCSV(text);
            if (!parsed.length) { toast.error('No valid rows found in CSV'); return; }

            // Pre-classify each row
            const emailSet = new Set(buyers.map(b => (b.contactEmail ?? '').toLowerCase()).filter(Boolean));
            const vatSet   = new Set(buyers.map(b => (b.vatId ?? '').toLowerCase()).filter(Boolean));

            const rows: ImportRow[] = parsed.map(raw => {
                const email = (raw.email ?? '').toLowerCase().trim();
                const vat   = (raw.vatid ?? '').toLowerCase().trim();
                if (!raw.name?.trim()) return { raw, status: 'error', reason: 'Name is required' };
                if (email && emailSet.has(email)) return { raw, status: 'dup-email', reason: 'Email already exists' };
                if (vat   && vatSet.has(vat))     return { raw, status: 'dup-vat',   reason: 'VAT ID already exists' };
                return { raw, status: 'new' };
            });

            setImportRows(rows);
            setShowImportModal(true);
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = async () => {
        const toCreate = importRows
            .filter(r => r.status === 'new')
            .map(r => ({
                name: r.raw.name,
                vatId: r.raw.vatid ?? '',
                legalOrganizationId: r.raw.legalorgid ?? '',
                contactEmail: r.raw.email ?? '',
                contactPhone: r.raw.phone ?? '',
                address: { street: r.raw.street ?? '', city: r.raw.city ?? '',
                    postalCode: r.raw.postalcode ?? '', country: r.raw.country ?? '' },
            }));

        if (!toCreate.length) { toast.error('No new buyers to import'); return; }

        setImporting(true);
        try {
            const result = await buyerService.import(toCreate);
            queryClient.invalidateQueries({ queryKey: ['buyers'] });
            toast.success(`Import complete: ${result.created} created, ${result.skipped} skipped`);
            setShowImportModal(false);
        } catch {
            toast.error('Import failed');
        } finally {
            setImporting(false);
        }
    };

    // ── Table filtering / sorting / pagination ────────────────────────────────
    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="ml-2 h-4 w-4" />
            : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    let processed = [...buyers];
    if (searchQuery) {
        processed = processed.filter(b =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.vatId ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.contactEmail ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    if (columnFilters.name)    processed = processed.filter(b => b.name.toLowerCase().includes(columnFilters.name.toLowerCase()));
    if (columnFilters.vatId)   processed = processed.filter(b => (b.vatId ?? '').toLowerCase().includes(columnFilters.vatId.toLowerCase()));
    if (columnFilters.email)   processed = processed.filter(b => (b.contactEmail ?? '').toLowerCase().includes(columnFilters.email.toLowerCase()));
    if (columnFilters.address) processed = processed.filter(b => {
        const a = b.address ? `${b.address.city} ${b.address.country} ${b.address.street} ${b.address.postalCode}`.toLowerCase() : '';
        return a.includes(columnFilters.address.toLowerCase());
    });

    if (sortConfig) {
        processed.sort((a, b) => {
            const val = (x: Buyer) => {
                if (sortConfig.key === 'name')    return x.name;
                if (sortConfig.key === 'vatId')   return x.vatId ?? '';
                if (sortConfig.key === 'email')   return x.contactEmail ?? '';
                if (sortConfig.key === 'address') return x.address ? `${x.address.city} ${x.address.country}` : '';
                return '';
            };
            const cmp = val(a).localeCompare(val(b));
            return sortConfig.direction === 'asc' ? cmp : -cmp;
        });
    }

    const { currentPage, setCurrentPage, totalPages, paginatedData: paginatedBuyers, pageSize: itemsPerPage, setPageSize: setItemsPerPage } = usePagination(processed);

    const importNewCount  = importRows.filter(r => r.status === 'new').length;
    const importSkipCount = importRows.filter(r => r.status !== 'new').length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-[#1e3a5f] dark:text-white mb-1">{t('buyers.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('buyers.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 border-slate-200">
                        <FileDown className="h-4 w-4" />
                        CSV Template
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={!buyers.length} className="gap-2 border-slate-200">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-[rgba(30,58,95,0.20)] text-[#1e3a5f] hover:bg-[#f0f6ff]"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-4 w-4" />
                        Import CSV
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                    <Button
                        size="sm"
                        onClick={handleOpenAdd}
                        className="bg-gradient-to-r from-[#1e3a5f] via-[#2a8fbd] to-[#3d5a80] text-white shadow-md shadow-[rgba(30,58,95,0.10)] gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        {t('buyers.addBuyer')}
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card className="p-4">
                <SearchBar
                    value={searchQuery}
                    onChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                    placeholder={t('buyers.searchPlaceholder')}
                    className="w-full"
                />
            </Card>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {(['name', 'vatId', 'email', 'address'] as const).map((col, i) => (
                                <TableHead key={col} className="cursor-pointer hover:bg-gray-50/50" onClick={() => handleSort(col)}>
                                    <div className="flex items-center">
                                        {[t('buyers.name'), t('buyers.vatId'), t('buyers.email'), t('buyers.address')][i]}
                                        <SortIcon columnKey={col} />
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="text-right">{t('invoiceList.actions')}</TableHead>
                        </TableRow>
                        {/* Column filter row */}
                        <TableRow className="bg-gray-50/30">
                            {(['name', 'vatId', 'email', 'address'] as const).map(col => (
                                <TableHead key={col} className="p-2">
                                    <Input
                                        className="h-8 text-micro font-normal"
                                        placeholder={`Filter ${col}...`}
                                        value={columnFilters[col]}
                                        onChange={(e) => { setColumnFilters(f => ({ ...f, [col]: e.target.value })); setCurrentPage(1); }}
                                    />
                                </TableHead>
                            ))}
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="h-8 w-8 animate-spin text-[#2a8fbd]" />
                                        <p className="text-body text-gray-500">{t('common.loading')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : paginatedBuyers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <User className="h-12 w-12 text-gray-300" />
                                        <h3 className="text-gray-900 dark:text-gray-100">{t('buyers.noBuyers')}</h3>
                                        <p className="text-body text-gray-500">{t('buyers.noBuyersDesc')}</p>
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
                                            <div className="flex items-center gap-1 text-micro text-gray-500">
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

                {/* Pagination */}
                {processed.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t flex-wrap gap-3">
                        <div className="flex items-center gap-2 text-body text-gray-600">
                            <span>{t('invoiceList.showing')}</span>
                            <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                            <span>{t('invoiceList.paginationTo')}</span>
                            <span className="font-medium">{Math.min(currentPage * itemsPerPage, processed.length)}</span>
                            <span>{t('invoiceList.of')}</span>
                            <span className="font-medium">{processed.length}</span>
                            <span>{t('invoiceList.results')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-body text-gray-600">{t('invoiceList.rowsPerPage')}:</span>
                                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[10, 25, 50, 100].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-body text-gray-600">{t('invoiceList.page')} {currentPage} {t('invoiceList.of')} {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* ── Add / Edit Dialog ─────────────────────────────────────────── */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{selectedBuyer ? t('buyers.editBuyer') : t('buyers.newBuyer')}</DialogTitle>
                            <DialogDescription>{t('buyers.buyerDetails')}</DialogDescription>
                        </DialogHeader>

                        {/* Duplicate warnings */}
                        {(formDupEmail || formDupVat) && (
                            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-body text-amber-800 mt-2">
                                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>
                                    {formDupEmail && formDupVat
                                        ? 'A buyer with this email address and VAT ID already exists.'
                                        : formDupEmail
                                            ? 'A buyer with this email address already exists.'
                                            : 'A buyer with this VAT ID already exists.'}
                                    {' '}You can still save to update records.
                                </span>
                            </div>
                        )}

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-body font-medium">{t('buyers.name')}</label>
                                    <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-body font-medium">{t('buyers.vatId')}</label>
                                    <Input
                                        value={formData.vatId}
                                        onChange={(e) => setFormData({ ...formData, vatId: e.target.value })}
                                        className={formDupVat ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-body font-medium">{t('buyers.legalOrgId')}</label>
                                    <Input value={formData.legalOrganizationId} onChange={(e) => setFormData({ ...formData, legalOrganizationId: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-body font-medium">{t('buyers.email')}</label>
                                    <Input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        className={formDupEmail ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-body font-medium">{t('buyers.phone')}</label>
                                    <Input value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="text-body font-medium flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />{t('buyers.address')}
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-body font-medium">{t('buyers.street')}</label>
                                        <Input value={formData.address?.street} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-body font-medium">{t('buyers.city')}</label>
                                        <Input value={formData.address?.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-body font-medium">{t('buyers.postalCode')}</label>
                                        <Input value={formData.address?.postalCode} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, postalCode: e.target.value } })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-body font-medium">{t('buyers.country')}</label>
                                        <Input placeholder="e.g. DE, US, FR" value={formData.address?.country} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, country: e.target.value } })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" className="bg-[#f08a3c] hover:bg-[#e07530]">{t('common.save')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ───────────────────────────────────────── */}
            <ConfirmDeleteDialog
                open={isDelDialogOpen}
                onOpenChange={setIsDelDialogOpen}
                onConfirm={() => selectedBuyer?.id && deleteMutation.mutate(selectedBuyer.id)}
                title={t('buyers.deleteConfirm')}
                description={t('common.deleteAria', { index: selectedBuyer?.name || '' })}
                confirmLabel={t('common.delete')}
            />

            {/* ── Import Preview Modal ──────────────────────────────────────── */}
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-[#2a8fbd]" />
                            Import Preview
                        </DialogTitle>
                        <DialogDescription>
                            Review the rows below before importing. Duplicates will be skipped automatically.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Summary bar */}
                    <div className="flex items-center gap-4 py-2 border-b">
                        <div className="flex items-center gap-1.5 text-body text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span><strong>{importNewCount}</strong> new</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-body text-amber-700">
                            <AlertTriangle className="h-4 w-4" />
                            <span><strong>{importSkipCount}</strong> skipped (duplicate)</span>
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="overflow-auto flex-1 -mx-6 px-6">
                        <table className="w-full text-body">
                            <thead className="sticky top-0 bg-slate-50 border-b">
                                <tr>
                                    <th className="text-left py-2 pr-3 font-medium text-micro text-muted-foreground">Status</th>
                                    <th className="text-left py-2 pr-3 font-medium text-micro text-muted-foreground">Name</th>
                                    <th className="text-left py-2 pr-3 font-medium text-micro text-muted-foreground">Email</th>
                                    <th className="text-left py-2 font-medium text-micro text-muted-foreground">VAT ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {importRows.map((row, i) => (
                                    <tr key={i} className={row.status !== 'new' ? 'opacity-60 bg-amber-50/40' : ''}>
                                        <td className="py-2 pr-3">
                                            {row.status === 'new'
                                                ? <Badge className="bg-green-100 text-green-800 border-green-200 text-body">New</Badge>
                                                : <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-body" title={row.reason}>
                                                    {row.status === 'dup-email' ? 'Dup. email' : row.status === 'dup-vat' ? 'Dup. VAT' : 'Error'}
                                                  </Badge>
                                            }
                                        </td>
                                        <td className="py-2 pr-3 font-medium">{row.raw.name || '—'}</td>
                                        <td className="py-2 pr-3 text-muted-foreground">{row.raw.email || '—'}</td>
                                        <td className="py-2 text-muted-foreground">{row.raw.vatid || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
                        <Button
                            disabled={importing || importNewCount === 0}
                            onClick={handleConfirmImport}
                            className="bg-[#f08a3c] hover:bg-[#e07530] gap-2"
                        >
                            {importing
                                ? <><RefreshCw className="h-4 w-4 animate-spin" />Importing…</>
                                : <><Upload className="h-4 w-4" />Import {importNewCount} buyer{importNewCount !== 1 ? 's' : ''}</>
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
