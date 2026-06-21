import React, { memo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Clock, Loader2, MapPin, Plus } from 'lucide-react';
import { WHTask, WHWorker, TaskStatus, taskService } from '../../../services/workhubApi';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { NewTaskModal } from './NewTaskModal';

interface Props {
    tasks: WHTask[];
    workers?: WHWorker[];
    onSelectTask: (id: number) => void;
    onUpdated: () => void;
    readOnly?: boolean;
    selectedProjectId?: number | null;
    role?: string;
}

/* ── Column definitions ──────────────────────────────────────────────── */
type ColDef = {
    status: TaskStatus;
    label: string;
    accent: string;     // solid accent colour
    tint: string;       // 6% opacity background for column body
    badgeBg: string;    // count badge fill
    badgeFg: string;    // count badge text
};

const COLUMNS: ColDef[] = [
    { status: 'open',        label: 'Open',        accent: '#2a8fbd', tint: 'rgba(42,143,189,0.05)',  badgeBg: '#2a8fbd', badgeFg: '#fff' },
    { status: 'in_progress', label: 'In Progress',  accent: '#d97706', tint: 'rgba(217,119,6,0.05)',   badgeBg: '#d97706', badgeFg: '#fff' },
    { status: 'done',        label: 'Done',         accent: '#059669', tint: 'rgba(5,150,105,0.05)',   badgeBg: '#059669', badgeFg: '#fff' },
    { status: 'problem',     label: 'Problem',      accent: '#dc2626', tint: 'rgba(220,38,38,0.05)',   badgeBg: '#dc2626', badgeFg: '#fff' },
];

/* ── Priority badge colours ──────────────────────────────────────────── */
const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
    urgent: { bg: '#fee2e2', color: '#b91c1c' },
    high:   { bg: '#ffedd5', color: '#c2410c' },
    medium: { bg: '#dbeafe', color: '#1d4ed8' },
    low:    { bg: '#f3f4f6', color: '#374151' },
};

/* ── Worker avatar palette ───────────────────────────────────────────── */
const AVATAR_PALETTE = ['#f08a3c', '#2a8fbd', '#1e3a5f', '#059669', '#7c3aed', '#d97706'];
function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
    return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function workerInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

/* ── Status transitions ──────────────────────────────────────────────── */
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
    open: 'in_progress', in_progress: 'done', done: null, problem: 'in_progress',
};

