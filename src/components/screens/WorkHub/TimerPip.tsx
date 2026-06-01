import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Square, ExternalLink } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkhubTimerStore, formatHMS } from '../../../stores/workhubTimerStore';
import { timerService } from '../../../services/workhubApi';
import { toast } from 'sonner';

interface Props {
    onViewTask?: (id: number) => void;
}

export function TimerPip({ onViewTask }: Props) {
    const timer = useWorkhubTimerStore();
    const qc = useQueryClient();
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (timer.state === 'idle') return;
        const id = setInterval(() => setElapsed(timer.getElapsedSeconds()), 1000);
        return () => clearInterval(id);
    }, [timer.state]);

    const stopMut = useMutation({
        mutationFn: () => timerService.stop(timer.activeTaskId!),
        onSuccess: () => {
            const taskId = timer.activeTaskId;
            timer.stop();
            qc.invalidateQueries({ queryKey: ['wh-tasks'] });
            if (taskId) qc.invalidateQueries({ queryKey: ['wh-task', taskId] });
            toast.success('Timer stopped');
        },
        onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to stop'),
    });

    if (timer.state === 'idle') return null;

    const pip = (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 bg-background border shadow-lg rounded-full px-3 py-2 text-body font-medium">
            <span
                className={`w-2 h-2 rounded-full shrink-0 ${timer.state === 'running' ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}
            />
            <button
                className="font-mono hover:underline"
                onClick={() => timer.activeTaskId && onViewTask?.(timer.activeTaskId)}
            >
                {formatHMS(elapsed)}
            </button>
            <button
                className="text-muted-foreground hover:text-foreground"
                title="Open task"
                onClick={() => timer.activeTaskId && onViewTask?.(timer.activeTaskId)}
            >
                <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
                className="text-destructive hover:text-destructive/80"
                title="Stop timer"
                onClick={() => stopMut.mutate()}
                disabled={stopMut.isPending}
            >
                <Square className="w-3.5 h-3.5" />
            </button>
        </div>
    );

    return createPortal(pip, document.body);
}
