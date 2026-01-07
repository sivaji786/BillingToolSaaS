import { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { RoleList } from './RoleList';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { RoleForm } from './RoleForm';
import { CompanyTypeList } from './CompanyTypeList';
import { Shield, Users, Building } from 'lucide-react';
import { companyProfileService } from '../../../services/api';
import { toast } from 'sonner';

type AdminView = 'list' | 'user-form' | 'role-form';

export function AdminLayout() {
    const { t } = useLanguage();

    const [view, setView] = useState<AdminView>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('users');
    const [companyTypeId, setCompanyTypeId] = useState<string | null>(null);

    useEffect(() => {
        loadCompanyProfile();
    }, []);

    const loadCompanyProfile = async () => {
        try {
            const profiles = await companyProfileService.getAll();
            if (profiles && profiles.length > 0) {
                // Assuming single company profile or using the first one
                setCompanyTypeId(String(profiles[0].companyTypeId));
            }
        } catch (error) {
            console.error('Failed to load company profile', error);
            toast.error(t('admin.common.failedToLoadProfile'));
        }
    };

    const handleCreateUser = () => {
        setEditingId(null);
        setView('user-form');
    };

    const handleEditUser = (id: string) => {
        setEditingId(id);
        setView('user-form');
    };

    const handleCreateRole = () => {
        setEditingId(null);
        setView('role-form');
    };

    const handleEditRole = (id: string) => {
        setEditingId(id);
        setView('role-form');
    };

    const handleBack = () => {
        setView('list');
        setEditingId(null);
    };

    if (view === 'user-form') {
        return <UserForm userId={editingId} onBack={handleBack} companyTypeId={companyTypeId} />;
    }

    if (view === 'role-form') {
        return <RoleForm roleId={editingId} onBack={handleBack} companyTypeId={companyTypeId} />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('admin.title')}</h1>
                <p className="text-muted-foreground mt-2">{t('admin.subtitle')}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="users">
                        <Users className="h-4 w-4 mr-2" />
                        {t('admin.tabs.users')}
                    </TabsTrigger>
                    <TabsTrigger value="roles">
                        <Shield className="h-4 w-4 mr-2" />
                        {t('admin.tabs.roles')}
                    </TabsTrigger>
                    <TabsTrigger value="company-types">
                        <Building className="h-4 w-4 mr-2" />
                        {t('admin.tabs.companyTypes')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <UserList onCreate={handleCreateUser} onEdit={handleEditUser} companyTypeId={companyTypeId} />
                </TabsContent>

                <TabsContent value="roles">
                    <RoleList onCreate={handleCreateRole} onEdit={handleEditRole} companyTypeId={companyTypeId} />
                </TabsContent>

                <TabsContent value="company-types">
                    <CompanyTypeList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
