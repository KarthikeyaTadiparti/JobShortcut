/**
 * Generates search candidate queries for a group or channel without stripping essential keywords.
 */
export function getSearchCandidates(name: string): string[] {
    const candidates: string[] = [];

    const trimmed = name.trim();
    if (trimmed) {
        candidates.push(trimmed);
    }

    // 1. Remove bracketed/parenthesized suffixes (e.g., "(2026 Batch)" -> "Placement Officer")
    const noBrackets = trimmed.replace(/\s*[\(\[\{].*?[\)\]\}]/g, '').trim();
    if (noBrackets && !candidates.includes(noBrackets)) {
        candidates.push(noBrackets);
    }

    // 2. Remove leading serial numbers (e.g., "39 -Freshersdunia.in..." -> "Freshersdunia.in...")
    const noPrefixNumber = noBrackets.replace(/^\d+\s*[-–]\s*/, '').trim();
    if (noPrefixNumber && noPrefixNumber.length >= 3 && !candidates.includes(noPrefixNumber)) {
        candidates.push(noPrefixNumber);
    }

    // 3. Extract primary domain/brand name (e.g., "Freshersdunia.in - Freshers Job" -> "Freshersdunia.in")
    const primarySection = noPrefixNumber.split(/\s*[-–|]\s*/)[0]?.trim();
    if (primarySection && primarySection.length >= 5 && !candidates.includes(primarySection)) {
        candidates.push(primarySection);
    }

    return candidates;
}

/**
 * Normalizes a chat title for comparison: unified dashes, no non-breaking/zero-width
 * spaces, collapsed whitespace, lowercase. Mirrored inside page.evaluate() callbacks.
 */
export function normalizeChatName(name: string): string {
    return name
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/[\u00A0\u2000-\u200B]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

/**
 * How well a chat title matches a configured source name:
 * 3 = identical, 2 = title contains the full name, 1 = title equals a search candidate
 * (e.g. the name without its "39 -" prefix), 0 = no match. Never matches on message
 * previews or partial words, so "Fresher Openings - 85" is not "Fresher Openings - 86".
 */
export function chatNameMatchLevel(title: string, sourceName: string): number {
    const actual = normalizeChatName(title);
    const expected = normalizeChatName(sourceName);
    if (!actual || !expected) return 0;
    if (actual === expected) return 3;
    if (actual.includes(expected)) return 2;
    const candidates = getSearchCandidates(sourceName).map(normalizeChatName);
    return candidates.some((c) => c.length >= 4 && actual === c) ? 1 : 0;
}

/** True when the title belongs to the configured source (any match level). */
export function isSameChatName(title: string, sourceName: string): boolean {
    return chatNameMatchLevel(title, sourceName) > 0;
}
