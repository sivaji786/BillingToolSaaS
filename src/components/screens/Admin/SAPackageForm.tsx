import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminPackageService } from '../../../services/adminApi';
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
    const [features, setFeatures] = useState<PackageFeature[]>([
        { name: 'Storage', value: '', type: 'storage' },
        { name: 'Users', value: '', type: 'users' },
        { name: 'Bandwidth', value: '', type: 'bandwidth' },
    ]);

    // Fetch package data if editing
    const { data: packageData, isLoading } = useQuery({
        queryKey: ['package', packageId],
        queryFn: () => adminPackageService.getById(packageId!),
        enabled: isEditing,
    });

    // Load features when package data is available
    useEffect(() => {
        if (packageData?.features && packageData.features.length > 0) {
            setFeatures(packageData.features);
        }
    }, [packageData]);

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
        if (features.length > 1) {
            setFeatures(features.filter((_, i) => i !== index));
        } else {
            toast.error('Package must have at least one feature');
        }
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
        if (validFeatures.length === 0) {
            toast.error('Please add at least one feature');
            return;
        }

        const packageData: PackageFormData = {
            name: formDataObj.get('name') as string,
            description: formDataObj.get('description') as string,
            price: parseFloat(formDataObj.get('price') as string),
            currency: formDataObj.get('currency') as string,
            duration: formDataObj.get('duration') as 'monthly' | 'yearly' | 'lifetime',
            status: formDataObj.get('status') as 'active' | 'inactive',
            features: validFeatures,
        };

        if (isEditing && packageId) {
            updateMutation.mutate({ id: packageId, data: packageData });
        } else {
            createMutation.mutate(packageData);
        }
    };

    if (isLoading && isEditing) {
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
                                <Label htmlFor="status">Status</Label>
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
                        </CardContent>
                    </Card>

                    {/* Package Features */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Package Features</CardTitle>
                            <CardDescription>Define all features and limits for this package</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {features.map((feature, index) => (
                                <div key={index} className="flex gap-3 items-start p-4 border rounded-lg">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor={`feature-name-${index}`}>Feature Name *</Label>
                                            <Input
                                                id={`feature-name-${index}`}
                                                value={feature.name}
                                                onChange={(e) => handleFeatureChange(index, 'name', e.target.value)}
                                                placeholder="e.g., Storage, API Calls, Support"
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor={`feature-value-${index}`}>Value *</Label>
                                            <Input
                                                id={`feature-value-${index}`}
                                                value={String(feature.value)}
                                                onChange={(e) => handleFeatureChange(index, 'value', e.target.value)}
                                                placeholder="e.g., 50GB, Unlimited, 24/7"
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor={`feature-type-${index}`}>Type</Label>
                                            <Select
                                                value={feature.type}
                                                onValueChange={(value: string) => handleFeatureChange(index, 'type', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="storage">Storage</SelectItem>
                                                    <SelectItem value="users">Users</SelectItem>
                                                    <SelectItem value="bandwidth">Bandwidth</SelectItem>
                                                    <SelectItem value="api">API Calls</SelectItem>
                                                    <SelectItem value="support">Support</SelectItem>
                                                    <SelectItem value="feature">Feature</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="mt-8"
                                        onClick={() => handleRemoveFeature(index)}
                                        disabled={features.length === 1}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}

                            <div className="mt-4">
                                <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Feature
                                </Button>
                            </div>

                            <p className="text-xs text-muted-foreground mt-4">
                                💡 Tip: Add features like "Storage: 50GB", "Users: 5 users", "Support: 24/7 phone & chat", etc.
                            </p>
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
