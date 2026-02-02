import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminSettingsService } from '../../../services/adminApi';
import { useAdminStore } from '../../../stores/adminStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import { User, Lock, Key, Settings as SettingsIcon, Copy, Trash2, Database, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function SAsettings() {
    const queryClient = useQueryClient();
    const { adminUser, theme, setTheme } = useAdminStore();
    const { data: settings, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: () => adminSettingsService.getSettings(),
    });

    const [apiKeys, setApiKeys] = useState<any[]>([]);

    // Sync apiKeys state when settings are loaded
    useState(() => {
        if (settings?.apiKeys) {
            setApiKeys(settings.apiKeys);
        }
    });

    // Effect-like behavior for setApiKeys when settings load
    if (settings?.apiKeys && apiKeys.length === 0 && settings.apiKeys.length > 0) {
        setApiKeys(settings.apiKeys);
    }

    const updateProfileMutation = useMutation({
        mutationFn: (data: { name: string; email: string }) => adminSettingsService.updateProfile(data),
        onSuccess: () => {
            toast.success('Profile updated successfully');
        },
        onError: () => {
            toast.error('Failed to update profile');
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: (data: { currentPassword: string; newPassword: string }) =>
            adminSettingsService.changePassword(data.currentPassword, data.newPassword),
        onSuccess: () => {
            toast.success('Password changed successfully');
        },
        onError: () => {
            toast.error('Failed to change password');
        },
    });

    const updateSystemSettingsMutation = useMutation({
        mutationFn: (data: any) => adminSettingsService.updateSystemSettings(data),
        onSuccess: () => {
            toast.success('Settings updated successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
        },
        onError: () => {
            toast.error('Failed to update settings');
        },
    });

    const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        updateProfileMutation.mutate({
            name: formData.get('name') as string,
            email: formData.get('email') as string,
        });
    };

    const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        changePasswordMutation.mutate({
            currentPassword: formData.get('currentPassword') as string,
            newPassword,
        });
    };

    const handleSystemSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        updateSystemSettingsMutation.mutate({
            companyDetails: {
                name: formData.get('companyName'),
                vatId: formData.get('vatId'),
                address: {
                    street: formData.get('street'),
                    city: formData.get('city'),
                    postalCode: formData.get('postalCode'),
                    country: formData.get('country'),
                },
                email: formData.get('companyEmail'),
                phone: formData.get('companyPhone'),
                bankDetails: {
                    accountName: formData.get('bankAccountName'),
                    iban: formData.get('bankIban'),
                    bic: formData.get('bankBic'),
                }
            }
        });
    };


    const handleGenerateApiKey = async () => {
        try {
            const newKey = await adminSettingsService.generateApiKey('New API Key');
            setApiKeys([...apiKeys, newKey]);
            toast.success('API key generated successfully');
        } catch (error) {
            toast.error('Failed to generate API key');
        }
    };

    const handleCopyApiKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('API key copied to clipboard');
    };

    const handleRevokeApiKey = async (keyId: string) => {
        try {
            await adminSettingsService.revokeApiKey(keyId);
            setApiKeys(apiKeys.filter((k) => k.id !== keyId));
            toast.success('API key revoked successfully');
        } catch (error) {
            toast.error('Failed to revoke API key');
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl pb-12">
            {/* Company Details */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        <CardTitle>Platform Company Details</CardTitle>
                    </div>
                    <CardDescription>Configure your company information for invoice "From" section</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSystemSettingsSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="companyName">Company Name</Label>
                                <Input id="companyName" name="companyName" defaultValue={settings?.companyProfile?.name} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="vatId">VAT ID (Optional)</Label>
                                <Input id="vatId" name="vatId" defaultValue={settings?.companyProfile?.vat_id} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="companyEmail">Contact Email</Label>
                                <Input id="companyEmail" name="companyEmail" type="email" defaultValue={settings?.companyProfile?.email} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="companyPhone">Contact Phone</Label>
                                <Input id="companyPhone" name="companyPhone" defaultValue={settings?.companyProfile?.phone} />
                            </div>
                        </div>

                        <Separator />
                        <h4 className="text-sm font-medium">Headquarters Address</h4>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="street">Street Address</Label>
                                <Input id="street" name="street" defaultValue={settings?.companyProfile?.street} required />
                            </div>
                            <div className="grid gap-4 grid-cols-3">
                                <div className="grid gap-2 col-span-1">
                                    <Label htmlFor="postalCode">Postal Code</Label>
                                    <Input id="postalCode" name="postalCode" defaultValue={settings?.companyProfile?.postal_code} required />
                                </div>
                                <div className="grid gap-2 col-span-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input id="city" name="city" defaultValue={settings?.companyProfile?.city} required />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="country">Country</Label>
                                <Input id="country" name="country" defaultValue={settings?.companyProfile?.country} required />
                            </div>
                        </div>

                        <Separator />
                        <h4 className="text-sm font-medium">Bank Account Information (Required for QR/Giro)</h4>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="bankAccountName">Account Holder Name</Label>
                                <Input id="bankAccountName" name="bankAccountName" defaultValue={settings?.companyProfile?.bank_account_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bankIban">IBAN</Label>
                                <Input id="bankIban" name="bankIban" defaultValue={settings?.companyProfile?.bank_iban} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bankBic">BIC / SWIFT</Label>
                                <Input id="bankBic" name="bankBic" defaultValue={settings?.companyProfile?.bank_bic} />
                            </div>
                        </div>

                        <Button type="submit" disabled={updateSystemSettingsMutation.isPending}>
                            {updateSystemSettingsMutation.isPending ? 'Saving...' : 'Update Company Details'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {/* Profile Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <CardTitle>Profile Settings</CardTitle>
                    </div>
                    <CardDescription>Update your admin profile information</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={adminUser?.name}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={adminUser?.email}
                                required
                            />
                        </div>

                        <Button type="submit" disabled={updateProfileMutation.isPending}>
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Password Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        <CardTitle>Change Password</CardTitle>
                    </div>
                    <CardDescription>Update your admin password</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                            />
                        </div>

                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                            Change Password
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* API Keys */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                <CardTitle>API Keys</CardTitle>
                            </div>
                            <CardDescription>Manage your API keys for external integrations</CardDescription>
                        </div>
                        <Button onClick={handleGenerateApiKey}>
                            Generate New Key
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {apiKeys.map((apiKey) => (
                            <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium">{apiKey.name}</p>
                                    <p className="text-sm text-muted-foreground font-mono">{apiKey.key}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Created on {new Date(apiKey.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyApiKey(apiKey.key)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm('Are you sure you want to revoke this API key?')) {
                                                handleRevokeApiKey(apiKey.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        <CardTitle>System Settings</CardTitle>
                    </div>
                    <CardDescription>Configure platform-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Maintenance Mode</Label>
                            <p className="text-sm text-muted-foreground">
                                Temporarily disable access to the platform
                            </p>
                        </div>
                        <Switch />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Allow New Signups</Label>
                            <p className="text-sm text-muted-foreground">
                                Enable or disable new user registrations
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Send email notifications for important events
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Theme Preference</Label>
                            <p className="text-sm text-muted-foreground">
                                Current theme: {theme}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={theme === 'light' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('light')}
                            >
                                Light
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('dark')}
                            >
                                Dark
                            </Button>
                            <Button
                                variant={theme === 'system' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('system')}
                            >
                                System
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            {/* Database Management */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        <CardTitle>Database Management</CardTitle>
                    </div>
                    <CardDescription>Run database migrations and seeders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                            <h4 className="text-sm font-medium">Migrations</h4>
                            <p className="text-sm text-muted-foreground">
                                Update the database schema to the latest version.
                            </p>
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    const promise = adminSettingsService.migrateDatabase();
                                    toast.promise(promise, {
                                        loading: 'Running migrations...',
                                        success: (data) => data.message,
                                        error: 'Migration failed'
                                    });
                                }}
                            >
                                Run Pending Migrations
                            </Button>
                        </div>
                        <Separator orientation="vertical" className="hidden sm:block h-24" />
                        <div className="flex-1 space-y-2">
                            <h4 className="text-sm font-medium">Seeding</h4>
                            <p className="text-sm text-muted-foreground">
                                Reset or populate database with default data.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        if (confirm('Are you sure you want to run the default seeder? This may overwrite existing data.')) {
                                            const promise = adminSettingsService.seedDatabase();
                                            toast.promise(promise, {
                                                loading: 'Running seeder...',
                                                success: (data) => data.message,
                                                error: 'Seeding failed'
                                            });
                                        }
                                    }}
                                >
                                    Run Default Seeder
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
