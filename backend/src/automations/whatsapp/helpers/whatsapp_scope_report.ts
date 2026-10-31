import type { ExtractionScope } from "@/automations/whatsapp/whatsapp_types.js";
import type { HarvestStats } from "./whatsapp_harvester.js";

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

/**
 * Describes why a harvest may be incomplete, or returns undefined when it is complete.
 * A scan that hit the time limit, could not connect windows, or left message bodies
 * unread may be missing links even though it returned some.
 */
export function describeHarvestIssues(stats: HarvestStats): string | undefined {
    const issues: string[] = [];
    if (stats.stopReason === "timeout") issues.push(`scan hit the ${Math.round(stats.durationMs / 1000)}s time limit before the scope boundary`);
    if (stats.stopReason === "aborted") issues.push("scan was cancelled");
    if (stats.unrecoveredGaps > 0) issues.push(`${stats.unrecoveredGaps} scroll gap(s) could not be closed, so messages may be missing`);
    if (stats.placeholdersRemaining > 0) issues.push(`${stats.placeholdersRemaining} message(s) never loaded their content`);
    if (stats.truncatedRemaining > 0) issues.push(`${stats.truncatedRemaining} long message(s) could not be expanded, so their links may be missing`);
    return issues.length > 0 ? `Partial result: ${issues.join("; ")}` : undefined;
}
