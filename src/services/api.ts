import axios from 'axios';
import { Invoice, InvoiceTemplate, CompanyProfile, AuditLogEntry, AIPromptRequest, AIPromptResponse, Buyer } from '../types/invoice';
import { getApiBaseUrl } from '../utils/config';
import { useAuthStore } from '../stores/authStore';

// Use runtime configuration for API URL (can be changed after build by installer)
const API_URL = getApiBaseUrl();
console.log('API_URL Final:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Add auth token - use Zustand store
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['X-Authorization'] = `Bearer ${token}`;
    }

    // Note: We no longer auto-inject X-Tenant-ID here.
    // The Backend now extracts tenant_id directly from the JWT Token.
    // For legacy or specific overrides, you can still manually pass X-Tenant-ID in the config object of a specific call.

    return config;
});

// Handle auto-redirect for workspace mismatches and token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('API Error Response:', error.response.status, error.response.data);
        } else {
            console.error('API Error Message:', error.message);
        }

        if (error.response?.status === 401) {
            console.warn('Unauthorized or token expired, logging out...');
            useAuthStore.getState().logout();
            // Optional: for fully certain redirect if store update doesn't trigger parent re-render
            if (!window.location.hash.includes('login') && !window.location.hash.includes('landing')) {
                window.location.hash = '#login';
            }
        }

        if (error.response?.status === 403 && error.response.data?.redirect_url) {
            console.log('Tenant mismatch detected, redirecting to correct workspace:', error.response.data.redirect_url);
            window.location.href = error.response.data.redirect_url;
        }
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const data = response.data.data || response.data;

        // Note: We don't manually set raw localStorage here anymore.
        // The calling component or store.login() handles persistence via Zustand.

        return data;
    },
    logout: () => {
        // Broad clear is removed to avoid cross-portal logout. 
        // Individual stores handle their own state.
    },
    me: async () => {
        const response = await api.get('/auth/me');
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
        const response = await api.get(`/onboarding/check-subdomain?subdomain=${subdomain}`);
        return response.data;
    },
    getCountries: async (lang: string = 'en') => {
        const response = await api.get(`/api/countries?lang=${lang}`);
        return response.data;
    },
    signup: async (data: {
        company_name: string;
        website?: string;
        subdomain: string;
        email: string;
        password: string;
        plan_id?: string;
        phone: string;
        address?: string;
        city: string;
        country: string;
        postal_code?: string;
    }) => {
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

export const buyerService = {
    getAll: async () => {
        const response = await api.get<Buyer[]>('/buyers');
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<import('../types/invoice').Buyer>(`/buyers/${id}`);
        return response.data;
    },
    create: async (buyer: any) => {
        const response = await api.post('/buyers', buyer);
        return response.data;
    },
    update: async (id: string, buyer: any) => {
        const response = await api.put(`/buyers/${id}`, buyer);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/buyers/${id}`);
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

export const workspaceService = {
    list: async (path: string = '') => {
        const response = await api.get('/workspace/list', { params: { path } });
        return response.data;
    },
    upload: async (path: string, files: FileList | File[], onUploadProgress?: (progressEvent: any) => void) => {
        const formData = new FormData();
        formData.append('path', path);
        Array.from(files).forEach(file => {
            formData.append('files[]', file);
        });
        const response = await api.post('/workspace/upload', formData, {
            onUploadProgress
        });
        return response.data;
    },
    mkdir: async (path: string, name: string) => {
        const response = await api.post('/workspace/mkdir', { path, name });
        return response.data;
    },
    delete: async (path: string, items: string[]) => {
        const response = await api.post('/workspace/delete', { path, items });
        return response.data;
    },
    download: async (path: string, name: string) => {
        const response = await api.get('/workspace/download', {
            params: { path, name },
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },
    search: async (query: string, path: string = '') => {
        const response = await api.get('/workspace/search', { params: { q: query, path } });
        return response.data;
    },
    extractZip: async (path: string, name: string, toFolder: boolean, deleteSource: boolean) => {
        const response = await api.post('/workspace/extract-zip', { path, name, toFolder, deleteSource });
        return response.data;
    },
    rename: async (path: string, oldName: string, newName: string) => {
        const response = await api.post('/workspace/rename', { path, oldName, newName });
        return response.data;
    },
    open: async (path: string, name: string) => {
        const response = await api.post('/workspace/open', { path, name });
        return response.data;
    },
    downloadZip: async (path: string, items: string[]) => {
        const response = await api.post('/workspace/download-zip', { path, items }, {
            responseType: 'blob'
        });

        // Extract filename from Content-Disposition header if present
        let filename = 'workspace_export.zip';
        const disposition = response.headers['content-disposition'];
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
    aiSearch: async (prompt: string, path: string) => {
        const response = await api.post('/workspace/ai-search', { prompt, path });
        return response.data;
    },
    getAiHistory: async () => {
        const response = await api.get('/workspace/ai-history');
        return response.data;
    }
};

