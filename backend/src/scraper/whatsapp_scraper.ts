import { type Page, type Locator } from "playwright";
import { DEFAULT_WHATSAPP_GROUPS, type WhatsAppGroupConfig } from "../config/whatsapp-groups.js";
import {
    launchWhatsAppContext,
    checkWhatsAppAuthState,
    waitForWhatsAppLogin,
} from "./whatsapp_session.js";
import type {
    ExtractionScope,
    WhatsAppScrapeOptions,
    WhatsAppImportResult,
    GroupScrapeResult,
    WhatsAppEventCallback,
} from "./whatsapp-types.js";

/**
 * Scrolls the WhatsApp conversation message panel strictly inside #main downward repeatedly until reaching the bottom.
 */
export async function scrollToBottom(page: Page, maxScrollAttempts = 15): Promise<void> {
    try {
        await page.evaluate(async (maxAttempts) => {
            const main = document.querySelector('#main');
            if (!main) return;

            // Find scrollable element strictly inside #main (right conversation pane)
            const candidates = [
                main.querySelector('[data-testid="conversation-panel-messages"]'),
                main.querySelector('[data-testid="conversation-panel-body"] [tabindex="0"]'),
                main.querySelector('.copyable-area [tabindex="0"]'),
                main.querySelector('.copyable-area'),
                main.querySelector('div[tabindex="0"]'),
                ...Array.from(main.querySelectorAll('div')).filter((el) => {
                    const style = window.getComputedStyle(el);
                    return (
                        (style.overflowY === 'scroll' || style.overflowY === 'auto') &&
                        el.scrollHeight > el.clientHeight
                    );
                }),
            ];

            let panel: HTMLElement | null = null;
            for (const c of candidates) {
                if (c && (c as HTMLElement).scrollHeight > (c as HTMLElement).clientHeight) {
                    panel = c as HTMLElement;
                    break;
                }
            }

            if (!panel) {
                panel = (main.querySelector('[data-testid="conversation-panel-messages"]') || main) as HTMLElement;
            }

            let prevTop = -1;
            for (let i = 0; i < maxAttempts; i++) {
                const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 25;
                if (atBottom || panel.scrollTop === prevTop) {
                    break;
                }
                prevTop = panel.scrollTop;
                panel.scrollTop = panel.scrollHeight;
                await new Promise((r) => setTimeout(r, 200));
            }
        }, maxScrollAttempts);
    } catch (err) {
        console.warn("Scroll to bottom encountered a non-fatal issue:", err);
    }
}

/**
 * Progressively scrolls and accumulates all messages matching the target extraction scope,
 * handling WhatsApp Web's virtual message DOM list seamlessly.
 */
