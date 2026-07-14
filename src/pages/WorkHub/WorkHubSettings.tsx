import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Users, Trash2, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Separator } from '../../components/ui/separator';
import { settingsService, workerService, WHWorker } from '../../services/workhubApi';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

function utilBadge(pct: number): string {
    if (pct <= 70) return 'text-green-700 bg-green-100';
    if (pct <= 90) return 'text-amber-700 bg-amber-100';
    return 'text-red-700 bg-red-100';
}

function initials(name: string): string {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export function WorkHubSettings() {
    const qc = useQueryClient();
    const currentUserId = useAuthStore((s) => s.user?.id);

    // ---- Workers ----
    const [addingWorker,    setAddingWorker]    = useState(false);
    const [selectedUserId,  setSelectedUserId]  = useState('');
    const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
    const [workerRates,     setWorkerRates]     = useState<Record<number, string>>({});

    const { data: workers = [], isLoading: workersLoading } = useQuery({
        queryKey: ['wh-workers'],
        queryFn: workerService.list,
        staleTime: 60 * 1000,
    });

    const { data: availableUsers = [], isLoading: availableLoading } = useQuery({
        queryKey: ['wh-available-users'],
        queryFn: workerService.availableUsers,
        enabled: addingWorker,
        staleTime: 30 * 1000,
    });

    const addWorkerMut = useMutation({
        mutationFn: () => workerService.add(Number(selectedUserId)),
        onSuccess: () => {
            toast.success('Worker added');
            setAddingWorker(false);
            setSelectedUserId('');
            qc.invalidateQueries({ queryKey: ['wh-workers'] });
            qc.invalidateQueries({ queryKey: ['wh-available-users'] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to add worker'),
    });

    const removeWorkerMut = useMutation({
        mutationFn: (id: number) => workerService.remove(id),
        onSuccess: () => {
            toast.success('Worker removed');
            setConfirmRemoveId(null);
            qc.invalidateQueries({ queryKey: ['wh-workers'] });
            qc.invalidateQueries({ queryKey: ['wh-available-users'] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to remove worker'),
    });

    const setRoleMut = useMutation({
        mutationFn: ({ id, wh_role }: { id: number; wh_role: WHWorker['wh_role'] }) =>
            workerService.setRole(id, wh_role),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wh-workers'] });
            qc.invalidateQueries({ queryKey: ['wh-profile'] });
            toast.success('WorkHub role updated');
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to update role'),
    });

    // Initialise workerRates when workers load / change
    useEffect(() => {
        if (workers.length > 0) {
            setWorkerRates((prev) => {
                const next = { ...prev };
                workers.forEach((w: WHWorker) => {
                    if (!(w.id in next)) {
                        next[w.id] = w.hourly_rate_override != null ? String(w.hourly_rate_override) : '';
                    }
                });
                return next;
            });
        }
    }, [workers]);

    const saveRateMut = useMutation({
        mutationFn: ({ id, rate }: { id: number; rate: string }) =>
            workerService.update(id, { hourly_rate_override: rate === '' ? null : Number(rate) }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wh-workers'] });
            toast.success('Rate override saved');
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to save rate'),
    });

    function handleRemoveClick(id: number) {
        if (confirmRemoveId === id) {
            removeWorkerMut.mutate(id);
        } else {
            setConfirmRemoveId(id);
            setTimeout(() => setConfirmRemoveId(null), 3000);
        }
    }

    // ---- Billing settings ----
    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['wh-settings'],
        queryFn: settingsService.get,
        staleTime: 5 * 60 * 1000,
    });

    const [hourlyRate,   setHourlyRate]   = useState<string>('');
    const [currency,     setCurrency]     = useState<string>('EUR');
    const [taxPercent,   setTaxPercent]   = useState<string>('19');
    const [pdfLanguage,  setPdfLanguage]  = useState<string>('en');

    const isInitialised = hourlyRate !== '' || !settings;
    if (settings && !isInitialised) {
        setHourlyRate(String(settings.default_hourly_rate ?? 0));
        setCurrency(settings.currency ?? 'EUR');
        setTaxPercent(String(settings.tax_percent ?? 19));
        setPdfLanguage(settings.pdf_language ?? 'en');
    }

    const saveMut = useMutation({
        mutationFn: () => settingsService.update({
            default_hourly_rate: parseFloat(hourlyRate) || 0,
            currency,
            tax_percent: parseFloat(taxPercent) || 19,
            pdf_language: pdfLanguage,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wh-settings'] });
            toast.success('WorkHub settings saved');
        },
        onError: () => toast.error('Failed to save settings'),
    });

    if (settingsLoading) {
        return (
            <div className="p-6 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin w-4 h-4" /> Loading settings…
            </div>
        );
    }

    return (
        <div className="max-w-2xl space-y-6">
            {/* Workers */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-body-lg flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#2a8fbd]" />
                        Workers
                    </CardTitle>
                    {!addingWorker && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8"
                            onClick={() => { setAddingWorker(true); setSelectedUserId(''); }}
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add Worker
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Add worker row */}
                    {addingWorker && (
                        <div className="flex gap-2 p-3 bg-muted rounded-lg">
                            <Select
                                value={selectedUserId || '__none__'}
                                onValueChange={(v) => setSelectedUserId(v === '__none__' ? '' : v)}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a user…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__" disabled>Select a user…</SelectItem>
                                    {availableLoading && (
                                        <SelectItem value="__loading__" disabled>Loading…</SelectItem>
                                    )}
                                    {!availableLoading && availableUsers.length === 0 && (
                                        <SelectItem value="__empty__" disabled>All users are already workers</SelectItem>
                                    )}
                                    {availableUsers.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name}
                                            {u.email ? ` — ${u.email}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                size="sm"
                                className="bg-[#f08a3c] hover:bg-[#e07530] shrink-0"
                                disabled={!selectedUserId || addWorkerMut.isPending}
                                onClick={() => addWorkerMut.mutate()}
                            >
                                {addWorkerMut.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : 'Add'}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0"
                                onClick={() => setAddingWorker(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}

                    {/* Workers list */}
                    {workersLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
                            <Loader2 className="animate-spin w-4 h-4" /> Loading workers…
                        </div>
                    ) : workers.length === 0 ? (
                        <p className="text-body text-muted-foreground py-4 text-center">
                            No workers yet. Click <strong>Add Worker</strong> above, or visit your{' '}
                            <strong>Profile</strong> page to auto-register yourself.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {workers.map((w: WHWorker) => {
                                const pct = w.utilisation_pct ?? 0;
                                const isConfirming = confirmRemoveId === w.id;
                                return (
                                    <div
                                        key={w.id}
                                        className="flex flex-col gap-2 px-3 py-2.5 rounded-lg border"
                                    >
                                        {/* Row 1: avatar, name, util badge, remove */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#f0f6ff] text-[#1e3a5f] flex items-center justify-center text-body font-medium shrink-0">
                                                {initials(w.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-body font-medium truncate flex items-center gap-1.5">
                                                    {w.name}
                                                    {String(w.user_id) === String(currentUserId) && (
                                                        <span className="text-caption px-1.5 py-0.5 rounded-full bg-[#f0f6ff] text-[#1e3a5f] font-normal shrink-0">You</span>
                                                    )}
                                                </p>
                                                {w.email && (
                                                    <p className="text-caption text-muted-foreground truncate">{w.email}</p>
                                                )}
                                            </div>
                                            <span className={cn('text-caption px-1.5 py-0.5 rounded-full shrink-0', utilBadge(pct))}>
                                                {pct}%
                                            </span>
                                            <button
                                                onClick={() => handleRemoveClick(w.id)}
                                                disabled={removeWorkerMut.isPending && confirmRemoveId === w.id}
                                                className={cn(
                                                    'p-1.5 rounded transition-colors shrink-0',
                                                    isConfirming
                                                        ? 'text-red-600 bg-red-50'
                                                        : 'text-muted-foreground hover:text-red-600 hover:bg-red-50'
                                                )}
                                                title={isConfirming ? 'Click again to confirm remove' : 'Remove worker'}
                                            >
                                                {removeWorkerMut.isPending && confirmRemoveId === w.id
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <Trash2 className="w-4 h-4" />
                                                }
                                            </button>
                                        </div>
                                        {/* Row 2: role, rate, task count */}
                                        <div className="flex items-center gap-2 pl-11 flex-wrap">
                                            <select
                                                value={w.wh_role ?? ''}
                                                onChange={(e) => setRoleMut.mutate({
                                                    id: w.id,
                                                    wh_role: (e.target.value || null) as WHWorker['wh_role'],
                                                })}
                                                disabled={setRoleMut.isPending}
                                                className="text-caption border rounded px-1.5 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)] shrink-0"
                                                title="WorkHub role (overrides system role)"
                                            >
                                                <option value="">Auto</option>
                                                <option value="worker">Worker</option>
                                                <option value="planner">Planner</option>
                                                <option value="manager">Manager</option>
                                                <option value="finance">Finance</option>
                                                <option value="client">Client</option>
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={workerRates[w.id] ?? ''}
                                                placeholder="€/h override"
                                                title="Hourly rate override for this worker"
                                                className="w-28 text-xs border rounded px-1.5 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)] shrink-0"
                                                onChange={(e) =>
                                                    setWorkerRates((prev) => ({ ...prev, [w.id]: e.target.value }))
                                                }
                                                onBlur={() =>
                                                    saveRateMut.mutate({ id: w.id, rate: workerRates[w.id] ?? '' })
                                                }
                                            />
                                            <span className="text-caption text-muted-foreground shrink-0 ml-auto">
                                                {w.queue_depth ?? 0} tasks
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Billing configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-body-lg">Billing Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="hourly-rate">Default Hourly Rate</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="hourly-rate"
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(e.target.value)}
                                    placeholder="0.00"
                                />
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                        <SelectItem value="CHF">CHF</SelectItem>
                                        <SelectItem value="PLN">PLN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-caption text-muted-foreground">
                                Applied to labour line items on auto-generated invoices.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="tax-percent">VAT Rate (%)</Label>
                            <Input
                                id="tax-percent"
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                value={taxPercent}
                                onChange={(e) => setTaxPercent(e.target.value)}
                                placeholder="19"
                            />
                            <p className="text-caption text-muted-foreground">
                                Applied to all invoice line items.
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                        <Label>PDF Export Language</Label>
                        <Select value={pdfLanguage} onValueChange={setPdfLanguage}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="pl">Polski</SelectItem>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="it">Italiano</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-caption text-muted-foreground">
                            Language used for PDF document generation.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Button
                className="bg-[#f08a3c] hover:bg-[#e07530] gap-2"
                disabled={saveMut.isPending}
                onClick={() => saveMut.mutate()}
            >
                {saveMut.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Save Settings
            </Button>
        </div>
    );
}
