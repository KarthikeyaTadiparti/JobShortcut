import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { chromium, type BrowserContext, type Page } from "playwright";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "./config/whatsapp_locators.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Returns the default persistent session directory for WhatsApp Web.
 */
export function getDefaultWhatsAppSessionDir(): string {
    const sessionDir = path.resolve(__dirname, "../../../.whatsapp_session");
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
}

/**
 * tsx compiles with esbuild `keepNames`, which wraps named functions in `__name(fn, "name")`.
 * Playwright serializes page.evaluate()/addInitScript() callbacks as source text, so that
 * helper call reaches the browser where `__name` is undefined. This no-op shim is passed as a
 * string so esbuild cannot rewrite it, and must be registered before any other init script.
 */
const ESBUILD_NAME_SHIM = "globalThis.__name = globalThis.__name || ((fn) => fn);";

const LOCK_FILE = "automation.lock";

/**
 * Thrown when another automation (CLI, server request, or test run) already holds the
 * WhatsApp session. Two browsers on one WhatsApp Web login kick each other out.
 */
export class WhatsAppSessionBusyError extends Error {
    constructor(holder: string) {
        super(`WhatsApp session is already in use by another automation (${holder}). Wait for it to finish and retry.`);
        this.name = "WhatsAppSessionBusyError";
    }
}

function isProcessAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err: any) {
        return err?.code === "EPERM";
    }
}

/**
 * Takes an exclusive, cross-process lock on the session directory. A lock left behind by a
 * process that no longer exists is reclaimed. Returns the release function.
 */
function acquireSessionLock(sessionDir: string): () => void {
    const lockPath = path.join(sessionDir, LOCK_FILE);
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const fd = fs.openSync(lockPath, "wx");
            fs.writeSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
            fs.closeSync(fd);
            break;
        } catch (err: any) {
            if (err?.code !== "EEXIST") throw err;
            let holder: { pid?: number; startedAt?: string } = {};
            try {
                holder = JSON.parse(fs.readFileSync(lockPath, "utf8"));
            } catch {
                // Unreadable lock: treat as stale.
            }
            if (holder.pid && isProcessAlive(holder.pid)) {
                throw new WhatsAppSessionBusyError(`pid ${holder.pid}, since ${holder.startedAt ?? "unknown"}`);
            }
            fs.rmSync(lockPath, { force: true });
        }
    }

    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        process.off("exit", release);
        try {
            const holder = JSON.parse(fs.readFileSync(lockPath, "utf8"));
            if (holder.pid === process.pid) fs.rmSync(lockPath, { force: true });
        } catch {
            // Already removed.
        }
    };
    process.once("exit", release);
    return release;
}

/**
 * User agent matching the Chromium build Playwright actually ships, so WhatsApp never sees
 * an outdated "Chrome/126" on a newer engine. Falls back to a fixed version if unreadable.
 */
function buildUserAgent(): string {
    let major = "126";
    try {
        const require = createRequire(import.meta.url);
        const coreDir = path.dirname(require.resolve("playwright-core/package.json"));
        const manifest = JSON.parse(fs.readFileSync(path.join(coreDir, "browsers.json"), "utf8"));
        const version: string | undefined = manifest.browsers?.find((b: { name: string }) => b.name === "chromium")?.browserVersion;
        if (version) major = version.split(".")[0] ?? major;
    } catch {
        // Keep the fallback version.
    }
    const platform =
        process.platform === "darwin"
            ? "Macintosh; Intel Mac OS X 10_15_7"
            : process.platform === "linux"
            ? "X11; Linux x86_64"
            : "Windows NT 10.0; Win64; x64";
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

export interface WhatsAppSessionContext {
    context: BrowserContext;
    page: Page;
}

/**
 * Launches a persistent Playwright Chromium browser context for WhatsApp Web with stealth anti-detection masks.
 * Holds an exclusive lock on the session directory until the context closes.
 */
export async function launchWhatsAppContext(options: {
    headless?: boolean | undefined;
    sessionDir?: string | undefined;
}): Promise<WhatsAppSessionContext> {
    const sessionDir = options.sessionDir || getDefaultWhatsAppSessionDir();
    const headless = options.headless !== undefined ? options.headless : true;

    fs.mkdirSync(sessionDir, { recursive: true });
    const releaseLock = acquireSessionLock(sessionDir);

    let context: BrowserContext;
    try {
        context = await chromium.launchPersistentContext(sessionDir, {
            headless,
            ignoreDefaultArgs: ["--enable-automation"],
            viewport: { width: 1366, height: 768 },
            userAgent: buildUserAgent(),
            args: [
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
            ],
        });
    } catch (err) {
        releaseLock();
        throw err;
    }
    context.on("close", releaseLock);

    await context.addInitScript({ content: ESBUILD_NAME_SHIM });

    // Stealth init script: mask navigator.webdriver and standardize browser attributes
    await context.addInitScript(() => {
        // Mask navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // Ensure plugins & languages look like a standard user browser
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });

        // Mock window.chrome runtime
        if (!(window as any).chrome) {
            (window as any).chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {},
            };
        }
    });

    const pages = context.pages();
    const page: Page = pages[0] || (await context.newPage());

    // Init scripts only apply to future documents; patch pages that are already open.
    for (const p of context.pages()) {
        await p.evaluate(ESBUILD_NAME_SHIM).catch(() => {});
    }

    return { context, page };
}

