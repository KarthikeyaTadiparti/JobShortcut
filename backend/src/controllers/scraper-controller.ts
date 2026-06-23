import type { Request, Response } from "express";
import wrapAsync from "../utils/wrap-async.js";
import { scrapeUrls } from "../scraper/index.js";

export const handleScrapeRequest = wrapAsync(async (req: Request, res: Response) => {
    const urlsArray = req.urlsArray || [];
    const results = await scrapeUrls(urlsArray);
    return res.status(200).json(results);
});
