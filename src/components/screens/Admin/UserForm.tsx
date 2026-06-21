import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { userService, roleService, companyTypeService } from '../../../services/api';
import { getErrorMessage } from '../../../utils/config';
import { CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface UserFormProps {
    userId?: string | null;
    onBack: () => void;
    companyTypeId: string | null;
}

export function UserForm({ userId, onBack, companyTypeId }: UserFormProps) {
    const { t } = useLanguage();
    const [roles, setRoles] = useState<any[]>([]);
    const [companyTypes, setCompanyTypes] = useState<any[]>([]);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (companyTypeId) {
            loadData();
        }
    }, [userId, companyTypeId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rolesData, typesData, usersData] = await Promise.all([
                roleService.getAll({ company_type_id: companyTypeId! }),
                companyTypeService.getAll(),
                userId ? userService.getAll() : Promise.resolve([])
            ]);
            setRoles(rolesData);
            setCompanyTypes(typesData);

            if (userId) {
                // Since our API currently only has getAll for users, we find the user from the list 
                // In a real app we'd add getById to userService
                const user = usersData.find((u: any) => u.id === userId);
                if (user) {
                    setFormData({ name: user.name, email: user.email, password: '' });
                    setSelectedRoles(user.roles ? user.roles.map((r: any) => r.id) : []);
                }
            }
        } catch (error) {
            toast.error(t('admin.users.failedToLoad'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = { ...formData, roles: selectedRoles };

            if (userId) {
                const updatePayload: any = { ...payload };
                if (!updatePayload.password) delete updatePayload.password;

                await userService.update(userId, updatePayload);
                toast.success(t('admin.users.userUpdated'));
            } else {
                if (!formData.password) {
                    toast.error(t('admin.users.passwordRequired'));
                    return;
                }
                await userService.create(payload);
                toast.success(t('admin.users.userCreated'));
            }
            onBack();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, t('admin.users.failedToSave')));
        }
    };

    const toggleRole = (roleId: string) => {
        setSelectedRoles(prev => {
            if (prev.includes(roleId)) {
                return prev.filter(id => id !== roleId);
            } else {
                return [...prev, roleId];
            }
        });
    };

    const getCompanyName = (typeId: string) => {
        return companyTypes.find(t => String(t.id) === String(typeId))?.name || typeId;
    };

    if (isLoading) {
        return <div>{t('common.loading')}</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> {t('common.back')}
                </Button>
                <h2 className="text-heading-2 font-medium">{userId ? t('admin.users.editUser') : t('admin.users.newUser')}</h2>
            </div>

            <div className="border p-6 rounded-md bg-card space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>{t('party.name')}</Label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('party.name')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('party.email')}</Label>
                        <Input
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@example.com"
                            type="email"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('login.password')} {userId && `(${t('admin.users.leaveBlank')})`}</Label>
                        <Input
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            type="password"
                            placeholder={t('admin.users.passwordPlaceholder')}
                        />
                    </div>
                </div>

                <div>
                    <Label className="mb-2 block">{t('admin.users.assignRoles')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-4 rounded-md h-60 overflow-y-auto bg-background/50">
                        {roles.map(role => (
                            <div
                                key={role.id}
                                className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer transition-colors"
                                onClick={() => toggleRole(role.id)}
                            >
                                {selectedRoles.includes(role.id) ?
                                    <CheckSquare className="h-4 w-4 text-primary shrink-0" /> :
                                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                                }
                                <div>
                                    <div className="font-medium text-body">{role.name}</div>
                                    <div className="text-micro text-muted-foreground">{getCompanyName(role.company_type_id)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onBack}>{t('common.cancel')}</Button>
                    <Button onClick={handleSave}>{userId ? t('common.save') : t('admin.users.addUser')}</Button>
                </div>
            </div>
        </div>
    );
}
