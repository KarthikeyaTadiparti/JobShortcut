import { type Page } from "playwright";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "./config/whatsapp_locators.js";
import { ExtractionScope, type RawMessageData } from "./whatsapp-types.js";
import {
    assignDates,
    createMergeState,
    getScopedPlaceholders,
    getUnreadMarkerCount,
    isScopeBoundaryReached,
    mergeWindow,
    prependWindow,
    sliceScope,
    toDateKey,
    type DateOrder,
    type HarvestItem,
    type MergeState,
} from "./helpers/whatsapp_message_merge.js";

/**
 * One harvested view of the currently mounted conversation rows, oldest -> newest.
 */
export interface WindowSnapshot {
    items: HarvestItem[];
    scrollTop: number;
    clientHeight: number;
    loading: boolean;
}

export type HarvestStopReason = "boundary" | "top" | "timeout" | "no-messages";

export interface HarvestStats {
    windows: number;
    gapRetries: number;
    unrecoveredGaps: number;
    /** Scope messages whose content never rendered (should be 0). */
    placeholdersRemaining: number;
    totalItems: number;
    totalMessages: number;
    scopedMessages: number;
    unreadMarkerCount?: number | undefined;
    /** Local calendar date the 'today'/'yesterday' scope was matched against (YYYY-MM-DD). */
    scopeDate?: string | undefined;
    /** Date of the newest message seen in the conversation, if known. */
    newestMessageDate?: string | undefined;
    dateOrder: DateOrder;
    stopReason: HarvestStopReason;
    durationMs: number;
}

export interface HarvestOptions {
    /** Wall-time cap for one conversation scan. Default 180000 ms. */
    maxDurationMs?: number | undefined;
    /** Fraction of the viewport scrolled per step; the rest is overlap. Default 0.7. */
    stepRatio?: number | undefined;
    /** Reference "today" for date scopes. Default: now. */
    today?: Date | undefined;
}

export interface HarvestResult {
    messages: RawMessageData[];
    stats: HarvestStats;
}

const SCROLLER_ATTR = "data-js-harvest-scroller";

function harvestSelectors() {
    return {
        rowSel: getCombinedSelector(WHATSAPP_LOCATORS.messageRow),
        placeholderSel: getCombinedSelector(WHATSAPP_LOCATORS.virtualizedPlaceholder),
        quotedSel: getCombinedSelector(WHATSAPP_LOCATORS.quotedMessage),
        dividerSel: getCombinedSelector(WHATSAPP_LOCATORS.dateDividerSpan),
        unreadSel: getCombinedSelector(WHATSAPP_LOCATORS.unreadDivider),
        spinnerSel: getCombinedSelector(WHATSAPP_LOCATORS.historyLoadingSpinner),
        readMoreSel: getCombinedSelector(WHATSAPP_LOCATORS.readMoreBtn),
        panelSel: getCombinedSelector(WHATSAPP_LOCATORS.conversationPanelMessages),
        scrollerAttr: SCROLLER_ATTR,
    };
}

type HarvestSelectors = ReturnType<typeof harvestSelectors>;

/**
 * Resolves (and tags) the element that actually scrolls the message history:
 * the nearest scrollable ancestor of the first message row.
 */
