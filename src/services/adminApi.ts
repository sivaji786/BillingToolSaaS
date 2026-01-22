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
} from '../types/admin';
import { getApiBaseUrl } from '../utils/config';

const API_URL = getApiBaseUrl();

const adminApi = axios.create({
    baseURL: `${API_URL}/admin`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - use COMMON localStorage key 'token'
adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); // Common key for both admin and customer
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
            // Token expired or invalid - clear common storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
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

        // Store in COMMON localStorage (same keys as customer)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        return { user, token };
    },

    logout: async (): Promise<void> => {
        try {
            await adminApi.post('/auth/logout');
        } catch (error) {
            // Continue with logout even if API call fails
        }
        // Clear COMMON localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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

    exportCsv: async (filters: UserFilters = {}): Promise<Blob> => {
        const response = await adminApi.get('/users/export', {
            params: filters,
            responseType: 'blob',
        });
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

    getRevenue: async (period: 'monthly' | 'yearly' = 'monthly'): Promise<any> => {
        const response = await adminApi.get<any>('/revenue', {
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
};

export default adminApi;
