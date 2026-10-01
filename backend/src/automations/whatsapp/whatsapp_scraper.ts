import { type Page } from "playwright";
import {
    DEFAULT_WHATSAPP_SOURCES,
    type WhatsAppSourceConfig,
    type WhatsAppChannelConfig,
} from "./config/whatsapp-sources.js";
import {
    WHATSAPP_LOCATORS,
    getCombinedSelector,
} from "./config/whatsapp_locators.js";
import {
    launchWhatsAppContext,
    checkWhatsAppAuthState,
    waitForWhatsAppLogin,
} from "./whatsapp_session.js";
import {
    ExtractionScope,
    type WhatsAppScrapeOptions,
    type WhatsAppImportResult,
    type SourceScrapeResult,
    type WhatsAppSSEEvent,
    type WhatsAppEventCallback,
    type RawMessageData,
} from "./whatsapp-types.js";
import {
    collectScopeMessagesWithStats,
    evaluateWindowMessages,
    type HarvestOptions,
    type HarvestStats,
} from "./whatsapp_harvester.js";
import { randomJitter, clearActiveSearchInput, navigateToChatsTab, navigateToChannelsTab } from "./helpers/whatsapp_navigation.js";
import { cleanExtractedUrl, isMatchingDomain } from "./helpers/whatsapp_links.js";
import { getSearchCandidates } from "./helpers/whatsapp_search.js";
import { describeEmptyScope } from "./helpers/whatsapp_scope_report.js";

export { ExtractionScope };
export type { RawMessageData };

/**
 * Collects every message in the target extraction scope from the open conversation,
 * oldest -> newest, by scanning WhatsApp Web's virtualized message list upward and
 * merging overlapping windows. See whatsapp_harvester.ts for the scan algorithm.
 */
export async function collectAllScopeMessages(
    page: Page,
    scope: ExtractionScope = ExtractionScope.UNREAD,
    unreadCount = 0,
    options: HarvestOptions = {}
): Promise<RawMessageData[]> {
    const { messages } = await collectScopeMessagesWithStats(page, scope, unreadCount, options);
    return messages;
}

export { collectScopeMessagesWithStats };

export interface SearchAndOpenResult {
    status: "opened" | "skipped_no_unread" | "not_found";
    unreadCount: number;
}

/**
 * Searches for a group using the WhatsApp Web search input, extracts unread badge count from search results,
 * and opens the chat if appropriate.
 */
