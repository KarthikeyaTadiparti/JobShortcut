import type { Request, Response } from "express";
import wrapAsync from "../utils/wrap-async.js";
import { initSSEStream } from "../utils/sse-stream.js";
import { scrapeWhatsAppJobLinks } from "../scraper/whatsapp_scraper.js";
import {
    launchWhatsAppContext,
    checkWhatsAppAuthState,
} from "../scraper/whatsapp_session.js";
import {
    ExtractionScope,
    type WhatsAppSourceConfig,
    type WhatsAppGroupConfig,
    type WhatsAppScrapeOptions,
} from "../scraper/whatsapp-types.js";

/**
 * Controller to handle WhatsApp scraper requests with real-time SSE streaming.
 * Supports unified sources (groups & channels) as well as legacy groups format.
 */
export const handleWhatsAppScrape = wrapAsync(async (req: Request, res: Response) => {
    const rawScope = req.body.scope;
    const scope: ExtractionScope =
        rawScope === "today"
            ? ExtractionScope.TODAY
            : rawScope === "yesterday"
            ? ExtractionScope.YESTERDAY
            : ExtractionScope.UNREAD;
    const sources: WhatsAppSourceConfig[] | undefined = req.body.sources;
    const groups: WhatsAppGroupConfig[] | undefined = req.body.groups;
    const headless: boolean | undefined = req.body.headless;

    // Set up SSE stream
    const sendEvent = initSSEStream(res);

    const abortController = new AbortController();
    req.on("close", () => {
        if (!res.writableEnded) {
            abortController.abort();
        }
    });

    const scrapeOptions: WhatsAppScrapeOptions = {
        scope,
        sources,
        groups,
        headless,
        signal: abortController.signal,
    };

    try {
        await scrapeWhatsAppJobLinks(
            scrapeOptions,
            (event) => {
                if (!abortController.signal.aborted) {
                    sendEvent(event.type, event as any);
                }
            }
        );
    } catch (err: any) {
        if (abortController.signal.aborted) {
            console.log("WhatsApp scrape aborted by client request.");
            return;
        }
        console.error("Error executing WhatsApp scrape controller:", err);
        sendEvent("error", { message: err?.message || "Internal server error during WhatsApp scrape", fatal: true });
    } finally {
        if (!res.writableEnded) {
            res.end();
        }
    }
});

/**
 * Controller to check if a persistent WhatsApp Web session is currently active.
 */
export const handleWhatsAppStatus = wrapAsync(async (_req: Request, res: Response) => {
    let authenticated = false;
    try {
        const { context, page } = await launchWhatsAppContext({ headless: true });
        try {
            const authState = await checkWhatsAppAuthState(page, 5000);
            authenticated = authState.authenticated;
        } finally {
            await context.close().catch(() => { });
        }
    } catch (error) {
        console.warn("Could not check WhatsApp status:", error);
    }

    res.status(200).json({
        status: true,
        data: {
            authenticated,
        },
    });
});
