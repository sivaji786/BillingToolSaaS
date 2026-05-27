import type { FaqEntry, CategoryDef } from '../data/faqTypes';
import { FAQ, CATEGORIES, SCREEN_CATEGORY_MAP } from '../data/helpFaq';

const STOP_WORDS = new Set([
    'how', 'do', 'i', 'a', 'an', 'the', 'is', 'to', 'can', 'what', 'where',
    'why', 'my', 'me', 'we', 'it', 'in', 'of', 'for', 'and', 'or', 'on',
    'with', 'get', 'this', 'that', 'there', 'when', 'be', 'are', 'was',
]);

export function tokenise(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

export function findBestMatch(query: string, faq: FaqEntry[]): FaqEntry | null {
    const tokens = tokenise(query);
    if (!tokens.length) return null;

    let best: FaqEntry | null = null;
    let bestScore = 0;

    for (const entry of faq) {
        const score = tokens.filter(t => entry.keywords.includes(t)).length;
        const normalised = score / Math.sqrt(entry.keywords.length);
        if (normalised > bestScore) {
            bestScore = normalised;
            best = entry;
        }
    }

    return bestScore > 0 ? best : null;
}

export function getByCategory(category: string, faq: FaqEntry[]): FaqEntry[] {
    return faq.filter(e => e.category === category);
}

export function getById(id: string, faq: FaqEntry[]): FaqEntry | undefined {
    return faq.find(e => e.id === id);
}

export function suggestedCategories(
    currentScreen: string,
    categories: CategoryDef[],
    screenMap: Record<string, string>,
): CategoryDef[] {
    const primary = screenMap[currentScreen];
    if (!primary) return categories;
    return [
        ...categories.filter(c => c.id === primary),
        ...categories.filter(c => c.id !== primary),
    ];
}

// Convenience re-exports for the tenant (default) bot
export { FAQ, CATEGORIES, SCREEN_CATEGORY_MAP };
