import { useAuthStore } from '../stores/authStore';

export const usePermission = (requiredRight: string): boolean => {
    const user = useAuthStore(state => state.user);
    if (!user) return false;
    const rights = user.rights ?? [];
    return rights.includes('*') || rights.includes(requiredRight);
};

export const hasPermissionSync = (requiredRight: string): boolean => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    const rights = user.rights ?? [];
    return user.role === 'admin' || rights.includes('*') || rights.includes(requiredRight);
};
