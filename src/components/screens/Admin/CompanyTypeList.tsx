import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { companyTypeService } from '../../../services/api';
import { Plus, Pencil, Trash2, Building } from 'lucide-react';
import { TableEmptyState } from '../../ui/TableEmptyState';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../ui/dialog';
import { Input } from '../../ui/input';

export function CompanyTypeList() {
    const [types, setTypes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<any | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await companyTypeService.getAll();
            setTypes(data);
        } catch (error) {
            toast.error('Failed to load company types');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingType(null);
        setFormData({ name: '' });
        setIsDialogOpen(true);
    };

    const handleEdit = (type: any) => {
        setEditingType(type);
        setFormData({ name: type.name });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingType) {
                await companyTypeService.update(editingType.id, formData);
                toast.success('Company type updated');
            } else {
                await companyTypeService.create(formData);
                toast.success('Company type created');
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error('Failed to save company type');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this company type? This may affect associated roles.')) return;
        try {
            await companyTypeService.delete(id);
            toast.success('Company type deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete company type');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-heading-3 font-medium">Company Types</h2>
                    <p className="text-body text-gray-500">Manage different types of organizations (e.g. Agency, Client).</p>
                </div>
                <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> Add Type</Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading || types.length === 0 ? (
                            <TableEmptyState colSpan={2} isLoading={isLoading} emptyMessage="No company types found" />
                        ) : (
                            types.map(type => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Building className="h-4 w-4 text-gray-400" />
                                        {type.name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(type)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(type.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingType ? 'Edit Company Type' : 'New Company Type'}</DialogTitle>
                        <DialogDescription>
                            Define the name for the company type.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-body font-medium">Name</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Agency, Client"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
