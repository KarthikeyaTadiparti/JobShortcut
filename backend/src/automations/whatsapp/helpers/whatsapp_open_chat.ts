import { type Page } from "playwright";
import {
    WHATSAPP_LOCATORS,
    getLocatorSelectors,
    getCombinedSelector,
    type LocatorDefinition,
} from "@/automations/whatsapp/config/whatsapp_locators.js";
import { ExtractionScope } from "@/automations/whatsapp/whatsapp_types.js";
import { randomJitter, clearActiveSearchInput, navigateToChannelsTab } from "./whatsapp_navigation.js";
import { getSearchCandidates, chatNameMatchLevel, isSameChatName } from "./whatsapp_search.js";

export interface SearchAndOpenResult {
    status: "opened" | "skipped_no_unread" | "not_found" | "error";
    unreadCount: number;
    /** Title of the chat that was matched or opened, when known. */
    title?: string | undefined;
    /** Why searching or opening failed (status "error"). */
    message?: string | undefined;
}

export interface ListRowInfo {
    index: number;
    title: string;
    unreadCount: number;
    /** True while the row's preview line still reads "Loading..." (the badge is not rendered yet). */
    loading: boolean;
}

interface MatchedRow extends ListRowInfo {
    level: number;
}

interface ListSelectors {
    row: string;
    title: string;
    badge: string;
}

const ROW_INDEX_ATTR = "data-js-row-index";
const ROW_SETTLE_TIMEOUT_MS = 6000;
const ROW_SETTLE_POLL_MS = 300;

/**
 * Whether a row's unread count can be trusted. A positive badge is always real; a zero
 * only counts once the row has stopped loading and read the same on two consecutive polls,
 * because the badge is not rendered while the row shows "Loading...".
 */
export function isUnreadReadingConfirmed(previous: ListRowInfo | undefined, current: ListRowInfo): boolean {
    if (current.unreadCount > 0) return true;
    return !current.loading && !!previous && !previous.loading && previous.unreadCount === current.unreadCount;
}

/**
 * Reads the chat/channel list rows (never rows inside the open conversation in #main),
 * tagging each with an index so the chosen one can be clicked afterwards.
 */
async function readListRows(
    page: Page,
    rowSelector: string,
    titleSelector: string,
    badgeSelector: string,
    limit = 30
): Promise<ListRowInfo[]> {
    return await page.evaluate(({ rowSelector, titleSelector, badgeSelector, limit, attr }) => {
        document.querySelectorAll(`[${attr}]`).forEach((el) => el.removeAttribute(attr));
        const rows = Array.from(document.querySelectorAll(rowSelector))
            .filter((row) => !row.closest("#main") && !row.parentElement?.closest(rowSelector))
            .slice(0, limit);
        return rows.map((row, index) => {
            row.setAttribute(attr, String(index));
            const titleEl =
                row.querySelector('[data-testid="cell-frame-title"] [title]') ||
                row.querySelector('[data-testid="cell-frame-title"]') ||
                row.querySelector(titleSelector);
            const title = (titleEl?.getAttribute("title") || titleEl?.textContent || "").trim();
            const badge = row.querySelector(badgeSelector);
            const digits = (badge?.getAttribute("aria-label") || badge?.textContent || "").match(/[0-9]+/);
            const loading = Array.from(row.querySelectorAll("span, div")).some(
                (el) => el.children.length === 0 && /^loading(\.{3}|…)?$/i.test((el.textContent || "").trim())
            );
            return { index, title, unreadCount: digits ? parseInt(digits[0], 10) : 0, loading };
        });
    }, { rowSelector, titleSelector, badgeSelector, limit, attr: ROW_INDEX_ATTR });
}

/** Best-matching row by title (see chatNameMatchLevel); message previews never count. */
function pickBestRow(rows: ListRowInfo[], sourceName: string): MatchedRow | undefined {
    let best: MatchedRow | undefined;
    for (const row of rows) {
        const level = chatNameMatchLevel(row.title, sourceName);
        if (level > 0 && (!best || level > best.level)) {
            best = { ...row, level };
        }
    }
    return best;
}

