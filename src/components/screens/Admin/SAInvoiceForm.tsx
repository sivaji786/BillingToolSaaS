import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUserService, adminBillingService } from '../../../services/adminApi';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Plus, Trash2, ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { InvoiceFormData, InvoiceItem } from '../../../types/admin';

interface SAInvoiceFormProps {
    onNavigate: (screen: string) => void;
}

export function SAInvoiceForm({ onNavigate }: SAInvoiceFormProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<InvoiceFormData>({
        userId: '',
        items: [{ id: Math.random().toString(36).substr(2, 9), description: 'Subscription Service', quantity: 1, unitPrice: 0, total: 0 }],
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
    });

    const { data: usersData } = useQuery({
        queryKey: ['users', { limit: 100 }],
        queryFn: () => adminUserService.getAll({ limit: 100 }),
    });

    const createMutation = useMutation({
        mutationFn: adminBillingService.generateInvoice,
        onSuccess: () => {
            toast.success('Invoice generated successfully');
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            onNavigate('SAbilling');
        },
        onError: () => {
            toast.error('Failed to generate invoice');
        },
    });

    const handleAddItem = () => {
        const newItem: InvoiceItem = {
            id: Math.random().toString(36).substr(2, 9),
            description: '',
            quantity: 1,
            unitPrice: 0,
            total: 0,
        };
        setFormData({ ...formData, items: [...formData.items, newItem] });
    };

    const handleRemoveItem = (id: string) => {
        if (formData.items.length === 1) return;
        setFormData({ ...formData, items: formData.items.filter(item => item.id !== id) });
    };

    const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
        const newItems = formData.items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.unitPrice);
                }
                return updatedItem;
            }
            return item;
        });
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + item.total, 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.userId) {
            toast.error('Please select a client');
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => onNavigate('SAdashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-heading-1 font-medium">Generate Manual Invoice</h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoice Details</CardTitle>
                            <CardDescription>Select the client and set basic billing information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="userId">Client (Tenant)</Label>
                                <Select
                                    value={formData.userId}
                                    onValueChange={(value: string) => setFormData({ ...formData, userId: value })}
                                >
                                    <SelectTrigger id="userId">
                                        <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {usersData?.data.map((user) => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.name} ({user.subdomain})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Line Items</CardTitle>
                                <CardDescription>Add services or charges to this invoice</CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Description</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Unit Price</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formData.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Input
                                                    placeholder="Description"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="pl-7"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                €{item.total.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="mt-4 flex flex-col items-end space-y-2">
                                <div className="flex items-center gap-4 text-heading-3">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-medium text-primary">€{calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Notes</CardTitle>
                            <CardDescription>Optional notes for the invoice</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-body shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Enter any additional notes..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </CardContent>
                        <CardFooter className="flex justify-end gap-3 border-t pt-6">
                            <Button type="button" variant="outline" onClick={() => onNavigate('SAbilling')}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Generate Invoice
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </form>
        </div>
    );
}
