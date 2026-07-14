import { useState } from 'react';
import { Plus, Search, X, CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { WHTask, WHWorker, TaskStatus } from '../../../services/workhubApi';
import { NewTaskModal } from './NewTaskModal';
import { cn } from '../../../lib/utils';
import { DATE_OPTS, SORT_OPTS, DEFAULT_SORT, SortValue } from './taskFilterOptions';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
    { label: 'All Status',   value: '__all__', icon: null,            dot: '' },
    { label: 'Open',         value: 'open',    icon: Circle,          dot: 'bg-[#2a8fbd]' },
    { label: 'In Progress',  value: 'in_progress', icon: Clock,       dot: 'bg-amber-500' },
    { label: 'Done',         value: 'done',    icon: CheckCircle2,    dot: 'bg-green-500' },
    { label: 'Problem',      value: 'problem', icon: AlertCircle,     dot: 'bg-red-500' },
];

const STATUS_PILL: Record<TaskStatus, string> = {
    open:        'bg-blue-50 text-blue-700 border border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
    done:        'bg-green-50 text-green-700 border border-green-200',
    problem:     'bg-red-50 text-red-700 border border-red-200',
};

const STATUS_DOT: Record<TaskStatus, string> = {
    open:        'bg-[#2a8fbd]',
    in_progress: 'bg-amber-500',
    done:        'bg-green-500',
    problem:     'bg-red-500',
};

const PRIORITY_BAR: Record<string, string> = {
    urgent: 'bg-red-500',
    high:   'bg-orange-400',
    medium: 'bg-[#2a8fbd]',
    low:    'bg-gray-300',
};

const PRIORITY_LABEL: Record<string, string> = {
    urgent: 'text-red-600',
    high:   'text-orange-500',
    medium: 'text-[#2a8fbd]',
    low:    'text-gray-400',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
    tasks: WHTask[];
    statusFilter: string;
    onStatusFilter: (s: string) => void;
    datePreset?: string;
    onDatePreset?: (preset: string) => void;
    customFrom?: string;
    customTo?: string;
    onCustomRange?: (from: string, to: string) => void;
    workers?: WHWorker[];
    workerFilter?: number | '';
    onWorkerFilter?: (id: number | '') => void;
    sortValue?: SortValue;
    onSort?: (value: SortValue) => void;
    onSelectTask: (id: number) => void;
    onUpdated: () => void;
    readOnly?: boolean;
}

