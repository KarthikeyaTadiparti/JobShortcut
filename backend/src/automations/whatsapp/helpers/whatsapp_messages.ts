import { type Page } from "playwright";
import { ExtractionScope, type RawMessageData } from "@/automations/whatsapp/whatsapp_types.js";
import {
    collectScopeMessagesWithStats,
    evaluateWindowMessages,
    type HarvestOptions,
} from "./whatsapp_harvester.js";

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
