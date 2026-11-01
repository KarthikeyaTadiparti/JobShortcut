import { rateLimit, type Options, type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

export interface RateLimiterCustomOptions {
    windowMs?: number;
    limit?: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}

/**
 * Factory to create a rate limiter with standardized settings and JSON responses.
 */
export function createRateLimiter(options?: RateLimiterCustomOptions): RateLimitRequestHandler {
    const windowMs = options?.windowMs ?? 15 * 60 * 1000;
    const limit = options?.limit ?? 100;
    const message = options?.message ?? "Too many requests from this IP, please try again later.";

    return rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message,
        skip: () => process.env.DISABLE_RATE_LIMIT === "true",
        ...(options?.skipSuccessfulRequests !== undefined ? { skipSuccessfulRequests: options.skipSuccessfulRequests } : {}),
        ...(options?.skipFailedRequests !== undefined ? { skipFailedRequests: options.skipFailedRequests } : {}),
        handler: (_req: Request, res: Response, _next: NextFunction, optionsUsed: Options) => {
            res.status(optionsUsed.statusCode).json({
                status: false,
                message: optionsUsed.message,
            });
        },
    });
}

/**
 * General rate limiter for all API endpoints.
 * Defaults to 100 requests per 15 minutes.
 */
export const apiLimiter: RateLimitRequestHandler = createRateLimiter({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS ? Number(process.env.RATE_LIMIT_WINDOW_MS) : 15 * 60 * 1000,
    limit: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 100,
    message: "Too many requests from this IP, please try again after 15 minutes.",
});

/**
 * Stricter rate limiter for sensitive authentication endpoints (login, signup).
 * Protects against brute-force attacks.
 * Defaults to 10 requests per 15 minutes.
 */
export const authLimiter: RateLimitRequestHandler = createRateLimiter({
    windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS ? Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) : 15 * 60 * 1000,
    limit: process.env.AUTH_RATE_LIMIT_MAX ? Number(process.env.AUTH_RATE_LIMIT_MAX) : 10,
    message: "Too many authentication attempts from this IP, please try again after 15 minutes.",
});

/**
 * Stricter rate limiter for scraping endpoints which consume significant server resources.
 * Defaults to 20 requests per 15 minutes.
 */
export const scraperLimiter: RateLimitRequestHandler = createRateLimiter({
    windowMs: process.env.SCRAPER_RATE_LIMIT_WINDOW_MS ? Number(process.env.SCRAPER_RATE_LIMIT_WINDOW_MS) : 15 * 60 * 1000,
    limit: process.env.SCRAPER_RATE_LIMIT_MAX ? Number(process.env.SCRAPER_RATE_LIMIT_MAX) : 20,
    message: "Too many scraping requests from this IP, please try again after 15 minutes.",
});

