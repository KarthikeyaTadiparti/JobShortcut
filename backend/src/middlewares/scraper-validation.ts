import type { Request, Response, NextFunction } from "express";
import ExpressError from "./errorhandler.js";

// Extend Express Request to include parsed `urlsArray`
declare module "express-serve-static-core" {
    interface Request {
        urlsArray?: string[];
    }
}

/**
 * Middleware to validate and parse the scraper URLs input from the request body.
 * Expects 'urls' field in request body.
 * Populates req.urlsArray on success.
 */
export function validateScraperUrls(req: Request, res: Response, next: NextFunction) {
    const { urls } = req.body;

    if (!urls) {
        throw new ExpressError(400, "URLs are required. Please provide a comma-separated string or an array of URLs in 'urls' field.");
    }

    let urlsArray: string[] = [];
    if (typeof urls === "string") {
        urlsArray = urls
            .split(",")
            .map((url) => url.trim())
            .filter(Boolean);
    } else if (Array.isArray(urls)) {
        urlsArray = urls
            .map((url) => String(url).trim())
            .filter(Boolean);
    } else {
        throw new ExpressError(400, "Invalid format. 'urls' must be a comma-separated string or an array of URLs.");
    }

    if (urlsArray.length === 0) {
        throw new ExpressError(400, "No valid URLs provided.");
    }

    req.urlsArray = urlsArray;
    next();
}
