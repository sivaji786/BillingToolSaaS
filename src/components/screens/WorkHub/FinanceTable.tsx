import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskService, settingsService, workerService, WHTask } from '../../../services/workhubApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import { DollarSign, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { DATE_OPTS, SORT_OPTS, DEFAULT_SORT, SortValue, computeDateRange } from './taskFilterOptions';

interface Props {
    onSelectTask: (id: number) => void;
}

const STATUS_FILTER_OPTS = [
    { label: 'All Status',   value: '' },
    { label: 'Open',         value: 'open' },
    { label: 'In Progress',  value: 'in_progress' },
    { label: 'Done',         value: 'done' },
    { label: 'Problem',      value: 'problem' },
];

export function FinanceTable({ onSelectTask }: Props) {
    const [statusFilter, setStatusFilter] = useState('');
    const [datePreset,   setDatePreset]   = useState('');
    const [customFrom,   setCustomFrom]   = useState('');
    const [customTo,     setCustomTo]     = useState('');
    const [workerFilter, setWorkerFilter] = useState<number | ''>('');
    const [sortValue,    setSortValue]    = useState<SortValue>(DEFAULT_SORT);

    const { dateFrom, dateTo } = useMemo(
        () => computeDateRange(datePreset, customFrom, customTo),
        [datePreset, customFrom, customTo]
    );
    const activeSort = SORT_OPTS.find((o) => o.value === sortValue) ?? SORT_OPTS[0];

    const { data: workers = [] } = useQuery({
        queryKey: ['wh-workers'],
        queryFn: workerService.list,
        staleTime: 5 * 60 * 1000,
    });

    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: ['wh-tasks-finance', statusFilter, dateFrom, dateTo, workerFilter, sortValue],
        queryFn: () => taskService.list({
            status: statusFilter || undefined,
            assigned_worker_id: workerFilter || undefined,
            date_from: dateFrom || undefined,
            date_to:   dateTo   || undefined,
            sort:      activeSort.sort,
            sort_dir:  activeSort.dir,
            per_page:  100,
        }),
        staleTime: 60 * 1000,
    });

    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['wh-settings'],
        queryFn: settingsService.get,
        staleTime: 5 * 60 * 1000,
    });

    const tasks: WHTask[] = tasksData?.data ?? [];
    const rate = settings?.default_hourly_rate ?? 0;
    const currency = settings?.currency ?? 'EUR';
    const taxPct = settings?.tax_percent ?? 19;

    const isLoading = tasksLoading || settingsLoading;

    const fmt = (n: number) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(n);

    const rows = tasks.map((t) => {
        const hours = t.logged_hours ?? 0;
        const labour = hours * rate;
        const materialsTotal = t.materials?.reduce(
            (s, m) => s + (m.total_price != null
                ? Number(m.total_price)
                : (m.quantity ?? 1) * (m.unit_price ?? 0)),
            0,
        ) ?? 0;
        const subtotal = labour + materialsTotal;
        const tax = subtotal * (taxPct / 100);
        const total = subtotal + tax;
        const dualSigned = !!(t.completion_record as any)?.customer_signed_at;
        return { task: t, hours, labour, materialsTotal, subtotal, tax, total, dualSigned };
    });

    const grandLabour      = rows.reduce((s, r) => s + r.labour, 0);
    const grandMaterials   = rows.reduce((s, r) => s + r.materialsTotal, 0);
    const grandSubtotal    = rows.reduce((s, r) => s + r.subtotal, 0);
    const grandTax         = rows.reduce((s, r) => s + r.tax, 0);
    const grandTotal       = rows.reduce((s, r) => s + r.total, 0);
    const signedCount      = rows.filter((r) => r.dualSigned).length;

    if (isLoading) {
        return (
            <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                    className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                >
                    {STATUS_FILTER_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {workers.length > 0 && (
                    <select
                        value={workerFilter}
                        onChange={(e) => setWorkerFilter(e.target.value === '' ? '' : Number(e.target.value))}
                        aria-label="Filter by worker"
                        className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                    >
                        <option value="">All workers</option>
                        {workers.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                )}

                <select
                    value={datePreset || '__all__'}
                    onChange={(e) => setDatePreset(e.target.value === '__all__' ? '' : e.target.value)}
                    aria-label="Filter by date"
                    className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                >
                    {DATE_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {datePreset === 'custom' && (
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="h-[34px] rounded-lg border border-[rgba(30,58,95,0.20)] bg-white px-2 text-caption focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                        />
                        <span className="text-caption text-muted-foreground">to</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="h-[34px] rounded-lg border border-[rgba(30,58,95,0.20)] bg-white px-2 text-caption focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                        />
                    </div>
                )}

                <select
                    value={sortValue}
                    onChange={(e) => setSortValue(e.target.value as SortValue)}
                    aria-label="Sort tasks"
                    className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)] ml-auto"
                >
                    {SORT_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Tasks',       val: String(tasks.length),    icon: DollarSign,   warn: false },
                    { label: 'Dual-Signed',       val: String(signedCount),     icon: TrendingUp,   warn: signedCount < tasks.length },
                    { label: 'Labour Total',      val: fmt(grandLabour),        icon: DollarSign,   warn: false },
                    { label: `Total incl. ${taxPct}% VAT`, val: fmt(grandTotal), icon: TrendingUp,  warn: false },
                ].map(({ label, val, icon: Icon, warn }) => (
                    <Card key={label}>
                        <CardContent className="p-3 flex items-center gap-3">
                            <Icon className={cn('w-5 h-5 shrink-0', warn ? 'text-amber-500' : 'text-[#2a8fbd]')} />
                            <div>
                                <p className={cn('text-body-lg font-medium', warn ? 'text-amber-600' : 'text-foreground')}>{val}</p>
                                <p className="text-caption text-muted-foreground">{label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Billing table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-body-lg flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#2a8fbd]" />
                        All Tasks — Billing Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {tasks.length === 0 ? (
                        <p className="p-6 text-body text-muted-foreground text-center">
                            No tasks yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-body">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-caption">
                                        <th className="text-left px-4 py-2 font-medium">Task</th>
                                        <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Task Status</th>
                                        <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Hours</th>
                                        <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Labour</th>
                                        <th className="text-right px-4 py-2 font-medium whitespace-nowrap hidden md:table-cell">Materials</th>
                                        <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Subtotal</th>
                                        <th className="text-right px-4 py-2 font-medium whitespace-nowrap hidden md:table-cell">VAT</th>
                                        <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Total</th>
                                        <th className="px-4 py-2 font-medium">Sig.</th>
                                        <th className="px-4 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(({ task, hours, labour, materialsTotal, subtotal, tax, total, dualSigned }) => (
                                        <tr key={task.id} className="border-b hover:bg-muted/30">
                                            <td className="px-4 py-3 max-w-[200px]">
                                                <p className="font-medium truncate">{task.title}</p>
                                                {task.location_tag && (
                                                    <p className="text-caption text-muted-foreground truncate">
                                                        {task.location_tag}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {task.status === 'done' && (
                                                    <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">
                                                        Done
                                                    </Badge>
                                                )}
                                                {task.status === 'in_progress' && (
                                                    <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px]">
                                                        In Progress
                                                    </Badge>
                                                )}
                                                {task.status === 'open' && (
                                                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px]">
                                                        Open
                                                    </Badge>
                                                )}
                                                {task.status === 'problem' && (
                                                    <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">
                                                        Problem
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">{hours.toFixed(2)}h</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">{fmt(labour)}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap hidden md:table-cell">
                                                {materialsTotal > 0 ? fmt(materialsTotal) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(subtotal)}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground hidden md:table-cell">
                                                {fmt(tax)}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(total)}</td>
                                            <td className="px-4 py-3">
                                                {dualSigned ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">
                                                        Billable
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Awaiting sig.
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-caption"
                                                    onClick={() => onSelectTask(task.id)}
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t bg-muted/50 font-medium text-body">
                                        <td className="px-4 py-2" colSpan={4}>Totals</td>
                                        <td className="px-4 py-2 text-right hidden md:table-cell">{fmt(grandMaterials > 0 ? grandMaterials : 0)}</td>
                                        <td className="px-4 py-2 text-right">{fmt(grandSubtotal)}</td>
                                        <td className="px-4 py-2 text-right text-muted-foreground hidden md:table-cell">{fmt(grandTax)}</td>
                                        <td className="px-4 py-2 text-right text-[#1e3a5f]">{fmt(grandTotal)}</td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <p className="text-caption text-muted-foreground">
                Showing all tasks across all statuses. Invoices are auto-generated from dual-signed completion records.
                Rate: {fmt(rate)}/h · VAT: {taxPct}% · Dual-signed done tasks are immediately billable.
            </p>
        </div>
    );
}