export function KanbanBoard({ tasks, workers = [], onSelectTask, onUpdated, readOnly = false, selectedProjectId = null, role = 'manager' }: Props) {
    const qc = useQueryClient();
    const [showNew, setShowNew] = useState(false);
    const [workerFilter, setWorkerFilter] = useState<number | ''>('');

    const workerMap = new Map(workers.map((w) => [Number(w.id), w]));

    const moveMut = useMutation({
        mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
            taskService.update(id, { status }),
        onSuccess: () => { onUpdated(); },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to move task'),
    });

    const visibleTasks = workerFilter !== ''
        ? tasks.filter((t) => Number(t.assigned_worker_id) === Number(workerFilter))
        : tasks;

    const tasksByStatus = (status: TaskStatus) => visibleTasks.filter((t) => t.status === status);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-[#dbe8f7]">
            {/* Top toolbar */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0">
                {workers.length > 0 && ['planner', 'manager'].includes(role) && (
                    <select
                        value={workerFilter}
                        onChange={(e) => setWorkerFilter(e.target.value === '' ? '' : Number(e.target.value))}
                        className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                    >
                        <option value="">All workers</option>
                        {workers.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                )}
                <span className="text-caption text-[#3d5a80] ml-auto">
                    {visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''}
                </span>
                {!readOnly && (
                    <button
                        onClick={() => setShowNew(true)}
                        className="flex items-center gap-1.5 text-body font-medium px-3 py-1.5 rounded-lg bg-[#f08a3c] text-white hover:bg-[#e07530] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Task
                    </button>
                )}
            </div>

            {/* Kanban columns */}
            <div className="flex flex-col md:flex-row gap-4 p-4 overflow-x-auto flex-1 min-h-0">
                {COLUMNS.map((col) => {
                    const colTasks = tasksByStatus(col.status);
                    return (
                        <div key={col.status} className="flex flex-col w-full md:min-w-[240px] md:w-[240px] md:shrink-0">
                            {/* Column header */}
                            <div style={{ borderTop: `3px solid ${col.accent}`, background: '#fff', borderLeft: '1px solid rgba(30,58,95,0.12)', borderRight: '1px solid rgba(30,58,95,0.12)' }}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-t-lg">
                                <span style={{ background: col.accent }} className="w-2 h-2 rounded-full shrink-0" />
                                <span style={{ color: col.accent }} className="text-[11px] font-medium uppercase tracking-widest flex-1">
                                    {col.label}
                                </span>
                                <span style={{ background: col.badgeBg, color: col.badgeFg }}
                                    className="text-[10px] font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                    {colTasks.length}
                                </span>
                            </div>

                            {/* Column body */}
                            <div style={{ background: col.tint, borderLeft: `1px solid rgba(30,58,95,0.12)`, borderRight: `1px solid rgba(30,58,95,0.12)`, borderBottom: `1px solid rgba(30,58,95,0.12)` }}
                                className="flex-1 overflow-y-auto space-y-2 p-2 rounded-b-lg min-h-[200px]">
                                {colTasks.length === 0 && (
                                    <p className="text-caption text-[#3d5a80] text-center py-8 opacity-60">No tasks</p>
                                )}
                                {colTasks.map((task) => (
                                    <KanbanCard
                                        key={task.id}
                                        task={task}
                                        col={col}
                                        worker={task.assigned_worker_id != null ? workerMap.get(Number(task.assigned_worker_id)) : undefined}
                                        onSelect={() => onSelectTask(task.id)}
                                        nextStatus={STATUS_TRANSITIONS[task.status]}
                                        onMove={(ns) => moveMut.mutate({ id: task.id, status: ns })}
                                        isMoving={moveMut.isPending && moveMut.variables?.id === task.id}
                                        readOnly={readOnly}
                                    />
                                ))}
                                {!readOnly && col.status === 'open' && (
                                    <button
                                        onClick={() => setShowNew(true)}
                                        style={{ borderColor: col.accent + '66', color: col.accent + 'aa' }}
                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mt-1 rounded border border-dashed hover:opacity-100 hover:bg-white transition-all text-[11px] opacity-60"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        New Task
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showNew && (
                <NewTaskModal
                    onClose={() => setShowNew(false)}
                    onCreated={() => { setShowNew(false); onUpdated(); }}
                    defaultProjectId={selectedProjectId ?? undefined}
                />
            )}
        </div>
    );
}

interface CardProps {
    task: WHTask;
    col: ColDef;
    worker?: WHWorker;
    onSelect: () => void;
    nextStatus: TaskStatus | null;
    onMove: (status: TaskStatus) => void;
    isMoving: boolean;
    readOnly: boolean;
}

const KanbanCard = memo(function KanbanCard({ task, col, worker, onSelect, nextStatus, onMove, isMoving, readOnly }: CardProps) {
    const overrun = task.logged_hours && task.est_hours && task.logged_hours > task.est_hours;
    const priority = task.priority as string | undefined;
    const pStyle = priority ? (PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.low) : null;

    return (
        <div
            style={{ borderLeft: `3px solid ${col.accent}`, boxShadow: '0 1px 3px rgba(30,58,95,0.08)' }}
            className="bg-white border border-[rgba(30,58,95,0.10)] rounded-lg p-3 cursor-pointer hover:shadow-md transition-all group"
            onClick={onSelect}
        >
            {/* Title */}
            <p className="text-body font-medium text-[#1e3a5f] leading-snug line-clamp-2 mb-2">{task.title}</p>

            {/* Priority + location */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {pStyle && priority && (
                    <span style={{ background: pStyle.bg, color: pStyle.color }}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {priority}
                    </span>
                )}
                {task.location_tag && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[#3d5a80] truncate max-w-[90px]" title={task.location_tag}>
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {task.location_tag}
                    </span>
                )}
            </div>

            {/* Assigned worker */}
            {worker ? (
                <div className="flex items-center gap-1.5 mb-2">
                    <div style={{ background: avatarColor(worker.name), color: '#fff' }}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0">
                        {workerInitials(worker.name)}
                    </div>
                    <span className="text-caption text-[#3d5a80] truncate">{worker.name}</span>
                </div>
            ) : (
                <div className="mb-2">
                    <span className="text-[10px] text-[#3d5a80] italic opacity-60">Unassigned</span>
                </div>
            )}

            {/* Hours + due date */}
            <div className="flex items-center gap-2 text-caption text-[#3d5a80]">
                {task.est_hours != null && (
                    <span className={cn('flex items-center gap-0.5', overrun ? 'text-amber-600' : '')}>
                        <Clock className="w-3 h-3" />
                        {task.logged_hours != null ? `${task.logged_hours}` : '0'}/{task.est_hours}h
                        {overrun && <AlertCircle className="w-3 h-3" />}
                    </span>
                )}
                {task.due_date && (
                    <span className="ml-auto shrink-0 text-[#3d5a80]">
                        {format(new Date(task.due_date), 'dd MMM')}
                    </span>
                )}
            </div>

            {/* Move button */}
            {!readOnly && nextStatus && (
                <button
                    onClick={(e) => { e.stopPropagation(); onMove(nextStatus); }}
                    disabled={isMoving}
                    style={{ color: col.accent, borderColor: col.accent }}
                    className="mt-2 w-full text-[10px] font-medium py-1 rounded border bg-white hover:opacity-80 transition-opacity opacity-0 group-hover:opacity-100"
                >
                    {isMoving
                        ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                        : `→ Move to ${nextStatus.replace('_', ' ')}`
                    }
                </button>
            )}
        </div>
    );
});
