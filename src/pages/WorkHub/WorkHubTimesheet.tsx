import { useState, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetService, printService, workerService, WHWorker } from '../../services/workhubApi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import {
    ChevronLeft, ChevronRight, Download, FileText, Clock,
    AlertTriangle, Users, PenLine, CheckCircle2, BarChart2, FolderOpen,
    CalendarDays, Coffee, TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    format, startOfWeek, addDays, addWeeks, subWeeks,
    startOfMonth, endOfMonth, addMonths, subMonths,
    eachDayOfInterval, parseISO,
} from 'date-fns';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'custom';
type ReportView = 'daily' | 'task' | 'project';

interface DayEntry {
    id: number;
    task_id: number;
    task_title: string;
    project_id?: number;
    project_name?: string;
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

// ── Segmented control button ───────────────────────────────────────────────────

function SegBtn({ active, onClick, children, icon }: {
    active: boolean; onClick: () => void;
    children: React.ReactNode; icon?: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center justify-center gap-1 py-1.5 rounded-md text-caption font-medium transition-all',
                active
                    ? 'bg-background shadow-sm text-[#1e3a5f]'
                    : 'text-muted-foreground hover:text-foreground'
            )}
        >
            {icon && <span className="hidden sm:inline">{icon}</span>}
            {children}
        </button>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, val, icon: Icon, accent, warn }: {
    label: string; val: string; icon: React.ElementType; accent: string; warn?: boolean;
}) {
    return (
        <Card className={cn('overflow-hidden border-0 shadow-sm', warn && val !== '0' && 'ring-1 ring-amber-300')}>
            <div className="h-1 w-full" style={{ background: accent }} />
            <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${accent}18` }}>
                    <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div className="min-w-0">
                    <p className={cn('text-lg font-bold leading-tight', warn && val !== '0' ? 'text-amber-600' : 'text-[#1e3a5f]')}>
                        {val}
                    </p>
                    <p className="text-caption text-muted-foreground leading-tight truncate">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Daily table row ───────────────────────────────────────────────────────────

interface TimesheetRowProps { day: Date; tsDay: TimesheetDay | undefined; }

const TimesheetRow = memo(function TimesheetRow({ day, tsDay }: TimesheetRowProps) {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEntries = tsDay?.entries ?? [];
    const isFuture = day > new Date();
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const isOvertime = tsDay?.overtime_flag ?? false;
    const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const abbr = DAY_ABBR[(day.getDay() + 6) % 7];

    if (dayEntries.length === 0) {
        return (
            <tr className={cn('border-b', isWeekend && 'bg-muted/30', isFuture && 'opacity-40')}>
                <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-medium text-muted-foreground">{abbr}</span>{' '}
                    <span className="text-caption text-muted-foreground">{format(day, 'd')}</span>
                </td>
                <td colSpan={4} className="px-3 py-2.5 text-caption text-muted-foreground">
                    {isFuture ? '—' : 'No entries'}
                </td>
            </tr>
        );
    }

    return (
        <>
            {dayEntries.map((entry, ei) => (
                <tr key={`${dateKey}-${ei}`} className={cn('border-b hover:bg-muted/30', isWeekend && 'bg-muted/20')}>
                    {ei === 0 && (
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap" rowSpan={dayEntries.length}>
                            <span className={cn(isOvertime ? 'text-amber-600' : 'text-foreground')}>{abbr}</span>{' '}
                            <span className="text-caption text-muted-foreground">{format(day, 'd')}</span>
                        </td>
                    )}
                    <td className="px-3 py-2.5 max-w-[140px] text-body">
                        <span className="block truncate">{entry.task_title}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-[#2a8fbd] whitespace-nowrap">
                        {entry.net_hours.toFixed(2)}h
                    </td>
                    <td className="px-3 py-2.5 text-right hidden sm:table-cell text-muted-foreground">
                        {(entry.break_min / 60).toFixed(2)}h
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                        {ei === 0 && (
                            <Badge className={cn(
                                'text-caption',
                                isOvertime ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            )}>
                                {isOvertime ? <><AlertTriangle className="inline w-2.5 h-2.5 mr-0.5" />OT</> : 'OK'}
                            </Badge>
                        )}
                    </td>
                </tr>
            ))}
        </>
    );
});

// ── Share bar ─────────────────────────────────────────────────────────────────

function ShareBar({ pct, color }: { pct: number; color: string }) {
    return (
        <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-caption text-muted-foreground w-8 text-right">{pct}%</span>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WorkHubTimesheet() {
    const qc = useQueryClient();
    const today = new Date();

    const [period, setPeriod] = useState<Period>('week');
    const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
    const [monthDate, setMonthDate] = useState(() => startOfMonth(today));
    const [customStart, setCustomStart] = useState(() => format(startOfMonth(today), 'yyyy-MM-dd'));
    const [customEnd, setCustomEnd] = useState(() => format(today, 'yyyy-MM-dd'));
    const [reportView, setReportView] = useState<ReportView>('daily');
    const [selectedWorkerUserId, setSelectedWorkerUserId] = useState<number | undefined>(undefined);

    const { data: workers = [] } = useQuery<WHWorker[]>({
        queryKey: ['wh-workers'],
        queryFn: workerService.list,
        staleTime: 2 * 60 * 1000,
    });

    // ── Params ────────────────────────────────────────────────────────────────
    const weekEnd = addDays(weekStart, 6);
    const weekParam = format(weekStart, "RRRR-'W'II");
    const monthParam = format(monthDate, 'yyyy-MM');
    const isViewingOwnSheet = selectedWorkerUserId === undefined;
    const isNextWeekDisabled = weekStart >= startOfWeek(today, { weekStartsOn: 1 });
    const isNextMonthDisabled = monthDate >= startOfMonth(today);
    const isCustomValid = !!(customStart && customEnd && customStart <= customEnd);

    const queryParams = useMemo(() => {
        if (period === 'week')   return { week: weekParam, worker_id: selectedWorkerUserId };
        if (period === 'month')  return { month: monthParam, worker_id: selectedWorkerUserId };
        if (period === 'custom' && isCustomValid)
            return { from: customStart, to: customEnd, worker_id: selectedWorkerUserId };
        return null;
    }, [period, weekParam, monthParam, customStart, customEnd, selectedWorkerUserId, isCustomValid]);

    const { data: timesheet, isLoading } = useQuery({
        queryKey: ['wh-timesheet', queryParams],
        queryFn: () => timesheetService.get(queryParams!),
        enabled: queryParams !== null,
    });

    const isCurrentOrPastWeek = weekStart <= startOfWeek(today, { weekStartsOn: 1 });
    const { data: signoffStatus } = useQuery({
        queryKey: ['wh-timesheet-signoff', weekParam],
        queryFn: () => timesheetService.signoffStatus(weekParam),
        enabled: period === 'week' && isViewingOwnSheet && isCurrentOrPastWeek,
    });

    const signoffMut = useMutation({
        mutationFn: () => timesheetService.signoff(weekParam),
        onSuccess: (data) => {
            if (data.already_signed) toast.info('This week is already signed off.');
            else toast.success(`Week ${weekParam} signed off — ${data.total_net_hours}h recorded.`);
            qc.invalidateQueries({ queryKey: ['wh-timesheet-signoff', weekParam] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Sign-off failed'),
    });

    const isSigned = signoffStatus?.signed ?? false;
    const ts = timesheet as TimesheetData | undefined;

    // ── Aggregated data ───────────────────────────────────────────────────────
    const allEntries = useMemo(
        () => (ts?.days ?? []).flatMap(d => d.entries.map(e => ({ ...e, date: d.date }))),
        [ts]
    );
    const dayByDate = useMemo<Record<string, TimesheetDay>>(() => {
        const map: Record<string, TimesheetDay> = {};
        (ts?.days ?? []).forEach(d => { map[d.date] = d; });
        return map;
    }, [ts?.days]);

    const taskRows = useMemo(() => {
        const map = new Map<number, { task_id: number; task_title: string; project_name: string; total_hours: number; daySet: Set<string>; total_break: number; }>();
        allEntries.forEach(e => {
            if (!map.has(e.task_id)) map.set(e.task_id, { task_id: e.task_id, task_title: e.task_title, project_name: e.project_name ?? '—', total_hours: 0, daySet: new Set(), total_break: 0 });
            const row = map.get(e.task_id)!;
            row.total_hours += e.net_hours;
            row.daySet.add(e.date);
            row.total_break += e.break_min;
        });
        return Array.from(map.values()).sort((a, b) => b.total_hours - a.total_hours);
    }, [allEntries]);

    const projectRows = useMemo(() => {
        const map = new Map<string, { project_name: string; total_hours: number; taskIds: Set<number>; entry_count: number; }>();
        allEntries.forEach(e => {
            const key = e.project_name ?? 'No Project';
            if (!map.has(key)) map.set(key, { project_name: key, total_hours: 0, taskIds: new Set(), entry_count: 0 });
            const row = map.get(key)!;
            row.total_hours += e.net_hours;
            row.taskIds.add(e.task_id);
            row.entry_count++;
        });
        return Array.from(map.values()).sort((a, b) => b.total_hours - a.total_hours);
    }, [allEntries]);

    const totalBreakHours = (ts?.days ?? []).reduce((s, d) => s + d.total_break_min / 60, 0);
    const daysWorked   = (ts?.days ?? []).filter(d => d.entries.length > 0).length;
    const overtimeDays = (ts?.days ?? []).filter(d => d.overtime_flag).length;

    const daysToRender = useMemo(() => {
        if (period === 'week')  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        if (period === 'month') return eachDayOfInterval({ start: monthDate, end: endOfMonth(monthDate) });
        if (period === 'custom' && isCustomValid)
            return eachDayOfInterval({ start: parseISO(customStart), end: parseISO(customEnd) }).slice(0, 90);
        return [];
    }, [period, weekStart, monthDate, customStart, customEnd, isCustomValid]);

    const handleDownload = () => {
        const workerId = String(ts?.worker_id ?? 0);
        const label = period === 'week' ? weekParam : period === 'month' ? monthParam : `${customStart}_${customEnd}`;
        toast.promise(
            printService.generate('timesheet', workerId, weekParam).then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `timesheet-${label}.pdf`; a.click();
                URL.revokeObjectURL(url);
            }),
            { loading: 'Generating PDF…', success: 'PDF ready', error: 'Failed to generate PDF' }
        );
    };

    // ── Date label ────────────────────────────────────────────────────────────
    const dateLabel = period === 'week'
        ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`
        : period === 'month'
            ? format(monthDate, 'MMMM yyyy')
            : '';

    const goBack  = () => { if (period === 'week') setWeekStart(subWeeks(weekStart, 1)); else if (period === 'month') setMonthDate(subMonths(monthDate, 1)); };
    const goFwd   = () => { if (period === 'week') setWeekStart(addWeeks(weekStart, 1)); else if (period === 'month') setMonthDate(addMonths(monthDate, 1)); };
    const goNow   = () => { if (period === 'week') setWeekStart(startOfWeek(today, { weekStartsOn: 1 })); else if (period === 'month') setMonthDate(startOfMonth(today)); };
    const isFwdDisabled = (period === 'week' && isNextWeekDisabled) || (period === 'month' && isNextMonthDisabled);

    // ── View labels ───────────────────────────────────────────────────────────
    const VIEW_TITLE: Record<ReportView, { icon: React.ElementType; label: string }> = {
        daily:   { icon: FileText,   label: 'Daily Breakdown' },
        task:    { icon: BarChart2,  label: 'Task Summary' },
        project: { icon: FolderOpen, label: 'Project Summary' },
    };
    const { icon: ViewIcon, label: viewLabel } = VIEW_TITLE[reportView];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col flex-1 bg-[#f4f8fd]">

            {/* ── Sticky control header ─────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-background shadow-sm border-b">

                {/* Worker selector */}
                {workers.length > 0 && (
                    <div className="px-3 pt-2.5 pb-2 border-b border-muted">
                        <Select
                            value={selectedWorkerUserId !== undefined ? String(selectedWorkerUserId) : '__self__'}
                            onValueChange={v => setSelectedWorkerUserId(v === '__self__' ? undefined : Number(v))}
                        >
                            <SelectTrigger className="h-8 text-caption font-medium border-[rgba(30,58,95,0.15)]">
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__self__">My Timesheet</SelectItem>
                                {workers.map(w => (
                                    <SelectItem key={w.id} value={String(w.user_id)}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="px-3 pt-2.5 pb-2 space-y-2">
                    {/* Period segmented control */}
                    <div className="grid grid-cols-3 gap-0.5 bg-muted rounded-lg p-0.5">
                        <SegBtn active={period === 'week'}   onClick={() => setPeriod('week')}>Week</SegBtn>
                        <SegBtn active={period === 'month'}  onClick={() => setPeriod('month')}>Month</SegBtn>
                        <SegBtn active={period === 'custom'} onClick={() => setPeriod('custom')}>Custom</SegBtn>
                    </div>

                    {/* View segmented control */}
                    <div className="grid grid-cols-3 gap-0.5 bg-muted rounded-lg p-0.5">
                        <SegBtn active={reportView === 'daily'}   icon={<FileText className="w-3 h-3" />}   onClick={() => setReportView('daily')}>Daily</SegBtn>
                        <SegBtn active={reportView === 'task'}    icon={<BarChart2 className="w-3 h-3" />}  onClick={() => setReportView('task')}>By Task</SegBtn>
                        <SegBtn active={reportView === 'project'} icon={<FolderOpen className="w-3 h-3" />} onClick={() => setReportView('project')}>By Project</SegBtn>
                    </div>

                    {/* Navigation row */}
                    {period !== 'custom' ? (
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={goBack}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="flex-1 text-center text-body font-semibold text-[#1e3a5f] truncate">{dateLabel}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={goFwd} disabled={isFwdDisabled}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-caption px-2 shrink-0" onClick={goNow}>
                                Now
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={handleDownload} disabled={!ts} title="Download PDF">
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                            {/* Sign-off */}
                            {period === 'week' && isViewingOwnSheet && isCurrentOrPastWeek && (
                                isSigned ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" title="Signed off" />
                                ) : (
                                    <Button
                                        size="sm"
                                        className="h-7 text-caption px-2 bg-[#f08a3c] hover:bg-[#e07530] gap-1 shrink-0"
                                        disabled={signoffMut.isPending || !ts}
                                        onClick={() => signoffMut.mutate()}
                                        title="Sign off this week (EuGH C-55/18)"
                                    >
                                        <PenLine className="h-3 w-3" /> Sign
                                    </Button>
                                )
                            )}
                        </div>
                    ) : (
                        /* Custom date range */
                        <div className="flex items-center gap-2">
                            <Input type="date" value={customStart} max={customEnd || format(today, 'yyyy-MM-dd')}
                                onChange={e => setCustomStart(e.target.value)} className="h-7 text-caption flex-1" />
                            <span className="text-caption text-muted-foreground shrink-0">–</span>
                            <Input type="date" value={customEnd} min={customStart} max={format(today, 'yyyy-MM-dd')}
                                onChange={e => setCustomEnd(e.target.value)} className="h-7 text-caption flex-1" />
                            <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={handleDownload} disabled={!ts}>
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Signed-off banner */}
                {period === 'week' && isSigned && signoffStatus?.signoff && (
                    <div className="mx-3 mb-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-caption text-green-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Signed off {format(new Date(signoffStatus.signoff.signed_at), 'MMM d, HH:mm')} · {signoffStatus.signoff.total_net_hours}h
                    </div>
                )}
            </div>

            {/* ── Stats cards ───────────────────────────────────────────── */}
            {isLoading ? (
                <div className="px-3 pt-3 grid grid-cols-2 gap-2.5">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
            ) : ts ? (
                <div className="px-3 pt-3 grid grid-cols-2 gap-2.5">
                    <StatCard label="Total Work"    val={`${(ts.total_net_hours ?? 0).toFixed(1)}h`} icon={Clock}        accent="#2a8fbd" />
                    <StatCard label="Total Break"   val={`${totalBreakHours.toFixed(1)}h`}            icon={Coffee}       accent="#8b5cf6" />
                    <StatCard label="Days Worked"   val={String(daysWorked)}                          icon={CalendarDays} accent="#059669" />
                    <StatCard label="Overtime Days" val={String(overtimeDays)}                        icon={TrendingUp}   accent="#d97706" warn />
                </div>
            ) : null}

            {/* ── Report table card ─────────────────────────────────────── */}
            <div className="px-3 pt-3 pb-28">
                <Card className="overflow-hidden border-0 shadow-sm">
                    <CardHeader className="px-4 py-3 bg-[#f8fafc] border-b">
                        <CardTitle className="flex items-center gap-2 text-body font-semibold text-[#1e3a5f]">
                            <ViewIcon className="h-4 w-4 text-[#2a8fbd]" />
                            {viewLabel}
                            {selectedWorkerUserId !== undefined && (
                                <span className="text-caption font-normal text-muted-foreground ml-1">
                                    — {workers.find(w => w.user_id === selectedWorkerUserId)?.name}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-4 space-y-2">
                                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : !ts ? (
                            <div className="p-8 text-center text-muted-foreground text-body">
                                {period === 'custom' && !isCustomValid ? 'Select a valid date range above.' : 'No data for this period.'}
                            </div>
                        ) : (
                            <>
                                {/* Daily view */}
                                {reportView === 'daily' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-body">
                                            <thead>
                                                <tr className="border-b bg-muted/30 text-muted-foreground">
                                                    <th className="text-left px-3 py-2 font-medium text-caption">Day</th>
                                                    <th className="text-left px-3 py-2 font-medium text-caption">Task</th>
                                                    <th className="text-right px-3 py-2 font-medium text-caption">Work</th>
                                                    <th className="text-right px-3 py-2 font-medium text-caption hidden sm:table-cell">Break</th>
                                                    <th className="px-3 py-2 font-medium text-caption hidden sm:table-cell">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {daysToRender.map(day => (
                                                    <TimesheetRow
                                                        key={format(day, 'yyyy-MM-dd')}
                                                        day={day}
                                                        tsDay={dayByDate[format(day, 'yyyy-MM-dd')]}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Task summary */}
                                {reportView === 'task' && (
                                    <div className="overflow-x-auto">
                                        {taskRows.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground">No task entries in this period.</div>
                                        ) : (
                                            <table className="w-full text-body">
                                                <thead>
                                                    <tr className="border-b bg-muted/30 text-muted-foreground">
                                                        <th className="text-left px-3 py-2 font-medium text-caption">Task</th>
                                                        <th className="text-left px-3 py-2 font-medium text-caption hidden md:table-cell">Project</th>
                                                        <th className="text-right px-3 py-2 font-medium text-caption">Hours</th>
                                                        <th className="text-right px-3 py-2 font-medium text-caption hidden sm:table-cell">Days</th>
                                                        <th className="text-right px-3 py-2 font-medium text-caption hidden sm:table-cell">Share</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {taskRows.map(row => {
                                                        const pct = ts.total_net_hours > 0
                                                            ? Math.round((row.total_hours / ts.total_net_hours) * 100) : 0;
                                                        return (
                                                            <tr key={row.task_id} className="border-b hover:bg-muted/30">
                                                                <td className="px-3 py-3 font-medium max-w-[180px] truncate">{row.task_title}</td>
                                                                <td className="px-3 py-3 text-caption text-muted-foreground hidden md:table-cell">{row.project_name}</td>
                                                                <td className="px-3 py-3 text-right font-semibold text-[#2a8fbd]">{row.total_hours.toFixed(2)}h</td>
                                                                <td className="px-3 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.daySet.size}</td>
                                                                <td className="px-3 py-3 hidden sm:table-cell"><ShareBar pct={pct} color="#2a8fbd" /></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t bg-[#f8fafc] font-semibold">
                                                        <td className="px-3 py-2 text-[#1e3a5f]">Total</td>
                                                        <td className="hidden md:table-cell" />
                                                        <td className="px-3 py-2 text-right text-[#1e3a5f]">{(ts.total_net_hours ?? 0).toFixed(2)}h</td>
                                                        <td className="hidden sm:table-cell" /><td className="hidden sm:table-cell" />
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        )}
                                    </div>
                                )}

                                {/* Project summary */}
                                {reportView === 'project' && (
                                    <div className="overflow-x-auto">
                                        {projectRows.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground">No entries in this period.</div>
                                        ) : (
                                            <table className="w-full text-body">
                                                <thead>
                                                    <tr className="border-b bg-muted/30 text-muted-foreground">
                                                        <th className="text-left px-3 py-2 font-medium text-caption">Project</th>
                                                        <th className="text-right px-3 py-2 font-medium text-caption">Hours</th>
                                                        <th className="text-right px-3 py-2 font-medium text-caption hidden sm:table-cell">Tasks</th>
                                                        <th className="text-right px-3 py-2 font-medium text-caption hidden sm:table-cell">Entries</th>
                                                        <th className="text-right px-3 py-2 font-medium text-caption hidden sm:table-cell">Share</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {projectRows.map(row => {
                                                        const pct = ts.total_net_hours > 0
                                                            ? Math.round((row.total_hours / ts.total_net_hours) * 100) : 0;
                                                        return (
                                                            <tr key={row.project_name} className="border-b hover:bg-muted/30">
                                                                <td className="px-3 py-3 font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <FolderOpen className="w-3.5 h-3.5 text-[#2a8fbd] shrink-0" />
                                                                        <span className="truncate max-w-[140px]">{row.project_name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3 text-right font-semibold text-[#2a8fbd]">{row.total_hours.toFixed(2)}h</td>
                                                                <td className="px-3 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.taskIds.size}</td>
                                                                <td className="px-3 py-3 text-right text-muted-foreground hidden sm:table-cell">{row.entry_count}</td>
                                                                <td className="px-3 py-3 hidden sm:table-cell"><ShareBar pct={pct} color="#f08a3c" /></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t bg-[#f8fafc] font-semibold">
                                                        <td className="px-3 py-2 text-[#1e3a5f]">Total</td>
                                                        <td className="px-3 py-2 text-right text-[#1e3a5f]">{(ts.total_net_hours ?? 0).toFixed(2)}h</td>
                                                        <td className="hidden sm:table-cell" /><td className="hidden sm:table-cell" /><td className="hidden sm:table-cell" />
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* §16 ArbZG notice */}
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-caption text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>§16 ArbZG: max 8h/day · 30min break after 6h · 45min after 9h. ⚠ flags indicate overtime.</span>
                </div>
            </div>
        </div>
    );
}
