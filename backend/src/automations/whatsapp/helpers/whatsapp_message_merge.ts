/**
 * Pure (DOM-free) logic for merging overlapping WhatsApp message windows into one
 * ordered stream, assigning dates, and slicing the stream to an extraction scope.
 *
 * WhatsApp Web mounts only a window of the conversation at a time. Each harvest returns
 * a contiguous, ordered window (oldest -> newest). Consecutive windows are expected to
 * overlap; the overlap is what lets us place new items in the right position. A window
 * that shares no item with what we already have is reported as a gap.
 */
import { ExtractionScope } from "@/automations/whatsapp/whatsapp-types.js";

export type HarvestItemType = "message" | "divider" | "unread-marker";
export type MessageKind = "text" | "media" | "other";
export type DateOrder = "dmy" | "mdy" | "ymd";

export interface HarvestItem {
    key: string;
    type: HarvestItemType;
    dataId?: string | undefined;
    text: string;
    prePlainText: string;
    rawLinks: string[];
    kind: MessageKind;
    truncated: boolean;
    /**
     * True while the row is an empty virtualized shell (WhatsApp keeps every row's
     * data-id mounted but only renders content near the viewport).
     */
    placeholder: boolean;
    /** Raw divider label for dividers (e.g. "TODAY", "1/10/2026"). */
    dividerText: string;
    /** Assigned by assignDates(): local calendar date as YYYY-MM-DD. */
    date?: string | undefined;
    /** Assigned by assignDates(): label of the nearest divider above this item. */
    dateSection?: string | undefined;
}

export interface MergeState {
    ordered: HarvestItem[];
    index: Map<string, HarvestItem>;
}

export interface MergeResult {
    added: number;
    gap: boolean;
}

export function createMergeState(): MergeState {
    return { ordered: [], index: new Map() };
}

/**
 * Updates a known item with fresher data from a later harvest of the same row.
 * Text only grows (a truncated "Read more" body is replaced by the expanded one),
 * links are unioned, and missing metadata is filled in.
 */
function upsertItem(existing: HarvestItem, incoming: HarvestItem): void {
    if (!incoming.placeholder) {
        existing.placeholder = false;
    }
    if (incoming.text.length > existing.text.length) {
        existing.text = incoming.text;
        existing.truncated = incoming.truncated;
    } else if (incoming.text === existing.text && !incoming.truncated) {
        existing.truncated = false;
    }
    if (!existing.prePlainText && incoming.prePlainText) {
        existing.prePlainText = incoming.prePlainText;
    }
    if (!existing.dataId && incoming.dataId) {
        existing.dataId = incoming.dataId;
    }
    for (const link of incoming.rawLinks) {
        if (!existing.rawLinks.includes(link)) {
            existing.rawLinks.push(link);
        }
    }
    if (existing.kind === "other" && incoming.kind !== "other") {
        existing.kind = incoming.kind;
    }
}

/**
 * Merges one harvested window into the ordered state.
 *
 * Every new item is placed right after the nearest preceding item of the same window
 * (known or just inserted). Items before the first known item are placed right before it.
 * If the window shares no key with a non-empty state, nothing is inserted and `gap` is true.
 */
export function mergeWindow(state: MergeState, window: HarvestItem[]): MergeResult {
    // Drop duplicate keys inside the window itself (keep the first occurrence, upsert the rest).
    const unique: HarvestItem[] = [];
    const seen = new Map<string, HarvestItem>();
    for (const item of window) {
        const prior = seen.get(item.key);
        if (prior) {
            upsertItem(prior, item);
            continue;
        }
        const copy: HarvestItem = { ...item, rawLinks: [...item.rawLinks] };
        seen.set(item.key, copy);
        unique.push(copy);
    }

    if (unique.length === 0) {
        return { added: 0, gap: false };
    }

    if (state.ordered.length === 0) {
        for (const item of unique) {
            state.ordered.push(item);
            state.index.set(item.key, item);
        }
        return { added: unique.length, gap: false };
    }

    const firstKnownPos = unique.findIndex((item) => state.index.has(item.key));
    if (firstKnownPos === -1) {
        return { added: 0, gap: true };
    }

    let added = 0;

    // 1. Items older than the first known item go right before it, in window order.
    const firstKnown = state.index.get(unique[firstKnownPos]!.key)!;
    const leading = unique.slice(0, firstKnownPos);
    if (leading.length > 0) {
        const at = state.ordered.indexOf(firstKnown);
        state.ordered.splice(at, 0, ...leading);
        for (const item of leading) {
            state.index.set(item.key, item);
        }
        added += leading.length;
    }

    // 2. Walk the rest; each new item goes right after the previous window item.
    let previous: HarvestItem = firstKnown;
    upsertItem(firstKnown, unique[firstKnownPos]!);
    for (let i = firstKnownPos + 1; i < unique.length; i++) {
        const item = unique[i]!;
        const known = state.index.get(item.key);
        if (known) {
            upsertItem(known, item);
            previous = known;
            continue;
        }
        const at = state.ordered.indexOf(previous);
        state.ordered.splice(at + 1, 0, item);
        state.index.set(item.key, item);
        previous = item;
        added++;
    }

    return { added, gap: false };
}

