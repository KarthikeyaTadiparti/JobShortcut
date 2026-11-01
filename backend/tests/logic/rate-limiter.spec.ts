import { test, expect } from "@playwright/test";
import {
    createRateLimiter,
    apiLimiter,
    authLimiter,
    scraperLimiter,
} from "@/middlewares/rate-limiter.js";

function createMockReqRes(ip: string = "192.168.1.1") {
    let statusCode = 200;
    let jsonBody: unknown = null;
    const headers: Record<string, string | number> = {};

    const req = {
        ip,
        headers: {},
        app: {
            get: (key: string) => (key === "trust proxy" ? 1 : undefined),
        },
    };

    const res = {
        statusCode: 200,
        headers,
        setHeader(name: string, value: string | number) {
            headers[name.toLowerCase()] = value;
            return this;
        },
        append(name: string, value: string | number) {
            headers[name.toLowerCase()] = value;
            return this;
        },
        getHeader(name: string) {
            return headers[name.toLowerCase()];
        },
        status(code: number) {
            this.statusCode = code;
            statusCode = code;
            return this;
        },
        json(data: unknown) {
            jsonBody = data;
            return this;
        },
        send(data: unknown) {
            jsonBody = data;
            return this;
        },
    };

    return {
        req,
        res,
        getStatusCode: () => statusCode,
        getJsonBody: () => jsonBody,
        getHeaders: () => headers,
    };
}

async function runLimiter(limiter: any, mock: ReturnType<typeof createMockReqRes>): Promise<boolean> {
    return new Promise((resolve) => {
        let resolved = false;
        const originalJson = mock.res.json.bind(mock.res);
        mock.res.json = (data: unknown) => {
            originalJson(data);
            if (!resolved) {
                resolved = true;
                resolve(false); // rate limited (handler responded)
            }
            return mock.res;
        };

        limiter(mock.req, mock.res, (err?: unknown) => {
            if (err) throw err;
            if (!resolved) {
                resolved = true;
                resolve(true); // passed through to next()
            }
        });
    });
}

test.describe("IP Rate Limiting Middleware", () => {
    test("allows requests within configured limit and blocks when exceeded", async () => {
        const limiter = createRateLimiter({
            windowMs: 60 * 1000,
            limit: 2,
            message: "Too many requests, try later",
        });

        const testIp = "10.0.0.42";

        // 1st request -> pass
        const req1 = createMockReqRes(testIp);
        const pass1 = await runLimiter(limiter, req1);
        expect(pass1).toBe(true);

        // 2nd request -> pass
        const req2 = createMockReqRes(testIp);
        const pass2 = await runLimiter(limiter, req2);
        expect(pass2).toBe(true);

        // 3rd request -> blocked (429)
        const req3 = createMockReqRes(testIp);
        const pass3 = await runLimiter(limiter, req3);
        expect(pass3).toBe(false);
        expect(req3.getStatusCode()).toBe(429);
        expect(req3.getJsonBody()).toEqual({
            status: false,
            message: "Too many requests, try later",
        });
    });

    test("tracks limits separately per IP address", async () => {
        const limiter = createRateLimiter({
            windowMs: 60 * 1000,
            limit: 1,
            message: "Limit reached",
        });

        const ipA = "192.168.10.1";
        const ipB = "192.168.10.2";

        // IP A 1st request -> pass
        const reqA1 = createMockReqRes(ipA);
        expect(await runLimiter(limiter, reqA1)).toBe(true);

        // IP A 2nd request -> blocked
        const reqA2 = createMockReqRes(ipA);
        expect(await runLimiter(limiter, reqA2)).toBe(false);
        expect(reqA2.getStatusCode()).toBe(429);

        // IP B 1st request -> should still pass because IP B hasn't hit its limit
        const reqB1 = createMockReqRes(ipB);
        expect(await runLimiter(limiter, reqB1)).toBe(true);
    });

    test("includes standard RateLimit draft-8 headers", async () => {
        const limiter = createRateLimiter({
            windowMs: 60 * 1000,
            limit: 5,
        });

        const mock = createMockReqRes("172.16.0.5");
        await runLimiter(limiter, mock);

        const headers = mock.getHeaders();
        // draft-8 sends `ratelimit-policy` or `ratelimit`
        const hasRateLimitHeader = Object.keys(headers).some((h) => h.startsWith("ratelimit"));
        expect(hasRateLimitHeader).toBe(true);
    });

    test("apiLimiter, authLimiter, and scraperLimiter are properly exported and callable", () => {
        expect(typeof apiLimiter).toBe("function");
        expect(typeof authLimiter).toBe("function");
        expect(typeof scraperLimiter).toBe("function");
    });
});

