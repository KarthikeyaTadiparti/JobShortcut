import type { Request, Response } from "express";
import wrapAsync from "../utils/wrap-async.js";
import { scrapeUrls } from "../scraper/index.js";

export const handleScrapeRequest = wrapAsync(async (req: Request, res: Response) => {
    const urlsArray = req.urlsArray || [];

    // Set headers for Server-Sent Events (SSE) streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Helper to send JSON-formatted event chunk
    const sendEvent = (type: string, data: any) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    // Scrape URLs and send status/progress updates in real-time
    const results = await scrapeUrls(urlsArray, (url, status, result) => {
        if (status === "start") {
            sendEvent("status", { url, message: `Scraping ${url}...` });
        } else if (status === "end") {
            sendEvent("progress", { url, result });
        }
    });

    // Send final completed results
    sendEvent("done", { results });
    res.end();
});
