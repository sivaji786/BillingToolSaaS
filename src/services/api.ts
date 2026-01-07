import axios from 'axios';
import { Invoice, InvoiceTemplate, CompanyProfile, AuditLogEntry, AIPromptRequest, AIPromptResponse } from '../types/invoice';
import { getApiBaseUrl } from '../utils/config';

// Use runtime configuration for API URL (can be changed after build by installer)
const API_URL = getApiBaseUrl();

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    me: async () => {
        const response = await api.get('/auth/me');
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
        const response = await api.get<Invoice>(`/invoices/${id}`);
        return response.data;
    },
    create: async (invoice: Invoice) => {
        const response = await api.post('/invoices', invoice);
        return response.data;
    },
    update: async (id: string, invoice: Invoice) => {
        const response = await api.put(`/invoices/${id}`, invoice);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/invoices/${id}`);
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
        const response = await api.put(`/company-profiles/${id}`, profile);
        return response.data;
    },
};

export const invoiceTemplateService = {
    getAll: async () => {
        const response = await api.get<InvoiceTemplate[]>('/invoice-templates');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<InvoiceTemplate>(`/invoice-templates/${id}`);
        return response.data;
    },
    create: async (template: InvoiceTemplate) => {
        const response = await api.post('/invoice-templates', template);
        return response.data;
    },
    update: async (id: string, template: InvoiceTemplate) => {
        const response = await api.put(`/invoice-templates/${id}`, template);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/invoice-templates/${id}`);
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
        const response = await api.put(`/company-types/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/company-types/${id}`);
        return response.data;
    },
};

export const roleService = {
    getAll: async (params?: { company_type_id?: string }) => {
        const response = await api.get<any[]>('/roles', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<any>(`/roles/${id}`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('/roles', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put(`/roles/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/roles/${id}`);
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
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },
};

