import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { roleService, companyTypeService } from '../../../services/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../ui/select';

interface RoleListProps {
    onCreate: () => void;
    onEdit: (id: string) => void;
    companyTypeId: string | null;
}

export function RoleList({ onCreate, onEdit, companyTypeId: initialCompanyTypeId }: RoleListProps) {
    const { t } = useLanguage();
    const [roles, setRoles] = useState<any[]>([]);
    const [companyTypes, setCompanyTypes] = useState<any[]>([]);

    // When parent provides a company type, use it directly; otherwise allow local dropdown selection
    const controlled = initialCompanyTypeId != null && initialCompanyTypeId !== 'null' && initialCompanyTypeId !== 'undefined';
    const [selectedType, setSelectedType] = useState<string>(controlled ? initialCompanyTypeId : 'all');

    useEffect(() => {
        companyTypeService.getAll()
            .then(setCompanyTypes)
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (controlled) setSelectedType(initialCompanyTypeId);
    }, [initialCompanyTypeId]);

    useEffect(() => {
        loadRoles();
    }, [selectedType]);

    const loadRoles = async () => {
        try {
            const params: any = {};
            if (selectedType && selectedType !== 'all') {
                params.company_type_id = selectedType;
            }
            const data = await roleService.getAll(params);
            setRoles(data);
        } catch (error) {
            toast.error(t('admin.roles.failedToLoad'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('admin.roles.deleteConfirm'))) return;
        try {
            await roleService.delete(id);
            toast.success(t('admin.roles.roleDeleted'));
            loadRoles();
        } catch (error) {
            toast.error(t('admin.roles.failedToDelete'));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-heading-2 font-medium">{t('admin.roles.title')}</h2>
                    {!controlled && (
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t('admin.roles.filterByType')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('admin.roles.allTypes')}</SelectItem>
                                {companyTypes.map(type => (
                                    <SelectItem key={type.id} value={String(type.id)}>
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <Button onClick={onCreate}><Plus className="h-4 w-4 mr-2" /> {t('admin.roles.newRole')}</Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('admin.roles.roleName')}</TableHead>
                            <TableHead>{t('admin.companyTypes.title')}</TableHead>
                            <TableHead>{t('admin.roles.description')}</TableHead>
                            <TableHead className="text-right">{t('invoiceList.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">{t('admin.roles.noRoles')}</TableCell>
                            </TableRow>
                        ) : (
                            roles.map(role => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium">{role.name}</TableCell>
                                    <TableCell>
                                        {companyTypes.find(t => String(t.id) === String(role.company_type_id))?.name || role.company_type_id}
                                    </TableCell>
                                    <TableCell>{role.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => onEdit(role.id)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(role.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
