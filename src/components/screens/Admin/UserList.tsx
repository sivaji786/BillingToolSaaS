import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { userService, companyTypeService } from '../../../services/api';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface UserListProps {
    onCreate: () => void;
    onEdit: (id: string) => void;
    companyTypeId: string | null;
}

export function UserList({ onCreate, onEdit, companyTypeId }: UserListProps) {
    const { t } = useLanguage();
    const [users, setUsers] = useState<any[]>([]);
    const [companyTypes, setCompanyTypes] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, typesData] = await Promise.all([
                userService.getAll(),
                companyTypeService.getAll()
            ]);
            setUsers(usersData);
            setCompanyTypes(typesData);
        } catch (error) {
            toast.error(t('admin.users.failedToLoad'));
        }
    };

    const getCompanyName = (typeId: string) => {
        return companyTypes.find(t => String(t.id) === String(typeId))?.name || typeId;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2>{t('admin.users.title')}</h2>
                <Button onClick={onCreate}>
                    <Plus className="h-4 w-4 mr-2" /> {t('admin.users.addUser')}
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('editor.name')}</TableHead>
                            <TableHead>{t('editor.email')}</TableHead>
                            <TableHead>{t('admin.roles.title')}</TableHead>
                            <TableHead>{t('invoiceList.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {user.roles && user.roles
                                            .filter((r: any) => !companyTypeId || String(r.company_type_id) === String(companyTypeId))
                                            .map((r: any) => (
                                                <span key={r.id} className="text-xs bg-muted px-2 py-1 rounded">
                                                    {r.name}
                                                    <span className="text-[10px] text-muted-foreground ml-1">
                                                        ({getCompanyName(r.company_type_id)})
                                                    </span>
                                                </span>
                                            ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(user.id)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
