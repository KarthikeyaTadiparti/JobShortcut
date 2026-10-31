import { ExtractionScope, type RawMessageData } from "@/automations/whatsapp/whatsapp_types.js";
import { toDateKey } from "@/automations/whatsapp/helpers/whatsapp_message_merge.js";

/** Per-source budget for a live scope scan (harvester cap is 180 s plus open/search time). */
export const PER_SOURCE_TIMEOUT_MS = 240000;

export interface ScopeIntegrity {
    duplicates: number;
    outOfOrder: number;
    outOfScope: number;
}

/**
 * Checks a harvested scope result for duplicates, ordering, and scope membership.
 */
export function summarizeScopeIntegrity(
    messages: RawMessageData[],
    scope: ExtractionScope,
    today: Date = new Date()
): ScopeIntegrity {
    const keys = messages.map((m) => m.key ?? m.dataId ?? `${m.prePlainText}|${m.text}`);
    const duplicates = keys.length - new Set(keys).size;

    let outOfOrder = 0;
    let lastDate = "";
    for (const m of messages) {
        if (!m.date) continue;
        if (lastDate && m.date < lastDate) outOfOrder++;
        lastDate = m.date;
    }

    let outOfScope = 0;
    if (scope !== ExtractionScope.UNREAD) {
        const target = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (scope === ExtractionScope.YESTERDAY) target.setDate(target.getDate() - 1);
        const targetKey = toDateKey(target);
        outOfScope = messages.filter((m) => m.date !== targetKey).length;
    }

    return { duplicates, outOfOrder, outOfScope };
}
