import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { taskService, workerService, WHTask, WHWorker } from '../../../services/workhubApi';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'open' | 'in_progress' | 'done' | 'problem';

const PRIORITY_OPTS: { value: Priority; label: string }[] = [
    { value: 'low',    label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high',   label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
    { value: 'open',        label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'problem',     label: 'Problem' },
    { value: 'done',        label: 'Done' },
];

function utilColour(pct: number): string {
    if (pct <= 70) return 'border-green-400 bg-green-50';
    if (pct <= 90) return 'border-amber-400 bg-amber-50';
    return 'border-red-400 bg-red-50';
}

function utilBadge(pct: number): string {
    if (pct <= 70) return 'text-green-700 bg-green-100';
    if (pct <= 90) return 'text-amber-700 bg-amber-100';
    return 'text-red-700 bg-red-100';
}

interface Props {
    task: WHTask;
    onClose: () => void;
    onSaved: () => void;
}

export function TaskEditModal({ task, onClose, onSaved }: Props) {
    const qc = useQueryClient();

    const [title,       setTitle]       = useState(task.title ?? '');
    const [description, setDescription] = useState(task.description ?? '');
    const [priority,    setPriority]    = useState<Priority>((task.priority as Priority) ?? 'medium');
    const [status,      setStatus]      = useState<TaskStatus>((task.status as TaskStatus) ?? 'open');
    const [estHours,    setEstHours]    = useState(task.est_hours != null ? String(task.est_hours) : '');
    const [locationTag, setLocationTag] = useState(task.location_tag ?? '');
    const [dueDate,     setDueDate]     = useState(task.due_date ?? '');
    const [workerId,    setWorkerId]    = useState<number | null>(
        task.assigned_worker_id != null ? Number(task.assigned_worker_id) : null
    );

    const { data: workers = [], isPending: workersLoading } = useQuery<WHWorker[]>({
        queryKey: ['wh-workers'],
        queryFn: workerService.list,
    });

    const saveMut = useMutation({
        mutationFn: () => taskService.update(task.id, {
            title:               title.trim(),
            description:         description.trim() || undefined,
            priority,
            status,
            est_hours:           estHours ? Number(estHours) : undefined,
            location_tag:        locationTag.trim() || undefined,
            due_date:            dueDate || undefined,
            assigned_worker_id:  workerId ?? undefined,
        } as any),
        onSuccess: () => {
            toast.success('Task updated');
            qc.invalidateQueries({ queryKey: ['wh-task', task.id] });
            qc.invalidateQueries({ queryKey: ['wh-tasks'] });
            onSaved();
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to save task'),
    });

    const canSave = title.trim().length >= 3;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription className="sr-only">
                        Edit task details and re-assign worker.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    {/* Title */}
                    <div className="space-y-1">
                        <Label htmlFor="et-title">Title *</Label>
                        <Input
                            id="et-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title…"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <Label htmlFor="et-desc">Description</Label>
                        <textarea
                            id="et-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the work…"
                            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-body resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Priority + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PRIORITY_OPTS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTS.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Est. hours + Due date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="et-est">Est. hours</Label>
                            <Input
                                id="et-est"
                                type="number"
                                min="0"
                                step="0.5"
                                value={estHours}
                                onChange={(e) => setEstHours(e.target.value)}
                                placeholder="e.g. 4"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="et-due">Due date</Label>
                            <Input
                                id="et-due"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Location tag */}
                    <div className="space-y-1">
                        <Label htmlFor="et-loc">Location tag</Label>
                        <Input
                            id="et-loc"
                            value={locationTag}
                            onChange={(e) => setLocationTag(e.target.value)}
                            placeholder="e.g. Berlin-Nord-03"
                        />
                    </div>

                    {/* Worker assignment */}
                    <div className="space-y-2">
                        <Label>Assigned Worker</Label>
                        {workersLoading ? (
                            <div className="flex items-center justify-center h-16 text-muted-foreground">
                                <Loader2 className="animate-spin w-4 h-4" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                                <button
                                    type="button"
                                    onClick={() => setWorkerId(null)}
                                    className={cn(
                                        'p-3 rounded-lg border-2 text-left transition-colors',
                                        workerId === null
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-border hover:border-purple-300'
                                    )}
                                >
                                    <div className="text-body font-medium">Unassigned</div>
                                    <div className="text-caption text-muted-foreground">Clear assignment</div>
                                </button>

                                {workers.map((w) => {
                                    const pct     = w.utilisation_pct ?? 0;
                                    const isChosen = Number(w.id) === workerId;
                                    return (
                                        <button
                                            type="button"
                                            key={w.id}
                                            onClick={() => setWorkerId(Number(w.id))}
                                            className={cn(
                                                'p-3 rounded-lg border-2 text-left transition-colors',
                                                isChosen
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : utilColour(pct) + ' hover:border-purple-300'
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-body font-medium truncate">{w.name}</span>
                                                <span className={cn('text-caption px-1.5 py-0.5 rounded-full', utilBadge(pct))}>
                                                    {pct}%
                                                </span>
                                            </div>
                                            <div className="text-caption text-muted-foreground">
                                                {w.queue_depth ?? 0} tasks queued
                                                {w.free_from_date ? ` · free ${w.free_from_date}` : ''}
                                            </div>
                                            <div className="mt-1.5 h-1.5 rounded-full bg-gray-200">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full transition-all',
                                                        pct <= 70 ? 'bg-green-500' : pct <= 90 ? 'bg-amber-500' : 'bg-red-500'
                                                    )}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 gap-2"
                            disabled={!canSave || saveMut.isPending}
                            onClick={() => saveMut.mutate()}
                        >
                            {saveMut.isPending && <Loader2 className="animate-spin w-4 h-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
