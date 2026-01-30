import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminSettingsService } from '../../../services/adminApi';
import { useAdminStore } from '../../../stores/adminStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import { User, Lock, Key, Settings as SettingsIcon, Copy, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';

export function SAsettings() {
    const { adminUser, theme, setTheme } = useAdminStore();
    const [apiKeys, setApiKeys] = useState([
        { id: '1', name: 'Production API', key: 'sk_live_xxxxxxxxxxxxxxxx', createdAt: '2024-01-15', status: 'active' },
        { id: '2', name: 'Development API', key: 'sk_test_xxxxxxxxxxxxxxxx', createdAt: '2024-02-20', status: 'active' },
    ]);

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

    return (
        <div className="space-y-6 max-w-4xl">
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
