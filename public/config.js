// Runtime configuration - dynamically set based on current hostname
// This ensures multi-tenant subdomains work correctly
(function () {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    let apiBaseUrl;
    const port = window.location.port;
    if (hostname.includes('localhost') && port === '4173') {
        // Preview mode: use relative URLs so the vite preview proxy forwards to backend
        apiBaseUrl = '';
    } else if (hostname.includes('localhost')) {
        // Dev mode (port 3000): backend runs locally on 8080
        apiBaseUrl = protocol + '//' + hostname + ':8080';
    } else {
        // Production: use the exact hostname to avoid Cross-Origin (CORS) issues
        // e.g., nexus-ai.humpl.org/api/public
        apiBaseUrl = protocol + '//' + hostname + '/api/public';
    }

    window.APP_CONFIG = {
        API_BASE_URL: apiBaseUrl
    };
})();
