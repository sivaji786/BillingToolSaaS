import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { WHMaterial } from '../../../services/workhubApi';

const UNITS = ['pcs', 'm', 'kg', 'h', 'l', 'm²', 'm³', 'pkg'];

interface Props {
    materials: WHMaterial[];
    onChange: (materials: WHMaterial[]) => void;
    readOnly?: boolean;
}

function emptyRow(): WHMaterial {
    return { material_name: '', quantity: 1, unit: 'pcs', unit_price: 0 };
}

export function MaterialsTable({ materials, onChange, readOnly = false }: Props) {
    const update = (idx: number, patch: Partial<WHMaterial>) => {
        const next = materials.map((r, i) => {
            if (i !== idx) return r;
            const updated = { ...r, ...patch };
            updated.total_price = +(updated.unit_price * updated.quantity).toFixed(2);
            return updated;
        });
        onChange(next);
    };

    const add = () => onChange([...materials, emptyRow()]);
    const remove = (idx: number) => onChange(materials.filter((_, i) => i !== idx));

    const total = materials.reduce((s, m) => s + (m.total_price ?? m.unit_price * m.quantity), 0);

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_90px_80px_32px] gap-1 text-caption text-muted-foreground px-1">
                <span>Material</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Unit price</span>
                <span>Total</span>
                <span />
            </div>

            {materials.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_80px_90px_80px_32px] gap-1 items-center">
                    <Input
                        value={m.material_name}
                        onChange={(e) => update(idx, { material_name: e.target.value })}
                        placeholder="Material name"
                        disabled={readOnly}
                        className="text-body h-8"
                    />
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={m.quantity}
                        onChange={(e) => update(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                        className="text-body h-8"
                    />
                    <Select value={m.unit} onValueChange={(v) => update(idx, { unit: v })} disabled={readOnly}>
                        <SelectTrigger className="h-8 text-body"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={m.unit_price}
                        onChange={(e) => update(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                        disabled={readOnly}
                        className="text-body h-8"
                    />
                    <div className="text-body text-right pr-1 tabular-nums">
                        €{((m.total_price ?? m.unit_price * m.quantity)).toFixed(2)}
                    </div>
                    {!readOnly && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(idx)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            ))}

            {!readOnly && (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={add}>
                    <Plus className="w-3.5 h-3.5" /> Add row
                </Button>
            )}

            {/* Running total */}
            <div className="flex justify-end pt-1 border-t">
                <span className="text-body font-semibold">Total: €{total.toFixed(2)}</span>
            </div>
        </div>
    );
}
