import {
    DEFAULT_WHATSAPP_SOURCES,
    type WhatsAppSourceConfig,
} from "./config/whatsapp_sources.js";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "./config/whatsapp_locators.js";
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
} from "./whatsapp_types.js";
import { collectScopeMessagesWithStats } from "./helpers/whatsapp_harvester.js";
import { randomJitter, navigateToChatsTab, navigateToChannelsTab } from "./helpers/whatsapp_navigation.js";
import { searchAndOpenGroup, openFollowedChannel } from "./helpers/whatsapp_open_chat.js";
import { extractSourceLinks, extractChannelBroadcastLinks } from "./helpers/whatsapp_links.js";
import { describeEmptyScope, describeHarvestIssues } from "./helpers/whatsapp_scope_report.js";

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

                const loggedIn = await waitForWhatsAppLogin(page, 120000, {
                    lastQrDataUrl: authState.qrDataUrl,
                    signal: options.signal,
                    onQr: (qrDataUrl) => emit({ type: "qr", qrDataUrl, timestamp: new Date().toISOString() }),
                });
                if (options.signal?.aborted) {
                    throw new Error("WhatsApp scrape was cancelled before login completed.");
                }
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

                    if (searchResult.status === "error") {
                        const errorResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "group",
                            targetDomain: source.targetDomain,
                            status: "failed",
                            extractedLinks: [],
                            error: searchResult.message || "Failed to open group",
                        };
                        sourceResults.push(errorResult);
                        failedSources++;
                        emit({
                            type: "source_complete",
                            sourceType: "group",
                            sourceName: source.name,
                            result: errorResult,
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

                    const { messages: rawMessages, stats } = await collectScopeMessagesWithStats(page, scope, unreadCount, {
                        signal: options.signal,
                    });
                    const renderedCount = rawMessages.length;

                    if (renderedCount === 0) {
                        // A chat that rendered but has nothing in scope is a skip, not a failure.
                        const chatRendered = stats.totalMessages > 0;
                        const noMessagesResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "group",
                            targetDomain: source.targetDomain,
                            status: chatRendered ? "skipped" : "warning",
                            messagesRendered: 0,
                            extractedLinks: [],
                            warning: describeEmptyScope(scope, stats),
                        };
                        sourceResults.push(noMessagesResult);
                        if (chatRendered) {
                            skippedSources++;
                        } else {
                            failedSources++;
                        }
                        emit({
                            type: "source_complete",
                            sourceType: "group",
                            sourceName: source.name,
                            result: noMessagesResult,
                        });
                        continue;
                    }

                    // collectAllScopeMessages already returns only the messages inside the scope.
                    const groupLinks: string[] = [];
                    const messagesProcessed = renderedCount;

                    for (const msg of rawMessages) {
                        for (const link of extractSourceLinks(msg.rawLinks, source)) {
                            groupLinks.push(link);
                            allJobLinks.add(link);
                        }
                    }

                    const deduplicatedGroupLinks = Array.from(new Set(groupLinks));
                    const groupIssues = describeHarvestIssues(stats);
                    const successResult: SourceScrapeResult = {
                        sourceName: source.name,
                        sourceType: "group",
                        targetDomain: source.targetDomain,
                        status: groupIssues ? "warning" : "success",
                        warning: groupIssues,
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

                    if (openResult.status === "error") {
                        const errorResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "channel",
                            targetDomain: source.targetDomain,
                            status: "failed",
                            extractedLinks: [],
                            error: openResult.message || "Failed to open channel",
                        };
                        sourceResults.push(errorResult);
                        failedSources++;
                        emit({
                            type: "source_complete",
                            sourceType: "channel",
                            sourceName: source.name,
                            result: errorResult,
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
                    const { links, renderedCount, processedCount, stats } = await extractChannelBroadcastLinks(
                        page,
                        source,
                        scope,
                        unreadCount,
                        { signal: options.signal }
                    );

                    if (renderedCount === 0) {
                        const chatRendered = stats.totalMessages > 0;
                        const emptyResult: SourceScrapeResult = {
                            sourceName: source.name,
                            sourceType: "channel",
                            targetDomain: source.targetDomain,
                            status: chatRendered ? "skipped" : "warning",
                            messagesRendered: 0,
                            extractedLinks: [],
                            warning: describeEmptyScope(scope, stats),
                        };
                        sourceResults.push(emptyResult);
                        if (chatRendered) {
                            skippedSources++;
                        } else {
                            failedSources++;
                        }
                        emit({
                            type: "source_complete",
                            sourceType: "channel",
                            sourceName: source.name,
                            result: emptyResult,
                        });
                        continue;
                    }

                    for (const link of links) {
                        allJobLinks.add(link);
                    }

                    const channelIssues = describeHarvestIssues(stats);
                    const successResult: SourceScrapeResult = {
                        sourceName: source.name,
                        sourceType: "channel",
                        targetDomain: source.targetDomain,
                        status: channelIssues ? "warning" : "success",
                        warning: channelIssues,
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
