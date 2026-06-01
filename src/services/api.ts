import axios from 'axios';
import { toast } from "sonner";
import { Invoice, InvoiceTemplate, CompanyProfile, AuditLogEntry, AIPromptRequest, AIPromptResponse, Buyer, CompanyType, Role, Right, UserRecord } from '../types/invoice';
import { getApiBaseUrl } from '../utils/config';
import { useAuthStore } from '../stores/authStore';

const API_URL = getApiBaseUrl();

export const api = axios.create({
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
        if (error.response?.status === 401) {
            const isLoginRequest = error.config?.url?.includes('/auth/login');
            const hash = window.location.hash.replace('#', '').replace(/^\//, '');
            const publicScreens = ['landing', 'login', 'signup', 'impressum', 'privacyPolicy', 'termsAndConditions', 'cookiePolicy', 'packageComparison', 'reset-password'];
            const isPublicPage = !hash || publicScreens.some(s => hash.startsWith(s));

            if (isLoginRequest || isPublicPage) {
                useAuthStore.getState().clearAuth();
            } else {
                useAuthStore.getState().logout();
            }
        }

        if (error.response?.status === 403 && error.response.data?.redirect_url) {
            window.location.href = error.response.data.redirect_url;
        }

        // Handle Limit Exceeded errors specifically
        const message = error.response?.data?.message || '';
        if (message.toLowerCase().includes('limit exceeded')) {
            toast.error('Limit Reached', {
                description: message,
                action: {
                    label: 'Go to Billing',
                    onClick: () => window.location.hash = '#billing'
                },
                duration: 6000
            });
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
    logout: async () => {
        try {
            // Tell the server to destroy the PHP session.
            // Fire-and-forget: local state is cleared regardless of network result.
            await api.post('/auth/logout');
        } catch {
            // Ignore errors — local cleanup always proceeds.
        }
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
    forgotPassword: async (email: string) => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },
    resetPassword: async (token: string, password: string) => {
        const response = await api.post('/auth/reset-password', { token, password });
        return response.data;
    },
    getSsoProviders: async (): Promise<string[]> => {
        try {
            const response = await api.get('/auth/sso/providers');
            return response.data?.providers ?? [];
        } catch {
            return [];
        }
    },
    getSsoRedirectUrl: async (provider: string): Promise<string> => {
        const response = await api.get(`/auth/sso/${provider}/redirect`);
        return response.data?.redirect_url ?? '';
    },
    getSsoIdentities: async (): Promise<Array<{ id: number; provider: string; email: string; name: string; last_login_at: string }>> => {
        try {
            const response = await api.get('/auth/sso/identities');
            return response.data?.identities ?? [];
        } catch { return []; }
    },
    getSsoLinkUrl: async (provider: string): Promise<string> => {
        const response = await api.get(`/auth/sso/${provider}/redirect`, { params: { action: 'link' } });
        return response.data?.redirect_url ?? '';
    },
    unlinkSso: async (provider: string): Promise<void> => {
        await api.delete(`/auth/sso/${provider}/unlink`);
    },
};

export const ssoSettingsService = {
    get: async () => {
        const response = await api.get('/settings/sso');
        return response.data;
    },
    update: async (data: object) => {
        const response = await api.put('/settings/sso', data);
        return response.data;
    },
    testDiscovery: async (issuerUrl: string) => {
        const response = await api.post('/auth/oidc/test-discovery', { issuer_url: issuerUrl });
        return response.data;
    },
};


export const billingService = {
    getSubscription: async () => {
        const response = await api.get('/billing/subscription');
        return response.data;
    },
    getPlans: async () => {
        const response = await api.get('/billing/plans');
        const d = response.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.plans)) return d.plans;
        return [];
    },
    getPackageServices: async () => {
        const response = await api.get('/billing/package-services');
        const d = response.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        return [];
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
    verifyEmail: async (data: { email: string; code: string }) => {
        const response = await api.post('/onboarding/verify-email', data);
        return response.data;
    },
    resendVerification: async (data: { email: string }) => {
        const response = await api.post('/onboarding/resend-verification', data);
        return response.data;
    },
};

export const invoiceService = {
    getAll: async (params?: {
        search?: string;
        status?: string;
        dateFilter?: string;
        customDateFrom?: string;
        customDateTo?: string;
        sort?: string;
        templateType?: string;
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
    generateShareLink: async (id: string): Promise<{ shareUrl: string; token: string }> => {
        const response = await api.post<{ shareUrl: string; token: string }>(`/invoices/${id}/share`);
        return response.data;
    },
    getByShareToken: async (token: string): Promise<Invoice> => {
        const response = await api.get<Invoice>(`/public/invoices/${token}`);
        return response.data;
    },
};

export const letterService = {
    getAll: async (params?: {
        search?: string;
        status?: string;
        dateFilter?: string;
        sort?: string;
    }) => {
        const response = await api.get<Invoice[]>('/letters', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<Invoice>(`/letters/${id}`);
        return response.data;
    },
    create: async (letter: Invoice) => {
        const response = await api.post('/letters', letter);
        return response.data;
    },
    update: async (id: string, letter: Invoice) => {
        const response = await api.put(`/letters/${id}`, letter);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/letters/${id}`);
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
        const response = await api.get<Buyer>(`/buyers/${id}`);
        return response.data;
    },
    create: async (buyer: Partial<Buyer>) => {
        const response = await api.post('/buyers', buyer);
        return response.data;
    },
    update: async (id: string, buyer: Partial<Buyer>) => {
        const response = await api.put(`/buyers/${id}`, buyer);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/buyers/${id}`);
        return response.data;
    },
    import: async (buyers: Partial<Buyer>[]): Promise<{ created: number; skipped: number; errors: number }> => {
        const response = await api.post('/buyers/import', { buyers });
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

export const aiLetterService = {
    improveBody: async (body: string, language?: string, context?: {
        subject?: string;
        recipient?: string;
        sender?: string;
    }) => {
        const response = await api.post<{ body: string }>('/ai/improve-letter-body', { body, language, context });
        return response.data;
    },
};

export const companyTypeService = {
    getAll: async () => {
        const response = await api.get<CompanyType[]>('/company-types');
        return response.data;
    },
    create: async (data: Pick<CompanyType, 'name'>) => {
        const response = await api.post('/company-types', data);
        return response.data;
    },
    update: async (id: string, data: Pick<CompanyType, 'name'>) => {
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
        const response = await api.get<Role[]>('/roles', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get<Role>(`/roles/${id}`);
        return response.data;
    },
    create: async (data: Omit<Role, 'id'>) => {
        const response = await api.post('/roles', data);
        return response.data;
    },
    update: async (id: string, data: Partial<Omit<Role, 'id'>>) => {
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
        const response = await api.get<Right[]>('/rights', { params });
        return response.data;
    },
};

export const userService = {
    getAll: async () => {
        const response = await api.get<UserRecord[]>('/users');
        return response.data;
    },
    create: async (data: Omit<UserRecord, 'id'>) => {
        const response = await api.post('/users', data);
        return response.data;
    },
    update: async (id: string, data: Partial<Omit<UserRecord, 'id'>>) => {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },
};

export const workspaceService = {
    list: async (path: string = '') => {
        const response = await api.get('/workspace/list', { params: { path } });
        return response.data;
    },
    upload: async (path: string, files: FileList | File[], onUploadProgress?: (progressEvent: import('axios').AxiosProgressEvent) => void) => {
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

export const publicCmsService = {
    getPage: async (slug: string, lang = 'en') => {
        const response = await api.get(`/api/public/cms/${slug}`, { params: { lang } });
        return response.data;
    },
    getNavPages: async (lang = 'en') => {
        const response = await api.get('/api/public/cms/nav', { params: { lang } });
        return response.data;
    },
};