export async function searchAndOpenGroup(
    page: Page,
    groupName: string,
    scope: ExtractionScope = ExtractionScope.UNREAD
): Promise<SearchAndOpenResult> {
    try {
        await clearActiveSearchInput(page);

        const headerTitleSel = getCombinedSelector(WHATSAPP_LOCATORS.conversationChatTitle);
        const headerContainerSel = getCombinedSelector(WHATSAPP_LOCATORS.conversationHeader);

        // 0. Check if the requested group is already open
        const alreadyOpen = await page.evaluate(
            ({ targetName, titleSel, headerSel }) => {
                const titleEl = document.querySelector(titleSel);
                const headerEl = document.querySelector(headerSel);
                const titleText = (titleEl?.getAttribute("title") || titleEl?.textContent || "").trim().toLowerCase();
                const headerText = (headerEl?.textContent || "").trim().toLowerCase();
                const expected = targetName.trim().toLowerCase();

                return titleText === expected || (!!titleText && titleText.includes(expected)) || (!!headerText && headerText.includes(expected));
            },
            { targetName: groupName, titleSel: headerTitleSel, headerSel: headerContainerSel }
        );

        if (alreadyOpen) {
            if (scope === ExtractionScope.UNREAD) {
                return { status: "skipped_no_unread", unreadCount: 0 };
            }
            return { status: "opened", unreadCount: 0 };
        }

        const candidates = getSearchCandidates(groupName);
        const rowSel = getCombinedSelector(WHATSAPP_LOCATORS.chatListRow);
        const titleSpanSel = getCombinedSelector(WHATSAPP_LOCATORS.chatRowTitle);
        const unreadBadgeSel = getCombinedSelector(WHATSAPP_LOCATORS.chatRowUnreadBadge);
        const searchInputSel = getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput);

        for (const query of candidates) {
            // 1. Locate and focus search box
            await clearActiveSearchInput(page);
            const searchBox = page.locator(searchInputSel).first();
            await searchBox.waitFor({ state: "visible", timeout: 8000 });
            await searchBox.click({ force: true });

            // 2. Type search query
            const charDelay = Math.floor(Math.random() * 25) + 25;
            await page.keyboard.type(query, { delay: charDelay });
            await randomJitter(800, 1200);

            // 3. Wait for search results matching target or candidate queries to render in the DOM
            await page.waitForFunction(
                ({ targetName, candidateQueries, rowSelector, titleSelector }) => {
                    const rows = Array.from(document.querySelectorAll(rowSelector));
                    const normalize = (str: string) =>
                        str.replace(/[\u2013\u2014\u2212]/g, "-").replace(/[\u00A0\u2000-\u200B]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
                    const expected = normalize(targetName);
                    const expectedQueries = candidateQueries.map(normalize);

                    for (let i = 0; i < Math.min(rows.length, 30); i++) {
                        const row = rows[i] as HTMLElement;
                        if (!row) continue;

                        const titleEl =
                            row.querySelector('[data-testid="cell-frame-title"]') ||
                            row.querySelector(titleSelector) ||
                            row.querySelector('span[title]') ||
                            row.querySelector('span[dir="auto"]');

                        const titleAttr =
                            row.querySelector('[title]')?.getAttribute('title') ||
                            titleEl?.getAttribute('title') ||
                            row.getAttribute('title') ||
                            '';

                        const titleText = normalize(titleAttr || titleEl?.textContent || '');
                        const rowText = normalize(row.textContent || '');

                        const isMatch =
                            titleText === expected ||
                            titleText.includes(expected) ||
                            (expected.length >= 5 && titleText.length >= 5 && expected.includes(titleText)) ||
                            expectedQueries.some((q) => q.length >= 4 && (titleText.includes(q) || rowText.includes(q))) ||
                            rowText.includes(expected);

                        if (isMatch) {
                            return true;
                        }
                    }
                    return false;
                },
                {
                    targetName: groupName,
                    candidateQueries: candidates,
                    rowSelector: rowSel,
                    titleSelector: titleSpanSel,
                },
                { timeout: 3500 }
            ).catch(() => false);

            // 4. Inspect matches, tag exact matching element, and dispatch click
            const matchInfo = await page.evaluate(
                ({ targetName, candidateQueries, rowSelector, titleSelector, badgeSelector }) => {
                    // Clear any previous marker attributes
                    document.querySelectorAll('[data-target-active-row]').forEach((el) => el.removeAttribute('data-target-active-row'));

                    const rows = Array.from(document.querySelectorAll(rowSelector));
                    const normalize = (str: string) =>
                        str.replace(/[\u2013\u2014\u2212]/g, "-").replace(/[\u00A0\u2000-\u200B]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
                    const expected = normalize(targetName);
                    const expectedQueries = candidateQueries.map(normalize);

                    for (let i = 0; i < Math.min(rows.length, 30); i++) {
                        const row = rows[i] as HTMLElement;
                        if (!row) continue;

                        const titleEl =
                            row.querySelector('[data-testid="cell-frame-title"]') ||
                            row.querySelector(titleSelector) ||
                            row.querySelector('span[title]') ||
                            row.querySelector('span[dir="auto"]');

                        const titleAttr =
                            row.querySelector('[title]')?.getAttribute('title') ||
                            titleEl?.getAttribute('title') ||
                            row.getAttribute('title') ||
                            '';

                        const titleText = normalize(titleAttr || titleEl?.textContent || '');
                        const rowText = normalize(row.textContent || '');

                        const isMatch =
                            titleText === expected ||
                            titleText.includes(expected) ||
                            (expected.length >= 5 && titleText.length >= 5 && expected.includes(titleText)) ||
                            expectedQueries.some((q) => q.length >= 4 && (titleText.includes(q) || rowText.includes(q))) ||
                            rowText.includes(expected);

                        if (isMatch) {
                            let unreadCount = 0;
                            const unreadEl = row.querySelector(badgeSelector);
                            if (unreadEl) {
                                const label = unreadEl.getAttribute("aria-label") || unreadEl.textContent || "";
                                const match = label.match(/\d+/);
                                if (match) unreadCount = parseInt(match[0], 10);
                            }

                            // Tag the exact matching element for Playwright locator
                            row.setAttribute('data-target-active-row', 'true');

                            // Dispatch complete pointer and mouse event chain to activate React handlers
                            row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                            row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                            row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                            row.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                            row.click();

                            return { matched: true, unreadCount };
                        }
                    }
                    return null;
                },
                {
                    targetName: groupName,
                    candidateQueries: candidates,
                    rowSelector: rowSel,
                    titleSelector: titleSpanSel,
                    badgeSelector: unreadBadgeSel,
                }
            );

            if (matchInfo && matchInfo.matched) {
                // 5. For unread scope, skip if unreadCount is 0
                if (scope === ExtractionScope.UNREAD && matchInfo.unreadCount === 0) {
                    await clearActiveSearchInput(page);
                    return { status: "skipped_no_unread", unreadCount: 0 };
                }

                // 6. Click target row via Playwright to ensure synthetic and native pointer events
                const taggedRow = page.locator('[data-target-active-row="true"]').first();
                if ((await taggedRow.count()) > 0) {
                    await taggedRow.click({ force: true }).catch(() => {});
                }

                // 7. Wait for conversation panel & settle
                const conversationPanelSel = getCombinedSelector(WHATSAPP_LOCATORS.conversationPanelMessages);
                await page.waitForSelector(conversationPanelSel, { state: "visible", timeout: 8000 }).catch(() => {});
                await clearActiveSearchInput(page);
                await randomJitter(400, 700);

                return {
                    status: "opened",
                    unreadCount: matchInfo.unreadCount,
                };
            }
        }

        console.warn(`Group "${groupName}" was not found in top search results.`);
        await clearActiveSearchInput(page);
        return { status: "not_found", unreadCount: 0 };
    } catch (error) {
        console.warn(`Failed to search and open group "${groupName}":`, error);
        await clearActiveSearchInput(page);
        return { status: "not_found", unreadCount: 0 };
    }
}

/**
 * Locates and opens a target followed WhatsApp Channel in the Channels sidebar view.
 */
export async function openFollowedChannel(
    page: Page,
    channelName: string,
    scope: ExtractionScope = ExtractionScope.UNREAD
): Promise<SearchAndOpenResult> {
    try {
        // 0. Check if channel is already active in #main
        const channelChatTitleSel = getCombinedSelector(WHATSAPP_LOCATORS.channelChatTitle);
        const channelHeaderSel = getCombinedSelector(WHATSAPP_LOCATORS.channelHeader);

        const alreadyOpen = await page.evaluate(
            ({ targetName, titleSel, headerSel }) => {
                const titleEl = document.querySelector(titleSel);
                const headerEl = document.querySelector(headerSel);
                const titleText = (titleEl?.getAttribute("title") || titleEl?.textContent || "").trim().toLowerCase();
                const headerText = (headerEl?.textContent || "").trim().toLowerCase();
                const expected = targetName.trim().toLowerCase();

                return titleText === expected || (!!titleText && titleText.includes(expected)) || (!!headerText && headerText.includes(expected));
            },
            { targetName: channelName, titleSel: channelChatTitleSel, headerSel: channelHeaderSel }
        );

        if (alreadyOpen) {
            if (scope === ExtractionScope.UNREAD) {
                return { status: "skipped_no_unread", unreadCount: 0 };
            }
            return { status: "opened", unreadCount: 0 };
        }

        // Ensure Channels view is active
        await navigateToChannelsTab(page);
        await clearActiveSearchInput(page);

        const channelRowSel = getCombinedSelector(WHATSAPP_LOCATORS.channelListRow);
        const channelTitleSel = getCombinedSelector(WHATSAPP_LOCATORS.channelRowTitle);
        const channelBadgeSel = getCombinedSelector(WHATSAPP_LOCATORS.channelRowUnreadBadge);

        // 1. Inspect top followed channels in sidebar list
        const matchInfo = await page.evaluate(
            ({ targetName, rowSelector, titleSelector, badgeSelector }) => {
                const rows = Array.from(document.querySelectorAll(rowSelector)).slice(0, 15);
                const expected = targetName.trim().toLowerCase();

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row) continue;
                    const titleSpan = row.querySelector(titleSelector);
                    const actualName = (titleSpan?.getAttribute("title") || titleSpan?.textContent || row.textContent || "").trim().toLowerCase();

                    if (actualName === expected || actualName.includes(expected)) {
                        let unreadCount = 0;
                        const unreadEl = row.querySelector(badgeSelector);
                        if (unreadEl) {
                            const label = unreadEl.getAttribute("aria-label") || unreadEl.textContent || "";
                            const match = label.match(/\d+/);
                            if (match) unreadCount = parseInt(match[0], 10);
                        }
                        return { index: i, unreadCount };
                    }
                }
                return null;
            },
            {
                targetName: channelName,
                rowSelector: channelRowSel,
                titleSelector: channelTitleSel,
                badgeSelector: channelBadgeSel,
            }
        );

        if (matchInfo) {
            if (scope === ExtractionScope.UNREAD && matchInfo.unreadCount === 0) {
                return { status: "skipped_no_unread", unreadCount: 0 };
            }

            const items = page.locator(channelRowSel);
            if ((await items.count()) > matchInfo.index) {
                await items.nth(matchInfo.index).click({ force: true }).catch(() => { });
            }

            const messageContainerSel = getCombinedSelector(WHATSAPP_LOCATORS.channelMessageContainer);
            await page.waitForSelector(messageContainerSel, {
                state: "visible",
                timeout: 8000,
            }).catch(() => { });
            await randomJitter(300, 600);

            return { status: "opened", unreadCount: matchInfo.unreadCount };
        }

        // 2. Filter search inside Channels view
        const channelsSearchInputSel = getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput);
        const channelSearchInput = page.locator(channelsSearchInputSel).first();

        if ((await channelSearchInput.count()) > 0 && (await channelSearchInput.isVisible().catch(() => false))) {
            await channelSearchInput.click({ force: true });
            await page.keyboard.press("ControlOrMeta+A").catch(() => {});
            await page.keyboard.press("Backspace").catch(() => {});
            await page.keyboard.type(channelName, { delay: 40 });
            await randomJitter(600, 1000);

            const searchMatch = await page.evaluate(
                ({ targetName, rowSelector, titleSelector, badgeSelector }) => {
                    const rows = Array.from(document.querySelectorAll(rowSelector)).slice(0, 5);
                    const expected = targetName.trim().toLowerCase();

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row) continue;
                        const titleSpan = row.querySelector(titleSelector);
                        const actualName = (titleSpan?.getAttribute("title") || titleSpan?.textContent || row.textContent || "").trim().toLowerCase();

                        if (actualName === expected || actualName.includes(expected)) {
                            let unreadCount = 0;
                            const unreadEl = row.querySelector(badgeSelector);
                            if (unreadEl) {
                                const label = unreadEl.getAttribute("aria-label") || unreadEl.textContent || "";
                                const match = label.match(/\d+/);
                                if (match) unreadCount = parseInt(match[0], 10);
                            }
                            return { index: i, unreadCount };
                        }
                    }
                    return null;
                },
                { targetName: channelName, rowSelector: channelRowSel, titleSelector: channelTitleSel, badgeSelector: channelBadgeSel }
            );

            if (searchMatch) {
                if (scope === ExtractionScope.UNREAD && searchMatch.unreadCount === 0) {
                    await clearActiveSearchInput(page);
                    return { status: "skipped_no_unread", unreadCount: 0 };
                }

                await page.locator(channelRowSel).nth(searchMatch.index).click({ force: true });
                await clearActiveSearchInput(page);

                const messageContainerSel = getCombinedSelector(WHATSAPP_LOCATORS.channelMessageContainer);
                await page.waitForSelector(messageContainerSel, { state: "visible", timeout: 8000 }).catch(() => { });
                await randomJitter(300, 600);

                return { status: "opened", unreadCount: searchMatch.unreadCount };
            }

            await clearActiveSearchInput(page);
        }

        return { status: "not_found", unreadCount: 0 };
    } catch (err) {
        await clearActiveSearchInput(page);
        return { status: "not_found", unreadCount: 0 };
    }
}

