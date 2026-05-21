import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminSettingsService } from '../../../services/adminApi';
import { useAdminStore } from '../../../stores/adminStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import { User, Lock, Key, Settings as SettingsIcon, Copy, Trash2, Database, Building2, Mail, Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';

export function SAsettings() {
    const queryClient = useQueryClient();
    const adminUser = useAdminStore(s => s.adminUser);
    const theme = useAdminStore(s => s.theme);
    const setTheme = useAdminStore(s => s.setTheme);
    const { data: settings, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: () => adminSettingsService.getSettings(),
        staleTime: 60 * 60 * 1000,
    });

    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [testEmailAddr, setTestEmailAddr] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [health, setHealth] = useState<{ overall: string; checks: Record<string, { status: string; message: string }> } | null>(null);
    const [loadingHealth, setLoadingHealth] = useState(false);

    // Telegram state
    const [telegramToken, setTelegramToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [telegramEnabled, setTelegramEnabled] = useState(false);
    const [sendingTgTest, setSendingTgTest] = useState(false);

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

    // Sync Telegram state from settings
    useEffect(() => {
        if (settings?.companyProfile) {
            setTelegramChatId(settings.companyProfile.telegram_chat_id ?? '');
            setTelegramEnabled(!!settings.companyProfile.telegram_enabled);
            // Token is masked on the server — leave input blank so user explicitly re-enters to change
        }
    }, [settings]);

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

    const handleTelegramSave = () => {
        const payload: Record<string, unknown> = {
            telegram_chat_id: telegramChatId,
            telegram_enabled: telegramEnabled,
        };
        // Only send token if user typed a new non-masked value
        if (telegramToken && !telegramToken.includes('•')) {
            payload.telegram_bot_token = telegramToken;
        }
        updateSystemSettingsMutation.mutate(payload);
    };

    const handleTelegramTest = async () => {
        setSendingTgTest(true);
        try {
            const result = await adminSettingsService.testTelegram();
            toast.success(result.message);
        } catch {
            toast.error('Failed — check Bot Token and Chat ID');
        } finally {
            setSendingTgTest(false);
        }
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

    const handleTestEmail = async () => {
        if (!testEmailAddr) { toast.error('Enter a recipient email'); return; }
        setSendingTest(true);
        try {
            const result = await adminSettingsService.testEmail(testEmailAddr);
            toast.success(result.message);
        } catch {
            toast.error('Test email failed — check SMTP settings');
        } finally {
            setSendingTest(false);
        }
    };

    const handleLoadHealth = async () => {
        setLoadingHealth(true);
        try {
            const result = await adminSettingsService.getHealth();
            setHealth(result);
        } catch {
            toast.error('Failed to fetch health status');
        } finally {
            setLoadingHealth(false);
        }
    };

    const healthIcon = (status: string) => {
        if (status === 'ok')      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        return <XCircle className="h-4 w-4 text-red-500" />;
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
                        <h4 className="text-body font-medium">Headquarters Address</h4>

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
                        <h4 className="text-body font-medium">Bank Account Information (Required for QR/Giro)</h4>

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
                                    <p className="text-body text-muted-foreground font-mono">{apiKey.key}</p>
                                    <p className="text-micro text-muted-foreground mt-1">
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
                            <p className="text-body text-muted-foreground">
                                Temporarily disable access to the platform
                            </p>
                        </div>
                        <Switch />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Allow New Signups</Label>
                            <p className="text-body text-muted-foreground">
                                Enable or disable new user registrations
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Email Notifications</Label>
                            <p className="text-body text-muted-foreground">
                                Send email notifications for important events
                            </p>
                        </div>
                        <Switch defaultChecked />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Theme Preference</Label>
                            <p className="text-body text-muted-foreground">
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
            {/* Email Test */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        <CardTitle>Test Email (SMTP)</CardTitle>
                    </div>
                    <CardDescription>Send a test message to verify your SMTP configuration is working</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={testEmailAddr}
                            onChange={(e) => setTestEmailAddr(e.target.value)}
                            className="max-w-sm"
                        />
                        <Button onClick={handleTestEmail} disabled={sendingTest} variant="outline">
                            {sendingTest ? 'Sending…' : 'Send Test Email'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Telegram Notifications */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        <CardTitle>Telegram Notifications</CardTitle>
                    </div>
                    <CardDescription>Push ticket events to a Telegram group or channel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Enable Telegram Notifications</Label>
                            <p className="text-body text-muted-foreground">Send messages when tickets are created or updated</p>
                        </div>
                        <Switch
                            checked={telegramEnabled}
                            onCheckedChange={setTelegramEnabled}
                        />
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                        <Label htmlFor="telegramToken">Bot Token</Label>
                        <Input
                            id="telegramToken"
                            type="password"
                            placeholder={settings?.companyProfile?.telegram_bot_token_set ? '••••••••(saved)' : 'Enter bot token from @BotFather'}
                            value={telegramToken}
                            onChange={(e) => setTelegramToken(e.target.value)}
                        />
                        <p className="text-micro text-muted-foreground">
                            {settings?.companyProfile?.telegram_bot_token_set
                                ? 'A token is saved. Leave blank to keep it, or enter a new one to replace it.'
                                : 'Get a token from @BotFather on Telegram.'}
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="telegramChatId">Chat ID</Label>
                        <Input
                            id="telegramChatId"
                            placeholder="e.g. -1001234567890"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                        />
                        <p className="text-micro text-muted-foreground">
                            Group ID (negative number) or channel username (@name). Add @userinfobot to your group to get the ID.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            onClick={handleTelegramSave}
                            disabled={updateSystemSettingsMutation.isPending}
                        >
                            {updateSystemSettingsMutation.isPending ? 'Saving…' : 'Save Telegram Settings'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleTelegramTest}
                            disabled={sendingTgTest}
                        >
                            {sendingTgTest ? 'Sending…' : 'Send Test Message'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* System Health */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            <div>
                                <CardTitle>System Health</CardTitle>
                                <CardDescription>Check database, disk, mail, and API key status</CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLoadHealth} disabled={loadingHealth}>
                            <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                            {health ? 'Refresh' : 'Run Check'}
                        </Button>
                    </div>
                </CardHeader>
                {health && (
                    <CardContent className="space-y-3">
                        <div className={`text-body font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-2 ${
                            health.overall === 'ok' ? 'bg-green-50 text-green-700' :
                            health.overall === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                        }`}>
                            {healthIcon(health.overall)}
                            Overall: {health.overall.toUpperCase()}
                        </div>
                        <div className="divide-y rounded-lg border">
                            {Object.entries(health.checks).map(([key, check]) => (
                                <div key={key} className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        {healthIcon(check.status)}
                                        <span className="text-body font-medium capitalize">{key}</span>
                                    </div>
                                    <span className="text-micro text-muted-foreground">{check.message}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                )}
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
                            <h4 className="text-body font-medium">Migrations</h4>
                            <p className="text-body text-muted-foreground">
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
                            <h4 className="text-body font-medium">Seeding</h4>
                            <p className="text-body text-muted-foreground">
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
