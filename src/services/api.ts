import axios from 'axios';
import { Invoice, InvoiceTemplate, CompanyProfile, AuditLogEntry, AIPromptRequest, AIPromptResponse } from '../types/invoice';
import { getApiBaseUrl } from '../utils/config';

// Use runtime configuration for API URL (can be changed after build by installer)
const API_URL = getApiBaseUrl();
console.log('API_URL Final:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Helper to extract subdomain
const getSubdomain = () => {
    if (typeof window === 'undefined') return 'demo';
    const host = window.location.hostname;

    // Handle localhost and IPs
    if (host === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
        return 'demo';
    }

    const parts = host.split('.');

    // For humple.org, parts.length is 2. 
    // If it's a subdomain like sub.humple.org, parts.length is 3.
    if (parts.length > 2) {
        // sub.humple.com -> sub
        // sub.humple.org -> sub
        return parts[0];
    }

    // For humple.org or humple.local where it's the root domain
    if (parts.length === 2) {
        // If it's sub.localhost, parts[1] is localhost
        if (parts[1] === 'localhost') return parts[0];

        // Otherwise, it might be the main domain. 
        // Let's return the first part instead of 'demo' to be more flexible.
        return parts[0];
    }

    return 'demo';
};

// Add auth token and tenant header - use COMMON localStorage
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); // Common key for both admin and customer
    if (token) {
        config.headers.Authorization = `Bearer ${token} `;
        // Standard shared hosting workaround for Apache header stripping
        config.headers['X-Authorization'] = `Bearer ${token} `;
    }

    // Inject Tenant Header
    let tenantId = getSubdomain();
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.tenant_id) {
                // Use tenant_id if available
            }
        } catch (e) { }
    }

    if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
    }

    return config;
});

export const authService = {
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const data = response.data.data || response.data;

        // Store in COMMON localStorage (same keys as admin)
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data;
    },
    logout: () => {
        // Clear COMMON localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    me: async () => {
        const response = await api.get('/api/auth/me');
        // API returns { success: true, data: { user: ..., tenant: ... } }
        const responseData = response.data;

        if (responseData.data) {
            const { user, tenant } = responseData.data;
            // Merge user with tenant for App.tsx compatibility
            return { ...user, tenant };
        }

        // Fallback
        return responseData;
    },
};


export const billingService = {
    getSubscription: async () => {
        const response = await api.get('/billing/subscription');
        return response.data;
    },
    getPlans: async () => {
        const response = await api.get('/billing/plans');
        // API returns { success: true, data: [...plans] }
        return response.data.data || response.data;
    },
    upgradePlan: async (planId: number) => {
        const response = await api.post('/billing/upgrade', { plan_id: planId });
        return response.data;
    },
    getHistory: async () => {
        const response = await api.get('/billing/history');
        return response.data;
    }
};

export const onboardingService = {
    checkSubdomain: async (subdomain: string) => {
        const response = await api.get(`/ onboarding / check - subdomain ? subdomain = ${subdomain} `);
        return response.data;
    },
    signup: async (data: any) => {
        const response = await api.post('/onboarding/signup', data);
        return response.data;
    },
};

export const invoiceService = {
    getAll: async (params?: {
        search?: string;
        status?: string;
        dateFilter?: string;
        sort?: string;
    }) => {
        const response = await api.get<Invoice[]>('/invoices', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<Invoice>(`/ invoices / ${id} `);
        return response.data;
    },
    create: async (invoice: Invoice) => {
        const response = await api.post('/invoices', invoice);
        return response.data;
    },
    update: async (id: string, invoice: Invoice) => {
        const response = await api.put(`/ invoices / ${id} `, invoice);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/ invoices / ${id} `);
        return response.data;
    },
};

export const auditLogService = {
    getAll: async () => {
        const response = await api.get<AuditLogEntry[]>('/audit-logs');
        return response.data;
    },
};

export const companyProfileService = {
    getAll: async () => {
        const response = await api.get<CompanyProfile[]>('/company-profiles');
        return response.data;
    },
    update: async (id: string, profile: CompanyProfile) => {
        const response = await api.put(`/ company - profiles / ${id} `, profile);
        return response.data;
    },
};

export const invoiceTemplateService = {
    getAll: async () => {
        const response = await api.get<InvoiceTemplate[]>('/invoice-templates');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<InvoiceTemplate>(`/ invoice - templates / ${id} `);
        return response.data;
    },
    create: async (template: InvoiceTemplate) => {
        const response = await api.post('/invoice-templates', template);
        return response.data;
    },
    update: async (id: string, template: InvoiceTemplate) => {
        const response = await api.put(`/ invoice - templates / ${id} `, template);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/ invoice - templates / ${id} `);
        return response.data;
    },
};

export const aiInvoiceService = {
    parseInvoicePrompt: async (request: AIPromptRequest) => {
        const response = await api.post<AIPromptResponse>('/ai/parse-invoice', request);
        return response.data;
    },
};

export const companyTypeService = {
    getAll: async () => {
        const response = await api.get<import('../types/invoice').CompanyType[]>('/company-types');
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('/company-types', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put(`/ company - types / ${id} `, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/ company - types / ${id} `);
        return response.data;
    },
};

export const roleService = {
    getAll: async (params?: { company_type_id?: string }) => {
        const response = await api.get<any[]>('/roles', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<any>(`/ roles / ${id} `);
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('/roles', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put(`/ roles / ${id} `, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/ roles / ${id} `);
        return response.data;
    },
};

export const rightService = {
    getAll: async (params?: { group_by_module?: boolean }) => {
        const response = await api.get<any[]>('/rights', { params });
        return response.data;
    },
};

export const userService = {
    getAll: async () => {
        const response = await api.get<any[]>('/users');
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('/users', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put(`/ users / ${id} `, data);
        return response.data;
    },
};

