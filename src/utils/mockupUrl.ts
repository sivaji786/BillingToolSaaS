import { getApiBaseUrl } from './config';

/**
 * Build the correct URL for a mockup file across dev and production.
 * Strips /index.php if present (CI4 without clean URL rewriting in production),
 * then appends /uploads/mockups/path.
 *
 * Dev:  http://localhost:8080          → http://localhost:8080/uploads/mockups/…
 * Prod: https://humpl.org/api/public/index.php
 *                                      → https://humpl.org/api/public/uploads/mockups/…
 */
export function getMockupUrl(path: string): string {
    const base = getApiBaseUrl()
        .replace(/\/index\.php$/, '')
        .replace(/\/$/, '');
    return `${base}/uploads/mockups/${path}`;
}
