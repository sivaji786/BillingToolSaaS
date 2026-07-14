import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useWorkhubTimerGuardian } from '../../hooks/useWorkhubTimerGuardian';
import { useWorkhubTimerStore } from '../../stores/workhubTimerStore';

vi.mock('../../services/workhubApi', () => ({
    timerService: {
        start: vi.fn().mockResolvedValue({ ok: true }),
        pause: vi.fn().mockResolvedValue({ ok: true }),
        stop: vi.fn().mockResolvedValue({ ok: true }),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        warning: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
    },
}));

function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useWorkhubTimerGuardian', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T08:00:00Z'));
        vi.clearAllMocks();
        useWorkhubTimerStore.getState().stop(); // reset to idle
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('reminds every 30 min once the task target time is reached, then auto-stops capped at the target', async () => {
        const { timerService } = await import('../../services/workhubApi');
        const { toast } = await import('sonner');

        // Task target = 1h, nothing logged yet before this session.
        useWorkhubTimerStore.getState().start(42, 'Fix the pump', 1, 0);
        renderHook(() => useWorkhubTimerGuardian(), { wrapper });

        // Before the target: no reminder yet.
        await act(async () => { vi.advanceTimersByTime(59 * 60 * 1000); });
        expect(toast.warning).not.toHaveBeenCalled();

        // Cross the 1h target: first reminder fires.
        await act(async () => { vi.advanceTimersByTime(2 * 60 * 1000); });
        expect(toast.warning).toHaveBeenCalledTimes(1);
        expect(vi.mocked(toast.warning).mock.calls[0][0]).toMatch(/Reminder 1\/10/);

        // Advance through the remaining 9 reminders (30 min apart). This window also crosses
        // the unrelated §16 ArbZG "6h approaching" warning threshold, so filter to just the
        // target-time reminders when counting.
        await act(async () => { vi.advanceTimersByTime(9 * 30 * 60 * 1000); });

        const targetReminders = (toast.warning as any).mock.calls.filter((c: any[]) => /target time/.test(c[0]));
        expect(targetReminders).toHaveLength(10);
        expect(timerService.stop).toHaveBeenCalledTimes(1);
        // Capped at exactly the 1h target (3600s), not the actual overrun elapsed time.
        expect(timerService.stop).toHaveBeenCalledWith(42, 3600);
        expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/auto-stopped/));

        // Auto-stop resolves the store back to idle.
        await act(async () => { await Promise.resolve(); });
        expect(useWorkhubTimerStore.getState().state).toBe('idle');
    });

    it('does not remind or auto-stop when the task has no target/estimate', async () => {
        const { toast } = await import('sonner');

        useWorkhubTimerStore.getState().start(7, 'No estimate task', null, 0);
        renderHook(() => useWorkhubTimerGuardian(), { wrapper });

        await act(async () => { vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1000); }); // past even the ArbZG 6h limit boundary check window

        // Only the (unrelated) ArbZG break-required auto-pause may fire here — target-time
        // reminders specifically must never fire without an estimate.
        const targetReminderCalls = (toast.warning as any).mock.calls.filter((c: any[]) => /target time/.test(c[0]));
        expect(targetReminderCalls).toHaveLength(0);
    });

    it('reminds every 30 min once a break exceeds 60 min, then auto-resumes', async () => {
        const { timerService } = await import('../../services/workhubApi');
        const { toast } = await import('sonner');

        useWorkhubTimerStore.getState().start(9, 'Some task', null, 0);
        useWorkhubTimerStore.getState().pause();
        renderHook(() => useWorkhubTimerGuardian(), { wrapper });

        // Before 60 min: no break reminder.
        await act(async () => { vi.advanceTimersByTime(59 * 60 * 1000); });
        expect(toast.warning).not.toHaveBeenCalled();

        // Cross 60 min: first reminder.
        await act(async () => { vi.advanceTimersByTime(2 * 60 * 1000); });
        expect(toast.warning).toHaveBeenCalledTimes(1);
        expect(vi.mocked(toast.warning).mock.calls[0][0]).toMatch(/Reminder 1\/10/);

        // Remaining 9 reminders, 30 min apart -> auto-resume.
        await act(async () => { vi.advanceTimersByTime(9 * 30 * 60 * 1000); });

        expect(toast.warning).toHaveBeenCalledTimes(10);
        expect(timerService.start).toHaveBeenCalledWith(9);
        expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/resumed/));

        await act(async () => { await Promise.resolve(); });
        expect(useWorkhubTimerStore.getState().state).toBe('running');
    });
});
