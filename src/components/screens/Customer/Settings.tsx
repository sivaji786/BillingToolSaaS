import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../../../services/customerApi';
import { useAuthStore } from '../../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Building2, Mail, Phone, Save } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerSettingsProps {
    onNavigate: (screen: string) => void;
}

export function CustomerSettings({ onNavigate }: CustomerSettingsProps) {
    const token = useAuthStore((state) => state.token);
    const tenant = useAuthStore((state) => state.tenant);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        company_name: tenant?.company_name || '',
        contact_email: (tenant as any)?.contact_email || '',
        contact_phone: (tenant as any)?.contact_phone || '',
    });

    const updateMutation = useMutation({
        mutationFn: (data: typeof formData) => customerService.updateProfile(token!, data),
        onSuccess: () => {
            toast.success('Profile updated successfully');
            queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
        },
        onError: () => {
            toast.error('Failed to update profile');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences
                </p>
            </div>

            {/* Company Profile */}
            <Card>
                <CardHeader>
                    <CardTitle>Company Profile</CardTitle>
                    <CardDescription>
                        Update your company information
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Company Name</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="company_name"
                                    className="pl-10"
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact_email">Contact Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="contact_email"
                                    type="email"
                                    className="pl-10"
                                    value={formData.contact_email}
                                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact_phone">Contact Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="contact_phone"
                                    type="tel"
                                    className="pl-10"
                                    value={formData.contact_phone}
                                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={updateMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Subscription Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription>
                        Manage your subscription plan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium">Current Plan</p>
                            <p className="text-2xl font-bold">{(tenant as any)?.plan_name || 'No Plan'}</p>
                        </div>
                        <Button variant="outline" onClick={() => onNavigate('subscription')}>
                            Manage Subscription
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                        Irreversible actions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" disabled>
                        Cancel Subscription
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