/**
 * Best-effort fallback for a gap that could not be recovered while scrolling upward:
 * the window is older than everything known, so its unknown items go to the front.
 */
export function prependWindow(state: MergeState, window: HarvestItem[]): number {
    const fresh: HarvestItem[] = [];
    for (const item of window) {
        const known = state.index.get(item.key);
        if (known) {
            upsertItem(known, item);
            continue;
        }
        const copy: HarvestItem = { ...item, rawLinks: [...item.rawLinks] };
        state.index.set(copy.key, copy);
        fresh.push(copy);
    }
    state.ordered.unshift(...fresh);
    return fresh.length;
}

// ---------------------------------------------------------------------------
// DATES
// ---------------------------------------------------------------------------

const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const NUMERIC_DATE = /(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})/;

/** Formats a Date as a local YYYY-MM-DD key (string-comparable). */
export function toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function shiftDays(base: Date, days: number): Date {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + days);
    return d;
}

function buildKey(year: number, month: number, day: number): string | undefined {
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return undefined;
    return toDateKey(d);
}

function normalizeYear(y: number): number {
    return y < 100 ? 2000 + y : y;
}

/**
 * Infers whether numeric dates are day-first or month-first from a sample of
 * WhatsApp timestamps. A part greater than 12 decides; otherwise `fallback` is used.
 */
export function detectDateOrder(samples: string[], fallback: DateOrder = "dmy"): DateOrder {
    for (const sample of samples) {
        const m = sample.match(NUMERIC_DATE);
        if (!m) continue;
        if (m[1]!.length === 4) return "ymd";
        const a = parseInt(m[1]!, 10);
        const b = parseInt(m[2]!, 10);
        if (a > 12 && b <= 12) return "dmy";
        if (b > 12 && a <= 12) return "mdy";
    }
    return fallback;
}

/** Parses a numeric date (e.g. "1/10/2026", "2026-10-01") using the given order. */
export function parseNumericDate(text: string, order: DateOrder): string | undefined {
    const m = text.match(NUMERIC_DATE);
    if (!m) return undefined;
    const p1 = parseInt(m[1]!, 10);
    const p2 = parseInt(m[2]!, 10);
    const p3 = parseInt(m[3]!, 10);
    if (m[1]!.length === 4 || order === "ymd") return buildKey(p1, p2, p3);
    if (order === "mdy") return buildKey(normalizeYear(p3), p1, p2);
    return buildKey(normalizeYear(p3), p2, p1);
}

/**
 * Parses the date part of a `data-pre-plain-text` value such as
 * "[10:32 am, 1/10/2026] Sender: ".
 */
export function parsePrePlainDate(prePlainText: string, order: DateOrder): string | undefined {
    if (!prePlainText) return undefined;
    return parseNumericDate(prePlainText, order);
}

/**
 * Parses a conversation date divider label relative to `today`.
 * Handles "TODAY", "YESTERDAY", weekday names (last 7 days), numeric dates, and
 * month-name dates with or without a year ("1 October 2026", "October 1").
 */
export function parseDividerDate(label: string, today: Date, order: DateOrder): string | undefined {
    const text = label.trim().toLowerCase();
    if (!text) return undefined;
    if (/^today\b/.test(text)) return toDateKey(today);
    if (/^yesterday\b/.test(text)) return toDateKey(shiftDays(today, -1));

    const weekday = WEEKDAYS.findIndex((w) => text.startsWith(w));
    if (weekday !== -1 && !/\d/.test(text)) {
        // Most recent past occurrence of that weekday (WhatsApp uses names for 2-6 days ago).
        for (let back = 1; back <= 7; back++) {
            const d = shiftDays(today, -back);
            if (d.getDay() === weekday) return toDateKey(d);
        }
    }

    const numeric = parseNumericDate(text, order);
    if (numeric) return numeric;

    const monthIdx = MONTHS.findIndex((mo) => text.includes(mo) || text.includes(mo.slice(0, 3)));
    if (monthIdx !== -1) {
        const yearMatch = text.match(/\b(\d{4})\b/);
        const withoutYear = yearMatch ? text.replace(yearMatch[0], " ") : text;
        const dayMatch = withoutYear.match(/\b(\d{1,2})\b/);
        if (!dayMatch) return undefined;
        const day = parseInt(dayMatch[1]!, 10);
        if (yearMatch) return buildKey(parseInt(yearMatch[1]!, 10), monthIdx + 1, day);
        const thisYear = buildKey(today.getFullYear(), monthIdx + 1, day);
        if (thisYear && thisYear > toDateKey(today)) {
            return buildKey(today.getFullYear() - 1, monthIdx + 1, day);
        }
        return thisYear;
    }

    return undefined;
}

