import axios from 'axios';
import {
    AdminUser,
    Package,
    SaasUser,
    Invoice,
    DashboardStats,
    UsageMetrics,
    AdminSettings,
    ApiKey,
    PaginatedResponse,
    ApiResponse,
    UserFilters,
    InvoiceFilters,
    UsageFilters,
    PackageFormData,
    InvoiceFormData,
    RevenueStats,
    Ticket,
    TicketTracking,
    TenantUsage,
    AdminStaff,
} from '../types/admin';
import { getApiBaseUrl } from '../utils/config';
import { useAdminStore } from '../stores/adminStore';

const API_URL = getApiBaseUrl();

const adminApi = axios.create({
    baseURL: `${API_URL}/admin`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - use Admin Store token
adminApi.interceptors.request.use((config) => {
    // Get token from Zustand store instead of raw localStorage 'token' key
    const token = useAdminStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
adminApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - logout via store
            // This handles clearing the specific admin storage keys
            useAdminStore.getState().logout();
            window.location.hash = '#/SALogin';
        }
        return Promise.reject(error);
    }
);

// Authentication Services
export const adminAuthService = {
    login: async (email: string, password: string): Promise<{ user: AdminUser; token: string }> => {
        const response = await adminApi.post<ApiResponse<{ user: AdminUser; token: string }>>('/auth/login', {
            email,
            password,
        });
        const { user, token } = response.data.data;

        // Note: We don't manually set localStorage here anymore.
        // The calling component (SALogin) calls setAuth() on the store,
        // which handles persistence to 'admin-storage' key.

        return { user, token };
    },

    logout: async (): Promise<void> => {
        try {
            await adminApi.post('/auth/logout');
        } catch (error) {
            // Continue with logout even if API call fails
        }
        // Store logout is handled by the component or store action
    },

    me: async (): Promise<AdminUser> => {
        const response = await adminApi.get<ApiResponse<AdminUser>>('/auth/me');
        return response.data.data;
    },

    refreshToken: async (): Promise<{ token: string }> => {
        const response = await adminApi.post<ApiResponse<{ token: string }>>('/auth/refresh');
        return response.data.data;
    },
};


// Package Services
export const adminPackageService = {
    getAll: async (page = 1, limit = 10): Promise<PaginatedResponse<Package>> => {
        const response = await adminApi.get<PaginatedResponse<Package>>('/packages', {
            params: { page, limit },
        });
        return response.data;
    },

    getById: async (id: string): Promise<Package> => {
        const response = await adminApi.get<ApiResponse<Package>>(`/packages/${id}`);
        return response.data.data;
    },

    create: async (data: PackageFormData): Promise<Package> => {
        const response = await adminApi.post<ApiResponse<Package>>('/packages', data);
        return response.data.data;
    },

    update: async (id: string, data: Partial<PackageFormData>): Promise<Package> => {
        const response = await adminApi.put<ApiResponse<Package>>(`/packages/${id}`, data);
        return response.data.data;
    },

    delete: async (id: string): Promise<void> => {
        await adminApi.delete(`/packages/${id}`);
    },
};

// Package Services Configuration (Columns)
export const adminPackageServicesService = {
    getAll: async (activeOnly = false): Promise<any[]> => {
        const response = await adminApi.get<ApiResponse<any[]>>('/package-services', {
            params: { active: activeOnly }
        });
        return response.data.data;
    },

    create: async (data: { name: string; type: string; description?: string; isActive?: boolean }): Promise<any> => {
        const response = await adminApi.post<ApiResponse<any>>('/package-services', data);
        return response.data.data;
    },

    update: async (id: string, data: Partial<{ name: string; type: string; description?: string; isActive?: boolean }>): Promise<any> => {
        const response = await adminApi.put<ApiResponse<any>>(`/package-services/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await adminApi.delete(`/package-services/${id}`);
    },
};

// User Services
export const adminUserService = {
    getAll: async (filters: UserFilters = {}): Promise<PaginatedResponse<SaasUser>> => {
        const response = await adminApi.get<PaginatedResponse<SaasUser>>('/users', {
            params: filters,
        });
        return response.data;
    },

    getById: async (id: string): Promise<SaasUser> => {
        const response = await adminApi.get<ApiResponse<SaasUser>>(`/users/${id}`);
        return response.data.data;
    },

    upgradePackage: async (userId: string, packageId: string): Promise<void> => {
        await adminApi.post(`/users/${userId}/upgrade`, { packageId });
    },

    suspend: async (userId: string, reason?: string): Promise<void> => {
        await adminApi.post(`/users/${userId}/suspend`, { reason });
    },

    activate: async (userId: string): Promise<void> => {
        await adminApi.post(`/users/${userId}/activate`);
    },

    resetPassword: async (userId: string): Promise<void> => {
        await adminApi.post(`/users/${userId}/reset-password`);
    },

    exportCsv: async (filters: UserFilters = {}): Promise<Blob> => {
        const response = await adminApi.get('/users/export', {
            params: filters,
            responseType: 'blob',
        });
        return response.data;
    },

    toggleWorkhub: async (tenantId: string): Promise<{ workhub_enabled: boolean }> => {
        const response = await adminApi.put<{ workhub_enabled: boolean }>(`/workhub/tenants/${tenantId}/toggle`);
        return response.data;
    },
};

// Billing Services
export const adminBillingService = {
    getInvoices: async (filters: InvoiceFilters = {}): Promise<PaginatedResponse<Invoice>> => {
        const response = await adminApi.get<PaginatedResponse<Invoice>>('/invoices', {
            params: filters,
        });
        return response.data;
    },

    getInvoiceById: async (id: string): Promise<Invoice> => {
        const response = await adminApi.get<ApiResponse<Invoice>>(`/invoices/${id}`);
        return response.data.data;
    },

    generateInvoice: async (data: InvoiceFormData): Promise<Invoice> => {
        const response = await adminApi.post<ApiResponse<Invoice>>('/invoices', data);
        return response.data.data;
    },

    downloadPdf: async (invoiceId: string): Promise<Blob> => {
        const response = await adminApi.get(`/invoices/${invoiceId}/pdf`, {
            responseType: 'blob',
        });
        return response.data;
    },

    getRevenue: async (period: 'monthly' | 'yearly' = 'monthly'): Promise<RevenueStats> => {
        const response = await adminApi.get<RevenueStats>('/revenue', {
            params: { period },
        });
        return response.data; // Data is returned directly, not wrapped in data.data
    },
};

// Analytics Services
export const adminAnalyticsService = {
    getDashboardStats: async (): Promise<DashboardStats> => {
        const response = await adminApi.get<ApiResponse<DashboardStats>>('/analytics/dashboard');
        return response.data.data;
    },

    getUsageMetrics: async (filters: UsageFilters = {}): Promise<UsageMetrics> => {
        const response = await adminApi.get<ApiResponse<UsageMetrics>>('/usage', {
            params: filters,
        });
        return response.data.data;
    },

    getTenantUsage: async (): Promise<TenantUsage[]> => {
        const response = await adminApi.get<ApiResponse<TenantUsage[]>>('/analytics/tenants');
        return response.data.data;
    },

    exportUsageCsv: async (filters: UsageFilters = {}): Promise<Blob> => {
        const response = await adminApi.get('/usage/export', {
            params: filters,
            responseType: 'blob',
        });
        return response.data;
    },
};

// Settings Services
export const adminSettingsService = {
    getSettings: async (): Promise<AdminSettings> => {
        const response = await adminApi.get<ApiResponse<AdminSettings>>('/settings');
        return response.data.data;
    },

    updateProfile: async (data: { name: string; email: string }): Promise<void> => {
        await adminApi.put('/settings/profile', data);
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await adminApi.post('/settings/password', { currentPassword, newPassword });
    },

    generateApiKey: async (name: string): Promise<ApiKey> => {
        const response = await adminApi.post<ApiResponse<ApiKey>>('/settings/api-keys', { name });
        return response.data.data;
    },

    revokeApiKey: async (keyId: string): Promise<void> => {
        await adminApi.delete(`/settings/api-keys/${keyId}`);
    },

    updateSystemSettings: async (settings: any): Promise<void> => {
        await adminApi.put('/settings/system', settings);
    },
    migrateDatabase: async (): Promise<{ status: string; message: string }> => {
        const response = await adminApi.get<{ status: string; message: string }>('/database/migrate');
        return response.data;
    },
    seedDatabase: async (className?: string): Promise<{ status: string; message: string }> => {
        const response = await adminApi.get<{ status: string; message: string }>('/database/seed', {
            params: { class: className }
        });
        return response.data;
    },
    testEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
        const response = await adminApi.post<{ success: boolean; message: string }>('/settings/test-email', { email });
        return response.data;
    },
    getHealth: async (): Promise<{ overall: string; checks: Record<string, { status: string; message: string }> }> => {
        const response = await adminApi.get<{ overall: string; checks: Record<string, { status: string; message: string }> }>('/settings/health');
        return response.data;
    },
    testTelegram: async (): Promise<{ success: boolean; message: string }> => {
        const response = await adminApi.post<{ success: boolean; message: string }>('/settings/test-telegram');
        return response.data;
    },
};

// Ticket Services
export const adminTicketService = {
    getTickets: async (): Promise<Ticket[]> => {
        const response = await adminApi.get<Ticket[]>('/tickets');
        return response.data;
    },
    updateTicket: async (id: string, data: Partial<Ticket> & { comment?: string }): Promise<{ status: string, message: string }> => {
        const response = await adminApi.put<{ status: string, message: string }>(`/tickets/${id}`, data);
        return response.data;
    },
    getTicketTracking: async (id: string): Promise<TicketTracking[]> => {
        const response = await adminApi.get<TicketTracking[]>(`/tickets/${id}/tracking`);
        return response.data;
    },
    bulkUpdateTickets: async (ids: string[], status: string): Promise<{ status: string; message: string }> => {
        const response = await adminApi.post<{ status: string; message: string }>('/tickets/bulk-update', { ids, status });
        return response.data;
    },
    getAdminStaff: async (): Promise<AdminStaff[]> => {
        const response = await adminApi.get<AdminStaff[]>('/admins');
        return response.data;
    },
};

export interface MockupItem {
    type: 'file' | 'directory';
    name: string;
    path: string;
    url?: string;
    size?: number;
    created_at?: string;
    children?: MockupItem[];
}

// Wiki Services
export const adminWikiService = {
    getTree: async (lang = 'en'): Promise<any[]> => {
        const response = await adminApi.get<any[]>('/wiki', {
            params: { lang }
        });
        return response.data;
    },
    getContent: async (path: string, lang = 'en'): Promise<{ content: string; filename: string }> => {
        const response = await adminApi.get<any>('/wiki/read', {
            params: { path, lang }
        });
        return response.data;
    },
    saveContent: async (path: string, content: string, lang = 'en'): Promise<void> => {
        await adminApi.put('/wiki/write', { path, content, lang });
    },
    createDocument: async (path: string, lang = 'en'): Promise<{ path: string }> => {
        const response = await adminApi.post<{ path: string }>('/wiki/create', { path, lang });
        return response.data;
    },
    listMockups: async (): Promise<MockupItem[]> => {
        const response = await adminApi.get<MockupItem[]>('/wiki/mockups');
        return response.data;
    },
    uploadMockup: async (file: File, folder = ''): Promise<MockupItem> => {
        const formData = new FormData();
        formData.append('file', file);
        if (folder) formData.append('folder', folder);
        const response = await adminApi.post<MockupItem>('/wiki/mockups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    renameMockup: async (oldPath: string, newName: string): Promise<void> => {
        await adminApi.patch('/wiki/mockups', { old_path: oldPath, new_name: newName });
    },
    deleteMockup: async (path: string): Promise<void> => {
        await adminApi.delete('/wiki/mockups', { data: { path } });
    },
    createMockupFolder: async (path: string): Promise<void> => {
        await adminApi.post('/wiki/mockups/folder', { path });
    },
};

// ─── CMS Types ────────────────────────────────────────────────────────────────

export type NavPosition = 'top' | 'bottom' | 'both' | 'none';
export type LinkTarget  = '_self' | '_blank';
export type PageTemplate = 'blank' | 'legal' | 'landing';

export interface CmsNavItem {
    id: number;
    slug: string;
    title: string;
    nav_label: string | null;
    nav_order: number;
    nav_position: NavPosition;
    footer_group: string | null;
    link_url: string | null;
    link_target: LinkTarget;
    page_template: PageTemplate;
    lang: string;
    children: CmsNavItem[];
}

export interface CmsNavResponse {
    top: CmsNavItem[];
    bottom: CmsNavItem[];
}

export interface CmsPageUpdateData {
    title?: string;
    content?: any;
    meta_description?: string;
    meta_title?: string;
    og_description?: string;
    og_image?: string;
    show_in_nav?: boolean | number;
    nav_label?: string;
    nav_order?: number;
    nav_position?: NavPosition;
    parent_id?: number | null;
    link_url?: string | null;
    link_target?: LinkTarget;
    footer_group?: string | null;
    is_published?: boolean | number;
    published_at?: string | null;
    page_template?: PageTemplate;
}

export interface NavReorderItem {
    slug: string;
    nav_order: number;
    parent_id?: number | null;
}

// ─── CMS Services ─────────────────────────────────────────────────────────────

export const adminCmsService = {
    getPages: async (lang = 'en'): Promise<any[]> => {
        const response = await adminApi.get<ApiResponse<any[]>>('/cms', { params: { lang } });
        return response.data.data;
    },
    createPage: async (slug: string, lang: string, title: string, showInNav = false, navLabel = '', navPosition: NavPosition = 'none', footerGroup = ''): Promise<void> => {
        await adminApi.put(`/cms/${slug}`, {
            lang, title, content: '', is_published: 1,
            show_in_nav: showInNav ? 1 : 0,
            nav_label: navLabel,
            nav_position: navPosition,
            footer_group: footerGroup || null,
        });
    },
    updatePage: async (slug: string, lang: string, data: CmsPageUpdateData): Promise<void> => {
        await adminApi.put(`/cms/${slug}`, { ...data, lang });
    },
    patchCmsField: async (slug: string, lang: string, field: string, value: any): Promise<void> => {
        await adminApi.patch(`/cms/${slug}`, { lang, field, value });
    },
    uploadCmsImage: async (base64: string): Promise<string> => {
        const response = await adminApi.post<{ url: string }>('/cms/upload-image', { image: base64 });
        return response.data.url;
    },
    deleteCmsPage: async (slug: string): Promise<void> => {
        await adminApi.delete(`/cms/${slug}`);
    },
    reorderNav: async (items: NavReorderItem[]): Promise<void> => {
        await adminApi.patch('/cms/nav/reorder', { items });
    },
    // Version history
    saveVersion: async (slug: string, lang: string): Promise<void> => {
        await adminApi.post(`/cms/versions/${slug}`, { lang });
    },
    listVersions: async (slug: string, lang: string): Promise<any[]> => {
        const response = await adminApi.get<ApiResponse<any[]>>(`/cms/versions/${slug}`, { params: { lang } });
        return response.data.data;
    },
    restoreVersion: async (id: number): Promise<void> => {
        await adminApi.post(`/cms/versions/restore/${id}`);
    },
    // Media library
    listMedia: async (): Promise<any[]> => {
        const response = await adminApi.get<ApiResponse<any[]>>('/cms/media');
        return response.data.data;
    },
    updateMediaAlt: async (id: number, altText: string): Promise<void> => {
        await adminApi.patch(`/cms/media/${id}`, { alt_text: altText });
    },
    deleteMedia: async (id: number): Promise<void> => {
        await adminApi.delete(`/cms/media/${id}`);
    },
};

export default adminApi;
