import React from 'react';
import { createRoot } from 'react-dom/client';
import { TicketingWidget } from './components/TicketingWidget';
import { Toaster } from './components/ui/sonner';
import './index.css';

interface WidgetOptions {
    apiKey: string;
    apiBaseUrl?: string;
    containerId?: string;
    userId?: string;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    screenshotEnabled?: boolean;
    zIndex?: number;
    launcherIcon?: 'message' | 'bug' | 'help' | 'chat';
    launcherLabel?: string;
}

export const initTicketingWidget = (options: WidgetOptions) => {
    const containerId = options.containerId || 'ticketing-widget-container';
    let container = document.getElementById(containerId);

    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }

    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <TicketingWidget
                apiKey={options.apiKey}
                apiBaseUrl={options.apiBaseUrl}
                userId={options.userId}
                position={options.position}
                screenshotEnabled={options.screenshotEnabled ?? true}
                zIndex={options.zIndex ?? 9999}
                launcherIcon={options.launcherIcon}
                launcherLabel={options.launcherLabel}
            />
            <Toaster />
        </React.StrictMode>
    );
};

if (typeof document !== 'undefined') {
    const script = document.currentScript as HTMLScriptElement;
    if (script) {
        const apiKey = script.getAttribute('data-api-key');
        const apiBaseUrl = script.getAttribute('data-api-base-url');
        const userId = script.getAttribute('data-user-id') || undefined;
        const position = (script.getAttribute('data-position') || 'bottom-right') as WidgetOptions['position'];
        const screenshotEnabled = script.getAttribute('data-screenshot') !== 'false';
        const zIndex = script.getAttribute('data-z-index') ? Number(script.getAttribute('data-z-index')) : 9999;
        const launcherIcon = (script.getAttribute('data-launcher-icon') || 'message') as WidgetOptions['launcherIcon'];
        const launcherLabel = script.getAttribute('data-launcher-label') || undefined;

        if (apiKey) {
            initTicketingWidget({ apiKey, apiBaseUrl: apiBaseUrl || undefined, userId, position, screenshotEnabled, zIndex, launcherIcon, launcherLabel });
        }
    }
}
