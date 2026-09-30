import { type Page } from "playwright";
import {
    DEFAULT_WHATSAPP_SOURCES,
    DEFAULT_WHATSAPP_GROUPS,
    DEFAULT_WHATSAPP_CHANNELS,
    type WhatsAppSourceType,
    type WhatsAppSourceConfig,
    type WhatsAppGroupConfig,
    type WhatsAppChannelConfig,
} from "../config/whatsapp-sources.js";
import {
    WHATSAPP_LOCATORS,
    getLocatorSelectors,
    getCombinedSelector,
} from "../config/whatsapp_locators.js";
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
} from "./whatsapp-types.js";

export { ExtractionScope };

/**
 * Helper to pause execution with a randomized human-like jitter duration.
 */
export async function randomJitter(minMs = 300, maxMs = 700): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Ensures any active search or filter input state is cleanly sanitized and reset prior to typing.
 * Handles React controlled inputs, clear buttons, and contenteditable boxes without triggering global view dismissals.
 */
export async function clearActiveSearchInput(page: Page): Promise<void> {
    try {
        const searchInputSelector = `${getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput)}, ${getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput)}`;

        // 1. Clear any active search input element via React-compatible native property setter
        await page.evaluate((selector) => {
            const inputs = document.querySelectorAll(selector);
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;

            for (const input of Array.from(inputs)) {
                const el = input as HTMLElement;
                if (nativeSetter && 'value' in el) {
                    nativeSetter.call(el, '');
                } else if ('value' in el) {
                    (el as HTMLInputElement).value = '';
                }
                el.textContent = '';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, searchInputSelector).catch(() => false);

        // 2. Locate and click any search clear / cancel button inside the search container
        const clearBtnSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.chatListSearchClearBtn);
        for (const sel of clearBtnSelectors) {
            const btn = page.locator(sel).first();
            if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
                await btn.click({ force: true }).catch(() => { });
                await page.waitForTimeout(100);
                break;
            }
        }

        // 3. Fallback: If search input is visible and still contains text, select all and backspace
        const inputLoc = page.locator(searchInputSelector).first();
        if ((await inputLoc.count()) > 0 && (await inputLoc.isVisible().catch(() => false))) {
            const currentVal = await inputLoc.inputValue().catch(() => "");
            if (currentVal && currentVal.length > 0) {
                await inputLoc.focus().catch(() => {});
                await page.keyboard.press("ControlOrMeta+A").catch(() => {});
                await page.keyboard.press("Backspace").catch(() => {});
                await page.waitForTimeout(100);
            }
        }
    } catch {
        // Non-fatal sanitization error
    }
}

/**
 * Switches WhatsApp Web navigation to the Chats tab if not already active.
 */
export async function navigateToChatsTab(page: Page): Promise<void> {
    try {
        const chatsListSel = getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer);
        const channelsListSel = getCombinedSelector(WHATSAPP_LOCATORS.channelsListContainer);

        const isChatsView = await page.evaluate(({ chats, channels }) => {
            const pane = document.querySelector(chats);
            const channelsHeader = document.querySelector(channels);
            return !!pane && !channelsHeader;
        }, { chats: chatsListSel, channels: channelsListSel });

        if (isChatsView) return;

        const chatsTabSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.chatsTabBtn);

        for (const sel of chatsTabSelectors) {
            const tab = page.locator(sel).first();
            if ((await tab.count()) > 0 && (await tab.isVisible().catch(() => false))) {
                await tab.click({ force: true }).catch(() => { });
                await page.waitForTimeout(600);
                break;
            }
        }
    } catch {
        // Non-fatal navigation issue
    }
}

/**
 * Switches WhatsApp Web navigation to the Channels / Updates sidebar rail view if not already active.
 */
