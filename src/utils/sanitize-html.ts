import DOMPurify from 'dompurify';

/**
 * Sanitize tenant/user-authored HTML before rendering via dangerouslySetInnerHTML.
 * Every call site that renders rich text sourced from a database field (CMS pages,
 * invoice/letter notes, template design layouts) must go through this — never pass
 * raw HTML straight to dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel'],
    });
}
