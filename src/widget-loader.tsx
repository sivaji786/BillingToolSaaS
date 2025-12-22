import React from 'react';
import { createRoot } from 'react-dom/client';
import { TicketingWidget } from './components/TicketingWidget';
import { Toaster } from './components/ui/sonner';
import './index.css'; // This might be too large, but for now we'll use it

interface WidgetOptions {
    apiKey: string;
    apiBaseUrl?: string;
    containerId?: string;
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
            <TicketingWidget apiKey={options.apiKey} apiBaseUrl={options.apiBaseUrl} />
            <Toaster />
        </React.StrictMode>
    );
};

// Auto-init if data attributes are present on a script tag
if (typeof document !== 'undefined') {
    const script = document.currentScript as HTMLScriptElement;
    if (script) {
        const apiKey = script.getAttribute('data-api-key');
        const apiBaseUrl = script.getAttribute('data-api-base-url');
        if (apiKey) {
            initTicketingWidget({ apiKey, apiBaseUrl: apiBaseUrl || undefined });
        }
    }
}
