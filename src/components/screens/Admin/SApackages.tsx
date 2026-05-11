import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPackageService, adminPackageServicesService } from '../../../services/adminApi';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../../ui/skeleton';
import { cn } from '../../../lib/utils';
import { Package, PackageFeature } from '../../../types/admin';

interface SApackagesProps {
    onNavigate: (screen: string, params?: { packageId?: string }) => void;
}

// Custom Debounced Input for Inline Editing
function DebouncedInput({ 
    value, 
    onSave, 
    type = "text",
    className 
}: { 
    value: string | number; 
    onSave: (val: any) => void;
    type?: string;
    className?: string;
}) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        if (localValue === value) return;
        const timer = setTimeout(() => {
            onSave(type === 'number' ? Number(localValue) : localValue);
        }, 500);
        return () => clearTimeout(timer);
    }, [localValue]);

    return (
        <Input
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className={cn("h-8 px-2 text-sm", className)}
        />
    );
}

export function SApackages({ onNavigate }: SApackagesProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient();

    // Queries
    const { data: packagesResponse, isLoading: isLoadingPackages } = useQuery({
        queryKey: ['packages'],
        queryFn: () => adminPackageService.getAll(1, 100),
        staleTime: 30 * 60 * 1000,
    });

    const { data: services, isLoading: isLoadingServices } = useQuery({
        queryKey: ['package-services'],
        queryFn: () => adminPackageServicesService.getAll(),
        staleTime: 30 * 60 * 1000,
    });

    const packages = useMemo<Package[]>(() => packagesResponse?.data || [], [packagesResponse]);

    // Mutations
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => adminPackageService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            // toast.success('Saved'); // Optional: Too many toasts might be annoying
        },
        onError: () => {
            toast.error('Failed to save changes');
        }
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

    const handleUpdate = (pkgId: string, field: string, value: any) => {
        // Special handling for features
        if (field.startsWith('feature:')) {
            const featureType = field.split(':')[1];
            const pkg = packages.find(p => p.id === pkgId);
            if (!pkg) return;

            let updatedFeatures: PackageFeature[] = [...(pkg.features || [])];
            const featureIndex = updatedFeatures.findIndex(f => f.type === featureType);

            if (featureIndex >= 0) {
                updatedFeatures[featureIndex] = { ...updatedFeatures[featureIndex], value };
            } else {
                const service = services?.find(s => s.type === featureType);
                updatedFeatures.push({ 
                    name: service?.name || featureType, 
                    type: featureType, 
                    value 
                });
            }

            updateMutation.mutate({ id: pkgId, data: { features: updatedFeatures } });
        } else {
            updateMutation.mutate({ id: pkgId, data: { [field]: value } });
        }
    };

    const handleSetDefault = (pkgId: string) => {
        // First deactivate other trailing/default packages (if backend doesn't handle it)
        // But usually we just tell backend this is the new default.
        updateMutation.mutate({ id: pkgId, data: { isTrailing: true } });
    };

    const filteredPackages = useMemo(() => {
        return packages.filter(pkg => 
            pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [packages, searchQuery]);

    if (isLoadingPackages || isLoadingServices) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card>
                    <CardContent className="p-0">
                        <div className="h-[400px] w-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-1 items-center gap-4 w-full md:max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search packages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button 
                        onClick={() => onNavigate('SAPackageForm')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 md:flex-none"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Package
                    </Button>
                </div>
            </div>

            {/* Comparison Management Table */}
            <Card className="overflow-hidden border-none shadow-premium bg-card/50 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <Table className="border-collapse min-w-[800px]">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b bg-muted/30">
                                <TableHead className="w-[200px] font-bold text-foreground py-6 px-6 sticky left-0 bg-muted/95 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Features
                                </TableHead>
                                {filteredPackages.map((pkg) => (
                                    <TableHead key={pkg.id} className="min-w-[180px] py-6 px-4 text-center border-l bg-card/40">
                                        <div className="flex flex-col items-center gap-3">
                                            <DebouncedInput 
                                                value={pkg.name} 
                                                onSave={(val) => handleUpdate(pkg.id, 'name', val)}
                                                className="text-center font-bold text-lg h-10 border-none bg-transparent hover:bg-muted/50 focus:bg-white"
                                            />
                                            <div className="flex gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-muted-foreground hover:text-indigo-600"
                                                    onClick={() => onNavigate('SAPackageForm', { packageId: pkg.id })}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                {!pkg.isTrailing && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to delete ${pkg.name}?`)) {
                                                                deleteMutation.mutate(pkg.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Price Row */}
                            <TableRow className="group border-b hover:bg-muted/10">
                                <TableCell className="font-semibold py-4 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Price
                                </TableCell>
                                {filteredPackages.map((pkg) => (
                                    <TableCell key={pkg.id} className="py-4 px-4 text-center border-l">
                                        <div className="flex items-center justify-center gap-1">
                                            <DebouncedInput 
                                                type="number"
                                                value={pkg.price}
                                                onSave={(val) => handleUpdate(pkg.id, 'price', val)}
                                                className="w-24 text-center font-bold"
                                            />
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Currency Row */}
                            <TableRow className="group border-b hover:bg-muted/10">
                                <TableCell className="font-semibold py-4 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Currency
                                </TableCell>
                                {filteredPackages.map((pkg) => (
                                    <TableCell key={pkg.id} className="py-4 px-4 text-center border-l">
                                        <Select 
                                            value={pkg.currency} 
                                            onValueChange={(val) => handleUpdate(pkg.id, 'currency', val)}
                                        >
                                            <SelectTrigger className="h-8 w-24 mx-auto">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                                <SelectItem value="AED">AED</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Duration Row */}
                            <TableRow className="group border-b hover:bg-muted/10">
                                <TableCell className="font-semibold py-4 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Duration / Cycle
                                </TableCell>
                                {filteredPackages.map((pkg) => (
                                    <TableCell key={pkg.id} className="py-4 px-4 text-center border-l">
                                        <Select 
                                            value={pkg.duration} 
                                            onValueChange={(val) => handleUpdate(pkg.id, 'duration', val)}
                                        >
                                            <SelectTrigger className="h-8 w-32 mx-auto">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="yearly">Yearly</SelectItem>
                                                <SelectItem value="lifetime">Lifetime</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Status Row */}
                            <TableRow className="group border-b hover:bg-muted/10">
                                <TableCell className="font-semibold py-4 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Active / Inactive
                                </TableCell>
                                {filteredPackages.map((pkg) => (
                                    <TableCell key={pkg.id} className="py-4 px-4 text-center border-l">
                                        <Switch 
                                            checked={pkg.status === 'active'} 
                                            onCheckedChange={(val) => handleUpdate(pkg.id, 'status', val ? 'active' : 'inactive')}
                                            className="mx-auto data-[state=checked]:bg-green-500"
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Public Visibility Row */}
                            <TableRow className="group border-b hover:bg-muted/10">
                                <TableCell className="font-semibold py-4 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Visible to Public
                                </TableCell>
                                {filteredPackages.map((pkg) => (
                                    <TableCell key={pkg.id} className="py-4 px-4 text-center border-l">
                                        <Switch 
                                            checked={pkg.isPublic} 
                                            onCheckedChange={(val) => handleUpdate(pkg.id, 'isPublic', val)}
                                            className="mx-auto"
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Default Package Row */}
                            <TableRow className="group border-b hover:bg-muted/10">
                                <TableCell className="font-semibold py-4 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    Default (trailing)
                                </TableCell>
                                {filteredPackages.map((pkg) => (
                                    <TableCell key={pkg.id} className="py-4 px-4 text-center border-l">
                                        <div className="flex items-center justify-center">
                                            {pkg.isTrailing ? (
                                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                                    Current Default
                                                </Badge>
                                            ) : (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 text-xs"
                                                    onClick={() => handleSetDefault(pkg.id)}
                                                >
                                                    Set Default
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>

                            {/* Divider for Services */}
                            <TableRow className="bg-muted/20">
                                <TableCell colSpan={filteredPackages.length + 1} className="py-2 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Service Limits & Features
                                </TableCell>
                            </TableRow>

                            {/* Dynamic Service Rows */}
                            {services?.map((service) => (
                                <TableRow key={service.id} className="group border-b hover:bg-muted/10">
                                    <TableCell className="py-4 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{service.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{service.type}</span>
                                        </div>
                                    </TableCell>
                                    {filteredPackages.map((pkg) => {
                                        const feature = pkg.features?.find(f => f.type === service.type);
                                        const value = feature ? feature.value : '';
                                        
                                        return (
                                            <TableCell key={pkg.id} className="py-4 px-4 text-center border-l">
                                                {typeof value === 'boolean' || service.type === 'custom' && (value === 'true' || value === 'false') ? (
                                                    <Switch 
                                                        checked={Boolean(value === true || value === 'true')}
                                                        onCheckedChange={(val) => handleUpdate(pkg.id, `feature:${service.type}`, val)}
                                                        className="mx-auto"
                                                    />
                                                ) : (
                                                    <DebouncedInput 
                                                        value={value || ''}
                                                        onSave={(val) => handleUpdate(pkg.id, `feature:${service.type}`, val)}
                                                        className="w-24 mx-auto text-center"
                                                    />
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                            
                            {/* Bottom Actions Row */}
                            <TableRow className="bg-card/30">
                                <TableCell className="py-6 px-6 sticky left-0 bg-card/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => onNavigate('SAPackageServices')}
                                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Add New Service
                                    </Button>
                                </TableCell>
                                {filteredPackages.map(pkg => (
                                    <TableCell key={pkg.id} className="border-l"></TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Empty State */}
            {filteredPackages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-card rounded-lg border border-dashed">
                    <div className="p-4 bg-muted rounded-full mb-4">
                        <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No packages found</h3>
                    <p className="text-muted-foreground mb-6">Try adjusting your search query</p>
                    <Button onClick={() => setSearchQuery('')} variant="outline">Clear Search</Button>
                </div>
            )}
        </div>
    );
}
