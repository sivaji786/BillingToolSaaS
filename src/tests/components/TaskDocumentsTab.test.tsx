/**
 * Unit tests for TaskDocumentsTab component.
 * Verifies: PDF button states, locked/unlocked, generate trigger.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- Mocks ----
vi.mock('../../services/workhubApi', () => ({
    printService: {
        generate:    vi.fn().mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
        listForTask: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// URL.createObjectURL is not available in jsdom.
globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
globalThis.URL.revokeObjectURL = vi.fn();

// Prevent jsdom "Not implemented: navigation" when the component calls anchor.click() to trigger a file download.
HTMLAnchorElement.prototype.click = vi.fn();

const mkQC = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={mkQC()}>{ui}</QueryClientProvider>);

describe('TaskDocumentsTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders document type labels', async () => {
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={1} hasCompletionRecord={true} />);
        expect(screen.getByText('Work Order')).toBeInTheDocument();
        expect(screen.getByText('Completion Certificate')).toBeInTheDocument();
        expect(screen.getByText('Timesheet')).toBeInTheDocument();
    });

    it('completion-certificate Generate PDF is disabled when hasCompletionRecord=false', async () => {
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={1} hasCompletionRecord={false} />);

        // Types that requiresCompletion=true: completion-certificate, invoice, consent-form → 3 locked.
        // Types without requirement: work-order, timesheet, project-status → 3 enabled.
        // All Generate PDF buttons for locked types must be disabled.
        const allButtons = screen.getAllByRole('button', { name: /generate pdf/i });
        const disabledBtns = allButtons.filter((b) => b.hasAttribute('disabled'));
        // At least the 3 completion-required document types must be disabled.
        expect(disabledBtns.length).toBeGreaterThanOrEqual(3);
    });

    it('completion-certificate Generate PDF is enabled when hasCompletionRecord=true', async () => {
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={1} hasCompletionRecord={true} />);
        // All generate buttons should be enabled (no locked rows)
        const generateBtns = screen.getAllByRole('button', { name: /generate pdf/i });
        for (const btn of generateBtns) {
            expect(btn).not.toBeDisabled();
        }
    });

    it('shows "Dual signed" badge when isDualSigned=true', async () => {
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={1} hasCompletionRecord={true} isDualSigned={true} />);
        const badges = screen.getAllByText('Dual signed');
        expect(badges.length).toBeGreaterThan(0);
    });

    it('does not show "Dual signed" badge when isDualSigned=false', async () => {
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={1} hasCompletionRecord={true} isDualSigned={false} />);
        expect(screen.queryByText('Dual signed')).not.toBeInTheDocument();
    });

    it('calls printService.generate with correct type and taskId when button is clicked', async () => {
        const { printService } = await import('../../services/workhubApi');
        const { TaskDocumentsTab } = await import('../../components/screens/WorkHub/TaskDocumentsTab');
        wrap(<TaskDocumentsTab taskId={42} hasCompletionRecord={true} />);

        const workOrderBtn = screen.getAllByRole('button', { name: /generate pdf/i })[0];
        fireEvent.click(workOrderBtn);

        await waitFor(() => {
            expect(printService.generate).toHaveBeenCalledWith('work-order', '42');
        });
    });
});
