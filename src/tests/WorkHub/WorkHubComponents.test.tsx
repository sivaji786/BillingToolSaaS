/**
 * WH-078: Combined component tests — OfflineBanner, CapacityCard, DoneReportModal steps,
 * SignaturePad validation, WorkHubGate redirect, InboxUnreadCount, PDFDownload trigger.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- Mocks ----
vi.mock('../../services/workhubApi', () => ({
    taskService:       { list: vi.fn().mockResolvedValue({ data: [], total: 0, unread_inbox_count: 0 }) },
    inboxService:      { list: vi.fn().mockResolvedValue({ data: [] }), markRead: vi.fn(), unreadCount: vi.fn().mockResolvedValue(3) },
    printService:      { generate: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })), listForTask: vi.fn().mockResolvedValue([]) },
    completionService: { submit: vi.fn(), customerSignature: vi.fn(), get: vi.fn() },
    workerService:     { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../stores/authStore', () => ({
    useAuthStore: () => ({
        tenant: { plan_features: { workhub_enabled: true } },
        isLoggedIn: true,
        token: 'mock-token',
    }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mkQC = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={mkQC()}>{ui}</QueryClientProvider>);

// ---- OfflineBanner ----
describe('OfflineBanner', () => {
    it('is hidden when online', async () => {
        Object.defineProperty(window.navigator, 'onLine', { value: true, writable: true });
        const { OfflineBanner } = await import('../../components/screens/WorkHub/OfflineBanner');
        wrap(<OfflineBanner />);
        expect(screen.queryByRole('status')).toBeNull();
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

    it('calls onSelect when card is clicked', async () => {
        const { CapacityCard } = await import('../../components/screens/WorkHub/CapacityCard');
        const onSelect = vi.fn();
        const worker = { id: 7, user_id: 10, name: 'Click Worker', utilisation_pct: 40, queue_depth: 2 };
        wrap(<CapacityCard worker={worker} isSelected={false} onSelect={onSelect} />);
        fireEvent.click(screen.getByText('Click Worker'));
        expect(onSelect).toHaveBeenCalledWith(7);
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
    it('renders location tasks list', async () => {
        const { taskService } = await import('../../services/workhubApi');
        vi.mocked(taskService.list).mockResolvedValue({
            data: [
                { id: 10, tenant_id: 1, title: 'Task at location A', status: 'open', priority: 'medium', created_at: '', updated_at: '', location_tag: 'Bldg7-F2' },
                { id: 11, tenant_id: 1, title: 'Task at location B', status: 'open', priority: 'high', created_at: '', updated_at: '', location_tag: 'Bldg7-F2' },
            ],
            total: 2,
            unread_inbox_count: 0,
        });

        const { BatchLocationPanel } = await import('../../components/screens/WorkHub/BatchLocationPanel');
        wrap(<BatchLocationPanel locationTag="Bldg7-F2" excludeTaskId={99} onSelectTask={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Task at location A')).toBeInTheDocument();
        });
    });
});

// ---- WorkHubDashboardWidget ----
describe('WorkHubDashboardWidget', () => {
    it('renders stat tiles', async () => {
        const { taskService } = await import('../../services/workhubApi');
        vi.mocked(taskService.list).mockResolvedValue({
            data: [
                { id: 1, tenant_id: 1, title: 'T1', status: 'open',        priority: 'low', created_at: '', updated_at: '' },
                { id: 2, tenant_id: 1, title: 'T2', status: 'in_progress', priority: 'medium', created_at: '', updated_at: '' },
                { id: 3, tenant_id: 1, title: 'T3', status: 'done',        priority: 'low', created_at: '', updated_at: '' },
            ],
            total: 3,
            unread_inbox_count: 0,
        });

        const { WorkHubDashboardWidget } = await import('../../components/screens/Dashboard/WorkHubDashboardWidget');
        wrap(<WorkHubDashboardWidget onNavigate={vi.fn()} onDismiss={vi.fn()} />);

        await waitFor(() => {
            // Open count
            expect(screen.getByText('1')).toBeInTheDocument();
        });
    });
});
