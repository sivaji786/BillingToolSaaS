import axios from 'axios';

import { getApiBaseUrl } from '../utils/config';
const API_URL = `${getApiBaseUrl()}/customer`;

// Add 401 interceptor to global axios or create local instance? 
// Better use a local instance to avoid side effects on other services.
const customerApi = axios.create({
    baseURL: API_URL
});

customerApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('Customer session expired, redirecting to login');
            // Assuming useAuthStore exists and is imported
            // Need to import it
            window.location.hash = '#login';
            window.location.reload(); // Force full reload to clear state
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
    getDashboard: async (token: string) => {
        const response = await customerApi.get<{ success: boolean; data: DashboardData }>(
            `/dashboard`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Authorization': `Bearer ${token}` // Apache workaround
                }
            }
        );
        return response.data.data;
    },

    getInvoices: async (token: string, params?: { page?: number; limit?: number; status?: string }) => {
        const response = await customerApi.get(`/invoices`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            },
            params
        });
        return response.data;
    },

    getInvoice: async (token: string, id: string) => {
        const response = await customerApi.get(`/invoices/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data.data;
    },

    getSubscription: async (token: string) => {
        const response = await customerApi.get(`/subscription`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data.data;
    },

    updateProfile: async (token: string, data: {
        company_name?: string;
        contact_email?: string;
        contact_phone?: string;
        ai_provider?: 'gemini' | 'openai';
        gemini_api_key?: string;
        openai_api_key?: string;
    }) => {
        const response = await customerApi.put(`/profile`, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    },

    getUsage: async (token: string) => {
        const response = await customerApi.get(`/usage`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data.data;
    }
};
