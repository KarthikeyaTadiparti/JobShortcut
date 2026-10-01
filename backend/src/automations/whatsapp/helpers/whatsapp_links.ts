/**
 * Cleans extracted URL to remove trailing punctuation, bracket symbols, or timestamp artifacts.
 */
export function cleanExtractedUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    url = url.replace(/[.,;:!?)>"']+$/, '');
    url = url.replace(/\/\d{1,2}:\d{2}(:\d{2})?(am|pm)?$/i, '/');
    url = url.replace(/\d{1,2}:\d{2}(:\d{2})?(am|pm)?$/i, '');
    return url;
}

/**
 * Checks if a given hyperlink matches the target domain or any allowed domain aliases.
 */
export function isMatchingDomain(
    href: string,
    source: { targetDomain: string; allowedDomains?: string[] | undefined }
): boolean {
    if (!href) return false;
    try {
        const urlObj = new URL(href);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");
        const target = source.targetDomain.toLowerCase().replace(/^www\./, "");

        if (hostname === target || hostname.endsWith(`.${target}`) || target.endsWith(`.${hostname}`)) {
            return true;
        }

        if (source.allowedDomains && source.allowedDomains.length > 0) {
            return source.allowedDomains.some((d) => {
                const normD = d.toLowerCase().replace(/^www\./, "");
                return hostname === normD || hostname.endsWith(`.${normD}`) || normD.endsWith(`.${hostname}`);
            });
        }

        return false;
    } catch {
        return false;
    }
}
