import { scrapeWhatsAppLinks } from "./whatsapp_scraper.js";
import type { ExtractionScope } from "./whatsapp-types.js";

async function main() {
    const rawScope = (process.argv[2] || "unread").toLowerCase();
    const scope: ExtractionScope = ["unread", "today", "yesterday"].includes(rawScope)
        ? (rawScope as ExtractionScope)
        : "unread";

    console.log(`\n=================== WHATSAPP JOB LINK SCRAPER ===================`);
    console.log(`Scope: ${scope.toUpperCase()}`);
    console.log(`Mode: Automated Playwright Web extraction`);
    console.log(`=================================================================\n`);

    try {
        const result = await scrapeWhatsAppLinks(
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
                        console.log(`[QR CODE] Session not authenticated. Please scan QR code in the browser window.`);
                        break;
                    case "authenticated":
                        console.log(`[AUTH] Session authenticated successfully!`);
                        break;
                    case "group_start":
                        console.log(`\n[GROUP ${event.index}/${event.total}] ${event.groupName} (${event.targetDomain})`);
                        break;
                    case "group_progress":
                        console.log(`  -> ${event.message}`);
                        break;
                    case "group_complete":
                        if (event.result.status === "success") {
                            console.log(`  ✓ Extracted ${event.result.extractedLinks.length} link(s):`);
                            event.result.extractedLinks.forEach((l) => console.log(`     * ${l}`));
                        } else if (event.result.status === "skipped") {
                            console.log(`  ○ Skipped: ${event.result.warning || "No unread messages"}`);
                        } else if (event.result.status === "warning") {
                            console.log(`  ⚠ Warning: ${event.result.warning}`);
                        } else {
                            console.log(`  ✗ Failed: ${event.result.error}`);
                        }
                        break;
                    case "done":
                        console.log(`\n=================== HARVEST COMPLETED ===================`);
                        console.log(`Total Groups Evaluated: ${event.result.totalGroups}`);
                        console.log(`Groups Processed: ${event.result.processedGroups}`);
                        console.log(`Groups Skipped: ${event.result.skippedGroups}`);
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
