import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetService, printService, workerService, WHWorker } from '../../services/workhubApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ChevronLeft, ChevronRight, Download, FileText, AlertTriangle, Users, PenLine, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'sonner';

interface DayEntry {
    id: number;
    task_id: number;
    task_title: string;
    started_at: string;
    ended_at?: string;
    net_hours: number;
    break_min: number;
    notes?: string;
}

interface TimesheetDay {
    date: string;
    entries: DayEntry[];
    total_net_hours: number;
    total_break_min: number;
    overtime_flag: boolean;
}

interface TimesheetData {
    worker_id: number;
    period_start: string;
    period_end: string;
    total_net_hours: number;
    days: TimesheetDay[];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WorkHubTimesheet() {
    const qc = useQueryClient();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const weekEnd = addDays(weekStart, 6);
    // undefined = own timesheet; a number = selected worker's user_id
    const [selectedWorkerUserId, setSelectedWorkerUserId] = useState<number | undefined>(undefined);

    const { data: workers = [] } = useQuery<WHWorker[]>({
        queryKey: ['wh-workers'],
        queryFn: workerService.list,
        staleTime: 2 * 60 * 1000,
    });

    // Backend expects ISO week format: 2026-W22
    const weekParam = format(weekStart, "RRRR-'W'II");
    const isViewingOwnSheet = selectedWorkerUserId === undefined;
    const isCurrentOrPastWeek = weekStart <= startOfWeek(new Date(), { weekStartsOn: 1 });

    const { data: timesheet, isLoading } = useQuery({
        queryKey: ['wh-timesheet', weekParam, selectedWorkerUserId],
        queryFn: () => timesheetService.get({ week: weekParam, worker_id: selectedWorkerUserId }),
    });

    const { data: signoffStatus } = useQuery({
        queryKey: ['wh-timesheet-signoff', weekParam],
        queryFn: () => timesheetService.signoffStatus(weekParam),
        enabled: isViewingOwnSheet && isCurrentOrPastWeek,
    });

    const signoffMut = useMutation({
        mutationFn: () => timesheetService.signoff(weekParam),
        onSuccess: (data) => {
            if (data.already_signed) {
                toast.info('This week is already signed off.');
            } else {
                toast.success(`Week ${weekParam} signed off — ${data.total_net_hours}h recorded.`);
            }
            qc.invalidateQueries({ queryKey: ['wh-timesheet-signoff', weekParam] });
        },
        onError: (e: any) => {
            toast.error(e.response?.data?.message ?? 'Sign-off failed');
        },
    });

    const isSigned = signoffStatus?.signed ?? false;

    const ts = timesheet as TimesheetData | undefined;

    // Build a date→day lookup from the backend days array
    const dayByDate: Record<string, TimesheetDay> = {};
    (ts?.days ?? []).forEach((d) => { dayByDate[d.date] = d; });

    // Compute totals from the days array
    const totalBreakHours = (ts?.days ?? []).reduce((sum, d) => sum + d.total_break_min / 60, 0);
    const daysWorked = (ts?.days ?? []).filter((d) => d.entries.length > 0).length;
    const overtimeDays = (ts?.days ?? []).filter((d) => d.overtime_flag).length;

    const handleDownload = async () => {
        try {
            const blob = await printService.generate('timesheet', String(ts?.worker_id ?? 0), weekParam);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `timesheet-${weekParam}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Timesheet PDF downloaded');
        } catch {
            toast.error('Failed to generate timesheet PDF');
        }
    };

    return (
        <div className="space-y-4 p-4">
            {/* Worker selector */}
            {workers.length > 0 && (
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                        value={selectedWorkerUserId !== undefined ? String(selectedWorkerUserId) : '__self__'}
                        onValueChange={(v) => setSelectedWorkerUserId(v === '__self__' ? undefined : Number(v))}
                    >
                        <SelectTrigger className="w-52 h-8 text-body">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__self__">My Timesheet</SelectItem>
                            {workers.map((w) => (
                                <SelectItem key={w.id} value={String(w.user_id)}>
                                    {w.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedWorkerUserId !== undefined && (
                        <span className="text-caption text-muted-foreground">
                            Viewing: <strong>{workers.find((w) => w.user_id === selectedWorkerUserId)?.name}</strong>
                        </span>
                    )}
                </div>
            )}

            {/* Header controls */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-body-lg px-2">
                        {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                        disabled={weekStart >= startOfWeek(new Date(), { weekStartsOn: 1 })}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                        This week
                    </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!ts}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                </Button>

                {/* Sign-off — only own sheet, current or past week */}
                {isViewingOwnSheet && isCurrentOrPastWeek && (
                    isSigned ? (
                        <Badge className="gap-1 bg-green-100 text-green-700 border border-green-300 px-3 py-1.5 text-caption font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Signed off
                        </Badge>
                    ) : (
                        <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 gap-1"
                            disabled={signoffMut.isPending || !ts}
                            onClick={() => signoffMut.mutate()}
                            title="Formally confirm this week's time record (EuGH C-55/18)"
                        >
                            <PenLine className="h-4 w-4" />
                            Sign off week
                        </Button>
                    )
                )}
            </div>

            {/* Summary stats */}
            {isLoading ? (
                <Skeleton className="h-20 w-full" />
            ) : ts ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Work', val: `${(ts.total_net_hours ?? 0).toFixed(1)}h` },
                        { label: 'Total Break', val: `${totalBreakHours.toFixed(1)}h` },
                        { label: 'Days Worked', val: String(daysWorked) },
                        { label: 'Overtime Days', val: String(overtimeDays), warn: overtimeDays > 0 },
                    ].map((s) => (
                        <Card key={s.label}>
                            <CardContent className="p-3 text-center">
                                <p className={cn('text-xl font-bold', s.warn ? 'text-amber-600' : 'text-purple-600')}>{s.val}</p>
                                <p className="text-caption text-muted-foreground">{s.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}

            {/* Weekly grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-body-lg">
                        <FileText className="h-4 w-4 text-purple-600" />
                        Daily Breakdown
                        {selectedWorkerUserId !== undefined && (
                            <span className="text-caption font-normal text-muted-foreground ml-1">
                                — {workers.find((w) => w.user_id === selectedWorkerUserId)?.name}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-body">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left px-4 py-2 font-medium">Day</th>
                                        <th className="text-left px-4 py-2 font-medium">Task</th>
                                        <th className="text-right px-4 py-2 font-medium">Work</th>
                                        <th className="text-right px-4 py-2 font-medium">Break</th>
                                        <th className="text-right px-4 py-2 font-medium">Net</th>
                                        <th className="px-4 py-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 7 }).map((_, i) => {
                                        const day = addDays(weekStart, i);
                                        const key = format(day, 'yyyy-MM-dd');
                                        const tsDay = dayByDate[key];
                                        const dayEntries = tsDay?.entries ?? [];
                                        const isFuture = day > new Date();
                                        const isWeekend = i >= 5;
                                        const isOvertime = tsDay?.overtime_flag ?? false;

                                        if (dayEntries.length === 0) {
                                            return (
                                                <tr key={key} className={cn('border-b', isWeekend && 'bg-muted/20', isFuture && 'opacity-40')}>
                                                    <td className="px-4 py-2 font-medium">
                                                        <span className="text-muted-foreground">{DAY_NAMES[i]}</span>{' '}
                                                        <span className="text-caption text-muted-foreground">{format(day, 'd')}</span>
                                                    </td>
                                                    <td colSpan={5} className="px-4 py-2 text-muted-foreground text-caption">
                                                        {isFuture ? '—' : 'No entries'}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return dayEntries.map((entry, ei) => (
                                            <tr key={`${key}-${ei}`} className={cn('border-b hover:bg-muted/30', isWeekend && 'bg-muted/20')}>
                                                {ei === 0 && (
                                                    <td className="px-4 py-2 font-medium" rowSpan={dayEntries.length}>
                                                        {DAY_NAMES[i]}{' '}
                                                        <span className="text-caption text-muted-foreground">{format(day, 'd')}</span>
                                                    </td>
                                                )}
                                                <td className="px-4 py-2 max-w-[180px] truncate">{entry.task_title}</td>
                                                <td className="px-4 py-2 text-right">{entry.net_hours.toFixed(2)}h</td>
                                                <td className="px-4 py-2 text-right">{(entry.break_min / 60).toFixed(2)}h</td>
                                                <td className={cn('px-4 py-2 text-right font-medium', isOvertime && ei === 0 && 'text-amber-600')}>
                                                    {ei === 0 ? (
                                                        <>
                                                            {(tsDay?.total_net_hours ?? 0).toFixed(2)}h
                                                            {isOvertime && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                                                        </>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {ei === 0 && (
                                                        <Badge
                                                            variant={isOvertime ? 'secondary' : 'default'}
                                                            className={cn(
                                                                'text-caption',
                                                                isOvertime && 'bg-amber-100 text-amber-700'
                                                            )}
                                                        >
                                                            {isOvertime ? 'Overtime' : 'OK'}
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* §16 ArbZG notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2 text-caption text-amber-800">
                <AlertTriangle className="inline h-3 w-3 mr-1" />
                §16 ArbZG compliance: max 8h/day, 30min break after 6h, 45min after 9h. ⚠ flags indicate approaching limits.
            </div>

            {/* Signed-off confirmation */}
            {isSigned && signoffStatus?.signoff && (
                <div className="bg-green-50 border border-green-200 rounded-md px-4 py-2 text-caption text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    This week was signed off on{' '}
                    <strong>{format(new Date(signoffStatus.signoff.signed_at), 'PPP p')}</strong>
                    {' '}— {signoffStatus.signoff.total_net_hours}h recorded.
                    Confirmed per EuGH C-55/18.
                </div>
            )}
        </div>
    );
}
