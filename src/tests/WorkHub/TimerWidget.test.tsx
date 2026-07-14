import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockTimerStore = {
    state: 'idle' as 'idle' | 'running' | 'break',
    activeTaskId: null as number | null,
    activeTaskTitle: '',
    needsServerSync: false,
    accumulatedSeconds: 0,
    startedAt: null as number | null,
    breakStartedAt: null as number | null,
    accumulatedBreakSeconds: 0,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    markSynced: vi.fn(),
    getElapsedSeconds: vi.fn(() => 0),
    getBreakSeconds: vi.fn(() => 0),
};

vi.mock('../../stores/workhubTimerStore', () => ({
    useWorkhubTimerStore: Object.assign(() => mockTimerStore, {
        getState: () => mockTimerStore,
    }),
    formatHMS: (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
    },
}));

vi.mock('../../services/workhubApi', () => ({
    timerService: {
        start: vi.fn().mockResolvedValue({ ok: true }),
        pause: vi.fn().mockResolvedValue({ ok: true }),
        stop:  vi.fn().mockResolvedValue({ ok: true }),
    },
    taskService: {
        list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    },
}));

const mkQC = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

async function loadTimerWidget() {
    const mod = await import('../../components/screens/WorkHub/TimerWidget');
    return mod.TimerWidget;
}

function wrap(ui: React.ReactElement) {
    return render(<QueryClientProvider client={mkQC()}>{ui}</QueryClientProvider>);
}

describe('TimerWidget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTimerStore.state = 'idle';
        mockTimerStore.activeTaskId = null;
        mockTimerStore.activeTaskTitle = '';
        mockTimerStore.needsServerSync = false;
        mockTimerStore.getElapsedSeconds = vi.fn(() => 0);
        mockTimerStore.getBreakSeconds = vi.fn(() => 0);
    });

    it('shows idle state with "No timer running" when not active', async () => {
        const TimerWidget = await loadTimerWidget();
        wrap(<TimerWidget onViewTask={vi.fn()} />);
        expect(screen.getByText(/no timer running/i)).toBeInTheDocument();
    });

    it('shows Break and Stop buttons when running', async () => {
        mockTimerStore.state = 'running';
        mockTimerStore.activeTaskId = 42;
        mockTimerStore.activeTaskTitle = 'Fix the pump';
        mockTimerStore.getElapsedSeconds = vi.fn(() => 3661); // 1h 1m 1s

        const TimerWidget = await loadTimerWidget();
        wrap(<TimerWidget onViewTask={vi.fn()} />);

        expect(screen.getByRole('button', { name: /break/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
        expect(screen.getByText(/running/i)).toBeInTheDocument();
        expect(screen.getByText(/01:01/)).toBeInTheDocument();
    });

    it('shows End Break and Stop buttons when on break', async () => {
        mockTimerStore.state = 'break';
        mockTimerStore.activeTaskId = 42;
        mockTimerStore.activeTaskTitle = 'Fix the pump';
        mockTimerStore.getElapsedSeconds = vi.fn(() => 1800);
        mockTimerStore.getBreakSeconds = vi.fn(() => 600);

        const TimerWidget = await loadTimerWidget();
        wrap(<TimerWidget onViewTask={vi.fn()} />);

        expect(screen.getByRole('button', { name: /end break/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    it('calls timerService.pause when Break is clicked while running', async () => {
        mockTimerStore.state = 'running';
        mockTimerStore.activeTaskId = 42;
        mockTimerStore.activeTaskTitle = 'Fix the pump';

        const TimerWidget = await loadTimerWidget();
        const { timerService } = await import('../../services/workhubApi');
        wrap(<TimerWidget onViewTask={vi.fn()} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /break/i }));
        });

        await waitFor(() => {
            expect(timerService.pause).toHaveBeenCalledWith(42);
        });
    });
});
