import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { getApiBaseUrl } from '../utils/config';

const api = axios.create({
    baseURL: `${getApiBaseUrl()}/workhub`,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Authorization'] = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (error) => {
        if (error.response?.status === 401) useAuthStore.getState().logout();
        return Promise.reject(error);
    }
);

// ---- Types ----

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'problem';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WHTask {
    id: number;
    tenant_id: number;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    project_id?: number;
    assigned_worker_id?: number;
    location_tag?: string;
    est_hours?: number;
    logged_hours?: number;
    net_hours_formatted?: string;
    due_date?: string;
    created_at: string;
    updated_at: string;
    // External module integration fields (Sprint D)
    correlation_id?: string | null;
    source_module?: 'manual' | 'pc13' | 'pfe' | 'm02' | 'ppt' | null;
    task_type?: 'fault_resolution' | 'commissioning' | 'configuration' | 'investigation' | 'maintenance' | null;
    pfe_ref_type?: string | null;
    pfe_ref_id?: string | null;
    completion_record?: WHCompletionRecord | null;
    materials?: WHMaterial[];
    photos?: WHPhoto[];
}

export interface WHProject {
    id: number;
    name: string;
    description?: string;
    status?: 'active' | 'on_hold' | 'completed' | 'archived';
    colour_accent?: string;
    customer_id?: number;
    customer_name?: string;
    task_count?: number;
    my_task_count?: number | null;
    progress_pct?: number;
    started_at?: string;
    due_at?: string;
}

export interface WHCustomer {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
}

export interface WHWorker {
    id: number;
    user_id: number;
    name: string;
    email?: string;
    role?: string;
    wh_role?: 'worker' | 'planner' | 'manager' | 'finance' | 'client' | null;
    capacity_hours_per_week?: number;
    hourly_rate_override?: number | null;
    utilisation_pct?: number;
    utilisation_pct_today?: number;
    logged_hours_week?: number;
    logged_hours_today?: number;
    queue_depth?: number;
    free_from_date?: string;
}

export interface WHAvailableUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface WHCompletionRecord {
    id: number;
    task_id: number;
    completion_note: string;
    worker_signature_data?: string;
    worker_signed_at?: string;
    customer_signature_data?: string;
    customer_name?: string;
    customer_signed_at?: string;
    gdpr_consent_given?: boolean;
    is_dual_signed?: boolean;
    materials?: WHMaterial[];
    material_total?: number;
    photos?: WHPhoto[];
}

export interface WHMaterial {
    id?: number;
    material_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price?: number;
    catalogue_ref?: string;
}

export interface WHPhoto {
    id: number;
    photo_type: string;
    url: string;
    created_at: string;
}

export interface WHTimerStatus {
    is_running: boolean;
    is_on_break: boolean;
    active_entry_id?: number;
    started_at?: string;
    net_seconds?: number;
    arbzg_status?: {
        compliant: boolean;
        message?: string;
        worked_minutes: number;
        break_minutes: number;
    };
}

// ---- Tasks ----

export const taskService = {
    list: async (params?: {
        status?: string;
        assigned_worker_id?: number;
        project_id?: number;
        priority?: string;
        location_tag?: string;
        date_from?: string;
        date_to?: string;
        sort?: 'due_date' | 'created_at' | 'title' | 'priority';
        sort_dir?: 'asc' | 'desc';
        page?: number;
        per_page?: number;
    }) => {
        const r = await api.get<{ data: WHTask[]; total: number; unread_inbox_count: number }>('/tasks', { params });
        return r.data;
    },

    get: async (id: number) => {
        const r = await api.get<{ data: WHTask }>(`/tasks/${id}`);
        return r.data.data;
    },

    create: async (payload: Partial<WHTask>) => {
        const r = await api.post<{ data: WHTask }>('/tasks', payload);
        return r.data.data;
    },

    update: async (id: number, payload: Partial<WHTask>) => {
        const r = await api.put<{ data: WHTask }>(`/tasks/${id}`, payload);
        return r.data.data;
    },

    delete: async (id: number) => {
        await api.delete(`/tasks/${id}`);
    },

    batchLocation: async (locationTag: string) => {
        const r = await api.get<{ data: WHTask[] }>('/tasks/batch-location', { params: { location_tag: locationTag } });
        return r.data.data;
    },
};

// ---- Timer ----

export const timerService = {
    start: async (taskId: number) => {
        const r = await api.post(`/tasks/${taskId}/timer/start`);
        return r.data;
    },
    pause: async (taskId: number) => {
        const r = await api.post(`/tasks/${taskId}/timer/pause`);
        return r.data;
    },
    stop: async (taskId: number, capSeconds?: number) => {
        const r = await api.post(`/tasks/${taskId}/timer/stop`, capSeconds != null ? { cap_seconds: capSeconds } : undefined);
        return r.data;
    },
};

// ---- Completion ----