/**
 * Evaluates the messages mounted in the active conversation window (oldest -> newest).
 * Falls back to every anchor in #main when no structured message rows are found.
 */
export async function evaluateConversationMessages(page: Page): Promise<RawMessageData[]> {
    const messages = await evaluateWindowMessages(page);
    if (messages.length > 0) {
        return messages;
    }

    return await page.evaluate(() => {
        const main = document.querySelector('#main') || document.body;
        return Array.from(main.querySelectorAll('a[href]'))
            .map((a) => ({ href: (a.getAttribute('href') || '').trim(), text: a.textContent || '' }))
            .filter((a) => /^https?:\/\//i.test(a.href))
            .map((a) => ({
                rawLinks: [a.href],
                text: a.text,
                prePlainText: '',
                dateSection: '',
            }));
    });
}

/**
 * Extracts hyperlinks from a WhatsApp Channel broadcast feed, applying domain whitelisting and scope boundaries.
 */
export async function extractChannelBroadcastLinks(
    page: Page,
    channelConfig: WhatsAppSourceConfig | WhatsAppChannelConfig,
    scope: ExtractionScope = ExtractionScope.UNREAD,
    unreadCount = 0
): Promise<{ links: string[]; renderedCount: number; processedCount: number; stats: HarvestStats }> {
    // The harvester already returns only the messages inside the scope.
    const { messages: rawMessages, stats } = await collectScopeMessagesWithStats(page, scope, unreadCount);
    const renderedCount = rawMessages.length;
    const processedCount = renderedCount;
    const channelLinks: string[] = [];

    const targetDomain = 'targetDomain' in channelConfig ? channelConfig.targetDomain : '';
    const allowedDomains = channelConfig.allowedDomains || [targetDomain];

    for (const msg of rawMessages) {
        for (const rawLink of msg.rawLinks) {
            const link = cleanExtractedUrl(rawLink);
            if (isMatchingDomain(link, { targetDomain, allowedDomains })) {
                channelLinks.push(link);
            }
        }
    }

    return {
        links: Array.from(new Set(channelLinks)),
        renderedCount,
        processedCount,
        stats,
    };
}

/**
 * Core scraping workflow for WhatsApp groups and broadcast channels.
 */
export async function scrapeWhatsAppJobLinks(
    options: WhatsAppScrapeOptions,
    onEvent?: WhatsAppEventCallback
): Promise<WhatsAppImportResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const scope: ExtractionScope = options.scope || ExtractionScope.UNREAD;

    // Resolve sources to scrape: priority to unified `sources`, or DEFAULT_WHATSAPP_SOURCES
    let sourcesToScrape: WhatsAppSourceConfig[];

    if (options.sources && options.sources.length > 0) {
        sourcesToScrape = options.sources.filter((s) => s.enabled !== false);
    } else {
        sourcesToScrape = DEFAULT_WHATSAPP_SOURCES.filter((s) => s.enabled !== false);
    }

    const totalGroups = sourcesToScrape.filter((s) => s.type === 'group').length;
    const totalChannels = sourcesToScrape.filter((s) => s.type === 'channel').length;

    const emit = (event: WhatsAppSSEEvent) => {
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
    const sourceResults: SourceScrapeResult[] = [];
    let processedSources = 0;
    let processedGroups = 0;
    let processedChannels = 0;
    let skippedSources = 0;
    let failedSources = 0;

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
            message: `Starting extraction for ${sourcesToScrape.length} source(s) (${totalGroups} group(s), ${totalChannels} channel(s)) with scope '${scope}'...`,
            timestamp: new Date().toISOString(),
        });

        // 2. Iterate through configured sources
        let currentIndex = 0;
        for (const source of sourcesToScrape) {
            if (options.signal?.aborted) {
                console.log("Extraction aborted by client signal.");
                break;
            }

            currentIndex++;

            // Emit unified source_start
            emit({
                type: "source_start",
                sourceType: source.type,
                sourceName: source.name,
                targetDomain: source.targetDomain,
                index: currentIndex,
                total: sourcesToScrape.length,
            });

            try {
                if (source.type === "group") {
                    // Ensure Chats tab is active
                    await navigateToChatsTab(page);

                    emit({
                        type: "source_progress",
                        sourceType: "group",
                        sourceName: source.name,
                        message: `Searching for group '${source.name}'...`,
                    });

                    const searchResult = await searchAndOpenGroup(page, source.name, scope);

                    if (searchResult.status === "skipped_no_unread") {
                        const skipResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "group",
                            targetDomain: source.targetDomain,
                            status: "skipped",
                            unreadCount: 0,
                            extractedLinks: [],
                            warning: "No unread messages detected",
                        };
                        sourceResults.push(skipResult);
                        skippedSources++;
                        emit({
                            type: "source_complete",
                            sourceType: "group",
                            sourceName: source.name,
                            result: skipResult,
                        });
                        continue;
                    }

                    if (searchResult.status === "not_found") {
                        const notFoundResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "group",
                            targetDomain: source.targetDomain,
                            status: "warning",
                            extractedLinks: [],
                            warning: `Group '${source.name}' not found in search results`,
                        };
                        sourceResults.push(notFoundResult);
                        failedSources++;
                        emit({
                            type: "source_complete",
                            sourceType: "group",
                            sourceName: source.name,
                            result: notFoundResult,
                        });
                        continue;
                    }

                    const unreadCount = searchResult.unreadCount;

                    const msgRowSel = getCombinedSelector(WHATSAPP_LOCATORS.messageContainer);
                    await page.waitForSelector(msgRowSel, { state: "attached", timeout: 5000 }).catch(() => { });
                    await page.waitForTimeout(500);

                    emit({
                        type: "source_progress",
                        sourceType: "group",
                        sourceName: source.name,
                        message: "Harvesting messages across scope history...",
                        unreadCount: scope === "unread" ? unreadCount : undefined,
                    });

                    const { messages: rawMessages, stats } = await collectScopeMessagesWithStats(page, scope, unreadCount);
                    const renderedCount = rawMessages.length;

                    if (renderedCount === 0) {
                        // A chat that rendered but has nothing in scope is a skip, not a failure.
                        const chatRendered = stats.totalMessages > 0;
                        const noMessagesResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "group",
                            targetDomain: source.targetDomain,
                            status: chatRendered ? "skipped" : "warning",
                            messagesRendered: 0,
                            extractedLinks: [],
                            warning: describeEmptyScope(scope, stats),
                        };
                        sourceResults.push(noMessagesResult);
                        if (chatRendered) {
                            skippedSources++;
                        } else {
                            failedSources++;
                        }
                        emit({
                            type: "source_complete",
                            sourceType: "group",
                            sourceName: source.name,
                            result: noMessagesResult,
                        });
                        continue;
                    }

                    // collectAllScopeMessages already returns only the messages inside the scope.
                    const groupLinks: string[] = [];
                    const messagesProcessed = renderedCount;

                    for (const msg of rawMessages) {
                        for (const rawLink of msg.rawLinks) {
                            const link = cleanExtractedUrl(rawLink);
                            if (isMatchingDomain(link, source)) {
                                groupLinks.push(link);
                                allJobLinks.add(link);
                            }
                        }
                    }

                    const deduplicatedGroupLinks = Array.from(new Set(groupLinks));
                    const successResult: SourceScrapeResult = {
                        sourceName: source.name,
                        sourceType: "group",
                        targetDomain: source.targetDomain,
                        status: "success",
                        unreadCount: scope === "unread" ? unreadCount : undefined,
                        messagesRendered: renderedCount,
                        messagesProcessed,
                        extractedLinks: deduplicatedGroupLinks,
                    };

                    sourceResults.push(successResult);
                    processedSources++;
                    processedGroups++;

                    emit({
                        type: "source_complete",
                        sourceType: "group",
                        sourceName: source.name,
                        result: successResult,
                    });

                    await randomJitter(800, 1800);
                } else if (source.type === "channel") {
                    // 1. Navigate to Channels tab
                    await navigateToChannelsTab(page);

                    emit({
                        type: "source_progress",
                        sourceType: "channel",
                        sourceName: source.name,
                        message: `Locating followed channel '${source.name}'...`,
                    });

                    // 2. Open followed channel
                    const openResult = await openFollowedChannel(page, source.name, scope);

                    if (openResult.status === "skipped_no_unread") {
                        const skipResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "channel",
                            targetDomain: source.targetDomain,
                            status: "skipped",
                            unreadCount: 0,
                            extractedLinks: [],
                            warning: "No unread messages detected",
                        };
                        sourceResults.push(skipResult);
                        skippedSources++;
                        emit({
                            type: "source_complete",
                            sourceType: "channel",
                            sourceName: source.name,
                            result: skipResult,
                        });
                        continue;
                    }

                    if (openResult.status === "not_found") {
                        const notFoundResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "channel",
                            targetDomain: source.targetDomain,
                            status: "warning",
                            extractedLinks: [],
                            warning: `Channel '${source.name}' not found in followed channels list`,
                        };
                        sourceResults.push(notFoundResult);
                        failedSources++;
                        emit({
                            type: "source_complete",
                            sourceType: "channel",
                            sourceName: source.name,
                            result: notFoundResult,
                        });
                        continue;
                    }

                    const unreadCount = openResult.unreadCount;

                    emit({
                        type: "source_progress",
                        sourceType: "channel",
                        sourceName: source.name,
                        message: "Extracting broadcast channel feed links...",
                        unreadCount: scope === "unread" ? unreadCount : undefined,
                    });

                    // 3. Extract channel broadcast links
                    const { links, renderedCount, processedCount, stats } = await extractChannelBroadcastLinks(
                        page,
                        source,
                        scope,
                        unreadCount
                    );

                    if (renderedCount === 0) {
                        const chatRendered = stats.totalMessages > 0;
                        const emptyResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "channel",
                            targetDomain: source.targetDomain,
                            status: chatRendered ? "skipped" : "warning",
                            messagesRendered: 0,
                            extractedLinks: [],
                            warning: describeEmptyScope(scope, stats),
                        };
                        sourceResults.push(emptyResult);
                        if (chatRendered) {
                            skippedSources++;
                        } else {
                            failedSources++;
                        }
                        emit({
                            type: "source_complete",
                            sourceType: "channel",
                            sourceName: source.name,
                            result: emptyResult,
                        });
                        continue;
                    }

                    for (const link of links) {
                        allJobLinks.add(link);
                    }

                    const successResult: SourceScrapeResult = {
                        sourceName: source.name,
                        sourceType: "channel",
                        targetDomain: source.targetDomain,
                        status: "success",
                        unreadCount: scope === "unread" ? unreadCount : undefined,
                        messagesRendered: renderedCount,
                        messagesProcessed: processedCount,
                        extractedLinks: links,
                    };

                    sourceResults.push(successResult);
                    processedSources++;
                    processedChannels++;

                    emit({
                        type: "source_complete",
                        sourceType: "channel",
                        sourceName: source.name,
                        result: successResult,
                    });

                    await randomJitter(800, 1800);
                }
            } catch (sourceError: any) {
                console.error(`Error processing ${source.type} '${source.name}':`, sourceError);
                const errResult: SourceScrapeResult = {
                    sourceName: source.name,
                    sourceType: source.type,
                    targetDomain: source.targetDomain,
                    status: "failed",
                    extractedLinks: [],
                    error: sourceError?.message || `Unexpected ${source.type} processing error`,
                };
                sourceResults.push(errResult);
                failedSources++;
                emit({
                    type: "source_complete",
                    sourceType: source.type,
                    sourceName: source.name,
                    result: errResult,
                });
                await randomJitter(600, 1200);
            }
        }

        const finalUrls = Array.from(allJobLinks);
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTime;

        const importResult: WhatsAppImportResult = {
            success: true,
            scope,
            totalSources: sourcesToScrape.length,
            totalGroups,
            totalChannels,
            processedSources,
            processedGroups,
            processedChannels,
            skippedSources,
            failedSources,
            sourceResults,
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
        await context.close().catch(() => { });
    }
}