export function TaskList({
    tasks, statusFilter, onStatusFilter,
    datePreset = '', onDatePreset,
    customFrom = '', customTo = '', onCustomRange,
    workers = [], workerFilter = '', onWorkerFilter,
    sortValue = DEFAULT_SORT, onSort,
    onSelectTask, onUpdated, readOnly = false,
}: Props) {
    const [search, setSearch] = useState('');
    const [showNew, setShowNew] = useState(false);

    const filtered = tasks.filter((t) =>
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.location_tag ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const hasFilters = !!(statusFilter || datePreset || workerFilter);
    const activeStatus = STATUS_OPTS.find(o => o.value === statusFilter);
    const activeDateLabel = DATE_OPTS.find(o => o.value === (datePreset || '__all__'))?.label ?? 'All time';
    const activeSortLabel = SORT_OPTS.find(o => o.value === sortValue)?.label ?? SORT_OPTS[0].label;
    const activeWorkerName = workers.find(w => Number(w.id) === Number(workerFilter))?.name;

    const clearFilters = () => { onStatusFilter(''); onDatePreset?.(''); onWorkerFilter?.(''); };

    return (
        <div className="flex flex-col h-full bg-[#f4f8fd]">

            {/* ── Sticky filter header ───────────────────────────────────── */}
            <div className="sticky top-0 z-10 bg-background border-b shadow-sm px-3 pt-3 pb-2 space-y-2">

                {/* Search + New */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            className="pl-8 h-8 text-body bg-[#f4f8fd] border-[rgba(30,58,95,0.15)]"
                            placeholder="Search tasks…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    {!readOnly && (
                        <Button
                            size="sm"
                            className="bg-[#f08a3c] hover:bg-[#e07530] gap-1 shrink-0"
                            onClick={() => setShowNew(true)}
                        >
                            <Plus className="w-4 h-4" />
                            New
                        </Button>
                    )}
                </div>

                {/* Status + Date selects */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Status select */}
                    <Select
                        value={statusFilter || '__all__'}
                        onValueChange={v => onStatusFilter(v === '__all__' ? '' : v)}
                    >
                        <SelectTrigger
                            className={cn(
                                'h-8 text-caption font-medium',
                                statusFilter
                                    ? 'border-[#f08a3c] text-[#f08a3c] bg-[#fff8f3]'
                                    : 'border-[rgba(30,58,95,0.15)] text-muted-foreground'
                            )}
                        >
                            <span className="flex items-center gap-1.5 min-w-0">
                                {statusFilter && (
                                    <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[statusFilter as TaskStatus])} />
                                )}
                                <span className="truncate">
                                    {statusFilter
                                        ? STATUS_OPTS.find(o => o.value === statusFilter)?.label ?? 'Status'
                                        : 'All Status'}
                                </span>
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All Status</SelectItem>
                            {STATUS_OPTS.slice(1).map(o => (
                                <SelectItem key={o.value} value={o.value}>
                                    <div className="flex items-center gap-2">
                                        <span className={cn('w-2 h-2 rounded-full shrink-0', o.dot)} />
                                        {o.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Date select */}
                    <Select
                        value={datePreset || '__all__'}
                        onValueChange={v => onDatePreset?.(v === '__all__' ? '' : v)}
                    >
                        <SelectTrigger
                            className={cn(
                                'h-8 text-caption font-medium',
                                datePreset
                                    ? 'border-[#f08a3c] text-[#f08a3c] bg-[#fff8f3]'
                                    : 'border-[rgba(30,58,95,0.15)] text-muted-foreground'
                            )}
                        >
                            <span className="truncate">{activeDateLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                            {DATE_OPTS.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Worker + Sort selects */}
                {(workers.length > 0 || onSort) && (
                    <div className="grid grid-cols-2 gap-2">
                        {workers.length > 0 && onWorkerFilter ? (
                            <Select
                                value={workerFilter === '' ? '__all__' : String(workerFilter)}
                                onValueChange={v => onWorkerFilter(v === '__all__' ? '' : Number(v))}
                            >
                                <SelectTrigger
                                    className={cn(
                                        'h-8 text-caption font-medium',
                                        workerFilter !== ''
                                            ? 'border-[#f08a3c] text-[#f08a3c] bg-[#fff8f3]'
                                            : 'border-[rgba(30,58,95,0.15)] text-muted-foreground'
                                    )}
                                >
                                    <span className="truncate">{activeWorkerName ?? 'All users'}</span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All users</SelectItem>
                                    {workers.map(w => (
                                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : <div />}

                        {onSort && (
                            <Select
                                value={sortValue}
                                onValueChange={v => onSort(v as SortValue)}
                            >
                                <SelectTrigger className="h-8 text-caption font-medium border-[rgba(30,58,95,0.15)] text-muted-foreground">
                                    <span className="truncate">{activeSortLabel}</span>
                                </SelectTrigger>
                                <SelectContent>
                                    {SORT_OPTS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                )}

                {/* Custom date range */}
                {datePreset === 'custom' && onCustomRange && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => onCustomRange(e.target.value, customTo)}
                            className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-caption focus:outline-none focus:ring-1 focus:ring-[#f08a3c]"
                        />
                        <span className="text-caption text-muted-foreground shrink-0">to</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => onCustomRange(customFrom, e.target.value)}
                            className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-caption focus:outline-none focus:ring-1 focus:ring-[#f08a3c]"
                        />
                    </div>
                )}

                {/* Result count + clear */}
                <div className="flex items-center justify-between">
                    <span className="text-caption text-muted-foreground">
                        {filtered.length} task{filtered.length !== 1 ? 's' : ''}
                        {search && ` matching "${search}"`}
                    </span>
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-caption text-[#f08a3c] hover:underline flex items-center gap-0.5"
                        >
                            <X className="w-3 h-3" /> Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* ── Task list ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Search className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                            <p className="text-body font-medium">No tasks found</p>
                            <p className="text-caption mt-0.5">
                                {hasFilters ? 'Try adjusting your filters' : 'Create your first task'}
                            </p>
                        </div>
                        {!readOnly && !hasFilters && (
                            <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
                                <Plus className="w-4 h-4 mr-1" /> New Task
                            </Button>
                        )}
                        {hasFilters && (
                            <Button size="sm" variant="outline" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="px-3 py-2 space-y-2">
                        {filtered.map((task) => {
                            const logged = task.logged_hours ?? 0;
                            const est = task.est_hours ?? 0;
                            const pct = est > 0 ? Math.min(Math.round((logged / est) * 100), 100) : 0;
                            const isOverBudget = est > 0 && logged > est;

                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onSelectTask(task.id)}
                                    className="w-full text-left bg-background rounded-xl border border-[rgba(30,58,95,0.10)] shadow-sm hover:shadow-md hover:border-[rgba(30,58,95,0.20)] active:scale-[0.99] transition-all duration-150 flex gap-0 overflow-hidden"
                                >
                                    {/* Priority accent bar */}
                                    <span className={cn('w-1 shrink-0 rounded-l-xl', PRIORITY_BAR[task.priority ?? 'low'])} />

                                    <div className="flex-1 min-w-0 px-3 py-3 space-y-2">
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-body font-semibold leading-snug line-clamp-2 flex-1 text-[#1e3a5f]">
                                                {task.title}
                                            </span>
                                            <span className={cn(
                                                'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5',
                                                STATUS_PILL[task.status]
                                            )}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        {/* Meta chips */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {task.location_tag && (
                                                <span className="flex items-center gap-0.5 text-caption text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                                    <span className="text-[9px]">📍</span> {task.location_tag}
                                                </span>
                                            )}
                                            {est > 0 && (
                                                <span className={cn(
                                                    'text-caption px-1.5 py-0.5 rounded-md',
                                                    isOverBudget
                                                        ? 'bg-red-50 text-red-600'
                                                        : 'bg-muted text-muted-foreground'
                                                )}>
                                                    ⏱ {logged}h / {est}h
                                                </span>
                                            )}
                                            {task.due_date && (
                                                <span className="text-caption text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                                    📅 {task.due_date}
                                                </span>
                                            )}
                                            {task.priority && task.priority !== 'medium' && (
                                                <span className={cn('text-caption font-medium capitalize', PRIORITY_LABEL[task.priority])}>
                                                    {task.priority}
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress bar */}
                                        {est > 0 && (
                                            <div className="space-y-0.5">
                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full transition-all',
                                                            isOverBudget ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-[#2a8fbd]'
                                                        )}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {showNew && (
                <NewTaskModal
                    onClose={() => setShowNew(false)}
                    onCreated={() => { setShowNew(false); onUpdated(); }}
                />
            )}
        </div>
    );
}
