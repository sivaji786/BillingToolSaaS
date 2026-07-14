import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Coffee, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { useWorkhubTimerStore, formatHMS } from '../../../stores/workhubTimerStore';
import { timerService } from '../../../services/workhubApi';
import {
    ARBZG_LIMIT_SECONDS,
    ARBZG_WARN_MINUTES as WARN_MINUTES,
    BREAK_FORGOTTEN_THRESHOLD_SECONDS,
    MAX_REMINDERS,
} from '../../../hooks/useWorkhubTimerGuardian';
import { toast } from 'sonner';

const MIN_BREAK_SECONDS = 30 * 60; // 30 minutes

interface Props {
    onViewTask?: (id: number) => void;
}

export function TimerWidget({ onViewTask }: Props) {
    const timer = useWorkhubTimerStore();
    const qc = useQueryClient();
    const [elapsed, setElapsed] = useState(0);
    const [breakElapsed, setBreakElapsed] = useState(0);

    // --- Change 3: debounce flag for all timer API calls ---
    const isRequestInFlight = useRef(false);

    // Tick every second
    useEffect(() => {
        if (timer.state === 'idle') return;
        const id = setInterval(() => {
            setElapsed(timer.getElapsedSeconds());
            setBreakElapsed(timer.getBreakSeconds());
        }, 1000);
        return () => clearInterval(id);
    }, [timer.state]);

    useEffect(() => {
        setElapsed(timer.getElapsedSeconds());
        setBreakElapsed(timer.getBreakSeconds());
    }, [timer.state]);

    // --- Change 2: on mount, sync timer with server if needsServerSync is set ---
    useEffect(() => {
        const { needsServerSync, activeTaskId, markSynced, state } = useWorkhubTimerStore.getState();
        if (needsServerSync && activeTaskId && state !== 'idle') {
            timerService.start(activeTaskId)
                .then(() => {
                    markSynced();
                })
                .catch(() => {
                    toast.warning('Could not sync timer with server. Local timer continues.');
                });
        }
    }, []); // intentionally runs only on mount

    // Auto-pause (§16 ArbZG), the target-time/break-forgotten reminder ladders, and their
    // auto-stop/auto-resume fallback actions all run once in useWorkhubTimerGuardian,
    // mounted at the WorkHub layout root — so they keep firing regardless of which timer
    // UI (this widget, the floating pip, or neither) happens to be on screen. This
    // component only derives what to *display*.

    const pauseMut = useMutation({
        mutationFn: () => {
            isRequestInFlight.current = true;
            return timerService.pause(timer.activeTaskId!);
        },
        onSuccess: (data) => {
            timer.pause();
            qc.invalidateQueries({ queryKey: ['wh-tasks'] });
            const w = data?.arbzg_warning;
            if (w) toast.warning(w);
            else toast.success('Break started');
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to pause'),
        onSettled: () => { isRequestInFlight.current = false; },
    });

    const resumeMut = useMutation({
        mutationFn: () => {
            // --- Change 1: enforce minimum 30-minute break before allowing resume ---
            const currentBreakSeconds = useWorkhubTimerStore.getState().getBreakSeconds();
            if (currentBreakSeconds < MIN_BREAK_SECONDS) {
                const remaining = Math.ceil((MIN_BREAK_SECONDS - currentBreakSeconds) / 60);
                throw new Error(`MIN_BREAK:${remaining}`);
            }
            isRequestInFlight.current = true;
            return timerService.start(timer.activeTaskId!);
        },
        onSuccess: () => {
            timer.resume();
            toast.success('Resumed');
        },
        onError: (e: any) => {
            const msg: string = e?.message ?? '';
            if (msg.startsWith('MIN_BREAK:')) {
                const remaining = msg.split(':')[1];
                toast.error(`Minimum 30-minute break required (§16 ArbZG). ${remaining} minutes remaining.`);
            } else {
                toast.error(e.response?.data?.message ?? 'Failed to resume');
            }
        },
        onSettled: () => { isRequestInFlight.current = false; },
    });

    const stopMut = useMutation({
        mutationFn: () => {
            isRequestInFlight.current = true;
            return timerService.stop(timer.activeTaskId!);
        },
        onSuccess: (data) => {
            const taskId = timer.activeTaskId;
            timer.stop();
            setElapsed(0);
            setBreakElapsed(0);
            qc.invalidateQueries({ queryKey: ['wh-tasks'] });
            if (taskId) qc.invalidateQueries({ queryKey: ['wh-task', taskId] });
            const status = data?.arbzg_status;
            if (status && !status.compliant) {
                toast.warning(`§16 ArbZG: ${status.message}`);
            } else {
                toast.success('Timer stopped');
            }
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to stop'),
        onSettled: () => { isRequestInFlight.current = false; },
    });

    // Derived: are any mutations pending (used for button disabled state alongside isRequestInFlight)
    const anyPending = pauseMut.isPending || resumeMut.isPending || stopMut.isPending;

    if (timer.state === 'idle') {
        return (
            <Card className="border-dashed">
                <CardContent className="p-6 flex flex-col items-center gap-3 text-muted-foreground">
                    <Clock className="w-8 h-8" />
                    <p className="text-body">No timer running.</p>
                    <p className="text-caption text-center">Open a task and press "Start Timer" to begin tracking time.</p>
                </CardContent>
            </Card>
        );
    }

    const workedMinutes = Math.floor(elapsed / 60);
    const nearBreakLimit = timer.state === 'running' && workedMinutes >= WARN_MINUTES - 30 && workedMinutes < WARN_MINUTES;
    const overBreakLimit = timer.state === 'running' && elapsed >= ARBZG_LIMIT_SECONDS;

    // How many minutes of the current break have elapsed (used in mandatory break notice)
    const breakMinutesElapsed = Math.floor(breakElapsed / 60);
    const breakMinutesRemaining = Math.max(0, Math.ceil((MIN_BREAK_SECONDS - breakElapsed) / 60));
    const breakSufficient = breakElapsed >= MIN_BREAK_SECONDS;

    // Target-time overrun (only when the task has an estimate) — mirrors useWorkhubTimerGuardian.
    const targetSeconds = timer.activeTaskEstHours != null
        ? Math.max(0, (timer.activeTaskEstHours - timer.activeTaskLoggedBaselineHours) * 3600)
        : null;
    const targetOverrunSeconds = targetSeconds != null ? elapsed - targetSeconds : -1;
    const targetReached = timer.state === 'running' && targetSeconds != null && targetOverrunSeconds >= 0;
    const targetReminderNumber = targetReached
        ? Math.min(MAX_REMINDERS, Math.floor(targetOverrunSeconds / (30 * 60)) + 1)
        : 0;

    // Break-forgotten overrun — mirrors useWorkhubTimerGuardian.
    const breakOverrunSeconds = breakElapsed - BREAK_FORGOTTEN_THRESHOLD_SECONDS;
    const breakForgotten = timer.state === 'break' && breakOverrunSeconds >= 0;
    const breakReminderNumber = breakForgotten
        ? Math.min(MAX_REMINDERS, Math.floor(breakOverrunSeconds / (30 * 60)) + 1)
        : 0;

    return (
        <Card className={overBreakLimit ? 'border-red-400' : nearBreakLimit ? 'border-amber-400' : ''}>
            <CardContent className="p-4 space-y-3">
                {/* Task name */}
                <div className="flex items-center justify-between gap-2">
                    <button
                        className="text-body font-medium text-left truncate hover:underline"
                        onClick={() => timer.activeTaskId && onViewTask?.(timer.activeTaskId)}
                    >
                        {timer.activeTaskTitle}
                    </button>
                    <Badge
                        className={
                            timer.state === 'running' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }
                    >
                        {timer.state === 'running' ? 'Running' : 'Break'}
                    </Badge>
                </div>

                {/* Elapsed */}
                <div className="text-center">
                    <span className="text-4xl font-mono font-medium tracking-wider">
                        {formatHMS(timer.state === 'break' ? breakElapsed : elapsed)}
                    </span>
                    {timer.state === 'break' && (
                        <p className="text-caption text-muted-foreground mt-1">
                            Break · Work: {formatHMS(elapsed)}
                        </p>
                    )}
                </div>

                {/* ArbZG warning banner (while still running and approaching/at limit) */}
                {(nearBreakLimit || overBreakLimit) && timer.state === 'running' && (
                    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-caption ${overBreakLimit ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {overBreakLimit
                            ? '§16 ArbZG: 6 hours reached — break required now.'
                            : `§16 ArbZG: Break required in ${WARN_MINUTES - workedMinutes} min.`}
                    </div>
                )}

                {/* Target-time reached banner — task's estimated hours exceeded */}
                {targetReached && (
                    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-caption bg-red-50 text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {timer.activeTaskEstHours}h target reached — please stop the timer.
                        {' '}({targetReminderNumber}/{MAX_REMINDERS} reminders
                        {targetReminderNumber >= MAX_REMINDERS ? ' — auto-stopping' : ''})
                    </div>
                )}

                {/* Break-forgotten banner — break running well past the required minimum */}
                {breakForgotten && (
                    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-caption bg-red-50 text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Still on break? Over 60 min elapsed.
                        {' '}({breakReminderNumber}/{MAX_REMINDERS} reminders
                        {breakReminderNumber >= MAX_REMINDERS ? ' — auto-resuming' : ''})
                    </div>
                )}

                {/* --- Change 1: Mandatory break notice shown when timer is in break state --- */}
                {timer.state === 'break' && (
                    <div className={`rounded-md px-3 py-2 text-caption space-y-1 ${breakSufficient ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {breakSufficient
                                ? 'Minimum break completed. You may resume.'
                                : `Mandatory break in progress — ${breakMinutesRemaining} min remaining (§16 ArbZG).`}
                        </div>
                        <p className="text-xs opacity-75">Break so far: {breakMinutesElapsed} min · Required: 30 min</p>
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-2">
                    {timer.state === 'running' ? (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1 gap-1"
                                onClick={() => !anyPending && !isRequestInFlight.current && pauseMut.mutate()}
                                disabled={anyPending || pauseMut.isPending}
                            >
                                <Coffee className="w-4 h-4" /> Break
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 gap-1"
                                onClick={() => !anyPending && !isRequestInFlight.current && stopMut.mutate()}
                                disabled={anyPending || stopMut.isPending}
                            >
                                <Square className="w-4 h-4" /> Stop
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                                onClick={() => !anyPending && !isRequestInFlight.current && resumeMut.mutate()}
                                disabled={anyPending || resumeMut.isPending}
                            >
                                <Play className="w-4 h-4" /> End Break
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 gap-1"
                                onClick={() => !anyPending && !isRequestInFlight.current && stopMut.mutate()}
                                disabled={anyPending || stopMut.isPending}
                            >
                                <Square className="w-4 h-4" /> Stop
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