/** Polls the list until a row matches the source name, or the timeout passes. */
async function findListRow(
    page: Page,
    sourceName: string,
    selectors: ListSelectors,
    timeoutMs: number
): Promise<MatchedRow | undefined> {
    const deadline = Date.now() + timeoutMs;
    do {
        const best = pickBestRow(await readListRows(page, selectors.row, selectors.title, selectors.badge), sourceName);
        if (best) return best;
        await page.waitForTimeout(300);
    } while (Date.now() < deadline);
    return undefined;
}

/**
 * Re-reads a matched row until its unread count can be trusted (see isUnreadReadingConfirmed)
 * or the timeout passes. Rows are re-read and re-tagged each poll, so the returned row is
 * the one to click.
 */
async function waitForRowSettled(
    page: Page,
    row: MatchedRow,
    sourceName: string,
    selectors: ListSelectors
): Promise<{ row: MatchedRow; confirmed: boolean }> {
    const deadline = Date.now() + ROW_SETTLE_TIMEOUT_MS;
    let latest = row;
    let previous: ListRowInfo | undefined;
    do {
        await page.waitForTimeout(ROW_SETTLE_POLL_MS);
        const best = pickBestRow(await readListRows(page, selectors.row, selectors.title, selectors.badge), sourceName);
        if (best) {
            latest = best;
            if (isUnreadReadingConfirmed(previous, best)) return { row: best, confirmed: true };
            previous = best;
        } else {
            previous = undefined;
        }
    } while (Date.now() < deadline);
    return { row: latest, confirmed: false };
}

async function clickListRow(page: Page, row: MatchedRow): Promise<void> {
    await page.locator(`[${ROW_INDEX_ATTR}="${row.index}"]`).first().click({ force: true });
}

/** Title of the open conversation, trying the locator's selectors in priority order. */
async function readOpenChatTitle(page: Page, def: LocatorDefinition): Promise<string> {
    return await page.evaluate((selectors) => {
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            const text = (el?.getAttribute("title") || el?.textContent || "").trim();
            if (text) return text;
        }
        return "";
    }, getLocatorSelectors(def)).catch(() => "");
}

/** Waits until the conversation header shows the expected chat. */
async function waitForOpenChat(
    page: Page,
    def: LocatorDefinition,
    sourceName: string,
    timeoutMs = 8000
): Promise<{ matched: boolean; title: string }> {
    const deadline = Date.now() + timeoutMs;
    let title = "";
    do {
        title = await readOpenChatTitle(page, def);
        if (title && isSameChatName(title, sourceName)) return { matched: true, title };
        await page.waitForTimeout(250);
    } while (Date.now() < deadline);
    return { matched: false, title };
}

/**
 * Opens a matched row after the unread check, then confirms the header shows that chat,
 * so a mis-click can never silently scrape a different conversation.
 */
