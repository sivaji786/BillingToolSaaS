import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { getApiBaseUrl } from '../utils/config';

const API_URL = `${getApiBaseUrl()}/customer`;

const customerApi = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Auto-inject auth token on every request — matches the pattern in api.ts
customerApi.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Authorization'] = `Bearer ${token}`;
    }
    return config;
});

customerApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('Customer session expired, redirecting to login');
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export interface DashboardData {
    tenant: any;
    subscription: any;
    plan: any;
    usage: {
        storage: { used: number; limit: number; percentage: number };
        api_calls: { used: number; limit: number; percentage: number };
        bandwidth: { used: number; limit: number; percentage: number };
        users: { used: number; limit: number; percentage: number };
    };
    recentInvoices: any[];
    stats: {
        totalInvoices: number;
        paidInvoices: number;
        pendingInvoices: number;
        totalSpent: number;
    };
}

export const customerService = {
    getDashboard: async () => {
        const response = await customerApi.get<{ success: boolean; data: DashboardData }>(`/dashboard`);
        return response.data.data;
    },

    getInvoices: async (params?: { page?: number; limit?: number; status?: string }) => {
        const response = await customerApi.get(`/invoices`, { params });
        return response.data;
    },

    getInvoice: async (id: string) => {
        const response = await customerApi.get(`/invoices/${id}`);
        return response.data.data;
    },

    getSubscription: async () => {
        const response = await customerApi.get(`/subscription`);
        return response.data.data;
    },

    updateProfile: async (data: {
        company_name?: string;
        contact_email?: string;
        contact_phone?: string;
        ai_provider?: 'gemini' | 'openai';
        gemini_api_key?: string;
        openai_api_key?: string;
    }) => {
        const response = await customerApi.put(`/profile`, data);
        return response.data;
    },

    getUsage: async () => {
        const response = await customerApi.get(`/usage`);
        return response.data.data;
    }
};
