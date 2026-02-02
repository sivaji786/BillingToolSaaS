import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export const usePermission = (requiredRight: string) => {
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        checkPermission();
        // Listen for storage events in case of login/logout elsewhere
        window.addEventListener('storage', checkPermission);
        return () => window.removeEventListener('storage', checkPermission);
    }, [requiredRight]);

    const checkPermission = () => {
        try {
            const user = useAuthStore.getState().user;
            if (!user) {
                setHasPermission(false);
                return;
            }

            const rights = user.rights || [];

            if (rights.includes('*') || rights.includes(requiredRight)) {
                setHasPermission(true);
            } else {
                setHasPermission(false);
            }
        } catch (e) {
            setHasPermission(false);
        }
    };

    return hasPermission;
};

// Also export a synchronous function for use in loops/rendering where hook rules might be annoying
export const hasPermissionSync = (requiredRight: string): boolean => {
    try {
        const user = useAuthStore.getState().user;
        if (!user) return false;

        const rights = user.rights || [];

        return user.role === 'admin' || rights.includes('*') || rights.includes(requiredRight);
    } catch (e) {
        return false;
    }
};