export async function collectAllScopeMessages(
    page: Page,
    scope: ExtractionScope,
    unreadCount = 0
): Promise<RawMessageData[]> {
    const collected = new Map<string, RawMessageData>();

    const harvest = async () => {
        const raw = await evaluateConversationMessages(page);
        for (const msg of raw) {
            const key = msg.prePlainText || msg.text.slice(0, 80);
            if (key && !collected.has(key)) {
                collected.set(key, msg);
            }
        }
    };

    // 1. Initial bottom harvest
    await harvest();

    if (scope === "unread" && unreadCount > 0 && collected.size >= unreadCount) {
        return Array.from(collected.values());
    }

    // 2. Progressive upward scroll
    const maxScrollSteps = scope === "unread" ? 10 : 25;

    for (let step = 1; step <= maxScrollSteps; step++) {
        const scrollInfo = await page.evaluate(async () => {
            const main = document.querySelector('#main');
            if (!main) return { atTop: true, scrollTop: 0 };

            const panel = (
                main.querySelector('[data-testid="conversation-panel-messages"]') ||
                main.querySelector('.copyable-area [tabindex="0"]') ||
                main.querySelector('.copyable-area')
            ) as HTMLElement | null;

            if (!panel) return { atTop: true, scrollTop: 0 };

            const prevTop = panel.scrollTop;
            panel.scrollTop = Math.max(0, panel.scrollTop - 950);
            return {
                atTop: panel.scrollTop === 0 && prevTop === 0,
                scrollTop: panel.scrollTop,
            };
        });

        await page.waitForTimeout(400); // allow virtual list to render previous DOM nodes
        await harvest();

        if (scope === "unread" && unreadCount > 0 && collected.size >= unreadCount) {
            break;
        }

        if (scope === "today") {
            // Check if we reached messages from yesterday or older
            const hasYesterdayOrOlder = Array.from(collected.values()).some((m) => {
                if (!m.prePlainText && !m.dateSection) return false;
                return isDateYesterday(m.prePlainText) ||
                       isDateYesterday(m.dateSection) ||
                       (!isDateToday(m.prePlainText) && !isDateToday(m.dateSection) && (m.prePlainText.includes('/') || m.prePlainText.includes('-')));
            });
            if (hasYesterdayOrOlder) {
                break;
            }
        }

        if (scope === "yesterday") {
            // Check if we reached messages strictly older than yesterday
            const hasOlderThanYesterday = Array.from(collected.values()).some((m) => {
                if (!m.prePlainText && !m.dateSection) return false;
                return !isDateToday(m.prePlainText) &&
                       !isDateToday(m.dateSection) &&
                       !isDateYesterday(m.prePlainText) &&
                       !isDateYesterday(m.dateSection) &&
                       (m.prePlainText.includes('/') || m.prePlainText.includes('-') || /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(m.dateSection));
            });
            if (hasOlderThanYesterday) {
                break;
            }
        }

        if (scrollInfo.atTop) {
            break;
        }
    }

    return Array.from(collected.values());
}

/**
 * Helper to escape special regex characters in group names.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Helper to check if a date string or data-pre-plain-text matches today.
 */
export function isDateToday(text: string): boolean {
    if (!text) return false;
    if (/\btoday\b/i.test(text)) return true;

    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    const dStr = String(d);
    const mStr = String(m);
    const dPad = String(d).padStart(2, "0");
    const mPad = String(m).padStart(2, "0");

    const patterns = [
        `${dStr}/${mStr}/${y}`,
        `${dPad}/${mPad}/${y}`,
        `${dStr}-${mStr}-${y}`,
        `${dPad}-${mPad}-${y}`,
        `${mStr}/${dStr}/${y}`,
        `${mPad}/${dPad}/${y}`,
        `${y}-${mPad}-${dPad}`,
    ];

    return patterns.some((p) => text.includes(p));
}

/**
 * Helper to check if a date string or data-pre-plain-text matches yesterday.
 */
export function isDateYesterday(text: string): boolean {
    if (!text) return false;
    if (/\byesterday\b/i.test(text)) return true;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const d = yesterday.getDate();
    const m = yesterday.getMonth() + 1;
    const y = yesterday.getFullYear();

    const dStr = String(d);
    const mStr = String(m);
    const dPad = String(d).padStart(2, "0");
    const mPad = String(m).padStart(2, "0");

    const patterns = [
        `${dStr}/${mStr}/${y}`,
        `${dPad}/${mPad}/${y}`,
        `${dStr}-${mStr}-${y}`,
        `${dPad}-${mPad}-${y}`,
        `${mStr}/${dStr}/${y}`,
        `${mPad}/${dPad}/${y}`,
        `${y}-${mPad}-${dPad}`,
    ];

    return patterns.some((p) => text.includes(p));
}

/**
 * Cleans extracted URL to remove trailing punctuation or timestamp artifacts.
 */
export function cleanExtractedUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    // Remove trailing punctuation or brackets
    url = url.replace(/[.,;:!?)>"']+$/, '');
    // Remove trailing timestamp artifacts like /10:01, /11:44, 10:01am
    url = url.replace(/\/\d{1,2}:\d{2}(:\d{2})?(am|pm)?$/i, '/');
    url = url.replace(/\d{1,2}:\d{2}(:\d{2})?(am|pm)?$/i, '');
    return url;
}

/**
 * Generates search candidate queries for a group (exact name, prefix without brackets or suffix keywords).
 */
