import { useState, useEffect } from 'react';

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
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                setHasPermission(false);
                return;
            }

            const user = JSON.parse(userStr);
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
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;

        const user = JSON.parse(userStr);
        const rights = user.rights || [];

        return rights.includes('*') || rights.includes(requiredRight);
    } catch (e) {
        return false;
    }
};
