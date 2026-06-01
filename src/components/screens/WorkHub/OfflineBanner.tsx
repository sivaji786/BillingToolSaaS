import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getApiBaseUrl } from '../../../utils/config';

const PING_INTERVAL_MS = 30 * 1000;
const PING_TIMEOUT_MS  = 5 * 1000;

async function pingApi(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
        const r = await fetch(`${getApiBaseUrl()}/ping`, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        return r.ok;
    } catch {
        return false;
    }
}

export function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOnline  = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online',  handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic API ping to detect portal/firewall scenarios where navigator.onLine is true but API unreachable
        const interval = setInterval(async () => {
            if (navigator.onLine) {
                const reachable = await pingApi();
                setIsOnline(reachable);
            }
        }, PING_INTERVAL_MS);

        return () => {
            window.removeEventListener('online',  handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (isOnline) {
            setShowReconnected(true);
            const t = setTimeout(() => setShowReconnected(false), 3000);
            return () => clearTimeout(t);
        }
    }, [isOnline]);

    if (isOnline && !showReconnected) return null;

    return (
        <div
            className={cn(
                'fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-body font-medium transition-all',
                isOnline
                    ? 'bg-green-600 text-white'
                    : 'bg-orange-500 text-white'
            )}
            role="status"
            aria-live="polite"
        >
            {isOnline ? (
                <>
                    <Wifi className="h-4 w-4" />
                    Back online — changes synced.
                </>
            ) : (
                <>
                    <WifiOff className="h-4 w-4" />
                    Offline — changes will sync when reconnected.
                </>
            )}
        </div>
    );
}
