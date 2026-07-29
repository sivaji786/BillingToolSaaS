import { useAuthStore } from '../stores/authStore';

interface PermissionUser {
    role: string;
    rights?: string[];
}

/**
 * Canonical "does this user bypass all right checks" test — the single source of
 * truth for the super-admin bypass on the frontend, mirroring
 * UserModel::isEffectiveSuperAdmin() on the backend. Everything that needs this
 * decision (usePermission, hasPermissionSync, App.tsx's hasBillingAccess) calls
 * this instead of re-deriving it.
 */
export const isEffectiveSuperAdmin = (user: PermissionUser | null | undefined): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'owner' || (user.rights ?? []).includes('*');
};

export const usePermission = (requiredRight: string): boolean => {
    const user = useAuthStore(state => state.user);
    if (!user) return false;
    return isEffectiveSuperAdmin(user) || (user.rights ?? []).includes(requiredRight);
};

export const hasPermissionSync = (requiredRight: string): boolean => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    return isEffectiveSuperAdmin(user) || (user.rights ?? []).includes(requiredRight);
};