async function ensureScroller(page: Page, sel: HarvestSelectors): Promise<boolean> {
    return await page.evaluate(({ rowSel, panelSel, scrollerAttr }) => {
        const main = document.querySelector("#main") || document.body;
        const firstRow = main.querySelector(rowSel);
        const tagged = document.querySelector(`[${scrollerAttr}]`);
        if (tagged && tagged.isConnected && main.contains(tagged) && (!firstRow || tagged.contains(firstRow))) {
            return true;
        }
        document.querySelectorAll(`[${scrollerAttr}]`).forEach((el) => el.removeAttribute(scrollerAttr));

        let scroller: Element | null = null;
        let cur: Element | null = firstRow ? firstRow.parentElement : null;
        while (cur && cur !== document.body) {
            const style = getComputedStyle(cur);
            if (/(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight + 4) {
                scroller = cur;
                break;
            }
            cur = cur.parentElement;
        }
        if (!scroller) {
            scroller = document.querySelector(panelSel);
        }
        if (!scroller) return false;
        scroller.setAttribute(scrollerAttr, "true");
        return true;
    }, sel);
}

/**
 * Captures every mounted message, date divider, and unread marker in DOM order.
 * Each message is read only from its own row, so quoted replies and nested
 * copyable-text spans cannot produce extra entries.
 */
export async function snapshotWindow(page: Page): Promise<WindowSnapshot> {
    const sel = harvestSelectors();
    await ensureScroller(page, sel);

    return await page.evaluate(({ rowSel, placeholderSel, quotedSel, dividerSel, unreadSel, spinnerSel, scrollerAttr }) => {
        const main = document.querySelector("#main") || document.body;
        const scroller = document.querySelector(`[${scrollerAttr}]`);
        const root = scroller || main;
        const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;
        const norm = (s: string) => s.replace(/\s+/g, " ").trim();
        const isDividerLabel = (t: string) =>
            !!t &&
            !t.includes(":") &&
            t.length < 35 &&
            (/^(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(t) ||
                /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(t) ||
                /\b\d{4}-\d{1,2}-\d{1,2}\b/.test(t) ||
                /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(t));
        const isPinned = (el: Element) => {
            let cur: Element | null = el;
            while (cur && cur !== root) {
                const pos = getComputedStyle(cur).position;
                if (pos === "sticky" || pos === "fixed") return true;
                cur = cur.parentElement;
            }
            return false;
        };

        type RowNode = { el: Element; kind: "message" | "divider" | "unread-marker"; label: string };
        const nodes: RowNode[] = [];
        const unreadRe = /^\d+\s+unread\s+messages?$/i;
        const dividerByLabel = new Map<string, Element>();
        let unreadFound = false;

        // 1. Outermost message elements only. Rows that carry a data-id but are really a
        //    date divider or the unread marker (no body, label-only text) are reclassified.
        const candidates = Array.from(root.querySelectorAll(rowSel));
        const messageEls = candidates.filter((el) => {
            const parent = el.parentElement ? el.parentElement.closest(rowSel) : null;
            return !parent || !root.contains(parent);
        });
        for (const el of messageEls) {
            const hasBody = !!el.querySelector('[data-pre-plain-text], span.selectable-text, [data-testid="selectable-text"], a[href]');
            const whole = norm(el.textContent || "");
            if (!hasBody && isDividerLabel(whole)) {
                dividerByLabel.set(whole, el);
                continue;
            }
            if (!hasBody && unreadRe.test(whole)) {
                if (!unreadFound) {
                    nodes.push({ el, kind: "unread-marker", label: whole });
                    unreadFound = true;
                }
                continue;
            }
            nodes.push({ el, kind: "message", label: "" });
        }

        // 2. Date dividers outside message bubbles, excluding the sticky floating date pill.
        for (const span of Array.from(root.querySelectorAll(dividerSel))) {
            if (span.closest(rowSel)) continue;
            const label = (span.textContent || "").trim();
            if (!isDividerLabel(label) || isPinned(span)) continue;
            const prior = dividerByLabel.get(label);
            // Prefer the copy living in a list row; otherwise keep the last one in DOM order.
            if (!prior || !prior.closest('[role="row"]') || span.closest('[role="row"]')) {
                dividerByLabel.set(label, span);
            }
        }
        for (const [label, el] of dividerByLabel) nodes.push({ el, kind: "divider", label });

        // 3. The "N unread messages" divider.
        for (const span of unreadFound ? [] : Array.from(root.querySelectorAll(unreadSel))) {
            if (span.closest(rowSel)) continue;
            const label = (span.textContent || "").trim();
            if (unreadRe.test(label)) {
                nodes.push({ el: span, kind: "unread-marker", label });
                break;
            }
        }

        nodes.sort((a, b) => {
            if (a.el === b.el) return 0;
            return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });

        const items: {
            key: string;
            type: "message" | "divider" | "unread-marker";
            dataId?: string | undefined;
            text: string;
            prePlainText: string;
            rawLinks: string[];
            kind: "text" | "media" | "other";
            truncated: boolean;
            placeholder: boolean;
            dividerText: string;
        }[] = [];

        for (const node of nodes) {
            if (node.kind !== "message") {
                items.push({
                    key: node.kind === "divider" ? `divider:${node.label}` : "unread-marker",
                    type: node.kind,
                    text: "",
                    prePlainText: "",
                    rawLinks: [],
                    kind: "other",
                    truncated: false,
                    placeholder: false,
                    dividerText: node.label,
                });
                continue;
            }

            const el = node.el;
            const dataIdEarly =
                el.getAttribute("data-id") || el.closest("[data-id]")?.getAttribute("data-id") || "";
            const isShell =
                (el.matches(placeholderSel) || !!el.querySelector(placeholderSel)) &&
                !el.querySelector('[data-pre-plain-text], span.selectable-text, [data-testid="selectable-text"], a[href], img, video');
            if (isShell && dataIdEarly) {
                items.push({
                    key: `id:${dataIdEarly}`,
                    type: "message",
                    dataId: dataIdEarly,
                    text: "",
                    prePlainText: "",
                    rawLinks: [],
                    kind: "other",
                    truncated: false,
                    placeholder: true,
                    dividerText: "",
                });
                continue;
            }
            const quoted = Array.from(el.querySelectorAll(quotedSel));
            const inQuote = (n: Element) => quoted.some((q) => q.contains(n));

            const dataId =
                el.getAttribute("data-id") ||
                el.closest("[data-id]")?.getAttribute("data-id") ||
                el.querySelector("[data-id]")?.getAttribute("data-id") ||
                "";

            const preEl = Array.from(el.querySelectorAll("[data-pre-plain-text]")).find((n) => !inQuote(n));
            const prePlainText = el.getAttribute("data-pre-plain-text") || preEl?.getAttribute("data-pre-plain-text") || "";

            const textEls = Array.from(el.querySelectorAll('span.selectable-text, [data-testid="selectable-text"]'))
                .filter((n) => !inQuote(n));
            const outerText = textEls.filter((n) => !textEls.some((o) => o !== n && o.contains(n)));
            let text = outerText.map((n) => (n as HTMLElement).innerText || n.textContent || "").join("\n");
            if (!text) {
                const copyable = Array.from(el.querySelectorAll(".copyable-text")).find((n) => !inQuote(n));
                text = copyable ? (copyable as HTMLElement).innerText || copyable.textContent || "" : "";
            }
            text = text.replace(/\s*Read more\s*$/i, "").trim();

            const truncated = Array.from(el.querySelectorAll('[role="button"], button'))
                .some((b) => /^\s*read more\s*$/i.test(b.textContent || ""));

            const linkSet = new Set<string>();
            for (const a of Array.from(el.querySelectorAll("a[href]"))) {
                if (inQuote(a)) continue;
                const href = a.getAttribute("href");
                if (href && /^https?:\/\//i.test(href)) linkSet.add(href.trim());
            }
            for (const url of text.match(urlRegex) || []) linkSet.add(url.trim());

            const hasMedia = !!el.querySelector(
                'img:not(.emoji), video, audio, [data-icon*="audio"], [data-icon*="document"], [data-testid*="image"], [data-testid*="video"], [data-testid*="document"], [data-testid*="sticker"]'
            );
            const kind: "text" | "media" | "other" = text ? "text" : hasMedia ? "media" : "other";

            const key = dataId ? `id:${dataId}` : `msg:${norm(prePlainText)}|${norm(text).slice(0, 80)}`;

            items.push({
                key,
                type: "message",
                dataId: dataId || undefined,
                text,
                prePlainText,
                rawLinks: Array.from(linkSet),
                kind,
                truncated,
                placeholder: false,
                dividerText: "",
            });
        }

        const spinner = root.querySelector(spinnerSel) as HTMLElement | null;
        const s = scroller as HTMLElement | null;
        return {
            items,
            scrollTop: s ? s.scrollTop : 0,
            clientHeight: s ? s.clientHeight : 0,
            loading: !!spinner && spinner.offsetParent !== null,
        };
    }, sel);
}

/**
 * Expands "Read more" bodies of messages currently in the viewport and waits until
 * they are expanded, so the snapshot captures full text (and links hidden in it).
 */
export async function expandTruncated(page: Page, timeoutMs = 1200): Promise<number> {
    const sel = harvestSelectors();
    const clickVisible = () =>
        page.evaluate(({ rowSel, readMoreSel, scrollerAttr }) => {
            const scroller = document.querySelector(`[${scrollerAttr}]`) || document.querySelector("#main");
            if (!scroller) return 0;
            const view = scroller.getBoundingClientRect();
            let clicked = 0;
            for (const btn of Array.from(scroller.querySelectorAll(readMoreSel))) {
                if (!/^\s*read more\s*$/i.test(btn.textContent || "")) continue;
                if (!btn.closest(rowSel)) continue;
                const r = btn.getBoundingClientRect();
                if (r.height === 0 || r.bottom < view.top || r.top > view.bottom) continue;
                try {
                    (btn as HTMLElement).click();
                    clicked++;
                } catch {
                    // Non-fatal: button detached mid-click
                }
            }
            return clicked;
        }, sel).catch(() => 0);

    const first = await clickVisible();
    if (first === 0) return 0;

    const deadline = Date.now() + timeoutMs;
    let remaining = first;
    while (remaining > 0 && Date.now() < deadline) {
        await page.waitForTimeout(150);
        remaining = await clickVisible();
    }
    return first;
}

async function probe(page: Page): Promise<{ signature: string; loading: boolean; scrollTop: number }> {
    const sel = harvestSelectors();
    return await page.evaluate(({ rowSel, spinnerSel, scrollerAttr }) => {
        const scroller = document.querySelector(`[${scrollerAttr}]`) as HTMLElement | null;
        const root = scroller || document.querySelector("#main") || document.body;
        const rows = root.querySelectorAll(rowSel);
        const firstId = rows[0]?.getAttribute("data-id") || rows[0]?.textContent?.slice(0, 40) || "";
        const lastRow = rows[rows.length - 1];
        const lastId = lastRow?.getAttribute("data-id") || lastRow?.textContent?.slice(0, 40) || "";
        const spinner = root.querySelector(spinnerSel) as HTMLElement | null;
        return {
            signature: `${rows.length}|${firstId}|${lastId}|${scroller ? scroller.scrollHeight : 0}`,
            loading: !!spinner && spinner.offsetParent !== null,
            scrollTop: scroller ? scroller.scrollTop : 0,
        };
    }, sel).catch(() => ({ signature: "", loading: false, scrollTop: 0 }));
}

/**
 * Waits until the mounted rows stop changing: no loading spinner, and the same
 * row signature (count, first/last key, scrollHeight) on two consecutive polls.
 */
export async function waitForSettle(page: Page, maxMs = 4000, pollMs = 150): Promise<void> {
    const deadline = Date.now() + maxMs;
    let previous = "";
    let stableHits = 0;
    while (Date.now() < deadline) {
        const p = await probe(page);
        if (!p.loading && p.signature === previous) {
            stableHits++;
            if (stableHits >= 2) return;
        } else {
            stableHits = 0;
        }
        previous = p.signature;
        await page.waitForTimeout(pollMs);
    }
}

async function scrollByPx(page: Page, delta: number): Promise<void> {
    await page.evaluate(({ attr, delta }) => {
        const scroller = document.querySelector(`[${attr}]`) as HTMLElement | null;
        if (scroller) scroller.scrollTop = Math.max(0, scroller.scrollTop + delta);
    }, { attr: SCROLLER_ATTR, delta }).catch(() => {});
}

async function scrollAnchorIntoView(
    page: Page,
    dataId: string,
    block: "start" | "center" | "end" = "end"
): Promise<boolean> {
    return await page.evaluate(({ id, block }) => {
        const el = document.querySelector(`#main [data-id="${CSS.escape(id)}"]`);
        if (!el) return false;
        el.scrollIntoView({ block });
        return true;
    }, { id: dataId, block }).catch(() => false);
}

/**
 * Brings the conversation to the newest message. WhatsApp opens unread chats at the
 * unread divider, so newer rows below the viewport may not be mounted yet.
 */
export async function scrollToBottom(page: Page): Promise<void> {
    const sel = harvestSelectors();
    const btnSel = getCombinedSelector(WHATSAPP_LOCATORS.scrollToBottomBtn);
    for (let attempt = 0; attempt < 10; attempt++) {
        const atBottom = await page.evaluate(({ scrollerAttr, btnSel }) => {
            const scroller = document.querySelector(`[${scrollerAttr}]`) as HTMLElement | null;
            if (!scroller) return true;
            const btn = document.querySelector(btnSel) as HTMLElement | null;
            if (btn && btn.offsetParent !== null) {
                const target = (btn.closest("button, [role='button']") as HTMLElement | null) ?? btn;
                target.click();
            }
            scroller.scrollTop = scroller.scrollHeight;
            return scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
        }, { scrollerAttr: sel.scrollerAttr, btnSel }).catch(() => true);
        await waitForSettle(page, 2500);
        if (atBottom) {
            const stillBottom = await page.evaluate((attr) => {
                const s = document.querySelector(`[${attr}]`) as HTMLElement | null;
                return !s || s.scrollTop + s.clientHeight >= s.scrollHeight - 2;
            }, sel.scrollerAttr).catch(() => true);
            if (stillBottom) return;
        }
    }
}

async function harvestOnce(page: Page): Promise<WindowSnapshot> {
    await expandTruncated(page);
    return await snapshotWindow(page);
}

function toRawMessage(item: HarvestItem): RawMessageData {
    return {
        key: item.key,
        dataId: item.dataId,
        rawLinks: [...item.rawLinks],
        text: item.text,
        prePlainText: item.prePlainText,
        dateSection: item.dateSection ?? "",
        date: item.date,
        kind: item.kind,
    };
}

function topmostAnchorId(state: MergeState): string | undefined {
    return state.ordered.find((i) => i.type === "message" && i.dataId)?.dataId;
}

/**
 * Scans the open conversation from the newest message upward until the scope boundary,
 * merging overlapping windows by key and recovering from gaps. Returns the scoped
 * messages (oldest -> newest) plus diagnostics.
 */
export async function collectScopeMessagesWithStats(
    page: Page,
    scope: ExtractionScope = ExtractionScope.UNREAD,
    unreadCount = 0,
    options: HarvestOptions = {}
): Promise<HarvestResult> {
    const startedAt = Date.now();
    const maxDurationMs = options.maxDurationMs ?? 180000;
    const baseRatio = options.stepRatio ?? 0.7;
    const today = options.today ?? new Date();
    const state = createMergeState();

    const stats: HarvestStats = {
        windows: 0,
        gapRetries: 0,
        unrecoveredGaps: 0,
        placeholdersRemaining: 0,
        totalItems: 0,
        totalMessages: 0,
        scopedMessages: 0,
        dateOrder: "dmy",
        stopReason: "boundary",
        durationMs: 0,
    };

    await waitForSettle(page, 3000);
    await ensureScroller(page, harvestSelectors());
    await scrollToBottom(page);

    let snap = await harvestOnce(page);
    stats.windows++;
    mergeWindow(state, snap.items);

    let ratio = baseRatio;
    let topStableHits = 0;

    while (true) {
        stats.dateOrder = assignDates(state.ordered, today);
        // Rows stay mounted as empty shells, so the boundary is often visible at once;
        // keep scanning until every scope message has been seen with real content.
        if (
            isScopeBoundaryReached(state.ordered, scope, unreadCount, today) &&
            getScopedPlaceholders(state.ordered, scope, unreadCount, today).length === 0
        ) {
            stats.stopReason = "boundary";
            break;
        }
        if (Date.now() - startedAt > maxDurationMs) {
            stats.stopReason = "timeout";
            break;
        }

        const viewport = snap.clientHeight > 0 ? snap.clientHeight : 600;
        const wasAtTop = snap.scrollTop <= 0;
        await scrollByPx(page, -Math.round(viewport * ratio));
        await waitForSettle(page);
        if (wasAtTop) {
            // Give WhatsApp time to fetch older history once the top is hit.
            await page.waitForTimeout(600);
            await waitForSettle(page);
        }

        snap = await harvestOnce(page);
        stats.windows++;
        let result = mergeWindow(state, snap.items);

        if (result.gap) {
            let recovered = false;
            for (let attempt = 1; attempt <= 3 && !recovered; attempt++) {
                stats.gapRetries++;
                const anchorId = attempt === 1 ? topmostAnchorId(state) : undefined;
                const anchored = anchorId ? await scrollAnchorIntoView(page, anchorId) : false;
                if (!anchored) {
                    await scrollByPx(page, Math.round(viewport * 0.3));
                }
                await waitForSettle(page);
                snap = await harvestOnce(page);
                stats.windows++;
                result = mergeWindow(state, snap.items);
                recovered = !result.gap;
            }
            if (!recovered) {
                stats.unrecoveredGaps++;
                result = { added: prependWindow(state, snap.items), gap: false };
            }
            ratio = Math.max(0.2, ratio / 2);
        } else if (ratio < baseRatio) {
            ratio = Math.min(baseRatio, ratio * 1.25);
        }

        if (snap.scrollTop <= 0 && result.added === 0 && !snap.loading) {
            topStableHits++;
            if (topStableHits >= 3) {
                stats.stopReason = "top";
                break;
            }
        } else {
            topStableHits = 0;
        }
    }

    stats.dateOrder = assignDates(state.ordered, today);

    // Safety net: jump straight to any scope message whose content never rendered.
    const leftovers = getScopedPlaceholders(state.ordered, scope, unreadCount, today).slice(0, 50);
    for (const item of leftovers) {
        if (!item.dataId || Date.now() - startedAt > maxDurationMs + 30000) break;
        if (!(await scrollAnchorIntoView(page, item.dataId, "center"))) continue;
        await waitForSettle(page, 2500);
        snap = await harvestOnce(page);
        stats.windows++;
        const res = mergeWindow(state, snap.items);
        if (res.gap) prependWindow(state, snap.items);
    }
    stats.dateOrder = assignDates(state.ordered, today);

    const scoped = sliceScope(state.ordered, scope, unreadCount, today);
    stats.placeholdersRemaining = scoped.filter((i) => i.placeholder).length;

    stats.totalItems = state.ordered.length;
    stats.totalMessages = state.ordered.filter((i) => i.type === "message").length;
    stats.scopedMessages = scoped.length;
    stats.unreadMarkerCount = getUnreadMarkerCount(state.ordered);
    if (scope !== ExtractionScope.UNREAD) {
        const target = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (scope === ExtractionScope.YESTERDAY) target.setDate(target.getDate() - 1);
        stats.scopeDate = toDateKey(target);
    }
    stats.newestMessageDate = [...state.ordered].reverse().find((i) => i.type === "message" && i.date)?.date;
    if (stats.totalMessages === 0) stats.stopReason = "no-messages";
    stats.durationMs = Date.now() - startedAt;

    return { messages: scoped.map(toRawMessage), stats };
}

/**
 * Returns the messages mounted in the current viewport window, oldest -> newest.
 */
export async function evaluateWindowMessages(page: Page, today: Date = new Date()): Promise<RawMessageData[]> {
    const snap = await harvestOnce(page);
    const items = snap.items.map((i) => ({ ...i, rawLinks: [...i.rawLinks] }));
    assignDates(items, today);
    return items.filter((i) => i.type === "message").map(toRawMessage);
}
