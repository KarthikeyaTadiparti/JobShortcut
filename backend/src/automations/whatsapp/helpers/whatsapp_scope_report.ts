import type { ExtractionScope } from "@/automations/whatsapp/whatsapp-types.js";
import type { HarvestStats } from "@/automations/whatsapp/whatsapp_harvester.js";

/**
 * Explains an empty scope result. Distinguishes "the chat never rendered" from "the chat was
 * read but nothing falls in the scope", e.g. a 'today' run just after midnight.
 */
export function describeEmptyScope(scope: ExtractionScope, stats: HarvestStats): string {
    if (stats.totalMessages === 0) {
        return "No messages rendered in conversation panel";
    }
    const target = stats.scopeDate ? ` (local date ${stats.scopeDate})` : "";
    const newest = stats.newestMessageDate ? `, newest dated ${stats.newestMessageDate}` : "";
    return `No messages in scope '${scope}'${target}: scanned ${stats.totalMessages} message(s)${newest}`;
}