export const completionService = {
    submit: async (taskId: number, payload: {
        completion_note: string;
        completion_note_original?: string;
        worker_signature_data: string;
        gdpr_consent_given: true;
        materials?: WHMaterial[];
        consent_text_version?: string;
    }) => {
        const r = await api.post(`/tasks/${taskId}/completion`, payload);
        return r.data;
    },

    customerSignature: async (completionId: number, payload: {
        customer_signature_data: string;
        customer_name: string;
        gdpr_consent_given: true;
        consent_text_version?: string;
    }) => {
        const r = await api.post(`/completions/${completionId}/customer-signature`, payload);
        return r.data;
    },

    get: async (id: number) => {
        const r = await api.get<{ data: WHCompletionRecord }>(`/completions/${id}`);
        return r.data.data;
    },
};

// ---- Files ----

export const fileService = {
    upload: async (taskId: number, file: File, photoType: 'jobsite' | 'identity' = 'jobsite') => {
        const form = new FormData();
        form.append('file', file);
        form.append('task_id', String(taskId));
        form.append('photo_type', photoType);
        const r = await api.post('/files/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return r.data;
    },
};

// ---- AI ----

export const aiService = {
    correct: async (text: string) => {
        const r = await api.post<{
            original: string;
            corrected: string;
            changes: { type: string; text: string; replacement: string }[];
            identical: boolean;
        }>('/ai/correct', { text });
        return r.data;
    },

    translate: async (text: string, targetLang: string, sourceLang = 'auto') => {
        const r = await api.post<{
            translated: string;
            detected_source_lang: string;
            from_cache: boolean;
        }>('/ai/translate', { text, target_lang: targetLang, source_lang: sourceLang });
        return r.data;
    },
};

// ---- Workers / Projects ----

export const workerService = {
    list: async () => {
        const r = await api.get<{ data: WHWorker[] }>('/workers');
        return r.data.data;
    },
    availableUsers: async () => {
        const r = await api.get<{ data: WHAvailableUser[] }>('/workers/available');
        return r.data.data;
    },
    add: async (userId: number, capacityHoursPerWeek = 40) => {
        const r = await api.post<{ data: WHWorker }>('/workers', {
            user_id: userId,
            capacity_hours_per_week: capacityHoursPerWeek,
        });
        return r.data.data;
    },
    remove: async (workerId: number) => {
        await api.delete(`/workers/${workerId}`);
    },
    setRole: async (workerId: number, wh_role: WHWorker['wh_role']) => {
        await api.patch(`/workers/${workerId}/role`, { wh_role: wh_role ?? null });
    },
    update: async (workerId: number, payload: Partial<Pick<WHWorker, 'capacity_hours_per_week' | 'hourly_rate_override'>>) => {
        const r = await api.put<{ data: WHWorker }>(`/workers/${workerId}`, payload);
        return r.data.data;
    },
};

export const projectService = {
    list: async () => {
        const r = await api.get<{ data: WHProject[] }>('/projects');
        return r.data.data;
    },
    create: async (payload: Partial<WHProject>) => {
        const r = await api.post<{ data: WHProject }>('/projects', payload);
        return r.data.data;
    },
    update: async (id: number, payload: Partial<WHProject>) => {
        const r = await api.put<{ data: WHProject }>(`/projects/${id}`, payload);
        return r.data.data;
    },
    delete: async (id: number) => {
        await api.delete(`/projects/${id}`);
    },
};

export const customerService = {
    list: async () => {
        const r = await api.get<{ data: WHCustomer[] }>('/customers');
        return r.data.data;
    },
};

// ---- Timesheet ----

export interface WHTimesheetSignoff {
    id: number;
    worker_id: number;
    week: string;
    total_net_hours: number;
    signed_at: string;
}

export const timesheetService = {
    get: async (params?: { worker_id?: number; week?: string; month?: string; from?: string; to?: string }) => {
        const r = await api.get('/timesheet', { params });
        return r.data;
    },
    signoffStatus: async (week: string): Promise<{ signed: boolean; signoff: WHTimesheetSignoff | null }> => {
        const r = await api.get('/timesheet/signoff-status', { params: { week } });
        return r.data;
    },
    signoff: async (week: string): Promise<WHTimesheetSignoff & { already_signed?: boolean }> => {
        const r = await api.post('/timesheet/signoff', { week });
        return r.data;
    },
};

// ---- Inbox ----

export const inboxService = {
    list: async () => {
        const r = await api.get('/inbox/messages');
        return r.data;
    },
    markRead: async (id: number) => {
        await api.put(`/inbox/messages/${id}/read`);
    },
    unreadCount: async () => {
        const r = await api.get<{ count: number }>('/inbox/unread-count');
        return r.data.count;
    },
};

// ---- Settings (WH-061) ----

export interface WHSettings {
    default_hourly_rate: number;
    currency: string;
    tax_percent: number;
    pdf_language: string;
}

export interface WHUsage {
    tasks_created: number;
    ai_calls_used: number;
    pdf_exports: number;
    storage_bytes_used: number;
    year_month: string;
}

export const settingsService = {
    get: async (): Promise<WHSettings> => {
        const r = await api.get<WHSettings>('/settings');
        return r.data;
    },
    update: async (payload: Partial<WHSettings>): Promise<void> => {
        await api.put('/settings', payload);
    },
    usage: async (): Promise<WHUsage> => {
        const r = await api.get<WHUsage>('/usage');
        return r.data;
    },
};

// ---- PDF Print ----

export const printService = {
    generate: async (type: string, id: string, extraParam?: string): Promise<Blob> => {
        const params: Record<string, string> = {};
        if (extraParam) params['week'] = extraParam;
        const r = await api.get(`/print/${type}/${id}`, {
            params,
            responseType: 'blob',
        });
        return r.data;
    },

    listForTask: async (taskId: number): Promise<unknown[]> => {
        const r = await api.get(`/tasks/${taskId}/documents`);
        return (r.data as any).data ?? [];
    },
};

// ---- Worker Profile ----

export interface WHProfile {
    id: number;
    user_id: number;
    name: string;
    email: string;
    role: string;
    wh_role?: string | null;
    capacity_hours_per_week: number;
    skills: string[];
    ui_language: string;
    export_language: string;
    has_identity_photo: boolean;
    is_admin: boolean;
}

export const profileService = {
    get: async (): Promise<WHProfile> => {
        const r = await api.get<{ data: WHProfile }>('/profile');
        return r.data.data;
    },
    update: async (payload: Partial<Pick<WHProfile, 'capacity_hours_per_week' | 'skills' | 'ui_language' | 'export_language'>>): Promise<void> => {
        await api.patch('/profile', payload);
    },
    uploadIdentityPhoto: async (file: File): Promise<{ url: string }> => {
        const form = new FormData();
        form.append('file', file);
        const r = await api.post<{ url: string }>('/workers/me/identity-photo', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return r.data;
    },
};

export const gdprService = {
    export: async (): Promise<object> => {
        const r = await api.get<object>('/my-data');
        return r.data;
    },
};

// ---- Sprint E: Aggregate endpoints ----

export interface WHKanbanColumn {
    status: string;
    label: string;
    count: number;
    tasks: WHTask[];
}

export interface WHKanbanResponse {
    project_id: number | null;
    columns: WHKanbanColumn[];
    total: number;
}

export interface WHWorkerCapacity {
    worker_id: number;
    user_id: number;
    name: string;
    email: string | null;
    role: string;
    capacity_hours_per_week: number;
    logged_hours_this_week: number;
    utilisation_pct: number;
    queue_depth: number;
    queue_label: 'free' | 'light' | 'busy' | 'overloaded';
    free_from_date: string | null;
}

export interface WHCapacityResponse {
    week_start: string;
    week_end: string;
    workers: WHWorkerCapacity[];
}

export interface WHFinanceSummary {
    currency: string;
    hourly_rate: number;
    tax_percent: number;
    summary: {
        billable_task_count: number;
        dual_signed_count: number;
        pending_sig_count: number;
        grand_labour: number;
        grand_materials: number;
        grand_subtotal: number;
        grand_tax: number;
        grand_total: number;
    };
    tasks: {
        task_id: number;
        title: string;
        location_tag: string | null;
        logged_hours: number;
        labour: number;
        materials_total: number;
        subtotal: number;
        tax: number;
        total: number;
        dual_signed: boolean;
        customer_signed_at: string | null;
        completion_record_id: number | null;
    }[];
}

export const aggregateService = {
    kanban: async (projectId?: number): Promise<WHKanbanResponse> => {
        const params = projectId ? { project_id: projectId } : {};
        const r = await api.get<WHKanbanResponse>('/kanban', { params });
        return r.data;
    },
    capacity: async (): Promise<WHCapacityResponse> => {
        const r = await api.get<WHCapacityResponse>('/capacity');
        return r.data;
    },
    financeSummary: async (): Promise<WHFinanceSummary> => {
        const r = await api.get<WHFinanceSummary>('/finance/summary');
        return r.data;
    },
};

// ---- Sprint E: Offline sync ----

export type SyncMutationType = 'task.update' | 'task.create' | 'timer.entry';

export interface SyncMutation {
    type: SyncMutationType;
    local_id?: string;
    task_id?: number;
    updated_at?: string;
    // task.update / task.create fields
    title?: string;
    status?: string;
    priority?: string;
    description?: string;
    location_tag?: string;
    est_hours?: number;
    project_id?: number;
    // timer.entry fields
    started_at?: string;
    ended_at?: string;
    break_minutes?: number;
    notes?: string;
}

export interface SyncResult {
    index: number;
    local_id?: string;
    task_id?: number;
    entry_id?: number;
    status: 'synced' | 'skipped';
    reason?: string;
}

export const syncService = {
    push: async (mutations: SyncMutation[]): Promise<{ synced: SyncResult[]; skipped: SyncResult[]; failed: SyncResult[] }> => {
        const r = await api.post('/sync', { mutations });
        return r.data as { synced: SyncResult[]; skipped: SyncResult[]; failed: SyncResult[] };
    },
};
