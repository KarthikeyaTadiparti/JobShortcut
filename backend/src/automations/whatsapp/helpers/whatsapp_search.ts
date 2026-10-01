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
