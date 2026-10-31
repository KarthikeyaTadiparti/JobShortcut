import type { Request, Response } from "express";
import wrapAsync from "@/utils/wrap-async.js";
import { initSSEStream } from "@/utils/sse-stream.js";
import { scrapeWhatsAppJobLinks } from "@/automations/whatsapp/whatsapp_scraper.js";
import {
    launchWhatsAppContext,
    checkWhatsAppAuthState,
    WhatsAppSessionBusyError,
} from "@/automations/whatsapp/whatsapp_session.js";
import {
    ExtractionScope,
    type WhatsAppSourceConfig,
    type WhatsAppScrapeOptions,
} from "@/automations/whatsapp/whatsapp_types.js";

/**
 * Controller to handle WhatsApp scraper requests with real-time SSE streaming.
 * Supports unified sources (groups & channels).
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
    const headless: boolean | undefined = req.body.headless;

    // Set up SSE stream
    const sendEvent = initSSEStream(res);

    // Cancel when the client disconnects. This must listen on `res`: `req` emits "close" as
    // soon as express.json() has consumed the body, which would abort every scrape at once.
    const abortController = new AbortController();
    res.on("close", () => {
        if (!res.writableEnded) {
            abortController.abort();
        }
    });

    const scrapeOptions: WhatsAppScrapeOptions = {
        scope,
        sources,
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
    let busy = false;
    try {
        const { context, page } = await launchWhatsAppContext({ headless: true });
        try {
            // WhatsApp Web usually needs 10+ seconds to show the chat list after loading.
            const authState = await checkWhatsAppAuthState(page, 30000);
            authenticated = authState.authenticated;
        } finally {
            await context.close().catch(() => { });
        }
    } catch (error) {
        if (error instanceof WhatsAppSessionBusyError) {
            // A scrape is running on this session; launching a second browser would kick it out.
            busy = true;
        } else {
            console.warn("[WARNING] Could not check WhatsApp status:", error);
        }
    }

    res.status(200).json({
        status: true,
        data: {
            authenticated,
            busy,
        },
        ...(busy ? { message: "WhatsApp session is busy with a running scrape" } : {}),
    });
});
