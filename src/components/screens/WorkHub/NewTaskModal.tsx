import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { taskService, workerService, projectService, WHWorker } from '../../../services/workhubApi';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TaskType = 'fault_resolution' | 'commissioning' | 'configuration' | 'investigation' | 'maintenance';

const PRIORITY_OPTS: Priority[] = ['low', 'medium', 'high', 'urgent'];
const TASK_TYPE_OPTS: { value: TaskType; label: string }[] = [
    { value: 'fault_resolution', label: 'Fault Resolution' },
    { value: 'commissioning',    label: 'Commissioning' },
    { value: 'configuration',    label: 'Configuration' },
    { value: 'investigation',    label: 'Investigation' },
    { value: 'maintenance',      label: 'Maintenance' },
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
    onClose: () => void;
    onCreated: () => void;
    defaultProjectId?: number;
}

export function NewTaskModal({ onClose, onCreated, defaultProjectId }: Props) {
    const [step, setStep] = useState<1 | 2>(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [taskType, setTaskType] = useState<TaskType>('fault_resolution');
    const [projectId, setProjectId] = useState(defaultProjectId ? String(defaultProjectId) : '');
    const [estHours, setEstHours] = useState('');
    const [locationTag, setLocationTag] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

    const { data: workers = [], isPending: workersLoading } = useQuery<WHWorker[]>({
        queryKey: ['wh-workers'],
        queryFn: workerService.list,
        enabled: step === 2,
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['wh-projects'],
        queryFn: projectService.list,
    });

    const createMut = useMutation({
        mutationFn: () => taskService.create({
            title,
            description: description || undefined,
            priority,
            task_type: taskType,
            project_id: projectId ? Number(projectId) : undefined,
            est_hours: estHours ? Number(estHours) : undefined,
            location_tag: locationTag || undefined,
            due_date: dueDate || undefined,
            assigned_worker_id: selectedWorkerId ?? undefined,
        }),
        onSuccess: () => {
            toast.success('Task created');
            onCreated();
        },
        onError: (e: any) => {
            const data = e.response?.data;
            const validationBag = data?.messages ?? data?.errors;
            if (validationBag && typeof validationBag === 'object') {
                const detail = Object.entries(validationBag)
                    .map(([field, msg]) => `${field}: ${msg}`)
                    .join(' | ');
                toast.error('Validation failed', { description: detail });
            } else {
                toast.error(data?.message ?? 'Failed to create task');
            }
        },
    });

    const canNext = title.trim().length >= 3;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        New Task
                        <span className="ml-auto text-caption text-muted-foreground font-normal">Step {step} / 2</span>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Create a new WorkHub task. Step 1 collects task details; step 2 assigns a worker.
                    </DialogDescription>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex gap-1 mb-4">
                    {[1, 2].map((s) => (
                        <div
                            key={s}
                            className={cn('h-1 flex-1 rounded-full transition-colors', step >= s ? 'bg-[#f08a3c]' : 'bg-muted')}
                        />
                    ))}
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Task title…"
                                autoFocus
                            />
                        </div>

                        <div>
                            <Label htmlFor="desc">Description</Label>
                            <textarea
                                id="desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the work to be done…"
                                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-body resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Priority</Label>
                                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PRIORITY_OPTS.map((p) => (
                                            <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Task type</Label>
                                <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TASK_TYPE_OPTS.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Project</Label>
                            <Select
                                value={projectId || '__none__'}
                                onValueChange={(v) => setProjectId(v === '__none__' ? '' : v)}
                                disabled={projects.length === 0}
                            >
                                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                                <SelectContent>
                                    {projects.length === 0 ? (
                                        <SelectItem value="__none__" disabled>No projects — create one first</SelectItem>
                                    ) : (
                                        <>
                                            <SelectItem value="__none__">None</SelectItem>
                                            {projects.map((p: any) => (
                                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                            ))}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="est">Est. hours</Label>
                                <Input id="est" type="number" min="0.5" max="999" step="0.5" value={estHours}
                                    onChange={(e) => setEstHours(e.target.value)} placeholder="e.g. 4" />
                            </div>
                            <div>
                                <Label htmlFor="due">Due date</Label>
                                <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="loc">Location tag</Label>
                            <Input id="loc" value={locationTag} onChange={(e) => setLocationTag(e.target.value)}
                                placeholder="e.g. Berlin-Nord-03" />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                className="bg-[#c2410c] hover:bg-[#9a3412] gap-1"
                                disabled={!canNext}
                                onClick={() => setStep(2)}
                            >
                                Assign Worker <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <p className="text-body text-muted-foreground">Select a worker (optional). Capacity is colour-coded: green ≤70 %, amber ≤90 %, red &gt;90 %.</p>

                        {workersLoading ? (
                            <div className="flex items-center justify-center h-24 text-muted-foreground">
                                <Loader2 className="animate-spin w-5 h-5" />
                            </div>
                        ) : workers.length === 0 ? (
                            <div className="flex items-center justify-center h-24 text-body text-muted-foreground">
                                No workers found — add workers in WorkHub Settings first.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                                {/* No assignment option */}
                                <button
                                    onClick={() => setSelectedWorkerId(null)}
                                    className={cn(
                                        'p-3 rounded-lg border-2 text-left transition-colors',
                                        selectedWorkerId === null ? 'border-[#f08a3c] bg-[#f0f6ff]' : 'border-border hover:border-[rgba(30,58,95,0.20)]'
                                    )}
                                >
                                    <div className="text-body font-medium">Unassigned</div>
                                    <div className="text-caption text-muted-foreground">Assign later</div>
                                </button>

                                {workers.map((w) => {
                                    const pct = w.utilisation_pct ?? 0;
                                    return (
                                        <button
                                            key={w.id}
                                            onClick={() => setSelectedWorkerId(w.id)}
                                            className={cn(
                                                'p-3 rounded-lg border-2 text-left transition-colors',
                                                selectedWorkerId === w.id ? 'border-[#f08a3c]' : utilColour(pct),
                                                selectedWorkerId === w.id ? '' : 'hover:border-[rgba(30,58,95,0.20)]'
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
                                                    className={cn('h-full rounded-full transition-all', pct <= 70 ? 'bg-green-500' : pct <= 90 ? 'bg-amber-500' : 'bg-red-500')}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex justify-between gap-2 pt-2">
                            <Button variant="outline" className="gap-1" onClick={() => setStep(1)}>
                                <ChevronLeft className="w-4 h-4" /> Back
                            </Button>
                            <Button
                                className="bg-[#c2410c] hover:bg-[#9a3412] gap-1"
                                onClick={() => createMut.mutate()}
                                disabled={createMut.isPending}
                            >
                                {createMut.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                                Create Task
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