/**
 * Walks the ordered stream (oldest -> newest) and assigns `date` and `dateSection`.
 * Dividers are part of the stream, so messages harvested in a window where their
 * divider was already unmounted still get the right date.
 */
export function assignDates(ordered: HarvestItem[], today: Date, order?: DateOrder): DateOrder {
    const resolvedOrder =
        order ?? detectDateOrder(ordered.filter((i) => i.prePlainText).map((i) => i.prePlainText));

    let currentDate: string | undefined;
    let currentLabel = "";
    for (const item of ordered) {
        if (item.type === "divider") {
            const parsed = parseDividerDate(item.dividerText, today, resolvedOrder);
            if (parsed) currentDate = parsed;
            currentLabel = item.dividerText;
            item.date = parsed;
            item.dateSection = item.dividerText;
            continue;
        }
        if (item.type === "message") {
            item.date = parsePrePlainDate(item.prePlainText, resolvedOrder) ?? currentDate;
            item.dateSection = currentLabel;
        } else {
            item.date = currentDate;
            item.dateSection = currentLabel;
        }
    }
    return resolvedOrder;
}

// ---------------------------------------------------------------------------
// SCOPE
// ---------------------------------------------------------------------------

/** Number advertised by the in-chat "N unread messages" divider, if present. */
export function getUnreadMarkerCount(ordered: HarvestItem[]): number | undefined {
    for (let i = ordered.length - 1; i >= 0; i--) {
        const item = ordered[i]!;
        if (item.type === "unread-marker") {
            const m = item.dividerText.match(/\d+/);
            return m ? parseInt(m[0], 10) : undefined;
        }
    }
    return undefined;
}

/**
 * True once the merged stream provably contains the whole scope, i.e. the scan has
 * reached at least one item older than the scope boundary. Expects assignDates() first.
 */
export function isScopeBoundaryReached(
    ordered: HarvestItem[],
    scope: ExtractionScope,
    unreadCount: number,
    today: Date
): boolean {
    if (scope === ExtractionScope.UNREAD) {
        if (ordered.some((i) => i.type === "unread-marker")) return true;
        const messages = ordered.filter((i) => i.type === "message").length;
        return unreadCount > 0 && messages >= unreadCount + 1;
    }
    const boundary =
        scope === ExtractionScope.TODAY ? toDateKey(today) : toDateKey(shiftDays(today, -1));
    return ordered.some((i) => i.date !== undefined && i.date < boundary);
}

/**
 * Scope messages still known only as empty virtualized shells (content never rendered).
 */
export function getScopedPlaceholders(
    ordered: HarvestItem[],
    scope: ExtractionScope,
    unreadCount: number,
    today: Date
): HarvestItem[] {
    return sliceScope(ordered, scope, unreadCount, today).filter((i) => i.placeholder);
}

/**
 * Returns only the message items that belong to the scope, oldest -> newest.
 * Expects assignDates() to have run.
 */
export function sliceScope(
    ordered: HarvestItem[],
    scope: ExtractionScope,
    unreadCount: number,
    today: Date
): HarvestItem[] {
    if (scope === ExtractionScope.UNREAD) {
        let markerPos = -1;
        for (let i = ordered.length - 1; i >= 0; i--) {
            if (ordered[i]!.type === "unread-marker") {
                markerPos = i;
                break;
            }
        }
        if (markerPos !== -1) {
            return ordered.slice(markerPos + 1).filter((i) => i.type === "message");
        }
        if (unreadCount <= 0) return [];
        const messages = ordered.filter((i) => i.type === "message");
        return messages.slice(Math.max(0, messages.length - unreadCount));
    }

    const target =
        scope === ExtractionScope.TODAY ? toDateKey(today) : toDateKey(shiftDays(today, -1));
    return ordered.filter((i) => i.type === "message" && i.date === target);
}
