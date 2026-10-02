import { normalizeJobUrl } from "@/utils/normalize-url.js";
import { type Page } from "playwright";
import type { WhatsAppSourceConfig, WhatsAppChannelConfig } from "@/automations/whatsapp/config/whatsapp_sources.js";
import { ExtractionScope } from "@/automations/whatsapp/whatsapp_types.js";
import {
    collectScopeMessagesWithStats,
    type HarvestOptions,
    type HarvestStats,
} from "./whatsapp_harvester.js";

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

        // The link must be the target domain or one of its subdomains. (A parent domain of the
        // target, e.g. "co.in" for "x.co.in", is not a match.)
        if (hostname === target || hostname.endsWith(`.${target}`)) {
            return true;
        }

        if (source.allowedDomains && source.allowedDomains.length > 0) {
            return source.allowedDomains.some((d) => {
                const normD = d.toLowerCase().replace(/^www\./, "");
                return hostname === normD || hostname.endsWith(`.${normD}`);
            });
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * First path segments that are site chrome (social-join pages, legal pages, listing pages),
 * never a job post. Compared case-insensitively. Extend this when a new junk link shows up.
 */
const NON_JOB_PATH_SEGMENTS = new Set([
    "whatsapp",
    "telegram",
    "join",
    "about",
    "about-us",
    "contact",
    "contact-us",
    "privacy-policy",
    "disclaimer",
    "terms",
    "category",
    "tag",
    "page",
    "feed",
    "search",
    "author",
]);

/** Compiles a source's jobPathPattern; an invalid pattern is ignored rather than dropping every link. */
function compileJobPathPattern(pattern: string | undefined): RegExp | undefined {
    if (!pattern) return undefined;
    try {
        return new RegExp(pattern);
    } catch {
        return undefined;
    }
}

/**
 * True when the URL looks like an individual job post: it has a path (not a homepage), the
 * path does not start with a known non-job segment, and it matches the source's optional
 * job path pattern.
 */
export function isJobPostUrl(href: string, jobPathPattern?: RegExp): boolean {
    try {
        const pathname = new URL(href).pathname.replace(/\/+$/, "");
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length === 0) return false;
        if (NON_JOB_PATH_SEGMENTS.has(segments[0]!.toLowerCase())) return false;
        return !jobPathPattern || jobPathPattern.test(pathname);
    } catch {
        return false;
    }
}

/**
 * Returns the message links that belong to the source's domains and point at a job post,
 * cleaned and normalized with normalizeJobUrl so tracking-parameter and trailing-slash
 * variants collapse to one URL.
 */
export function extractSourceLinks(
    rawLinks: string[],
    source: { targetDomain: string; allowedDomains?: string[] | undefined; jobPathPattern?: string | undefined }
): string[] {
    const jobPathPattern = compileJobPathPattern(source.jobPathPattern);
    const links: string[] = [];
    for (const rawLink of rawLinks) {
        const link = cleanExtractedUrl(rawLink);
        if (isMatchingDomain(link, source) && isJobPostUrl(link, jobPathPattern)) {
            links.push(normalizeJobUrl(link));
        }
    }
    return links;
}

/**
 * Extracts hyperlinks from a WhatsApp Channel broadcast feed, applying domain whitelisting and scope boundaries.
 */
export async function extractChannelBroadcastLinks(
    page: Page,
    channelConfig: WhatsAppSourceConfig | WhatsAppChannelConfig,
    scope: ExtractionScope = ExtractionScope.UNREAD,
    unreadCount = 0,
    options: HarvestOptions = {}
): Promise<{ links: string[]; renderedCount: number; processedCount: number; stats: HarvestStats }> {
    // The harvester already returns only the messages inside the scope.
    const { messages: rawMessages, stats } = await collectScopeMessagesWithStats(page, scope, unreadCount, options);
    const renderedCount = rawMessages.length;
    const processedCount = renderedCount;
    const channelLinks: string[] = [];

    const targetDomain = 'targetDomain' in channelConfig ? channelConfig.targetDomain : '';
    const allowedDomains = channelConfig.allowedDomains || [targetDomain];
    const jobPathPattern = channelConfig.jobPathPattern;

    for (const msg of rawMessages) {
        channelLinks.push(...extractSourceLinks(msg.rawLinks, { targetDomain, allowedDomains, jobPathPattern }));
    }

    return {
        links: Array.from(new Set(channelLinks)),
        renderedCount,
        processedCount,
        stats,
    };
}
