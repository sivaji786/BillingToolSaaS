import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { redirectToMainDomain } from '../utils/config';
import { queryClient } from '../providers/QueryProvider';

interface User {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role: string;
    is_super_admin?: boolean;
    rights?: string[];
}

interface Tenant {
    id: string;
    company_name: string;
    subdomain: string;
    custom_domain: string | null;
    plan_id: string;
    status: string;
    trial_ends_at: string;
    ai_provider?: 'gemini' | 'openai';
    gemini_api_key?: string;
    openai_api_key?: string;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    tenant: Tenant | null;
    token: string | null;
    login: (token: string, user: User, tenant: Tenant) => void;
    logout: () => void;
    clearAuth: () => void;
    updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            tenant: null,
            token: null,

            login: (token, user, tenant) => {
                set({
                    isAuthenticated: true,
                    token,
                    user,
                    tenant,
                });
            },

            logout: () => {
                set({
                    isAuthenticated: false,
                    token: null,
                    user: null,
                    tenant: null,
                });
                queryClient.clear();
                // Remove the persisted key so stale user data can't survive into the next login.
                localStorage.removeItem('auth-storage');
                redirectToMainDomain('?logout=true');
            },

            clearAuth: () => {
                set({
                    isAuthenticated: false,
                    token: null,
                    user: null,
                    tenant: null,
                });
                queryClient.clear();
                localStorage.removeItem('auth-storage');
            },

            updateUser: (user) => {
                set({ user });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                token: state.token,
                user: state.user,
                tenant: state.tenant ? {
                    ...state.tenant,
                    gemini_api_key: undefined,
                    openai_api_key: undefined,
                } : null,
            }),
        }
    )
);
