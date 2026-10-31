import type { Response } from "express";

/**
 * Configures Express Response headers for Server-Sent Events (SSE).
 */
export function initSSEStream(res: Response): (type: string, data?: Record<string, unknown>) => void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    return (type: string, data: Record<string, unknown> = {}) => {
        if (!res.writableEnded) {
            const payload = JSON.stringify({ type, ...data });
            res.write(`data: ${payload}\n\n`);
        }
    };
}
