import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminUser } from '../types/admin';

interface AdminState {
    // Authentication
    isAuthenticated: boolean;
    adminUser: AdminUser | null;
    token: string | null;

    // Theme
    theme: 'light' | 'dark' | 'system';

    // UI State
    sidebarCollapsed: boolean;

    // Actions
    setAuth: (user: AdminUser, token: string) => void;
    logout: () => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAdminStore = create<AdminState>()(
    persist(
        (set) => ({
            // Initial state - will be overridden by persisted state
            isAuthenticated: false,
            adminUser: null,
            token: null,
            theme: 'light',
            sidebarCollapsed: false,

            // Actions
            setAuth: (user, token) => {
                set({ isAuthenticated: true, adminUser: user, token });
            },

            logout: () => {
                set({ isAuthenticated: false, adminUser: null, token: null });
            },

            setTheme: (theme) => {
                // Apply theme to document
                const root = document.documentElement;
                if (theme === 'dark') {
                    root.classList.add('dark');
                } else if (theme === 'light') {
                    root.classList.remove('dark');
                } else {
                    // System preference
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) {
                        root.classList.add('dark');
                    } else {
                        root.classList.remove('dark');
                    }
                }
                set({ theme });
            },

            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        }),
        {
            name: 'admin-storage',
            // Persist authentication state, theme, and sidebar state
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                adminUser: state.adminUser,
                token: state.token,
                theme: state.theme,
                sidebarCollapsed: state.sidebarCollapsed,
            }),
        }
    )
);

// Initialize theme on app load
if (typeof window !== 'undefined') {
    const store = useAdminStore.getState();
    store.setTheme(store.theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentTheme = useAdminStore.getState().theme;
        if (currentTheme === 'system') {
            useAdminStore.getState().setTheme('system');
        }
    });
}
