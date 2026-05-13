import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { roleService, rightService } from '../../../services/api';
import { CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface RoleFormProps {
    roleId?: string | null;
    onBack: () => void;
    companyTypeId: string | null;
}

export function RoleForm({ roleId, onBack, companyTypeId }: RoleFormProps) {
    const { t } = useLanguage();
    const [rights, setRights] = useState<any[]>([]);
    const [formData, setFormData] = useState({ name: '', description: '', company_type_id: '', rights: [] as string[] });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [roleId, companyTypeId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const rightsData = await rightService.getAll();
            setRights(rightsData);

            if (roleId) {
                const fullRole = await roleService.getById(roleId);
                setFormData({
                    name: fullRole.name,
                    description: fullRole.description || '',
                    company_type_id: fullRole.company_type_id,
                    rights: fullRole.rights ? fullRole.rights.map((r: any) => r.id) : []
                });
            } else if (companyTypeId) {
                setFormData(prev => ({ ...prev, company_type_id: companyTypeId }));
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = { ...formData };
            if (companyTypeId) {
                payload.company_type_id = companyTypeId;
            }

            if (roleId) {
                await roleService.update(roleId, payload);
                toast.success(t('admin.roles.roleUpdated'));
            } else {
                await roleService.create(payload);
                toast.success(t('admin.roles.roleCreated'));
            }
            onBack();
        } catch (error) {
            toast.error(t('admin.roles.failedToSave'));
        }
    };

    const toggleRight = (rightId: string) => {
        setFormData(prev => {
            const currentRights = prev.rights || [];
            if (currentRights.includes(rightId)) {
                return { ...prev, rights: currentRights.filter(id => id !== rightId) };
            } else {
                return { ...prev, rights: [...currentRights, rightId] };
            }
        });
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
                <h2 className="text-xl font-semibold">{roleId ? t('admin.roles.editRole') : t('admin.roles.createRole')}</h2>
            </div>

            <div className="border p-6 rounded-md bg-card space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label>{t('admin.roles.roleName')}</Label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Finance Manager" />
                    </div>
                    <div>
                        <Label>{t('admin.roles.description')}</Label>
                        <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={t('admin.roles.description')} />
                    </div>
                </div>

                <div>
                    <Label className="mb-2 block">{t('admin.roles.permissions')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 border p-4 rounded-md h-96 overflow-y-auto bg-background/50">
                        {rights.length === 0 ? <p className="text-muted-foreground p-2 text-sm italic">{t('admin.roles.noPermissions')}</p> :
                            rights.sort((a, b) => a.module.localeCompare(b.module)).map(right => (
                                <div
                                    key={right.id}
                                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer transition-colors"
                                    onClick={() => toggleRight(right.id)}
                                >
                                    {formData.rights.includes(right.id) ?
                                        <CheckSquare className="h-4 w-4 text-primary shrink-0" /> :
                                        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                                    }
                                    <span className="text-sm">
                                        <span className="font-semibold text-xs text-muted-foreground uppercase mr-1">{right.module}</span>
                                        {right.action}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={onBack}>{t('common.cancel')}</Button>
                    <Button onClick={handleSave}>{t('admin.common.save') || 'Save'}</Button>
                </div>
            </div>
        </div>
    );
}
