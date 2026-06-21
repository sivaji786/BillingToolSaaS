import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WHTask } from '../services/workhubApi';

interface QueuedRequest {
    id: string;
    method: 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: any;
    timestamp: number;
}

interface WorkHubOfflineState {
    // Cached tasks (last 50 for current worker)
    cachedTasks: WHTask[];
    setCachedTasks: (tasks: WHTask[]) => void;

    // Active timer fallback (persisted across refresh)
    activeTimerTaskId: number | null;
    timerStartedAt: string | null;
    setActiveTimer: (taskId: number | null, startedAt: string | null) => void;

    // Draft completion note (before submit)
    draftNotes: Record<number, string>;
    setDraftNote: (taskId: number, note: string) => void;
    clearDraftNote: (taskId: number) => void;

    // Offline request queue (retry on reconnect)
    requestQueue: QueuedRequest[];
    enqueueRequest: (req: Omit<QueuedRequest, 'id' | 'timestamp'>) => void;
    dequeueRequest: (id: string) => void;
    clearQueue: () => void;

    // Sync indicator
    isSyncing: boolean;
    setSyncing: (v: boolean) => void;
    lastSyncedAt: string | null;
    setLastSyncedAt: (v: string) => void;

    // Ephemeral sync failure tracking (not persisted)
    syncFailures: QueuedRequest[];
    setSyncFailures: (items: QueuedRequest[]) => void;
    clearSyncFailures: () => void;

    // Ephemeral per-item sync progress (not persisted)
    syncProgress: { current: number; total: number } | null;
    setSyncProgress: (v: { current: number; total: number } | null) => void;
}

export const useWorkhubOfflineStore = create<WorkHubOfflineState>()(
    persist(
        (set) => ({
            cachedTasks: [],
            setCachedTasks: (tasks) =>
                set({ cachedTasks: tasks.slice(0, 50) }),

            activeTimerTaskId: null,
            timerStartedAt: null,
            setActiveTimer: (taskId, startedAt) =>
                set({ activeTimerTaskId: taskId, timerStartedAt: startedAt }),

            draftNotes: {},
            setDraftNote: (taskId, note) =>
                set((s) => ({ draftNotes: { ...s.draftNotes, [taskId]: note } })),
            clearDraftNote: (taskId) =>
                set((s) => {
                    const { [taskId]: _, ...rest } = s.draftNotes;
                    return { draftNotes: rest };
                }),

            requestQueue: [],
            enqueueRequest: (req) =>
                set((s) => ({
                    requestQueue: [
                        ...s.requestQueue,
                        { ...req, id: crypto.randomUUID(), timestamp: Date.now() },
                    ],
                })),
            dequeueRequest: (id) =>
                set((s) => ({ requestQueue: s.requestQueue.filter((r) => r.id !== id) })),
            clearQueue: () => set({ requestQueue: [] }),

            isSyncing: false,
            setSyncing: (v) => set({ isSyncing: v }),
            lastSyncedAt: null,
            setLastSyncedAt: (v) => set({ lastSyncedAt: v }),

            syncFailures: [],
            setSyncFailures: (items) => set({ syncFailures: items }),
            clearSyncFailures: () => set({ syncFailures: [] }),

            syncProgress: null,
            setSyncProgress: (v) => set({ syncProgress: v }),
        }),
        {
            name: 'workhub-offline-store',
            partialize: (state) => ({
                cachedTasks:       state.cachedTasks,
                activeTimerTaskId: state.activeTimerTaskId,
                timerStartedAt:    state.timerStartedAt,
                draftNotes:        state.draftNotes,
                requestQueue:      state.requestQueue,
                lastSyncedAt:      state.lastSyncedAt,
            }),
        }
    )
);

/**
 * Flushes the offline request queue when the app regains connectivity.
 * Call once from a top-level component.
 */
export async function flushOfflineQueue(
    store: ReturnType<typeof useWorkhubOfflineStore.getState>
): Promise<{ flushed: number; failed: number; failedItems: QueuedRequest[] }> {
    const queue = store.requestQueue;
    if (queue.length === 0) return { flushed: 0, failed: 0, failedItems: [] };

    const token = localStorage.getItem('wh-auth');
    const authHeaders: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

    store.setSyncing(true);
    store.setSyncProgress({ current: 0, total: queue.length });
    let flushed = 0;
    let failed  = 0;
    const failedItems: QueuedRequest[] = [];

    try {
        for (let i = 0; i < queue.length; i++) {
            const req = queue[i];
            store.setSyncProgress({ current: i + 1, total: queue.length });
            try {
                await fetch(req.url, {
                    method: req.method,
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: req.body ? JSON.stringify(req.body) : undefined,
                });
                store.dequeueRequest(req.id);
                flushed++;
            } catch {
                failed++;
                failedItems.push(req);
            }
        }
    } finally {
        store.setSyncing(false);
        store.setSyncProgress(null);
        store.setLastSyncedAt(new Date().toISOString());
        store.setSyncFailures(failedItems);
    }

    return { flushed, failed, failedItems };
}
