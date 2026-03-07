// Runtime configuration - dynamically set based on current hostname
// This ensures multi-tenant subdomains work correctly
(function () {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // For localhost (development), use port 8080
    // For production domains, use the current hostname with /api/public path
    let apiBaseUrl;
    if (hostname.includes('localhost')) {
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
