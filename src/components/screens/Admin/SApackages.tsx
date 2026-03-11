import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPackageService } from '../../../services/adminApi';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../../ui/skeleton';

interface SApackagesProps {
    onNavigate: (screen: string, params?: { packageId?: string }) => void;
}

export function SApackages({ onNavigate }: SApackagesProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();

    const { data: packagesData, isLoading } = useQuery({
        queryKey: ['packages'],
        queryFn: () => adminPackageService.getAll(1, 50),
    });

    const deleteMutation = useMutation({
        mutationFn: adminPackageService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            toast.success('Package deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete package');
        },
    });

    const filteredPackages = packagesData?.data.filter((pkg) =>
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search packages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => onNavigate('SAPackageForm')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                </Button>
            </div>

            {/* Packages Grid */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-32 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPackages.map((pkg) => (
                        <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                                        <CardDescription className="mt-1">{pkg.description}</CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                                            {pkg.status}
                                        </Badge>
                                        {pkg.isTrailing && (
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                Default
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className={pkg.isPublic ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                                            {pkg.isPublic ? 'Public' : 'Private'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">€{pkg.price}</span>
                                    <span className="text-muted-foreground">/{pkg.duration}</span>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Features:</p>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        {Array.isArray(pkg.features) ? (
                                            pkg.features.map((feature, idx) => (
                                                <li key={idx}>• {feature.name}: {feature.value}</li>
                                            ))
                                        ) : typeof pkg.features === 'object' && pkg.features !== null ? (
                                            Object.entries(pkg.features).map(([key, value], idx) => (
                                                <li key={idx}>• {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}: {String(value)}</li>
                                            ))
                                        ) : (
                                            <li>No features available</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => onNavigate('SAPackageForm', { packageId: pkg.id })}
                                    >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                    </Button>
                                    {!pkg.isTrailing && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-red-600 hover:text-red-700"
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this package?')) {
                                                    deleteMutation.mutate(pkg.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
