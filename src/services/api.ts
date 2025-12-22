import axios from 'axios';
import { Invoice, InvoiceTemplate, CompanyProfile, AuditLogEntry } from '../types/invoice';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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
