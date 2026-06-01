import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Calendar, X } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { WHTask, TaskStatus } from '../../../services/workhubApi';
import { NewTaskModal } from './NewTaskModal';
import { cn } from '../../../lib/utils';

const STATUS_FILTERS: { label: string; value: TaskStatus | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
    { label: 'Problem', value: 'problem' },
];

const DATE_PRESETS: { label: string; value: string }[] = [
    { label: 'Today',      value: 'today' },
    { label: 'Yesterday',  value: 'yesterday' },
    { label: 'This Week',  value: 'this_week' },
    { label: 'Last Week',  value: 'last_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Custom',     value: 'custom' },
];

const STATUS_COLORS: Record<TaskStatus, string> = {
    open:        'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    done:        'bg-green-100 text-green-700',
    problem:     'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
    low:    'bg-gray-200 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high:   'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
};

interface Props {
    tasks: WHTask[];
    statusFilter: string;
    onStatusFilter: (s: string) => void;
    datePreset?: string;
    onDatePreset?: (preset: string) => void;
    customFrom?: string;
    customTo?: string;
    onCustomRange?: (from: string, to: string) => void;
    onSelectTask: (id: number) => void;
    onUpdated: () => void;
    readOnly?: boolean;
}

export function TaskList({ tasks, statusFilter, onStatusFilter, datePreset = '', onDatePreset, customFrom = '', customTo = '', onCustomRange, onSelectTask, onUpdated, readOnly = false }: Props) {
    const [search, setSearch] = useState('');
    const [showNew, setShowNew] = useState(false);

    const filtered = tasks.filter((t) =>
        !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.location_tag ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Filter bar */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
                        <Input
                            className="pl-8 h-8 text-body"
                            placeholder="Search tasks…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {!readOnly && (
                        <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 gap-1 shrink-0"
                            onClick={() => setShowNew(true)}
                        >
                            <Plus className="w-4 h-4" />
                            New
                        </Button>
                    )}
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {STATUS_FILTERS.map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => onStatusFilter(value)}
                            className={cn(
                                'shrink-0 px-3 py-1 rounded-full text-caption font-medium transition-colors',
                                statusFilter === value
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-accent'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Date filter row */}
                {onDatePreset && (
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none flex-1">
                            {DATE_PRESETS.map(({ label, value }) => (
                                <button
                                    key={value}
                                    onClick={() => onDatePreset(datePreset === value ? '' : value)}
                                    className={cn(
                                        'shrink-0 px-3 py-1 rounded-full text-caption font-medium transition-colors',
                                        datePreset === value
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-muted text-muted-foreground hover:bg-accent'
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {datePreset && (
                            <button
                                onClick={() => onDatePreset('')}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Custom date range inputs */}
                {datePreset === 'custom' && onCustomRange && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => onCustomRange(e.target.value, customTo)}
                            className="flex-1 h-7 rounded border border-input bg-background px-2 text-caption"
                        />
                        <span className="text-caption text-muted-foreground shrink-0">to</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => onCustomRange(customFrom, e.target.value)}
                            className="flex-1 h-7 rounded border border-input bg-background px-2 text-caption"
                        />
                    </div>
                )}
            </div>

            {/* Task rows */}
            <div className="flex-1 overflow-y-auto divide-y">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-body gap-2">
                        <span>No tasks found</span>
                        {!readOnly && (
                            <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
                                Create first task
                            </Button>
                        )}
                    </div>
                ) : (
                    filtered.map((task) => (
                        <button
                            key={task.id}
                            onClick={() => onSelectTask(task.id)}
                            className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex gap-3 items-start"
                        >
                            {/* Priority bar */}
                            <span
                                className={cn(
                                    'mt-1 w-1 h-10 rounded-full shrink-0',
                                    task.priority === 'urgent' ? 'bg-red-500' :
                                    task.priority === 'high'   ? 'bg-orange-400' :
                                    task.priority === 'medium' ? 'bg-blue-400' : 'bg-gray-300'
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-body font-medium truncate">{task.title}</span>
                                    <Badge className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[task.status])}>
                                        {task.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-caption text-muted-foreground flex-wrap">
                                    {task.location_tag && <span>📍 {task.location_tag}</span>}
                                    {task.logged_hours !== undefined && task.est_hours !== undefined && (
                                        <span>{task.logged_hours}h / {task.est_hours}h</span>
                                    )}
                                    {task.due_date && <span>Due {task.due_date}</span>}
                                </div>
                            </div>
                        </button>
                    ))
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
