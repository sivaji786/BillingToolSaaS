import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the timer store
const mockTimerStore = {
    isRunning: false,
    isOnBreak: false,
    activeTaskId: null as number | null,
    startedAt: null as string | null,
    elapsedSeconds: 0,
    startTimer: vi.fn(),
    pauseTimer: vi.fn(),
    stopTimer: vi.fn(),
};

vi.mock('../../stores/workhubTimerStore', () => ({
    useWorkhubTimerStore: () => mockTimerStore,
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
        mockTimerStore.isRunning  = false;
        mockTimerStore.isOnBreak  = false;
        mockTimerStore.activeTaskId = null;
        mockTimerStore.elapsedSeconds = 0;
    });

    it('shows Idle state with Start button when not running', async () => {
        const TimerWidget = await loadTimerWidget();
        wrap(<TimerWidget onViewTask={vi.fn()} />);
        expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    });

    it('shows elapsed time and Pause/Stop when running', async () => {
        mockTimerStore.isRunning   = true;
        mockTimerStore.activeTaskId = 42;
        mockTimerStore.elapsedSeconds = 3661; // 1h 1m 1s

        const TimerWidget = await loadTimerWidget();
        wrap(<TimerWidget onViewTask={vi.fn()} />);

        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
        // Should show formatted time
        expect(screen.getByText(/01:01/)).toBeInTheDocument();
    });

    it('shows Break state with Resume button when on break', async () => {
        mockTimerStore.isRunning   = false;
        mockTimerStore.isOnBreak   = true;
        mockTimerStore.activeTaskId = 42;

        const TimerWidget = await loadTimerWidget();
        wrap(<TimerWidget onViewTask={vi.fn()} />);
        expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });

    it('calls startTimer when Start is clicked', async () => {
        const TimerWidget = await loadTimerWidget();
        wrap(<TimerWidget onViewTask={vi.fn()} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /start/i }));
        });
        // startTimer is called via the component
        expect(mockTimerStore.startTimer).toHaveBeenCalled();
    });
});
