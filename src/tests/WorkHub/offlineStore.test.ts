import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/workhubApi', () => ({}));

describe('workhubOfflineStore', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    it('caches tasks and trims to max 50', async () => {
        const { useWorkhubOfflineStore } = await import('../../stores/workhubOfflineStore');
        const store = useWorkhubOfflineStore.getState();

        const tasks = Array.from({ length: 55 }, (_, i) => ({
            id: i + 1, tenant_id: 1, title: `Task ${i + 1}`,
            status: 'open' as const, priority: 'low' as const,
            created_at: '', updated_at: '',
        }));

        store.setCachedTasks(tasks);

        const state = useWorkhubOfflineStore.getState();
        expect(state.cachedTasks.length).toBeLessThanOrEqual(50);
    });

    it('enqueues requests with unique ids', async () => {
        const { useWorkhubOfflineStore } = await import('../../stores/workhubOfflineStore');
        const store = useWorkhubOfflineStore.getState();

        store.enqueueRequest({ method: 'POST', url: '/api/workhub/tasks', body: { title: 'A' } });
        store.enqueueRequest({ method: 'PUT', url: '/api/workhub/tasks/1', body: { status: 'done' } });

        const state = useWorkhubOfflineStore.getState();
        expect(state.requestQueue).toHaveLength(2);
        expect(state.requestQueue[0].id).not.toBe(state.requestQueue[1].id);
    });

    it('saves and retrieves draft notes by task id', async () => {
        const { useWorkhubOfflineStore } = await import('../../stores/workhubOfflineStore');
        const store = useWorkhubOfflineStore.getState();

        store.setDraftNote(42, 'Work in progress on panel 3');
        const state = useWorkhubOfflineStore.getState();
        expect(state.draftNotes[42]).toBe('Work in progress on panel 3');
    });

    it('clears draft note after retrieval', async () => {
        const { useWorkhubOfflineStore } = await import('../../stores/workhubOfflineStore');
        const store = useWorkhubOfflineStore.getState();

        store.setDraftNote(7, 'Draft note to clear');
        store.clearDraftNote(7);

        const state = useWorkhubOfflineStore.getState();
        expect(state.draftNotes[7]).toBeUndefined();
    });

    it('stores active timer task id', async () => {
        const { useWorkhubOfflineStore } = await import('../../stores/workhubOfflineStore');
        const store = useWorkhubOfflineStore.getState();

        store.setActiveTimer(99, new Date().toISOString());
        const state = useWorkhubOfflineStore.getState();
        expect(state.activeTimerTaskId).toBe(99);
        expect(state.timerStartedAt).toBeTruthy();
    });

    it('clears active timer on clearTimer()', async () => {
        const { useWorkhubOfflineStore } = await import('../../stores/workhubOfflineStore');
        const store = useWorkhubOfflineStore.getState();

        store.setActiveTimer(5, new Date().toISOString());
        store.setActiveTimer(null, null);

        const state = useWorkhubOfflineStore.getState();
        expect(state.activeTimerTaskId).toBeNull();
        expect(state.timerStartedAt).toBeNull();
    });
});
