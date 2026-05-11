import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminPackageService, adminPackageServicesService } from '../../../services/adminApi';
import { PackageFormData, PackageFeature } from '../../../types/admin';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface SAPackageFormProps {
    packageId?: string;
    onNavigate: (screen: string) => void;
}

export function SAPackageForm({ packageId, onNavigate }: SAPackageFormProps) {
    const queryClient = useQueryClient();
    const isEditing = !!packageId;

    // State for dynamic features
    const [features, setFeatures] = useState<PackageFeature[]>([]);
    const [isTrailing, setIsTrailing] = useState(false);
    const [isPublic, setIsPublic] = useState(true);

    // Fetch package data if editing
    const { data: packageData, isLoading } = useQuery({
        queryKey: ['package', packageId],
        queryFn: () => adminPackageService.getById(packageId!),
        enabled: isEditing,
    });

    // Fetch active package services (columns)
    const { data: availableServices, isLoading: isServicesLoading } = useQuery({
        queryKey: ['package-services-active'],
        queryFn: () => adminPackageServicesService.getAll(true),
        staleTime: 30 * 60 * 1000,
    });

    // Load features when package data and available services are ready
    useEffect(() => {
        if (!availableServices) return;

        const defaultFeatures: PackageFeature[] = availableServices.map(srv => {
            const existingFeature = packageData?.features?.find(f => f.type === srv.type && f.name === srv.name);
            return {
                name: srv.name,
                type: srv.type,
                value: existingFeature ? existingFeature.value : '',
            };
        });

        // Add any extra custom features that the package had but aren't in active services anymore
        if (packageData?.features) {
            packageData.features.forEach(f => {
                if (!defaultFeatures.find(df => df.type === f.type && df.name === f.name)) {
                    defaultFeatures.push(f);
                }
            });
        }

        setFeatures(defaultFeatures);

        if (packageData) {
            setIsTrailing(!!packageData.isTrailing);
            setIsPublic(packageData.isPublic !== false); // default to true
        }
    }, [packageData, availableServices]);

    const createMutation = useMutation({
        mutationFn: adminPackageService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            toast.success('Package created successfully');
            onNavigate('SApackages');
        },
        onError: () => {
            toast.error('Failed to create package');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PackageFormData> }) =>
            adminPackageService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            toast.success('Package updated successfully');
            onNavigate('SApackages');
        },
        onError: () => {
            toast.error('Failed to update package');
        },
    });

    const handleAddFeature = () => {
        setFeatures([...features, { name: '', value: '', type: 'custom' }]);
    };

    const handleRemoveFeature = (index: number) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const handleFeatureChange = (index: number, field: keyof PackageFeature, value: string) => {
        const updatedFeatures = [...features];
        updatedFeatures[index] = { ...updatedFeatures[index], [field]: value };
        setFeatures(updatedFeatures);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formDataObj = new FormData(form);

        // Validate features
        const validFeatures = features.filter(f => f.name.toString().trim() && f.value.toString().trim());

        const packageDataPayload: PackageFormData = {
            name: formDataObj.get('name') as string,
            description: formDataObj.get('description') as string,
            price: parseFloat(formDataObj.get('price') as string),
            currency: formDataObj.get('currency') as string,
            duration: formDataObj.get('duration') as 'monthly' | 'yearly' | 'lifetime',
            status: formDataObj.get('status') as 'active' | 'inactive',
            isTrailing: isTrailing,
            isPublic: isPublic,
            features: validFeatures,
        };

        if (isEditing && packageId) {
            updateMutation.mutate({ id: packageId, data: packageDataPayload });
        } else {
            createMutation.mutate(packageDataPayload);
        }
    };

    if ((isLoading && isEditing) || isServicesLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => onNavigate('SApackages')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-2xl font-bold">Loading...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => onNavigate('SApackages')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold">{isEditing ? 'Edit Package' : 'Add New Package'}</h2>
                    <p className="text-sm text-muted-foreground">
                        {isEditing ? 'Update package details and features' : 'Create a new subscription package'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>Package name, description, and pricing details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Package Name *</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={packageData?.name}
                                    placeholder="e.g., Professional Plan"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    defaultValue={packageData?.description}
                                    placeholder="Brief description of the package"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="price">Price *</Label>
                                    <Input
                                        id="price"
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        defaultValue={packageData?.price}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select name="currency" defaultValue={packageData?.currency?.toString() || 'EUR'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="INR">INR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="duration">Duration *</Label>
                                    <Select name="duration" defaultValue={packageData?.duration?.toString() || 'monthly'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                            <SelectItem value="lifetime">Lifetime</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Select name="status" defaultValue={packageData?.status?.toString() || 'active'}>
                                    <SelectTrigger className="w-full md:w-[200px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isTrailing"
                                    checked={isTrailing}
                                    onChange={(e) => setIsTrailing(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor="isTrailing" className="font-medium cursor-pointer">
                                    Default (Trailing) Package
                                </Label>
                                <span className="text-xs text-muted-foreground ml-2">
                                    (New tenants from QuickAccess will receive this plan)
                                </span>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor="isPublic" className="font-medium cursor-pointer">
                                    Visible to Public
                                </Label>
                                <span className="text-xs text-muted-foreground ml-2">
                                    (Show this plan on the public pricing page)
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Package Features */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Package Services / Features</CardTitle>
                            <CardDescription>Provide values for the available services on this package</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {features.map((feature, index) => {
                                const isPredefinedService = availableServices?.some(s => s.name === feature.name && s.type === feature.type);

                                return (
                                    <div key={index} className="flex gap-3 items-start p-4 border rounded-lg bg-slate-50">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor={`feature-name-${index}`}>Service Name</Label>
                                                <Input
                                                    id={`feature-name-${index}`}
                                                    value={feature.name}
                                                    readOnly={isPredefinedService}
                                                    className={isPredefinedService ? "bg-gray-100 cursor-not-allowed" : ""}
                                                    onChange={(e) => handleFeatureChange(index, 'name', e.target.value)}
                                                    placeholder="e.g., Storage"
                                                    required
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor={`feature-value-${index}`}>Value</Label>
                                                <Input
                                                    id={`feature-value-${index}`}
                                                    value={String(feature.value)}
                                                    onChange={(e) => handleFeatureChange(index, 'value', e.target.value)}
                                                    placeholder="e.g., 50GB, Unlimited"
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor={`feature-type-${index}`}>Type</Label>
                                                <Select
                                                    value={feature.type}
                                                    disabled={isPredefinedService}
                                                    onValueChange={(value: string) => handleFeatureChange(index, 'type', value)}
                                                >
                                                    <SelectTrigger className={isPredefinedService ? "bg-gray-100 cursor-not-allowed" : ""}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="storage">Storage</SelectItem>
                                                        <SelectItem value="users">Users</SelectItem>
                                                        <SelectItem value="bandwidth">Bandwidth</SelectItem>
                                                        <SelectItem value="api_calls">API Calls</SelectItem>
                                                        <SelectItem value="invoices">Invoices</SelectItem>
                                                        <SelectItem value="projects">Projects</SelectItem>
                                                        <SelectItem value="support">Support</SelectItem>
                                                        <SelectItem value="custom">Custom Feature</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {!isPredefinedService && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-8 text-red-500 hover:text-red-700"
                                                onClick={() => handleRemoveFeature(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="mt-4 pt-4 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Custom Feature
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Add an extra feature that is unique to this package.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onNavigate('SApackages')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {isEditing ? 'Update Package' : 'Create Package'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
