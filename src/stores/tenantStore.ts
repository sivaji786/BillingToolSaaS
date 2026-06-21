import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantUIState {
  tourDismissed: boolean;
  sidebarCollapsed: boolean;
  unreadNotifications: number;

  dismissTour: () => void;
  resetTour: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setUnreadNotifications: (count: number) => void;
}

export const useTenantStore = create<TenantUIState>()(
  persist(
    (set) => ({
      tourDismissed: false,
      sidebarCollapsed: false,
      unreadNotifications: 0,

      dismissTour: () => set({ tourDismissed: true }),
      resetTour: () => set({ tourDismissed: false }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),
    }),
    {
      name: 'tenant-ui-storage',
      partialize: (state) => ({
        tourDismissed: state.tourDismissed,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