export function getSearchCandidates(groupName: string): string[] {
    const candidates = [groupName];

    // 1. Remove bracketed/parenthesized text
    const noBrackets = groupName.replace(/\s*[\(\[\{].*?[\)\]\}]/g, '').trim();
    if (noBrackets && !candidates.includes(noBrackets)) {
        candidates.push(noBrackets);
    }

    // 2. Remove trailing suffix keywords like Jobs, Alerts, Updates, Group, Openings, numbers, hyphens
    const noSuffix = noBrackets
        .replace(/\s*[-–]\s*\d+.*$/, '')
        .replace(/\s+(jobs|alerts|updates|group|openings|batch|community)\b.*$/i, '')
        .trim();
    if (noSuffix && noSuffix.length >= 3 && !candidates.includes(noSuffix)) {
        candidates.push(noSuffix);
    }

    return candidates;
}

/**
 * Searches for a group using the WhatsApp Web search input and selects the chat.
 */
export async function searchAndOpenGroup(page: Page, groupName: string): Promise<boolean> {
    try {
        // 0. Check if group is already open in active conversation header (inside #main ONLY)
        const alreadyOpen = await page.evaluate((targetName) => {
            const header = document.querySelector(
                '#main [data-testid="conversation-info-header-chat-title"], #main [data-testid="conversation-header"] h2'
            );
            const text = header?.textContent?.trim() || "";
            if (!text) return false;
            const h = text.toLowerCase();
            const t = targetName.toLowerCase().trim();
            const prefix = t.replace(/\s*[-–(].*$/, '').trim();
            return h === t || h.includes(t) || t.includes(h) || h.includes(prefix);
        }, groupName);

        if (alreadyOpen) {
            return true;
        }

        // 1. Locate search box
        const searchBox = page
            .locator(
                'div[data-testid="chat-list-search-container"] input, [data-testid="chat-list-search-container"] [role="textbox"], input[data-tab="3"], [data-testid="chat-list-search"], #side [role="textbox"], input[role="textbox"]'
            )
            .first();

        await searchBox.waitFor({ state: "visible", timeout: 8000 });

        // Search terms to try in priority order
        const searchTerms = getSearchCandidates(groupName);

        for (const searchTerm of searchTerms) {
            // 2. Click and clear search box
            await searchBox.click({ force: true });
            await page.waitForTimeout(100);

            // Click clear icon button if present
            const clearBtn = page
                .locator(
                    '[data-testid="chat-list-search-container"] button, button[aria-label="End icon button"]'
                )
                .first();

            if ((await clearBtn.count()) > 0 && (await clearBtn.isVisible())) {
                await clearBtn.click({ force: true }).catch(() => {});
                await page.waitForTimeout(150);
            }

            // Clear existing query via DOM and keyboard
            await page.evaluate(() => {
                const input = document.querySelector('div[data-testid="chat-list-search-container"] input, input[data-tab="3"]') as HTMLInputElement;
                if (input) {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            await page.keyboard.press("Control+A");
            await page.keyboard.press("Backspace");
            await page.waitForTimeout(150);

            // 3. Type search term using keyboard
            await page.keyboard.type(searchTerm, { delay: 40 });
            await page.waitForTimeout(1500);

            // 4. Try opening the chat:
            // Attempt A: Playwright locator click on cell-frame-title or span[title]
            const escaped = escapeRegex(searchTerm);
            const chatRowLocator = page
                .locator('#pane-side [role="row"], [data-testid="chat-list"] [role="row"]')
                .filter({ has: page.locator(`[data-testid="cell-frame-title"], span[title]`).filter({ hasText: new RegExp(escaped, 'i') }) })
                .first();

            if ((await chatRowLocator.count()) > 0) {
                await chatRowLocator.click({ force: true }).catch(() => {});
            } else {
                // Attempt B: Click nth(1) which is first chat item under "Chats" header
                const firstResult = page
                    .locator('[aria-label="Search results."] [role="row"], [data-testid="chat-list"] [role="row"]')
                    .nth(1);
                if ((await firstResult.count()) > 0) {
                    await firstResult.click({ force: true }).catch(() => {});
                } else {
                    await page.keyboard.press("Enter");
                }
            }

            // 5. Wait for conversation panel to be visible inside #main
            await page.waitForSelector('#main [data-testid="conversation-panel-messages"], #main .copyable-area, #main', {
                state: "visible",
                timeout: 6000,
            }).catch(() => {});

            // 6. Verify if conversation is opened with the target group title
            const isNowOpen = await page.evaluate((targetName) => {
                const header = document.querySelector(
                    '#main [data-testid="conversation-info-header-chat-title"], #main [data-testid="conversation-header"]'
                );
                const text = header?.textContent?.trim() || "";
                if (!text) {
                    return !!document.querySelector('#main');
                }
                const h = text.toLowerCase();
                const t = targetName.toLowerCase().trim();
                const prefix = t.replace(/\s*[-–(].*$/, '').trim();
                return h.includes(prefix) || prefix.includes(h) || h === t || h.includes(t) || t.includes(h);
            }, groupName);

            if (isNowOpen) {
                // Focus conversation pane on the right so keyboard/wheel events target #main
                await page.locator('#main header, #main [data-testid="conversation-header"]').first().click({ force: true }).catch(() => {});
                await page.hover('#main [data-testid="conversation-panel-messages"], #main').catch(() => {});
                await page.waitForTimeout(300);
                return true;
            }
        }

        console.warn(`Group '${groupName}' could not be found or opened from search results.`);
        return false;
    } catch (error) {
        console.warn(`Failed to search and open group '${groupName}':`, error);
        return false;
    }
}


/**
 * Extracts unread message count from group row in chat list.
 */
export async function getGroupUnreadCount(page: Page, groupName: string): Promise<number> {
    try {
        return await page.evaluate((name) => {
            const pane = document.querySelector('#pane-side, [data-testid="chat-list"]');
            if (!pane) return 0;

            const lowerTarget = name.toLowerCase().trim();
            const rows = Array.from(pane.querySelectorAll('[role="row"], [data-testid^="list-item-"]'));

            for (const row of rows) {
                const titleSpan = row.querySelector('[data-testid="cell-frame-title"] span, span[title]');
                const title = (titleSpan?.getAttribute('title') || row.textContent || '').toLowerCase().trim();

                if (title.includes(lowerTarget)) {
                    const unreadEl = row.querySelector('[data-testid="icon-unread-count"], span[role="status"], span.x140p0ai');
                    if (unreadEl) {
                        const label = unreadEl.getAttribute('aria-label') || unreadEl.textContent || '';
                        const match = label.match(/\d+/);
                        if (match) return parseInt(match[0], 10);
                    }
                }
            }
            return 0;
        }, groupName);
    } catch {
        return 0;
    }
}

/**
 * Checks if a given hyperlink matches the target domain or any allowed domain aliases.
 */
export function isMatchingDomain(href: string, group: WhatsAppGroupConfig): boolean {
    if (!href) return false;
    try {
        const urlObj = new URL(href);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");
        const target = group.targetDomain.toLowerCase().replace(/^www\./, "");

        if (hostname === target || hostname.endsWith(`.${target}`) || target.endsWith(`.${hostname}`)) {
            return true;
        }

        if (group.allowedDomains && group.allowedDomains.length > 0) {
            return group.allowedDomains.some((d) => {
                const normD = d.toLowerCase().replace(/^www\./, "");
                return hostname === normD || hostname.endsWith(`.${normD}`) || normD.endsWith(`.${hostname}`);
            });
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Interface representing a message evaluated in DOM.
 */
export interface RawMessageData {
    rawLinks: string[];
    text: string;
    prePlainText: string;
    dateSection: string;
}

/**
 * Evaluates messages and date dividers in the active conversation panel.
 */
export async function evaluateConversationMessages(page: Page): Promise<RawMessageData[]> {
    return await page.evaluate(() => {
        const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;
        const results: {
            rawLinks: string[];
            text: string;
            prePlainText: string;
            dateSection: string;
        }[] = [];

        // Try multiple selectors for the active conversation container
        const main =
            document.querySelector('#main') ||
            document.querySelector('[data-testid="conversation-panel-wrapper"]') ||
            document.querySelector('[data-testid="conversation-panel-body"]') ||
            document.querySelector('.copyable-area') ||
            document.body;

        // 1. Find all date divider headers in the conversation
        const allSpans = Array.from(main.querySelectorAll("div[tabindex='-1'] span[dir='auto'], span[dir='auto']"));
        const dateHeaders: { el: Element; text: string }[] = [];

        for (const s of allSpans) {
            const t = s.textContent?.trim() || '';
            if (
                t &&
                !t.includes(':') &&
                t.length < 35 &&
                (/^(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(t) ||
                 /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(t) ||
                 /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(t))
            ) {
                dateHeaders.push({ el: s, text: t });
            }
        }

        // 2. Find all message elements
        const messageElements = Array.from(
            main.querySelectorAll(
                'div[data-testid="msg-container"], div[data-testid^="conv-msg-"], div.copyable-text, [data-testid="selectable-text"]'
            )
        );

        // Deduplicate messages by data-pre-plain-text or text
        const uniqueMessages: HTMLElement[] = [];
        const seenKeys = new Set<string>();

        for (const el of messageElements) {
            const copyable = el.classList.contains('copyable-text') ? el : el.closest('.copyable-text') || el.querySelector('.copyable-text');
            const prePlain = copyable?.getAttribute('data-pre-plain-text') || '';
            const textContent = el.textContent || '';
            const key = prePlain || textContent.slice(0, 80);

            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueMessages.push((copyable || el) as HTMLElement);
            }
        }

        // 3. Process each unique message
        for (const msg of uniqueMessages) {
            const prePlainText = msg.getAttribute('data-pre-plain-text') || msg.closest('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
            const text = msg.textContent || '';

            // Find the most recent date header appearing before this message in DOM order
            let dateSection = '';
            for (const header of dateHeaders) {
                if (header.el.compareDocumentPosition(msg) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    dateSection = header.text;
                }
            }

            const linkSet = new Set<string>();

            // Direct <a> tags inside or in parent msg-container
            const msgParent = msg.closest('[data-testid="msg-container"]') || msg;
            const anchors = msgParent.querySelectorAll('a[href]');
            anchors.forEach((a) => {
                const href = a.getAttribute('href');
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                    linkSet.add(href.trim());
                }
            });

            // Plain text URLs
            const matches = text.match(urlRegex);
            if (matches) {
                matches.forEach((url) => linkSet.add(url.trim()));
            }

            results.push({
                rawLinks: Array.from(linkSet),
                text,
                prePlainText,
                dateSection,
            });
        }

        // 4. Fallback: If no structured messages found, scan all <a> tags directly in main
        if (results.length === 0) {
            const allAnchors = Array.from(main.querySelectorAll('a[href]'));
            for (const a of allAnchors) {
                const href = a.getAttribute('href');
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                    results.push({
                        rawLinks: [href.trim()],
                        text: a.textContent || '',
                        prePlainText: '',
                        dateSection: '',
                    });
                }
            }
        }

        return results;
    });
}



/**
 * Core scraping workflow for WhatsApp groups.
 */
export async function scrapeWhatsAppLinks(
    options: WhatsAppScrapeOptions,
    onEvent?: WhatsAppEventCallback
): Promise<WhatsAppImportResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const groupsToScrape: WhatsAppGroupConfig[] =
        options.groups || DEFAULT_WHATSAPP_GROUPS.filter((g) => g.enabled !== false);
    const scope = options.scope || "unread";

    const emit = (event: Parameters<NonNullable<typeof onEvent>>[0]) => {
        if (onEvent) {
            onEvent(event);
        }
    };

    emit({
        type: "status",
        message: "Initializing browser session for WhatsApp Web...",
        timestamp: new Date().toISOString(),
    });

    const { context, page } = await launchWhatsAppContext({
        headless: options.headless,
        sessionDir: options.sessionDir,
    });

    const allJobLinks = new Set<string>();
    const groupResults: GroupScrapeResult[] = [];
    let processedGroups = 0;
    let skippedGroups = 0;
    let failedGroups = 0;

    try {
        emit({
            type: "status",
            message: "Connecting to WhatsApp Web...",
            timestamp: new Date().toISOString(),
        });

        // 1. Verify Authentication / QR Check
        const authState = await checkWhatsAppAuthState(page, 20000);

        if (!authState.authenticated) {
            if (authState.qrDataUrl) {
                emit({
                    type: "qr",
                    qrDataUrl: authState.qrDataUrl,
                    timestamp: new Date().toISOString(),
                });
                emit({
                    type: "status",
                    message: "WhatsApp session requires login. Please scan QR code with WhatsApp on your phone.",
                    timestamp: new Date().toISOString(),
                });

                const loggedIn = await waitForWhatsAppLogin(page, 120000);
                if (!loggedIn) {
                    throw new Error("WhatsApp Web authentication timed out. Scan QR code to proceed.");
                }
            } else {
                throw new Error("Unable to locate WhatsApp Web chat list or QR code.");
            }
        }

        emit({
            type: "authenticated",
            timestamp: new Date().toISOString(),
        });

        emit({
            type: "status",
            message: `Starting extraction for ${groupsToScrape.length} group(s) with scope '${scope}'...`,
            timestamp: new Date().toISOString(),
        });

        // 2. Iterate through configured groups
        let currentIndex = 0;
        for (const group of groupsToScrape) {
            if (options.signal?.aborted) {
                console.log("Extraction aborted by client signal.");
                break;
            }

            currentIndex++;

            emit({
                type: "group_start",
                groupName: group.groupName,
                targetDomain: group.targetDomain,
                index: currentIndex,
                total: groupsToScrape.length,
            });

            try {
                // Check unread count first if in 'unread' mode
                let unreadCount = 0;
                if (scope === "unread") {
                    unreadCount = await getGroupUnreadCount(page, group.groupName);
                    if (unreadCount === 0) {
                        const skipResult: GroupScrapeResult = {
                            groupName: group.groupName,
                            targetDomain: group.targetDomain,
                            status: "skipped",
                            unreadCount: 0,
                            extractedLinks: [],
                            warning: "No unread messages detected",
                        };
                        groupResults.push(skipResult);
                        skippedGroups++;
                        emit({
                            type: "group_complete",
                            groupName: group.groupName,
                            result: skipResult,
                        });
                        continue;
                    }
                }

                // Search and open group
                emit({
                    type: "group_progress",
                    groupName: group.groupName,
                    message: `Searching for group '${group.groupName}'...`,
                    unreadCount: scope === "unread" ? unreadCount : undefined,
                });

                const opened = await searchAndOpenGroup(page, group.groupName);
                if (!opened) {
                    const notFoundResult: GroupScrapeResult = {
                        groupName: group.groupName,
                        targetDomain: group.targetDomain,
                        status: "warning",
                        extractedLinks: [],
                        warning: `Group '${group.groupName}' not found in search results`,
                    };
                    groupResults.push(notFoundResult);
                    failedGroups++;
                    emit({
                        type: "group_complete",
                        groupName: group.groupName,
                        result: notFoundResult,
                    });
                    continue;
                }

                // Wait for message elements to mount in conversation panel
                await page.waitForSelector(
                    '#main [data-testid^="conv-msg-"], #main [data-testid="msg-container"], #main .copyable-text, #main [role="row"]',
                    { state: "attached", timeout: 5000 }
                ).catch(() => {});
                await page.waitForTimeout(500);

                emit({
                    type: "group_progress",
                    groupName: group.groupName,
                    message: "Harvesting messages across scope history...",
                    unreadCount: scope === "unread" ? unreadCount : undefined,
                });

                // Progressively collect all messages within scope from virtualized message pane
                const rawMessages = await collectAllScopeMessages(page, scope, unreadCount);
                const renderedCount = rawMessages.length;

                if (renderedCount === 0) {
                    const noMessagesResult: GroupScrapeResult = {
                        groupName: group.groupName,
                        targetDomain: group.targetDomain,
                        status: "warning",
                        messagesRendered: 0,
                        extractedLinks: [],
                        warning: "No messages rendered in conversation panel",
                    };
                    groupResults.push(noMessagesResult);
                    failedGroups++;
                    emit({
                        type: "group_complete",
                        groupName: group.groupName,
                        result: noMessagesResult,
                    });
                    continue;
                }

                const groupLinks: string[] = [];
                let messagesProcessed = 0;

                if (scope === "unread") {
                    const startIndex = unreadCount > 0 ? Math.max(0, renderedCount - unreadCount) : 0;
                    messagesProcessed = renderedCount - startIndex;

                    for (let i = startIndex; i < renderedCount; i++) {
                        const msg = rawMessages[i];
                        if (msg) {
                            for (const rawLink of msg.rawLinks) {
                                const link = cleanExtractedUrl(rawLink);
                                if (isMatchingDomain(link, group)) {
                                    groupLinks.push(link);
                                    allJobLinks.add(link);
                                }
                            }
                        }
                    }
                } else if (scope === "today") {
                    for (const msg of rawMessages) {
                        const isToday =
                            isDateToday(msg.dateSection) ||
                            isDateToday(msg.prePlainText) ||
                            (!msg.dateSection && !isDateYesterday(msg.prePlainText) && !msg.prePlainText.includes('/'));

                        if (isToday) {
                            messagesProcessed++;
                            for (const rawLink of msg.rawLinks) {
                                const link = cleanExtractedUrl(rawLink);
                                if (isMatchingDomain(link, group)) {
                                    groupLinks.push(link);
                                    allJobLinks.add(link);
                                }
                            }
                        }
                    }
                } else if (scope === "yesterday") {
                    for (const msg of rawMessages) {
                        const isYesterday =
                            isDateYesterday(msg.dateSection) ||
                            isDateYesterday(msg.prePlainText);

                        if (isYesterday) {
                            messagesProcessed++;
                            for (const rawLink of msg.rawLinks) {
                                const link = cleanExtractedUrl(rawLink);
                                if (isMatchingDomain(link, group)) {
                                    groupLinks.push(link);
                                    allJobLinks.add(link);
                                }
                            }
                        }
                    }
                }

                const deduplicatedGroupLinks = Array.from(new Set(groupLinks));
                const successResult: GroupScrapeResult = {
                    groupName: group.groupName,
                    targetDomain: group.targetDomain,
                    status: "success",
                    unreadCount: scope === "unread" ? unreadCount : undefined,
                    messagesRendered: renderedCount,
                    messagesProcessed,
                    extractedLinks: deduplicatedGroupLinks,
                };

                groupResults.push(successResult);
                processedGroups++;

                emit({
                    type: "group_complete",
                    groupName: group.groupName,
                    result: successResult,
                });
            } catch (groupError: any) {
                console.error(`Error processing group '${group.groupName}':`, groupError);
                const errResult: GroupScrapeResult = {
                    groupName: group.groupName,
                    targetDomain: group.targetDomain,
                    status: "failed",
                    extractedLinks: [],
                    error: groupError?.message || "Unexpected group processing error",
                };
                groupResults.push(errResult);
                failedGroups++;
                emit({
                    type: "group_complete",
                    groupName: group.groupName,
                    result: errResult,
                });
            }
        }

        const finalUrls = Array.from(allJobLinks);
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;

        const importResult: WhatsAppImportResult = {
            success: true,
            scope,
            totalGroups: groupsToScrape.length,
            processedGroups,
            skippedGroups,
            failedGroups,
            groupResults,
            urls: finalUrls,
            totalUrls: finalUrls.length,
            startedAt,
            completedAt,
            durationMs,
        };

        emit({
            type: "done",
            result: importResult,
        });

        return importResult;
    } catch (fatalError: any) {
        emit({
            type: "error",
            message: fatalError?.message || "Fatal error during WhatsApp scraping execution",
            fatal: true,
        });
        throw fatalError;
    } finally {
        await context.close().catch(() => {});
    }
}