async function openMatchedRow(
    page: Page,
    initialRow: MatchedRow,
    sourceName: string,
    scope: ExtractionScope,
    headerDef: LocatorDefinition,
    panelSelector: string,
    selectors: ListSelectors
): Promise<SearchAndOpenResult> {
    let row = initialRow;

    // Opening a chat marks it read, so check the unread count before clicking. A zero is only
    // trusted once the row has finished loading; if it never settles, open the chat anyway and
    // let the harvester count from the in-chat "N unread messages" divider.
    if (scope === ExtractionScope.UNREAD && row.unreadCount === 0) {
        const settled = await waitForRowSettled(page, row, sourceName, selectors);
        row = settled.row;
        if (settled.confirmed && row.unreadCount === 0) {
            await clearActiveSearchInput(page);
            return { status: "skipped_no_unread", unreadCount: 0, title: row.title };
        }
    }

    await clickListRow(page, row);
    await page.waitForSelector(panelSelector, { state: "visible", timeout: 8000 }).catch(() => {});
    const opened = await waitForOpenChat(page, headerDef, sourceName);
    await clearActiveSearchInput(page);

    if (!opened.matched) {
        return {
            status: "error",
            unreadCount: 0,
            title: opened.title,
            message: `Opened chat '${opened.title || "unknown"}' does not match '${sourceName}'`,
        };
    }

    await randomJitter(400, 700);
    return { status: "opened", unreadCount: row.unreadCount, title: opened.title };
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

        // 0. Already open: only an exact title match counts, never a substring of the header.
        const openTitle = await readOpenChatTitle(page, WHATSAPP_LOCATORS.conversationChatTitle);
        if (openTitle && isSameChatName(openTitle, groupName)) {
            if (scope === ExtractionScope.UNREAD) {
                return { status: "skipped_no_unread", unreadCount: 0, title: openTitle };
            }
            return { status: "opened", unreadCount: 0, title: openTitle };
        }

        const selectors = {
            row: getCombinedSelector(WHATSAPP_LOCATORS.chatListRow),
            title: getCombinedSelector(WHATSAPP_LOCATORS.chatRowTitle),
            badge: getCombinedSelector(WHATSAPP_LOCATORS.chatRowUnreadBadge),
        };
        const searchInputSel = getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput);
        const panelSel = getCombinedSelector(WHATSAPP_LOCATORS.conversationPanelMessages);

        for (const query of getSearchCandidates(groupName)) {
            // 1. Focus the search box and type the query
            await clearActiveSearchInput(page);
            const searchBox = page.locator(searchInputSel).first();
            await searchBox.waitFor({ state: "visible", timeout: 8000 });
            await searchBox.click({ force: true });
            const charDelay = Math.floor(Math.random() * 25) + 25;
            await page.keyboard.type(query, { delay: charDelay });
            await randomJitter(800, 1200);

            // 2. Wait for a result row whose title matches the configured name
            const row = await findListRow(page, groupName, selectors, 3500);
            if (row) {
                return await openMatchedRow(page, row, groupName, scope, WHATSAPP_LOCATORS.conversationChatTitle, panelSel, selectors);
            }
        }

        await clearActiveSearchInput(page);
        return { status: "not_found", unreadCount: 0 };
    } catch (error: any) {
        await clearActiveSearchInput(page);
        return { status: "error", unreadCount: 0, message: `Search/open failed for group '${groupName}': ${error?.message || error}` };
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
        // 0. Already open: only an exact title match counts.
        const openTitle = await readOpenChatTitle(page, WHATSAPP_LOCATORS.channelChatTitle);
        if (openTitle && isSameChatName(openTitle, channelName)) {
            if (scope === ExtractionScope.UNREAD) {
                return { status: "skipped_no_unread", unreadCount: 0, title: openTitle };
            }
            return { status: "opened", unreadCount: 0, title: openTitle };
        }

        // Ensure Channels view is active
        await navigateToChannelsTab(page);
        await clearActiveSearchInput(page);

        const selectors = {
            row: getCombinedSelector(WHATSAPP_LOCATORS.channelListRow),
            title: getCombinedSelector(WHATSAPP_LOCATORS.channelRowTitle),
            badge: getCombinedSelector(WHATSAPP_LOCATORS.channelRowUnreadBadge),
        };
        const panelSel = getCombinedSelector(WHATSAPP_LOCATORS.channelMessageContainer);

        // 1. Followed channels list
        let row = await findListRow(page, channelName, selectors, 1500);

        // 2. Filter search inside Channels view
        if (!row) {
            const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput)).first();
            if ((await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false))) {
                await searchInput.click({ force: true });
                await page.keyboard.press("ControlOrMeta+A").catch(() => {});
                await page.keyboard.press("Backspace").catch(() => {});
                await page.keyboard.type(channelName, { delay: 40 });
                await randomJitter(600, 1000);
                row = await findListRow(page, channelName, selectors, 3500);
            }
        }

        if (!row) {
            await clearActiveSearchInput(page);
            return { status: "not_found", unreadCount: 0 };
        }

        return await openMatchedRow(page, row, channelName, scope, WHATSAPP_LOCATORS.channelChatTitle, panelSel, selectors);
    } catch (error: any) {
        await clearActiveSearchInput(page);
        return { status: "error", unreadCount: 0, message: `Open failed for channel '${channelName}': ${error?.message || error}` };
    }
}
