/**
 * Parses a localized number string into a standard number.
 * Supports formats:
 * - 1.234,56 (European: dot for thousands, comma for decimals)
 * - 1,234.56 (US/UK: comma for thousands, dot for decimals)
 * - 1234 (Plain integer)
 * - 1234.56 (Plain float)
 */
export function parseLocalizedNumber(value: string): number {
    if (!value) return 0;

    // Remove all whitespace
    const cleanValue = value.replace(/\s/g, '');

    // Check for European format (1.234,56)
    // Heuristic: if last punctuation is a comma, and there are dots before it, or just a comma
    if (/^[0-9.]+,[0-9]+$/.test(cleanValue) || /^[0-9]+,[0-9]+$/.test(cleanValue)) {
        // Remove dots (thousands separators) and replace comma with dot
        return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'));
    }

    // Check for US/UK format (1,234.56)
    // Heuristic: if last punctuation is a dot, and there are commas before it
    if (/^[0-9,]+\.[0-9]+$/.test(cleanValue)) {
        // Remove commas (thousands separators)
        return parseFloat(cleanValue.replace(/,/g, ''));
    }

    // Fallback for plain numbers or mixed cases, try standard parsing
    // Remove all non-numeric characters except dot, comma, and minus
    // If multiple dots/commas, this might fail, but we try our best

    // If it looks like a standard number (only dots, no commas)
    if (/^-?\d*(\.\d+)?$/.test(cleanValue)) {
        return parseFloat(cleanValue);
    }

    // If it looks like a standard number with commas (only commas, no dots) -> treat as thousands separator usually, 
    // UNLESS it's like 1,5 (which is 1.5 in EU). 
    // Ambiguity: 1,234 (1234 or 1.234?)
    // We'll assume if it has 3 decimals it might be thousands, otherwise decimal? 
    // Actually, let's stick to the explicit patterns above. 
    // If none match, try replacing comma with dot if it's the only separator

    if (cleanValue.indexOf(',') !== -1 && cleanValue.indexOf('.') === -1) {
        // Only commas. 
        // 1,234 -> could be 1234 or 1.234
        // 1,5 -> 1.5
        // Let's assume it's a decimal separator if it's not in a standard thousands pattern (3 digits)
        // But 1,000 is usually 1000. 
        // Let's assume comma is decimal separator if there are no dots
        return parseFloat(cleanValue.replace(',', '.'));
    }

    return parseFloat(cleanValue.replace(/,/g, ''));
}