export interface WhatsAppAuthState {
    authenticated: boolean;
    qrDetected?: boolean;
    qrDataUrl?: string | undefined;
}

/** Any of these being visible means the chat UI (i.e. a logged-in session) is showing. */
const AUTH_SELECTOR = `${getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer)}, button[aria-label="Chats"], button[aria-label="Chats "], [data-testid="menu-bar-chats"], div[data-testid="chat-list-search-container"], #side`;

/**
 * Only an actual QR code counts. The generic login fallbacks (h1, h2, any canvas) also
 * match the logged-in UI, e.g. the "WhatsApp" title is an h1.
 */
const QR_SELECTOR = 'canvas[aria-label*="Scan"], div[data-ref] canvas, [data-testid="qrcode"], div[data-testid="link-device-qr-code"]';

/**
 * True when at least one element matching the selector is rendered and visible.
 * Checking only `.first()` is unreliable: the first DOM match can be a hidden element.
 */
async function isAnyVisible(page: Page, selector: string): Promise<boolean> {
    return await page.evaluate((sel) => {
        return Array.from(document.querySelectorAll(sel)).some((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        });
    }, selector).catch(() => false);
}

async function captureQr(page: Page): Promise<string | undefined> {
    const qr = page.locator(QR_SELECTOR).first();
    if ((await qr.count()) === 0 || !(await qr.isVisible().catch(() => false))) return undefined;
    try {
        const buffer = await qr.screenshot();
        return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch {
        return undefined;
    }
}

/**
 * Checks if the page is currently logged into WhatsApp Web or showing the QR code.
 */
export async function checkWhatsAppAuthState(page: Page, timeoutMs = 45000): Promise<WhatsAppAuthState> {
    try {
        // First check if already on WhatsApp Web or need to navigate
        const currentUrl = page.url();
        if (!currentUrl.includes("web.whatsapp.com")) {
            await page.goto("https://web.whatsapp.com", {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });
        }

        // Race between chat-list / navigation and QR code
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (await isAnyVisible(page, AUTH_SELECTOR)) {
                return { authenticated: true, qrDetected: false };
            }

            if (await isAnyVisible(page, QR_SELECTOR)) {
                return {
                    authenticated: false,
                    qrDetected: true,
                    qrDataUrl: await captureQr(page),
                };
            }

            await page.waitForTimeout(500);
        }

        // Final check after timeout
        if (await isAnyVisible(page, AUTH_SELECTOR)) {
            return { authenticated: true, qrDetected: false };
        }

        return { authenticated: false, qrDetected: false };
    } catch (error) {
        console.error("[ERROR] Error during WhatsApp auth check:", error);
        return { authenticated: false, qrDetected: false };
    }
}

export interface WaitForLoginOptions {
    /** Called with each new QR image. WhatsApp rotates the code roughly every 20 seconds. */
    onQr?: ((qrDataUrl: string) => void) | undefined;
    /** The last QR image already shown, so it is not re-sent unchanged. */
    lastQrDataUrl?: string | undefined;
    signal?: AbortSignal | undefined;
}

/**
 * Waits for the user to scan the QR code and log in. Re-sends the QR whenever it rotates,
 * clicks WhatsApp's "reload" control once the code expires, and stops early on abort.
 */
export async function waitForWhatsAppLogin(
    page: Page,
    timeoutMs = 120000,
    options: WaitForLoginOptions = {}
): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let lastQr = options.lastQrDataUrl;

    while (Date.now() < deadline) {
        if (options.signal?.aborted) return false;
        if (await isAnyVisible(page, AUTH_SELECTOR)) return true;

        const reload = page.getByRole("button", { name: /reload/i }).first();
        if ((await reload.count()) > 0 && (await reload.isVisible().catch(() => false))) {
            await reload.click().catch(() => {});
        }

        if (options.onQr) {
            const qr = await captureQr(page);
            if (qr && qr !== lastQr) {
                lastQr = qr;
                options.onQr(qr);
            }
        }

        await page.waitForTimeout(1000);
    }
    return await isAnyVisible(page, AUTH_SELECTOR);
}
