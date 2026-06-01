import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Coffee, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { useWorkhubTimerStore, formatHMS } from '../../../stores/workhubTimerStore';
import { timerService } from '../../../services/workhubApi';
import { toast } from 'sonner';

// §16 ArbZG: warn at 6h without break
const WARN_MINUTES = 360;

interface Props {
    onViewTask?: (id: number) => void;
}

export function TimerWidget({ onViewTask }: Props) {
    const timer = useWorkhubTimerStore();
    const qc = useQueryClient();
    const [elapsed, setElapsed] = useState(0);
    const [breakElapsed, setBreakElapsed] = useState(0);

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

    // §16 ArbZG toast at exactly 6h
    useEffect(() => {
        if (timer.state === 'running' && elapsed === WARN_MINUTES * 60) {
            toast.warning('§16 ArbZG: You have worked 6 hours without a break. A 30-minute break is required.');
        }
    }, [elapsed, timer.state]);

    const pauseMut = useMutation({
        mutationFn: () => timerService.pause(timer.activeTaskId!),
        onSuccess: (data) => {
            timer.pause();
            qc.invalidateQueries({ queryKey: ['wh-tasks'] });
            const w = data?.arbzg_warning;
            if (w) toast.warning(w);
            else toast.success('Break started');
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to pause'),
    });

    const resumeMut = useMutation({
        mutationFn: () => timerService.start(timer.activeTaskId!),
        onSuccess: () => {
            timer.resume();
            toast.success('Resumed');
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to resume'),
    });

    const stopMut = useMutation({
        mutationFn: () => timerService.stop(timer.activeTaskId!),
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
    });

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
    const overBreakLimit = timer.state === 'running' && workedMinutes >= WARN_MINUTES;

    return (
        <Card className={overBreakLimit ? 'border-red-400' : nearBreakLimit ? 'border-amber-400' : ''}>
            <CardContent className="p-4 space-y-3">
                {/* Task name */}
                <div className="flex items-center justify-between gap-2">
                    <button
                        className="text-body font-semibold text-left truncate hover:underline"
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
                    <span className="text-4xl font-mono font-bold tracking-wider">
                        {formatHMS(timer.state === 'break' ? breakElapsed : elapsed)}
                    </span>
                    {timer.state === 'break' && (
                        <p className="text-caption text-muted-foreground mt-1">
                            Break · Work: {formatHMS(elapsed)}
                        </p>
                    )}
                </div>

                {/* ArbZG warning */}
                {(nearBreakLimit || overBreakLimit) && (
                    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-caption ${overBreakLimit ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {overBreakLimit
                            ? '§16 ArbZG: 6 hours reached — break required now.'
                            : `§16 ArbZG: Break required in ${WARN_MINUTES - workedMinutes} min.`}
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-2">
                    {timer.state === 'running' ? (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1 gap-1"
                                onClick={() => pauseMut.mutate()}
                                disabled={pauseMut.isPending}
                            >
                                <Coffee className="w-4 h-4" /> Break
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 gap-1"
                                onClick={() => stopMut.mutate()}
                                disabled={stopMut.isPending}
                            >
                                <Square className="w-4 h-4" /> Stop
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                                onClick={() => resumeMut.mutate()}
                                disabled={resumeMut.isPending}
                            >
                                <Play className="w-4 h-4" /> Resume
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1 gap-1"
                                onClick={() => stopMut.mutate()}
                                disabled={stopMut.isPending}
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