export async function navigateToChannelsTab(page: Page): Promise<boolean> {
    try {
        const channelsListSel = getCombinedSelector(WHATSAPP_LOCATORS.channelsListContainer);

        const isAlreadyChannels = await page.evaluate((selector) => {
            return !!document.querySelector(selector);
        }, channelsListSel);

        if (isAlreadyChannels) return true;

        const channelsTabSelectors = getLocatorSelectors(WHATSAPP_LOCATORS.channelsTabBtn);

        for (const sel of channelsTabSelectors) {
            const tab = page.locator(sel).first();
            if ((await tab.count()) > 0 && (await tab.isVisible().catch(() => false))) {
                await tab.click({ force: true }).catch(() => { });
                await page.waitForTimeout(1000);
                return true;
            }
        }

        // Fallback check
        return await page.evaluate((selector) => {
            return !!document.querySelector(selector);
        }, channelsListSel);
    } catch (err) {
        console.warn("Failed to navigate to Channels tab:", err);
        return false;
    }
}

/**
 * Progressively scrolls and accumulates all messages matching the target extraction scope,
 * handling WhatsApp Web's virtual message DOM list for both groups and channels.
 */
export async function collectAllScopeMessages(
    page: Page,
    scope: ExtractionScope = ExtractionScope.UNREAD,
    unreadCount = 0
): Promise<RawMessageData[]> {
    const collected = new Map<string, RawMessageData>();

    const harvest = async () => {
        const raw = await evaluateConversationMessages(page);
        for (const msg of raw) {
            const key = msg.prePlainText || (msg.rawLinks.length > 0 ? msg.rawLinks.join('|') : msg.text.slice(0, 100));
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
    const panelSel = getCombinedSelector(WHATSAPP_LOCATORS.conversationPanelMessages);

    for (let step = 1; step <= maxScrollSteps; step++) {
        const scrollInfo = await page.evaluate(async (panelSelector) => {
            const main = document.querySelector('#main');
            if (!main) return { atTop: true, scrollTop: 0 };

            const panel = (
                main.querySelector(panelSelector) ||
                main.querySelector('[data-testid="conversation-panel-messages"]') ||
                main.querySelector('.copyable-area [tabindex="0"]') ||
                main.querySelector('.copyable-area') ||
                main
            ) as HTMLElement | null;

            if (!panel) return { atTop: true, scrollTop: 0 };

            const prevTop = panel.scrollTop;
            panel.scrollTop = Math.max(0, panel.scrollTop - 950);
            return {
                atTop: panel.scrollTop === 0 && prevTop === 0,
                scrollTop: panel.scrollTop,
            };
        }, panelSel);

        await page.waitForTimeout(400); // allow virtual list to render previous DOM nodes
        await harvest();

        if (scope === "unread" && unreadCount > 0 && collected.size >= unreadCount) {
            break;
        }

        if (scope === "today") {
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
 * Helper to escape special regex characters.
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
 * Evaluates messages, broadcast posts, and date dividers in the active conversation panel.
 */
export async function evaluateConversationMessages(page: Page): Promise<RawMessageData[]> {
    const msgContainerSel = getCombinedSelector(WHATSAPP_LOCATORS.messageContainer);
    const dateDividerSel = getCombinedSelector(WHATSAPP_LOCATORS.dateDividerSpan);
    const linkSel = getCombinedSelector(WHATSAPP_LOCATORS.messageAnchorLink);

    return await page.evaluate(({ msgContainerSelector, dateDividerSelector, linkSelector }) => {
        const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;
        const results: {
            rawLinks: string[];
            text: string;
            prePlainText: string;
            dateSection: string;
        }[] = [];

        const main =
            document.querySelector('#main') ||
            document.querySelector('[data-testid="conversation-panel-wrapper"]') ||
            document.querySelector('[data-testid="conversation-panel-body"]') ||
            document.querySelector('.copyable-area') ||
            document.body;

        // 1. Find all date divider headers
        const allSpans = Array.from(main.querySelectorAll(dateDividerSelector));
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

        // 2. Find all message elements (groups and channels)
        const messageElements = Array.from(main.querySelectorAll(msgContainerSelector));

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

            let dateSection = '';
            for (const header of dateHeaders) {
                if (header.el.compareDocumentPosition(msg) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    dateSection = header.text;
                }
            }

            const linkSet = new Set<string>();
            const msgParent = msg.closest('[data-testid="msg-container"]') || msg.closest('div[role="row"]') || msg;
            const anchors = msgParent.querySelectorAll(linkSelector);
            anchors.forEach((a) => {
                const href = a.getAttribute('href');
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                    linkSet.add(href.trim());
                }
            });

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
    }, {
        msgContainerSelector: msgContainerSel,
        dateDividerSelector: dateDividerSel,
        linkSelector: linkSel,
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
): Promise<{ links: string[]; renderedCount: number; processedCount: number }> {
    const rawMessages = await collectAllScopeMessages(page, scope, unreadCount);
    const renderedCount = rawMessages.length;
    const channelLinks: string[] = [];
    let processedCount = 0;

    const targetDomain = 'targetDomain' in channelConfig ? channelConfig.targetDomain : '';
    const allowedDomains = channelConfig.allowedDomains || [targetDomain];

    if (scope === ExtractionScope.UNREAD) {
        const startIndex = unreadCount > 0 ? Math.max(0, renderedCount - unreadCount) : 0;
        processedCount = renderedCount - startIndex;

        for (let i = startIndex; i < renderedCount; i++) {
            const msg = rawMessages[i];
            if (msg) {
                for (const rawLink of msg.rawLinks) {
                    const link = cleanExtractedUrl(rawLink);
                    if (isMatchingDomain(link, { targetDomain, allowedDomains })) {
                        channelLinks.push(link);
                    }
                }
            }
        }
    } else if (scope === ExtractionScope.TODAY) {
        for (const msg of rawMessages) {
            const isToday =
                isDateToday(msg.dateSection) ||
                isDateToday(msg.prePlainText) ||
                (!msg.dateSection && !isDateYesterday(msg.prePlainText) && !msg.prePlainText.includes('/'));

            if (isToday) {
                processedCount++;
                for (const rawLink of msg.rawLinks) {
                    const link = cleanExtractedUrl(rawLink);
                    if (isMatchingDomain(link, { targetDomain, allowedDomains })) {
                        channelLinks.push(link);
                    }
                }
            }
        }
    } else if (scope === ExtractionScope.YESTERDAY) {
        for (const msg of rawMessages) {
            const isYesterday =
                isDateYesterday(msg.dateSection) ||
                isDateYesterday(msg.prePlainText);

            if (isYesterday) {
                processedCount++;
                for (const rawLink of msg.rawLinks) {
                    const link = cleanExtractedUrl(rawLink);
                    if (isMatchingDomain(link, { targetDomain, allowedDomains })) {
                        channelLinks.push(link);
                    }
                }
            }
        }
    }

    return {
        links: Array.from(new Set(channelLinks)),
        renderedCount,
        processedCount,
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

                    const rawMessages = await collectAllScopeMessages(page, scope, unreadCount);
                    const renderedCount = rawMessages.length;

                    if (renderedCount === 0) {
                        const noMessagesResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "group",
                            targetDomain: source.targetDomain,
                            status: "warning",
                            messagesRendered: 0,
                            extractedLinks: [],
                            warning: "No messages rendered in conversation panel",
                        };
                        sourceResults.push(noMessagesResult);
                        failedSources++;
                        emit({
                            type: "source_complete",
                            sourceType: "group",
                            sourceName: source.name,
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
                                    if (isMatchingDomain(link, source)) {
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
                                    if (isMatchingDomain(link, source)) {
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
                                    if (isMatchingDomain(link, source)) {
                                        groupLinks.push(link);
                                        allJobLinks.add(link);
                                    }
                                }
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
                    const { links, renderedCount, processedCount } = await extractChannelBroadcastLinks(
                        page,
                        source,
                        scope,
                        unreadCount
                    );

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
