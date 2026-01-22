import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
    children: ReactNode;
    requireAuth?: boolean;
    requireRole?: 'admin' | 'customer';
}

export function ProtectedRoute({ children, requireAuth = true, requireRole }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        // If authentication is required but user is not authenticated
        if (requireAuth && !isAuthenticated) {
            window.location.hash = 'login';
            return;
        }

        // If specific role is required
        if (requireRole && user?.role !== requireRole) {
            // Redirect to appropriate dashboard based on role
            if (user?.role === 'admin') {
                window.location.hash = 'admin';
            } else {
                window.location.hash = 'customer-dashboard';
            }
        }
    }, [requireAuth, isAuthenticated, requireRole, user]);

    // Don't render children if not authenticated or wrong role
    if (requireAuth && !isAuthenticated) {
        return null;
    }

    if (requireRole && user?.role !== requireRole) {
        return null;
    }

    return <>{children}</>;
}
