import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimerState = 'idle' | 'running' | 'break';

interface WorkhubTimerStore {
    state: TimerState;
    activeTaskId: number | null;
    activeTaskTitle: string;
    startedAt: number | null;       // Date.now() when current period began
    accumulatedSeconds: number;     // seconds banked before current period
    breakStartedAt: number | null;  // Date.now() when break began
    accumulatedBreakSeconds: number;

    start: (taskId: number, title: string) => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    getElapsedSeconds: () => number;
    getBreakSeconds: () => number;
}

export const useWorkhubTimerStore = create<WorkhubTimerStore>()(
    persist(
        (set, get) => ({
            state: 'idle',
            activeTaskId: null,
            activeTaskTitle: '',
            startedAt: null,
            accumulatedSeconds: 0,
            breakStartedAt: null,
            accumulatedBreakSeconds: 0,

            start: (taskId, title) => set({
                state: 'running',
                activeTaskId: taskId,
                activeTaskTitle: title,
                startedAt: Date.now(),
                accumulatedSeconds: 0,
                breakStartedAt: null,
                accumulatedBreakSeconds: 0,
            }),

            pause: () => {
                const { startedAt, accumulatedSeconds } = get();
                const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
                set({
                    state: 'break',
                    startedAt: null,
                    accumulatedSeconds: accumulatedSeconds + elapsed,
                    breakStartedAt: Date.now(),
                });
            },

            resume: () => {
                const { breakStartedAt, accumulatedBreakSeconds } = get();
                const breakElapsed = breakStartedAt ? Math.floor((Date.now() - breakStartedAt) / 1000) : 0;
                set({
                    state: 'running',
                    startedAt: Date.now(),
                    breakStartedAt: null,
                    accumulatedBreakSeconds: accumulatedBreakSeconds + breakElapsed,
                });
            },

            stop: () => set({
                state: 'idle',
                activeTaskId: null,
                activeTaskTitle: '',
                startedAt: null,
                accumulatedSeconds: 0,
                breakStartedAt: null,
                accumulatedBreakSeconds: 0,
            }),

            getElapsedSeconds: () => {
                const { state, startedAt, accumulatedSeconds } = get();
                if (state === 'running' && startedAt) {
                    return accumulatedSeconds + Math.floor((Date.now() - startedAt) / 1000);
                }
                return accumulatedSeconds;
            },

            getBreakSeconds: () => {
                const { state, breakStartedAt, accumulatedBreakSeconds } = get();
                if (state === 'break' && breakStartedAt) {
                    return accumulatedBreakSeconds + Math.floor((Date.now() - breakStartedAt) / 1000);
                }
                return accumulatedBreakSeconds;
            },
        }),
        {
            name: 'wh-timer',
            partialize: (s) => ({
                state: s.state,
                activeTaskId: s.activeTaskId,
                activeTaskTitle: s.activeTaskTitle,
                startedAt: s.startedAt,
                accumulatedSeconds: s.accumulatedSeconds,
                breakStartedAt: s.breakStartedAt,
                accumulatedBreakSeconds: s.accumulatedBreakSeconds,
            }),
        }
    )
);

export function formatHMS(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
