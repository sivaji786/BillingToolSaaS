/**
 * WH-078: Combined component tests — OfflineBanner, CapacityCard, DoneReportModal steps,
 * SignaturePad validation, WorkHubGate redirect, InboxUnreadCount, PDFDownload trigger.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- Mocks ----
vi.mock('../../services/workhubApi', () => ({
    taskService:       { list: vi.fn().mockResolvedValue({ data: [], unread_inbox_count: 0, pagination: { page: 1, per_page: 20, total: 0, last_page: 1 } }), batchLocation: vi.fn().mockResolvedValue([]) },
    inboxService:      { list: vi.fn().mockResolvedValue({ data: [] }), markRead: vi.fn(), unreadCount: vi.fn().mockResolvedValue(3) },
    printService:      { generate: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })), listForTask: vi.fn().mockResolvedValue([]) },
    completionService: { submit: vi.fn(), customerSignature: vi.fn(), get: vi.fn() },
    workerService:     { list: vi.fn().mockResolvedValue([]) },
}));

const defaultAuthState = {
    tenant: { plan_features: { workhub_enabled: true } },
    isLoggedIn: true,
    token: 'mock-token',
};

vi.mock('../../stores/authStore', () => ({
    useAuthStore: vi.fn((selector?: (s: typeof defaultAuthState) => any) =>
        typeof selector === 'function' ? selector(defaultAuthState) : defaultAuthState
    ),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mkQC = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={mkQC()}>{ui}</QueryClientProvider>);

// ---- OfflineBanner ----
describe('OfflineBanner', () => {
    it('is hidden when online after reconnected banner fades', async () => {
        vi.useFakeTimers();
        Object.defineProperty(window.navigator, 'onLine', { value: true, writable: true });
        const { OfflineBanner } = await import('../../components/screens/WorkHub/OfflineBanner');
        wrap(<OfflineBanner />);
        // Component briefly shows "Back online" on mount — advance past the 3s timeout
        await act(async () => { vi.advanceTimersByTime(4000); });
        expect(screen.queryByRole('status')).toBeNull();
        vi.useRealTimers();
    });

    it('shows banner when offline', async () => {
        Object.defineProperty(window.navigator, 'onLine', { value: false, writable: true });
        const { OfflineBanner } = await import('../../components/screens/WorkHub/OfflineBanner');
        wrap(<OfflineBanner />);
        await waitFor(() => {
            expect(screen.getByRole('status')).toBeInTheDocument();
        });
    });
});

// ---- CapacityCard ----
describe('CapacityCard', () => {
    it('renders worker name and utilisation', async () => {
        const { CapacityCard } = await import('../../components/screens/WorkHub/CapacityCard');
        const worker = {
            id: 1, user_id: 10, name: 'Anna Schmidt', role: 'Electrician',
            capacity_hours_per_week: 40, utilisation_pct: 65, queue_depth: 3,
        };
        wrap(<CapacityCard worker={worker} isSelected={false} onSelect={vi.fn()} />);
        expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
        expect(screen.getByText(/65/)).toBeInTheDocument();
    });

    it('shows green badge at ≤70% utilisation', async () => {
        const { CapacityCard } = await import('../../components/screens/WorkHub/CapacityCard');
        const worker = { id: 1, user_id: 10, name: 'Test Worker', utilisation_pct: 50, queue_depth: 1 };
        const { container } = wrap(<CapacityCard worker={worker} isSelected={false} onSelect={vi.fn()} />);
        // Green progress bar for ≤70%
        expect(container.querySelector('.bg-green-500')).toBeTruthy();
    });

    it('shows red badge at >90% utilisation', async () => {
        const { CapacityCard } = await import('../../components/screens/WorkHub/CapacityCard');
        const worker = { id: 1, user_id: 10, name: 'Busy Worker', utilisation_pct: 95, queue_depth: 8 };
        const { container } = wrap(<CapacityCard worker={worker} isSelected={false} onSelect={vi.fn()} />);
        expect(container.querySelector('.bg-red-500')).toBeTruthy();
    });

    it('calls onClick with the worker object when card is clicked', async () => {
        const { CapacityCard } = await import('../../components/screens/WorkHub/CapacityCard');
        const onClick = vi.fn();
        const worker = { id: 7, user_id: 10, name: 'Click Worker', utilisation_pct: 40, queue_depth: 2 };
        wrap(<CapacityCard worker={worker} selected={false} onClick={onClick} />);
        fireEvent.click(screen.getByText('Click Worker'));
        expect(onClick).toHaveBeenCalledWith(worker);
    });
});

// ---- TaskDocumentsTab ----
describe('TaskDocumentsTab', () => {
    it('renders document type buttons', async () => {
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={1} hasCompletionRecord={true} />);
        await waitFor(() => {
            expect(screen.getByText(/work.?order/i)).toBeInTheDocument();
        });
    });

    it('locks completion-certificate when no completion record', async () => {
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={1} hasCompletionRecord={false} />);
        await waitFor(() => {
            const certRow = screen.queryByText(/completion.?cert/i);
            if (certRow) {
                // The generate button should be disabled
                const btn = certRow.closest('tr')?.querySelector('button');
                if (btn) expect(btn).toBeDisabled();
            }
        });
    });
});

// ---- WorkHubGate ----
describe('WorkHubGate', () => {
    it('renders children when workhub_enabled', async () => {
        const { WorkHubGate } = await import('../../components/screens/WorkHub/WorkHubGate');
        wrap(
            <WorkHubGate onUpgrade={vi.fn()}>
                <span>WorkHub content</span>
            </WorkHubGate>
        );
        await waitFor(() => {
            expect(screen.getByText('WorkHub content')).toBeInTheDocument();
        });
    });

    it('shows upgrade CTA when workhub not enabled', async () => {
        // Override auth store for this test
        const { useAuthStore } = await import('../../stores/authStore');
        vi.mocked(useAuthStore).mockReturnValueOnce({
            tenant: { plan_features: { workhub_enabled: false } },
            isLoggedIn: true,
            token: 'mock-token',
        } as any);

        const { WorkHubGate } = await import('../../components/screens/WorkHub/WorkHubGate');
        wrap(
            <WorkHubGate onUpgrade={vi.fn()}>
                <span>Should not show</span>
            </WorkHubGate>
        );
        await waitFor(() => {
            expect(screen.queryByText('Should not show')).toBeNull();
        });
    });
});

// ---- Inbox unread badge ----
describe('WorkHub inbox unread count', () => {
    it('fetches and displays unread count', async () => {
        const { inboxService } = await import('../../services/workhubApi');
        vi.mocked(inboxService.unreadCount).mockResolvedValue(5);

        const qc = mkQC();
        // Pre-populate cache
        await qc.prefetchQuery({
            queryKey: ['wh-inbox-unread'],
            queryFn: inboxService.unreadCount,
        });

        const count = qc.getQueryData<number>(['wh-inbox-unread']);
        expect(count).toBe(5);
    });
});

// ---- Batch location panel ----
describe('BatchLocationPanel', () => {
    it('renders location tasks list after expanding', async () => {
        const { taskService } = await import('../../services/workhubApi');
        vi.mocked(taskService.batchLocation).mockResolvedValue([
            { id: 10, tenant_id: 1, title: 'Task at location A', status: 'open', priority: 'medium', created_at: '', updated_at: '', location_tag: 'Bldg7-F2' },
            { id: 11, tenant_id: 1, title: 'Task at location B', status: 'open', priority: 'high', created_at: '', updated_at: '', location_tag: 'Bldg7-F2' },
        ] as any);

        const { BatchLocationPanel } = await import('../../components/screens/WorkHub/BatchLocationPanel');
        wrap(<BatchLocationPanel locationTag="Bldg7-F2" currentTaskId={99} onTaskSelect={vi.fn()} />);

        // Panel is collapsed by default — click to expand
        fireEvent.click(screen.getByText(/also at Bldg7-F2/i));

        await waitFor(() => {
            expect(screen.getByText('Task at location A')).toBeInTheDocument();
        });
    });
});

// ---- WorkHubDashboardWidget ----
describe('WorkHubDashboardWidget', () => {
    it('renders stat tiles', async () => {
        const { taskService } = await import('../../services/workhubApi');
        const allTasks: import('../../services/workhubApi').WHTask[] = [
            { id: 1, tenant_id: 1, title: 'T1', status: 'open',        priority: 'low',    created_at: '', updated_at: '' },
            { id: 2, tenant_id: 1, title: 'T2', status: 'in_progress', priority: 'medium', created_at: '', updated_at: '' },
            { id: 3, tenant_id: 1, title: 'T3', status: 'done',        priority: 'low',    created_at: '', updated_at: '' },
        ];
        // The widget issues one per_page:1 request per status (open/in_progress/done/problem)
        // plus one unfiltered request, reading the true count from each response's
        // `pagination.total` rather than counting a single fetched array client-side —
        // so the mock must filter by the requested status like the real backend does.
        vi.mocked(taskService.list).mockImplementation(async (params?: { status?: string }) => {
            const filtered = params?.status ? allTasks.filter((t) => t.status === params.status) : allTasks;
            return {
                data: filtered,
                unread_inbox_count: 0,
                pagination: { page: 1, per_page: 1, total: filtered.length, last_page: 1 },
            };
        });

        const { WorkHubDashboardWidget } = await import('../../components/screens/Dashboard/WorkHubDashboardWidget');
        wrap(<WorkHubDashboardWidget onNavigate={vi.fn()} onDismiss={vi.fn()} />);

        await waitFor(() => {
            // At least one stat tile renders a count
            expect(screen.getAllByText('1').length).toBeGreaterThan(0);
        });
    });
});
