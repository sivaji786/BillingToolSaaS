import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUserService } from '../../../services/adminApi';
import { UserFilters } from '../../../types/admin';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Search, Download, UserCheck, UserX, Eye, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../../ui/skeleton';
import { format } from 'date-fns';

interface SAASusersProps {
    onNavigate: (screen: string, params?: { userId?: string }) => void;
}

export function SAASusers({ onNavigate }: SAASusersProps) {
    const [filters, setFilters] = useState<UserFilters>({ page: 1, limit: 10 });
    const queryClient = useQueryClient();

    const { data: usersData, isLoading } = useQuery({
        queryKey: ['users', filters],
        queryFn: () => adminUserService.getAll(filters),
    });

    const suspendMutation = useMutation({
        mutationFn: (userId: string) => adminUserService.suspend(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User suspended successfully');
        },
    });

    const activateMutation = useMutation({
        mutationFn: (userId: string) => adminUserService.activate(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User activated successfully');
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: (userId: string) => adminUserService.resetPassword(userId),
        onSuccess: () => {
            toast.success('Password reset to "password123" successfully');
        },
        onError: () => {
            toast.error('Failed to reset password');
        }
    });

    const handleExportCsv = async () => {
        try {
            const blob = await adminUserService.exportCsv(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users-${new Date().toISOString()}.csv`;
            a.click();
            toast.success('Users exported successfully');
        } catch {
            toast.error('Failed to export users');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <CardTitle>SaaS Users</CardTitle>
                            <CardDescription>Manage and monitor all platform users</CardDescription>
                        </div>
                        <Button onClick={handleExportCsv} variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                                className="pl-10"
                            />
                        </div>

                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value: string) =>
                                setFilters({ ...filters, status: value === 'all' ? undefined : value as 'active' | 'suspended' | 'inactive', page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.sortBy || 'joinedDate'}
                            onValueChange={(value: string) => setFilters({ ...filters, sortBy: value as 'name' | 'email' | 'joinedDate' | 'lastLogin' })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="joinedDate">Joined Date</SelectItem>
                                <SelectItem value="lastLogin">Last Login</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">S.No</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Package</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usersData?.data.map((user, index) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {((filters.page || 1) - 1) * (filters.limit || 10) + index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.packageId}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(user.joinedDate), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>{user.lastLogin ? format(new Date(user.lastLogin), 'MMM dd, yyyy') : 'Never'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onNavigate('SAUserDetails', { userId: user.id })}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to reset the tenant admin password to "password123"?')) {
                                                            resetPasswordMutation.mutate(user.id);
                                                        }
                                                    }}
                                                    title="Reset Password to password123"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </Button>
                                                {user.status === 'active' ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => suspendMutation.mutate(user.id)}
                                                    >
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => activateMutation.mutate(user.id)}
                                                    >
                                                        <UserCheck className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {usersData && usersData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                        disabled={(filters.page || 1) <= 1}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm">
                        Page {filters.page || 1} of {usersData.pagination.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                        disabled={(filters.page || 1) >= usersData.pagination.totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
