import { useQuery } from '@tanstack/react-query';
import { taskService } from '../../../services/workhubApi';
import { useAuthStore } from '../../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import { Briefcase, CheckCircle2, Clock, AlertTriangle, ExternalLink, Timer } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface WorkHubDashboardWidgetProps {
    onNavigate: (screen: string) => void;
    onDismiss?: () => void;
}

export function WorkHubDashboardWidget({ onNavigate, onDismiss }: WorkHubDashboardWidgetProps) {
    const tenant = useAuthStore((s) => (s as any).tenant);
    const workhubEnabled = (tenant as any)?.plan_features?.workhub_enabled;

    // Per-status counts come from the backend's own `total` (each call scoped to one
    // status, per_page=1 so it's cheap) rather than counting a single fetched page of
    // tasks client-side — that page defaults to 20 rows, which would silently under-count
    // any tenant with more open/in-progress/problem tasks than fit on one page.
    const { data: counts, isLoading } = useQuery({
        queryKey: ['wh-tasks-summary'],
        queryFn: async () => {
            const [open, inProgress, done, problem, all] = await Promise.all([
                taskService.list({ status: 'open', per_page: 1 }),
                taskService.list({ status: 'in_progress', per_page: 1 }),
                taskService.list({ status: 'done', per_page: 1 }),
                taskService.list({ status: 'problem', per_page: 1 }),
                taskService.list({ per_page: 1 }),
            ]);
            return {
                open: open.pagination.total, inProgress: inProgress.pagination.total,
                done: done.pagination.total, problem: problem.pagination.total, all: all.pagination.total,
            };
        },
        refetchInterval: 60 * 1000,
        enabled: !!workhubEnabled,
        staleTime: 30 * 1000,
    });

    if (!workhubEnabled) return null;

    const openCount       = counts?.open ?? 0;
    const inProgressCount = counts?.inProgress ?? 0;
    const doneCount       = counts?.done ?? 0;
    const problemCount    = counts?.problem ?? 0;
    const totalTasks      = counts?.all ?? 0;
    const completionRate  = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

    const stats = [
        { label: 'Open',        val: openCount,       icon: Clock,        colour: 'text-blue-600'   },
        { label: 'In Progress', val: inProgressCount, icon: Timer,        colour: 'text-amber-600'  },
        { label: 'Done',        val: doneCount,       icon: CheckCircle2, colour: 'text-green-600'  },
        { label: 'Problems',    val: problemCount,    icon: AlertTriangle, colour: 'text-red-600'   },
    ];

    return (
        <Card className="border-[rgba(30,58,95,0.15)]">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-body-lg">
                        <Briefcase className="h-4 w-4 text-[#2a8fbd]" />
                        WorkHub
                        <Badge className="bg-[#f0f6ff] text-[#1e3a5f] text-caption">{completionRate}% done</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigate('workhub')}
                            className="text-caption text-[#2a8fbd] h-7 px-2"
                        >
                            Open <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                        {onDismiss && (
                            <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 w-7 p-0 text-muted-foreground">
                                ×
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {stats.map((s) => (
                                <div key={s.label} className="rounded-md bg-muted/40 p-2 text-center">
                                    <s.icon className={cn('h-4 w-4 mx-auto mb-0.5', s.colour)} />
                                    <p className={cn('text-heading-1 font-medium leading-none', s.colour)}>{s.val}</p>
                                    <p className="text-caption text-muted-foreground mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Active timer indicator */}
                        {inProgressCount > 0 && (
                            <div className="mt-3 flex items-center gap-2 text-caption text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                {inProgressCount} task{inProgressCount > 1 ? 's' : ''} currently in progress
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto h-5 px-1 text-caption text-amber-700"
                                    onClick={() => onNavigate('workhub')}
                                >
                                    View →
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
