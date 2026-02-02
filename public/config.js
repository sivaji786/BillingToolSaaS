// Runtime configuration - dynamically set based on current hostname
// This ensures multi-tenant subdomains work correctly
(function () {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // For localhost (development), use port 8080
    // For production domains, use /api/public path
    let apiBaseUrl;
    if (hostname.includes('localhost')) {
        apiBaseUrl = protocol + '//' + hostname + ':8080';
    } else {
        // Production: use the base domain with /api/public
        // Extract base domain (e.g., humpl.org from nexus-ai.humpl.org)
        const parts = hostname.split('.');
        const baseDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
        apiBaseUrl = protocol + '//' + baseDomain + '/api/public';
    }

    window.APP_CONFIG = {
        API_BASE_URL: apiBaseUrl
    };
})();
