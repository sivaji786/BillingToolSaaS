import React, { memo, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Clock, ExternalLink, Folder, Loader2, MapPin, Plus } from 'lucide-react';
import { WHTask, WHWorker, WHProject, TaskStatus, TaskPriority, taskService } from '../../../services/workhubApi';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { NewTaskModal } from './NewTaskModal';
import { DATE_OPTS, SORT_OPTS, DEFAULT_SORT, SortValue } from './taskFilterOptions';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../../ui/hover-card';

interface Props {
    tasks: WHTask[];
    /** True total task count from the backend (see TaskList's `total` prop for rationale). */
    total?: number;
    workers?: WHWorker[];
    projects?: WHProject[];
    onSelectTask: (id: number) => void;
    onUpdated: () => void;
    readOnly?: boolean;
    selectedProjectId?: number | null;
    role?: string;
    isAdmin?: boolean;
    datePreset?: string;
    onDatePreset?: (preset: string) => void;
    customFrom?: string;
    customTo?: string;
    onCustomRange?: (from: string, to: string) => void;
    workerFilter?: number | '';
    onWorkerFilter?: (id: number | '') => void;
    sortValue?: SortValue;
    onSort?: (value: SortValue) => void;
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
function toNum(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function occupancyColour(pct: number | undefined): string {
    if (pct === undefined) return 'text-[#3d5a80]';
    if (pct > 90) return 'text-red-600';
    if (pct > 70) return 'text-amber-600';
    return 'text-green-600';
}
function workerInitials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

/* ── Status transitions ──────────────────────────────────────────────── */
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
    open: 'in_progress', in_progress: 'done', done: null, problem: 'in_progress',
};

export function KanbanBoard({
    tasks, total, workers = [], projects = [], onSelectTask, onUpdated, readOnly = false, selectedProjectId = null, role = 'manager', isAdmin = false,
    datePreset = '', onDatePreset, customFrom = '', customTo = '', onCustomRange,
    workerFilter = '', onWorkerFilter, sortValue = DEFAULT_SORT, onSort,
}: Props) {
    const qc = useQueryClient();
    const [showNew, setShowNew] = useState(false);

    const workerMap = new Map(workers.map((w) => [Number(w.id), w]));
    const projectMap = new Map(projects.map((p) => [Number(p.id), p]));

    const moveMut = useMutation({
        mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
            taskService.update(id, { status }),
        onSuccess: () => { onUpdated(); },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to move task'),
    });

    const updateFieldMut = useMutation({
        mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
            taskService.update(id, patch as Partial<WHTask>),
        onSuccess: () => { onUpdated(); },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to update task'),
    });
    const handleUpdateField = (id: number, patch: Record<string, unknown>) => updateFieldMut.mutate({ id, patch });

    // Server already applies worker/date filters + sort; `tasks` arrives pre-filtered and pre-ordered.
    const visibleTasks = tasks;
    // True backend count — may exceed `visibleTasks.length` when the server-side page cap
    // was hit; never display `.length` alone as if it were the true count.
    const trueTotal = total ?? visibleTasks.length;

    const tasksByStatus = (status: TaskStatus) => visibleTasks.filter((t) => t.status === status);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-[#dbe8f7]">
            {/* Top toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0">
                {workers.length > 0 && (['planner', 'manager'].includes(role) || isAdmin) && onWorkerFilter && (
                    <select
                        value={workerFilter}
                        onChange={(e) => onWorkerFilter(e.target.value === '' ? '' : Number(e.target.value))}
                        aria-label="Filter by worker"
                        className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                    >
                        <option value="">All workers</option>
                        {workers.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                )}
                {onDatePreset && (
                    <select
                        value={datePreset || '__all__'}
                        onChange={(e) => onDatePreset(e.target.value === '__all__' ? '' : e.target.value)}
                        aria-label="Filter by date"
                        className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                    >
                        {DATE_OPTS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                )}
                {datePreset === 'custom' && onCustomRange && (
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => onCustomRange(e.target.value, customTo)}
                            className="h-[34px] rounded-lg border border-[rgba(30,58,95,0.20)] bg-white px-2 text-caption focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                        />
                        <span className="text-caption text-[#3d5a80]">to</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => onCustomRange(customFrom, e.target.value)}
                            className="h-[34px] rounded-lg border border-[rgba(30,58,95,0.20)] bg-white px-2 text-caption focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                        />
                    </div>
                )}
                {onSort && (
                    <select
                        value={sortValue}
                        onChange={(e) => onSort(e.target.value as SortValue)}
                        aria-label="Sort tasks"
                        className="text-body border border-[rgba(30,58,95,0.20)] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(30,58,95,0.25)]"
                    >
                        {SORT_OPTS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                )}
                <span className="text-caption text-[#3d5a80] ml-auto">
                    {trueTotal > visibleTasks.length
                        ? `Showing ${visibleTasks.length} of ${trueTotal} tasks — refine filters to see more`
                        : `${trueTotal} task${trueTotal !== 1 ? 's' : ''}`}
                </span>
                {!readOnly && (
                    <button
                        onClick={() => setShowNew(true)}
                        className="flex items-center gap-1.5 text-body font-medium px-3 py-1.5 rounded-lg bg-[#c2410c] text-white hover:bg-[#9a3412] transition-colors"
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
                                        project={task.project_id != null ? projectMap.get(Number(task.project_id)) : undefined}
                                        showProject={!selectedProjectId}
                                        workers={workers}
                                        projects={projects}
                                        onSelect={() => onSelectTask(task.id)}
                                        onUpdateField={handleUpdateField}
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

type EditableField = 'title' | 'priority' | 'project' | 'worker';

interface CardProps {
    task: WHTask;
    col: ColDef;
    worker?: WHWorker;
    project?: WHProject;
    showProject?: boolean;
    workers?: WHWorker[];
    projects?: WHProject[];
    onSelect: () => void;
    onUpdateField?: (id: number, patch: Record<string, unknown>) => void;
    nextStatus: TaskStatus | null;
    onMove: (status: TaskStatus) => void;
    isMoving: boolean;
    readOnly: boolean;
}

const PRIORITY_CHOICES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const KanbanCard = memo(function KanbanCard({
    task, col, worker, project, showProject = false, workers = [], projects = [],
    onSelect, onUpdateField, nextStatus, onMove, isMoving, readOnly,
}: CardProps) {
    const overrun = task.logged_hours && task.est_hours && task.logged_hours > task.est_hours;
    const priority = task.priority as string | undefined;
    const pStyle = priority ? (PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.low) : null;
    const canEdit = !readOnly && !!onUpdateField;

    const [editingField, setEditingField] = useState<EditableField | null>(null);
    const [titleDraft, setTitleDraft] = useState(task.title);

    useEffect(() => { setTitleDraft(task.title); }, [task.title]);

    const startEdit = (field: EditableField) => (e: React.MouseEvent) => {
        if (!canEdit) return;
        e.stopPropagation();
        if (field === 'title') setTitleDraft(task.title);
        setEditingField(field);
    };

    const commitTitle = () => {
        const trimmed = titleDraft.trim();
        setEditingField(null);
        if (trimmed && trimmed !== task.title) onUpdateField?.(task.id, { title: trimmed });
        else setTitleDraft(task.title);
    };

    return (
        <div
            style={{ borderLeft: `3px solid ${col.accent}`, boxShadow: '0 1px 3px rgba(30,58,95,0.08)' }}
            className="bg-white border border-[rgba(30,58,95,0.10)] rounded-lg p-3 cursor-pointer hover:shadow-md transition-all group"
            onClick={onSelect}
        >
            {/* Title + details link */}
            <div className="flex items-start justify-between gap-1 mb-2">
                {editingField === 'title' ? (
                    <input
                        autoFocus
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={commitTitle}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
                            if (e.key === 'Escape') { e.preventDefault(); setTitleDraft(task.title); setEditingField(null); }
                        }}
                        className="flex-1 min-w-0 text-body font-medium text-[#1e3a5f] border border-[#f08a3c] rounded px-1 py-0 -my-0.5 focus:outline-none"
                    />
                ) : (
                    <p
                        onClick={startEdit('title')}
                        title={canEdit ? 'Click to rename' : undefined}
                        className={cn(
                            'flex-1 min-w-0 text-body font-medium text-[#1e3a5f] leading-snug line-clamp-2',
                            canEdit && 'cursor-text hover:bg-[#f4f8fd] rounded -mx-0.5 px-0.5'
                        )}
                    >
                        {task.title}
                    </p>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    title="View task details"
                    className="shrink-0 p-0.5 rounded text-[#3d5a80] opacity-50 hover:opacity-100 hover:text-[#f08a3c] hover:bg-[#f4f8fd] transition-all"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Project */}
            {showProject && (
                editingField === 'project' ? (
                    <select
                        autoFocus
                        value={project?.id ?? ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            const v = e.target.value;
                            onUpdateField?.(task.id, { project_id: v === '' ? null : Number(v) });
                            setEditingField(null);
                        }}
                        onBlur={() => setEditingField(null)}
                        className="w-full text-[10px] border border-[#f08a3c] rounded px-1 py-0.5 mb-1.5 focus:outline-none"
                    >
                        <option value="">No Project</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                ) : (
                    <div
                        onClick={startEdit('project')}
                        title={canEdit ? 'Click to change project' : (project?.name ?? 'No Project')}
                        className={cn('flex items-center gap-1 mb-1.5', canEdit && 'cursor-pointer hover:opacity-70')}
                    >
                        <Folder className="w-2.5 h-2.5 text-[#3d5a80] shrink-0" />
                        <span className={cn('text-[10px] truncate', project ? 'text-[#3d5a80]' : 'text-[#3d5a80] italic opacity-60')}>
                            {project?.name ?? 'No Project'}
                        </span>
                    </div>
                )
            )}

