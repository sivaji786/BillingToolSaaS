import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Clock, Loader2, Plus } from 'lucide-react';
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
}

const COLUMNS: { status: TaskStatus; label: string; color: string; bg: string; dot: string }[] = [
    { status: 'open',        label: 'Open',        color: 'text-blue-700',   bg: 'bg-blue-50',   dot: 'bg-blue-500'   },
    { status: 'in_progress', label: 'In Progress',  color: 'text-amber-700',  bg: 'bg-amber-50',  dot: 'bg-amber-500'  },
    { status: 'done',        label: 'Done',         color: 'text-green-700',  bg: 'bg-green-50',  dot: 'bg-green-500'  },
    { status: 'problem',     label: 'Problem',      color: 'text-red-700',    bg: 'bg-red-50',    dot: 'bg-red-500'    },
];

const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high:   'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low:    'bg-gray-100 text-gray-600',
};

const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus | null> = {
    open:        'in_progress',
    in_progress: 'done',
    done:        null,
    problem:     'in_progress',
};

export function KanbanBoard({ tasks, workers = [], onSelectTask, onUpdated, readOnly = false }: Props) {
    const qc = useQueryClient();
    const [showNew, setShowNew] = useState(false);
    const [workerFilter, setWorkerFilter] = useState<number | ''>('');

    const workerMap = new Map(workers.map((w) => [Number(w.id), w]));

    const moveMut = useMutation({
        mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
            taskService.update(id, { status }),
        onSuccess: () => {
            onUpdated();
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to move task'),
    });

    const visibleTasks = workerFilter !== ''
        ? tasks.filter((t) => Number(t.assigned_worker_id) === Number(workerFilter))
        : tasks;

    const tasksByStatus = (status: TaskStatus) => visibleTasks.filter((t) => t.status === status);

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center gap-3 px-4 py-2 border-b shrink-0">
                {/* Worker filter */}
                {workers.length > 0 && (
                    <select
                        value={workerFilter}
                        onChange={(e) => setWorkerFilter(e.target.value === '' ? '' : Number(e.target.value))}
                        className="text-body border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        <option value="">All workers</option>
                        {workers.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                )}
                <span className="text-caption text-muted-foreground ml-auto">
                    {visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''}
                </span>
                {!readOnly && (
                    <button
                        onClick={() => setShowNew(true)}
                        className="flex items-center gap-1.5 text-body font-medium px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Task
                    </button>
                )}
            </div>
        <div className="flex gap-3 p-4 overflow-x-auto flex-1 min-h-0">
            {COLUMNS.map(({ status, label, color, bg, dot }) => {
                const colTasks = tasksByStatus(status);
                return (
                    <div
                        key={status}
                        className="flex flex-col min-w-[220px] w-[220px] shrink-0"
                    >
                        {/* Column header */}
                        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0', bg)}>
                            <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                            <span className={cn('text-caption font-semibold uppercase tracking-wide', color)}>
                                {label}
                            </span>
                            <span className={cn('ml-auto text-caption font-bold px-1.5 py-0.5 rounded-full', bg, color)}>
                                {colTasks.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-muted/30 border rounded-b-lg min-h-[120px]">
                            {colTasks.length === 0 && (
                                <p className="text-caption text-muted-foreground text-center py-6">No tasks</p>
                            )}
                            {colTasks.map((task) => (
                                <KanbanCard
                                    key={task.id}
                                    task={task}
                                    worker={task.assigned_worker_id != null ? workerMap.get(Number(task.assigned_worker_id)) : undefined}
                                    onSelect={() => onSelectTask(task.id)}
                                    nextStatus={STATUS_TRANSITIONS[task.status]}
                                    onMove={(nextStatus) => moveMut.mutate({ id: task.id, status: nextStatus })}
                                    isMoving={moveMut.isPending && moveMut.variables?.id === task.id}
                                    readOnly={readOnly}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
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

interface CardProps {
    task: WHTask;
    worker?: WHWorker;
    onSelect: () => void;
    nextStatus: TaskStatus | null;
    onMove: (status: TaskStatus) => void;
    isMoving: boolean;
    readOnly: boolean;
}

function workerInitials(name: string): string {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function KanbanCard({ task, worker, onSelect, nextStatus, onMove, isMoving, readOnly }: CardProps) {
    const overrun = task.logged_hours && task.est_hours && task.logged_hours > task.est_hours;

    return (
        <div
            className="bg-background border rounded-lg p-3 cursor-pointer hover:shadow-sm hover:border-purple-300 transition-all group"
            onClick={onSelect}
        >
            <p className="text-body font-medium leading-snug line-clamp-2 mb-2">{task.title}</p>

            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {task.priority && (
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase', PRIORITY_COLORS[task.priority])}>
                        {task.priority}
                    </span>
                )}
                {task.location_tag && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={task.location_tag}>
                        📍 {task.location_tag}
                    </span>
                )}
            </div>

            {/* Assigned worker */}
            {worker ? (
                <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                        {workerInitials(worker.name)}
                    </div>
                    <span className="text-caption text-muted-foreground truncate">{worker.name}</span>
                </div>
            ) : (
                <div className="mb-2">
                    <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                </div>
            )}

            <div className="flex items-center gap-2 text-caption text-muted-foreground">
                {task.est_hours != null && (
                    <span className={cn('flex items-center gap-0.5', overrun && 'text-amber-600')}>
                        <Clock className="w-3 h-3" />
                        {task.logged_hours != null ? `${task.logged_hours}` : '0'}/{task.est_hours}h
                        {overrun && <AlertCircle className="w-3 h-3" />}
                    </span>
                )}
                {task.due_date && (
                    <span className="ml-auto shrink-0">
                        {format(new Date(task.due_date), 'dd MMM')}
                    </span>
                )}
            </div>

            {/* Move button — visible on hover, hidden for client/read-only */}
            {!readOnly && nextStatus && (
                <button
                    onClick={(e) => { e.stopPropagation(); onMove(nextStatus); }}
                    disabled={isMoving}
                    className="mt-2 w-full text-[10px] font-medium py-1 rounded border border-muted hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                >
                    {isMoving
                        ? <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                        : `→ Move to ${nextStatus.replace('_', ' ')}`
                    }
                </button>
            )}
        </div>
    );
}
