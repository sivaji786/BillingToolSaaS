/**
 * i18n key coverage test.
 * Ensures all keys present in the base English translation exist in every other locale.
 * A missing key means the UI will show raw key strings or fall back to English,
 * causing a broken experience in that language.
 *
 * Run: npx vitest run src/tests/i18n/coverage.test.ts
 */
import { describe, it, expect } from 'vitest';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            return flattenKeys(v as Record<string, unknown>, key);
        }
        return [key];
    });
}

describe('i18n key coverage', () => {
    it('EN → DE: no missing keys', async () => {
        const { en } = await import('../../translations/en');
        const { de } = await import('../../translations/de');
        const enKeys = flattenKeys(en as unknown as Record<string, unknown>);
        const deKeys = new Set(flattenKeys(de as unknown as Record<string, unknown>));
        const missing = enKeys.filter((k) => !deKeys.has(k));
        expect(missing, `DE is missing ${missing.length} keys:\n${missing.slice(0, 20).join('\n')}`).toHaveLength(0);
    });

    it('EN → PL: no missing keys', async () => {
        const { en } = await import('../../translations/en');
        const { pl } = await import('../../translations/pl');
        const enKeys = flattenKeys(en as unknown as Record<string, unknown>);
        const plKeys = new Set(flattenKeys(pl as unknown as Record<string, unknown>));
        const missing = enKeys.filter((k) => !plKeys.has(k));
        expect(missing, `PL is missing ${missing.length} keys:\n${missing.slice(0, 20).join('\n')}`).toHaveLength(0);
    });

    it('EN → AR: no missing keys', async () => {
        const { en } = await import('../../translations/en');
        const { ar } = await import('../../translations/ar');
        const enKeys = flattenKeys(en as unknown as Record<string, unknown>);
        const arKeys = new Set(flattenKeys(ar as unknown as Record<string, unknown>));
        const missing = enKeys.filter((k) => !arKeys.has(k));
        expect(missing, `AR is missing ${missing.length} keys:\n${missing.slice(0, 20).join('\n')}`).toHaveLength(0);
    });

    it('EN → FR: no missing keys', async () => {
        const { en } = await import('../../translations/en');
        const { fr } = await import('../../translations/fr');
        const enKeys = flattenKeys(en as unknown as Record<string, unknown>);
        const frKeys = new Set(flattenKeys(fr as unknown as Record<string, unknown>));
        const missing = enKeys.filter((k) => !frKeys.has(k));
        expect(missing, `FR is missing ${missing.length} keys:\n${missing.slice(0, 20).join('\n')}`).toHaveLength(0);
    });

    it('EN → IT: no missing keys', async () => {
        const { en } = await import('../../translations/en');
        const { it } = await import('../../translations/it');
        const enKeys = flattenKeys(en as unknown as Record<string, unknown>);
        const itKeys = new Set(flattenKeys(it as unknown as Record<string, unknown>));
        const missing = enKeys.filter((k) => !itKeys.has(k));
        expect(missing, `IT is missing ${missing.length} keys:\n${missing.slice(0, 20).join('\n')}`).toHaveLength(0);
    });

    it('non-base locales have no empty string values (EN may have intentional content placeholders)', async () => {
        // EN is excluded: some keys like impressum.sourceNote are intentionally empty
        // (tenant-specific content filled at deploy time, not a translation).
        const locales = await Promise.all([
            import('../../translations/de').then((m) => ({ lang: 'de', data: m.de })),
            import('../../translations/fr').then((m) => ({ lang: 'fr', data: m.fr })),
        ]);

        // Keys whose values are legitimately empty — filled by the tenant at deploy time.
        const CONTENT_PLACEHOLDERS = ['impressum.sourceNote', 'impressum.sections.legalNotice.content'];

        for (const { lang, data } of locales) {
            const findEmpty = (obj: Record<string, unknown>, prefix = ''): string[] =>
                Object.entries(obj).flatMap(([k, v]) => {
                    const key = prefix ? `${prefix}.${k}` : k;
                    if (CONTENT_PLACEHOLDERS.includes(key)) return [];
                    if (v !== null && typeof v === 'object') return findEmpty(v as Record<string, unknown>, key);
                    if (v === '') return [key];
                    return [];
                });
            const empty = findEmpty(data as unknown as Record<string, unknown>);
            expect(empty, `${lang} has empty string values at: ${empty.join(', ')}`).toHaveLength(0);
        }
    });
});
