import axios from 'axios';

const API_URL = 'http://localhost:8080/api/customer';

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
        const response = await axios.get<{ success: boolean; data: DashboardData }>(
            `${API_URL}/dashboard`,
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
        const response = await axios.get(`${API_URL}/invoices`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            },
            params
        });
        return response.data;
    },

    getInvoice: async (token: string, id: string) => {
        const response = await axios.get(`${API_URL}/invoices/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data.data;
    },

    getSubscription: async (token: string) => {
        const response = await axios.get(`${API_URL}/subscription`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data.data;
    },

    updateProfile: async (token: string, data: { company_name?: string; contact_email?: string; contact_phone?: string }) => {
        const response = await axios.put(`${API_URL}/profile`, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    },

    getUsage: async (token: string) => {
        const response = await axios.get(`${API_URL}/usage`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Authorization': `Bearer ${token}`
            }
        });
        return response.data.data;
    }
};