            {/* Priority + location */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {editingField === 'priority' ? (
                    <select
                        autoFocus
                        value={priority ?? 'medium'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            onUpdateField?.(task.id, { priority: e.target.value });
                            setEditingField(null);
                        }}
                        onBlur={() => setEditingField(null)}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#f08a3c] uppercase tracking-wide focus:outline-none"
                    >
                        {PRIORITY_CHOICES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                ) : pStyle && priority && (
                    <span
                        style={{ background: pStyle.bg, color: pStyle.color }}
                        onClick={startEdit('priority')}
                        title={canEdit ? 'Click to change priority' : undefined}
                        className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide',
                            canEdit && 'cursor-pointer hover:opacity-70'
                        )}
                    >
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
            {editingField === 'worker' ? (
                <select
                    autoFocus
                    value={worker?.id ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        const v = e.target.value;
                        onUpdateField?.(task.id, { assigned_worker_id: v === '' ? null : Number(v) });
                        setEditingField(null);
                    }}
                    onBlur={() => setEditingField(null)}
                    className="w-full text-caption border border-[#f08a3c] rounded px-1 py-0.5 mb-2 focus:outline-none"
                >
                    <option value="">Unassigned</option>
                    {workers.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
            ) : worker ? (
                <HoverCard openDelay={150} closeDelay={100}>
                    <HoverCardTrigger asChild>
                        <div
                            onClick={startEdit('worker')}
                            title={canEdit ? 'Click to reassign' : undefined}
                            className={cn('flex items-center gap-1.5 mb-2 w-fit max-w-full', canEdit && 'cursor-pointer hover:opacity-70')}
                        >
                            <div style={{ background: avatarColor(worker.name), color: '#fff' }}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0">
                                {workerInitials(worker.name)}
                            </div>
                            <span className="text-caption text-[#3d5a80] truncate">{worker.name}</span>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                        side="right"
                        className="w-60 p-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 mb-2.5">
                            <div style={{ background: avatarColor(worker.name), color: '#fff' }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0">
                                {workerInitials(worker.name)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-body font-medium text-[#1e3a5f] truncate">{worker.name}</p>
                                {worker.role && <p className="text-caption text-muted-foreground truncate capitalize">{worker.role}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-caption">
                                <span className="text-muted-foreground">Today</span>
                                <span className={cn('font-medium', occupancyColour(toNum(worker.utilisation_pct_today)))}>
                                    {toNum(worker.utilisation_pct_today).toFixed(0)}%
                                    <span className="text-muted-foreground font-normal ml-1">
                                        ({toNum(worker.logged_hours_today).toFixed(1)}h / {(toNum(worker.capacity_hours_per_week, 40) / 5).toFixed(1)}h)
                                    </span>
                                </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                    className={cn('h-1.5 rounded-full', occupancyColour(toNum(worker.utilisation_pct_today)).replace('text-', 'bg-'))}
                                    style={{ width: `${Math.min(toNum(worker.utilisation_pct_today), 100)}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-caption pt-1">
                                <span className="text-muted-foreground">This week</span>
                                <span className={cn('font-medium', occupancyColour(toNum(worker.utilisation_pct)))}>
                                    {toNum(worker.utilisation_pct).toFixed(0)}%
                                    <span className="text-muted-foreground font-normal ml-1">
                                        ({toNum(worker.logged_hours_week).toFixed(1)}h / {toNum(worker.capacity_hours_per_week, 40).toFixed(1)}h)
                                    </span>
                                </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                    className={cn('h-1.5 rounded-full', occupancyColour(toNum(worker.utilisation_pct)).replace('text-', 'bg-'))}
                                    style={{ width: `${Math.min(toNum(worker.utilisation_pct), 100)}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-caption pt-1 border-t mt-1.5">
                                <span className="text-muted-foreground">Open queue</span>
                                <span className="font-medium text-[#1e3a5f]">{toNum(worker.queue_depth)} task{toNum(worker.queue_depth) !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            ) : (
                <div
                    onClick={startEdit('worker')}
                    title={canEdit ? 'Click to assign' : undefined}
                    className={cn('mb-2', canEdit && 'cursor-pointer hover:opacity-70')}
                >
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
                        : nextStatus === 'in_progress' ? '▶ Start task' : nextStatus === 'done' ? '✓ End task' : `→ Move to ${nextStatus.replace('_', ' ')}`
                    }
                </button>
            )}
        </div>
    );
});
