import { scrapeWhatsAppJobLinks } from "./whatsapp_scraper.js";
import { ExtractionScope } from "./whatsapp_types.js";

async function main() {
    // Supported forms:
    //   npm run whatsapp -- today          (positional)
    //   npm run whatsapp -- --scope=today  (flag after --)
    //   npm run whatsapp --scope=today     (npm consumes the flag and exposes it as npm_config_scope)
    const args = process.argv.slice(2);
    const rawArg =
        args.find((a) => !a.startsWith("-")) ||
        args.find((a) => a.startsWith("--scope="))?.split("=")[1] ||
        process.env.npm_config_scope ||
        ExtractionScope.UNREAD;

    const normalizedArg = rawArg.toLowerCase().trim();
    const validScopes = Object.values(ExtractionScope) as string[];
    if (!validScopes.includes(normalizedArg)) {
        console.error(`[ERROR] Unknown scope '${rawArg}'. Use one of: ${validScopes.join(", ")}`);
        process.exit(1);
    }
    const scope = normalizedArg as ExtractionScope;

    console.log(`\n=================== WHATSAPP JOB LINK SCRAPER ===================`);
    console.log(`Scope: ${scope.toUpperCase()}`);
    console.log(`Mode: Automated Playwright Web extraction (Groups & Broadcast Channels)`);
    console.log(`=================================================================\n`);

    let qrAnnounced = false;
    try {
        const result = await scrapeWhatsAppJobLinks(
            {
                scope,
                headless: false, // Run with visual browser window in CLI mode for ease of QR scanning
            },
            (event) => {
                switch (event.type) {
                    case "status":
                        console.log(`[STATUS] ${event.message}`);
                        break;
                    case "qr":
                        // The QR is re-sent each time WhatsApp rotates it; announce it once.
                        if (!qrAnnounced) {
                            qrAnnounced = true;
                            console.log(`[QR CODE] Session not authenticated. Please scan QR code in the browser window.`);
                        }
                        break;
                    case "authenticated":
                        console.log(`[AUTH] Session authenticated successfully!`);
                        break;
                    case "source_start":
                        console.log(`\n[${event.sourceType.toUpperCase()} ${event.index}/${event.total}] ${event.sourceName} (${event.targetDomain})`);
                        break;
                    case "source_progress":
                        console.log(`  -> ${event.message}`);
                        break;
                    case "source_complete":
                        if (event.result.status === "success") {
                            console.log(`  [SUCCESS] Extracted ${event.result.extractedLinks.length} link(s):`);
                            event.result.extractedLinks.forEach((l) => console.log(`     * ${l}`));
                        } else if (event.result.status === "skipped") {
                            console.log(`  [SKIPPED] ${event.result.warning || "No unread messages"}`);
                        } else if (event.result.status === "warning") {
                            console.log(`  [WARNING] ${event.result.warning}`);
                            if (event.result.extractedLinks.length > 0) {
                                console.log(`  Extracted ${event.result.extractedLinks.length} link(s) before the issue:`);
                                event.result.extractedLinks.forEach((l) => console.log(`     * ${l}`));
                            }
                        } else {
                            console.log(`  [FAILED] ${event.result.error}`);
                        }
                        break;
                    case "done":
                        console.log(`\n=================== HARVEST COMPLETED ===================`);
                        console.log(`Total Sources Evaluated: ${event.result.totalSources} (${event.result.totalGroups} groups, ${event.result.totalChannels} channels)`);
                        console.log(`Sources Processed: ${event.result.processedSources} (${event.result.processedGroups} groups, ${event.result.processedChannels} channels)`);
                        console.log(`Sources Skipped: ${event.result.skippedSources}`);
                        console.log(`Sources Failed: ${event.result.failedSources}`);
                        console.log(`Total Unique Job URLs: ${event.result.totalUrls}`);
                        console.log(`Duration: ${(event.result.durationMs / 1000).toFixed(1)}s`);
                        console.log(`\nExtracted Job URLs:`);
                        event.result.urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
                        console.log(`=========================================================\n`);
                        break;
                    case "error":
                        console.error(`[ERROR] ${event.message}`);
                        break;
                }
            }
        );

        if (result.totalUrls === 0) {
            console.log("No new job links found for this scope.");
        }
    } catch (err: any) {
        console.error("\nFatal error during WhatsApp scraping:", err?.message || err);
        process.exit(1);
    }
}

main();
