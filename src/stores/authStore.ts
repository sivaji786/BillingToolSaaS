import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    role: string;
}

interface Tenant {
    id: string;
    company_name: string;
    subdomain: string;
    custom_domain: string | null;
    plan_id: string;
    status: string;
    trial_ends_at: string;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    tenant: Tenant | null;
    token: string | null;
    login: (token: string, user: User, tenant: Tenant) => void;
    logout: () => void;
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
                // Clear all localStorage as per requirement
                localStorage.clear();
            },

            updateUser: (user) => {
                set({ user });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                user: state.user,
                tenant: state.tenant,
                token: state.token,
            }),
        }
    )
);
