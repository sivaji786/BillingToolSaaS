/**
 * Runtime Configuration Utility
 * 
 * This allows the API URL to be configured at runtime (after build)
 * instead of being hardcoded during the build process.
 * 
 * The installer will generate a config.js file with the correct API URL.
 */

// Extend Window interface to include APP_CONFIG
declare global {
    interface Window {
        APP_CONFIG?: {
            API_BASE_URL: string;
        };
    }
}

/**
 * Get the API base URL from runtime config or fallback to environment variable
 */
export const getApiBaseUrl = (): string => {
    // Priority 1: Runtime config (set by installer)
    if (typeof window !== 'undefined' && window.APP_CONFIG?.API_BASE_URL) {
        return window.APP_CONFIG.API_BASE_URL;
    }

    // Priority 2: Build-time environment variable (for development)
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }

    // Priority 3: Default fallback
    return 'http://localhost:8080';
};

/**
 * Get the base domain (e.g., example.com) from the current hostname.
 * This is used for tenant subdomain redirection.
 */
export const getBaseDomain = (): string => {
    const hostname = window.location.hostname;

    // Handle localhost and IP addresses
    if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        return hostname;
    }

    const parts = hostname.split('.');

    // If it's a simple domain like "example.com", return it.
    // If it's a subdomain like "tenant.example.com", we want "example.com".
    // This simple logic works for most cases unless we have complex TLDs like "co.uk".
    // For now, we take the last two parts.
    if (parts.length > 2) {
        // Check if the second to last part is a common short TLD part like "co", "com", "org", etc.
        // This is a heuristic. A better way would be using a TLD library, but let's keep it simple.
        return parts.slice(-2).join('.');
    }

    return hostname;
};

export default { getApiBaseUrl, getBaseDomain };
