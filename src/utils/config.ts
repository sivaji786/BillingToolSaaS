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

export default { getApiBaseUrl };
