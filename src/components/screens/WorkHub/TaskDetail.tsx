import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, CheckSquare, AlertTriangle, Clock, MapPin, Package, Image, Link2, User, Pencil, FileText } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { taskService, timerService, WHTask, WHWorker, TaskStatus } from '../../../services/workhubApi';
import { useWorkhubTimerStore } from '../../../stores/workhubTimerStore';
import { DoneReportModal } from './DoneReportModal';
import { TaskEditModal } from './TaskEditModal';
import { TaskDocumentsTab } from './TaskDocumentsTab';
import { BatchLocationPanel } from './BatchLocationPanel';
import { toast } from 'sonner';

const STATUS_COLORS: Record<TaskStatus, string> = {
    open:        'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    done:        'bg-green-100 text-green-700',
    problem:     'bg-red-100 text-red-700',
};

interface Props {
    taskId: number;
    onBack: () => void;
    onUpdated: () => void;
    workers?: WHWorker[];
    canEdit?: boolean;
}

export function TaskDetail({ taskId, onBack, onUpdated, workers = [], canEdit = false }: Props) {
    const qc = useQueryClient();
    const timer = useWorkhubTimerStore();
    const [showDoneReport, setShowDoneReport] = useState(false);
    const [showEdit,       setShowEdit]       = useState(false);

    const { data: task, isLoading } = useQuery<WHTask>({
        queryKey: ['wh-task', taskId],
        queryFn: () => taskService.get(taskId),
    });

    const startMut = useMutation({
        mutationFn: () => timerService.start(taskId),
        onSuccess: () => {
            timer.start(taskId, task?.title ?? '', task?.est_hours ?? null, task?.logged_hours ?? 0);
            qc.invalidateQueries({ queryKey: ['wh-task', taskId] });
            qc.invalidateQueries({ queryKey: ['wh-tasks'] });
            onUpdated();
            toast.success('Timer started');
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to start timer'),
    });

    if (isLoading || !task) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 p-4 border-b">
                    <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
                    <div className="h-4 bg-muted rounded w-48 animate-pulse" />
                </div>
                <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
                </div>
            </div>
        );
    }

    const isTimerRunningForThis = timer.activeTaskId === taskId && timer.state !== 'idle';
    const canStartTimer = task.status === 'in_progress' || task.status === 'open';

    const assignedWorker = task.assigned_worker_id != null
        ? workers.find((w) => Number(w.id) === Number(task.assigned_worker_id))
        : null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b sticky top-0 bg-background z-10">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-heading-2 font-medium flex-1 min-w-0 truncate">{task.title}</h2>
                <Badge className={STATUS_COLORS[task.status]}>{task.status.replace('_', ' ')}</Badge>
                {canEdit && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={() => setShowEdit(true)}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Meta */}
                <Card>
                    <CardContent className="p-3 space-y-2 text-body">
                        {/* Assigned worker */}
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                            {assignedWorker ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#f0f6ff] text-[#1e3a5f] flex items-center justify-center text-[10px] font-medium shrink-0">
                                        {assignedWorker.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                                    </div>
                                    <span className="font-medium">{assignedWorker.name}</span>
                                    {assignedWorker.role && (
                                        <span className="text-caption text-muted-foreground">· {assignedWorker.role}</span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                        </div>

                        {task.location_tag && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span>{task.location_tag}</span>
                            </div>
                        )}
                        {(task.logged_hours !== undefined || task.est_hours !== undefined) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4 shrink-0" />
                                <span>{task.net_hours_formatted ?? `${task.logged_hours ?? 0}h`} logged
                                    {task.est_hours ? ` / ${task.est_hours}h est.` : ''}</span>
                            </div>
                        )}
                        {task.due_date && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>Due {task.due_date}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Description */}
                {task.description ? (
                    <div className="text-body text-foreground whitespace-pre-wrap">{task.description}</div>
                ) : (
                    <p className="text-caption text-muted-foreground italic">No description provided</p>
                )}

                {/* Completion record */}
                <div>
                    <div className="flex items-center gap-1.5 mb-2 text-body font-medium">
                        <CheckSquare className="w-4 h-4" />
                        Completion
                    </div>
                    {task.completion_record ? (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body text-muted-foreground">
                            {task.completion_record.customer_signed_at && (
                                <>
                                    <dt className="font-medium text-foreground">Date</dt>
                                    <dd>{new Date(task.completion_record.customer_signed_at).toLocaleDateString()}</dd>
                                </>
                            )}
                            <dt className="font-medium text-foreground">Dual-signed</dt>
                            <dd>{task.completion_record.is_dual_signed ? 'Yes' : 'No'}</dd>
                            {task.completion_record.customer_name && (
                                <>
                                    <dt className="font-medium text-foreground">Customer</dt>
                                    <dd>{task.completion_record.customer_name}</dd>
                                </>
                            )}
                            {assignedWorker && (
                                <>
                                    <dt className="font-medium text-foreground">Worker</dt>
                                    <dd>{assignedWorker.name}</dd>
                                </>
                            )}
                        </dl>
                    ) : (
                        <p className="text-caption text-muted-foreground italic">No completion record yet</p>
                    )}
                </div>

                {/* Documents / PDF download */}
                {task.completion_record && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2 text-body font-medium">
                            <FileText className="w-4 h-4" />
                            Documents
                        </div>
                        <TaskDocumentsTab
                            taskId={task.id}
                            hasCompletionRecord={!!task.completion_record}
                            isDualSigned={!!task.completion_record?.is_dual_signed}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    {canStartTimer && !isTimerRunningForThis && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 gap-1"
                            onClick={() => startMut.mutate()}
                            disabled={startMut.isPending || (timer.state !== 'idle' && timer.activeTaskId !== taskId)}
                        >
                            <Play className="w-4 h-4" />
                            Start Timer
                        </Button>
                    )}
                    {task.status !== 'done' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => setShowDoneReport(true)}
                        >
                            <CheckSquare className="w-4 h-4" />
                            Done Report
                        </Button>
                    )}
                </div>

                {/* Materials */}
                {task.materials && task.materials.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2 text-body font-medium">
                            <Package className="w-4 h-4" />
                            Materials
                        </div>
                        <div className="space-y-1">
                            {task.materials.map((m, i) => (
                                <div key={i} className="flex justify-between text-body text-muted-foreground">
                                    <span>{m.material_name} × {m.quantity} {m.unit}</span>
                                    <span>€{m.total_price?.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Photos */}
                {task.photos && task.photos.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2 text-body font-medium">
                            <Image className="w-4 h-4" />
                            Photos ({task.photos.length})
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {task.photos.map((p) => (
                                <img
                                    key={p.id}
                                    src={p.url}
                                    alt="jobsite"
                                    className="w-full aspect-square object-cover rounded-md"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Batch location panel */}
                {task.location_tag && (
                    <BatchLocationPanel
                        locationTag={task.location_tag}
                        currentTaskId={task.id}
                        onTaskSelect={() => {}}
                    />
                )}

                {/* External integration metadata — visible only for machine-created tasks */}
                {task.source_module && task.source_module !== 'manual' && (
                    <Card>
                        <CardContent className="p-3 space-y-1.5 text-caption text-muted-foreground">
                            <div className="flex items-center gap-2 font-medium text-body text-foreground mb-1">
                                <Link2 className="w-4 h-4 text-[#2a8fbd] shrink-0" />
                                Integration Origin
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span className="font-medium">Source</span>
                                <span className="uppercase">{task.source_module}</span>
                                {task.task_type && (
                                    <>
                                        <span className="font-medium">Type</span>
                                        <span>{task.task_type.replace('_', ' ')}</span>
                                    </>
                                )}
                                {task.correlation_id && (
                                    <>
                                        <span className="font-medium">Correlation ID</span>
                                        <span className="font-mono truncate">{task.correlation_id}</span>
                                    </>
                                )}
                                {task.pfe_ref_type && (
                                    <>
                                        <span className="font-medium">Ref type</span>
                                        <span>{task.pfe_ref_type}</span>
                                    </>
                                )}
                                {task.pfe_ref_id && (
                                    <>
                                        <span className="font-medium">Ref ID</span>
                                        <span className="font-mono truncate">{task.pfe_ref_id}</span>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {showDoneReport && (
                <DoneReportModal
                    taskId={task.id}
                    onClose={() => setShowDoneReport(false)}
                    onSubmitted={() => {
                        setShowDoneReport(false);
                        qc.invalidateQueries({ queryKey: ['wh-task', taskId] });
                        qc.invalidateQueries({ queryKey: ['wh-tasks'] });
                        onUpdated();
                    }}
                />
            )}

            {showEdit && (
                <TaskEditModal
                    task={task}
                    onClose={() => setShowEdit(false)}
                    onSaved={() => {
                        setShowEdit(false);
                        qc.invalidateQueries({ queryKey: ['wh-task', taskId] });
                        qc.invalidateQueries({ queryKey: ['wh-tasks'] });
                        onUpdated();
                    }}
                />
            )}
        </div>
    );
}
