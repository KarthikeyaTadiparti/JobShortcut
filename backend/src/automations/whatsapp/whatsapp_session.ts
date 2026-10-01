import path from "path";
import fs from "fs";
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

export interface WhatsAppSessionContext {
    context: BrowserContext;
    page: Page;
}

/**
 * Launches a persistent Playwright Chromium browser context for WhatsApp Web with stealth anti-detection masks.
 */
export async function launchWhatsAppContext(options: {
    headless?: boolean | undefined;
    sessionDir?: string | undefined;
}): Promise<WhatsAppSessionContext> {
    const sessionDir = options.sessionDir || getDefaultWhatsAppSessionDir();
    const headless = options.headless !== undefined ? options.headless : true;

    const context = await chromium.launchPersistentContext(sessionDir, {
        headless,
        ignoreDefaultArgs: ["--enable-automation"],
        viewport: { width: 1366, height: 768 },
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
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

/**
 * Checks if the page is currently logged into WhatsApp Web or showing the QR code.
 */
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

export async function checkWhatsAppAuthState(page: Page, timeoutMs = 45000): Promise<WhatsAppAuthState> {
    const chatListSelector = getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer);
    const authBroadSelector = `${chatListSelector}, button[aria-label="Chats"], button[aria-label="Chats "], [data-testid="menu-bar-chats"], div[data-testid="chat-list-search-container"], #side`;
    // Only an actual QR code counts. The generic login fallbacks (h1, h2, any canvas) also
    // match the logged-in UI, e.g. the "WhatsApp" title is an h1.
    const qrSelector = 'canvas[aria-label*="Scan"], div[data-ref] canvas, [data-testid="qrcode"], div[data-testid="link-device-qr-code"]';

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
            // Check authenticated
            if (await isAnyVisible(page, authBroadSelector)) {
                return { authenticated: true, qrDetected: false };
            }

            // Check QR code
            if (await isAnyVisible(page, qrSelector)) {
                const qrCanvas = page.locator(qrSelector).first();
                let qrDataUrl: string | undefined = undefined;
                if ((await qrCanvas.count()) > 0 && (await qrCanvas.isVisible().catch(() => false))) {
                    try {
                        const screenshotBuffer = await qrCanvas.screenshot();
                        qrDataUrl = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
                    } catch {}
                }
                return {
                    authenticated: false,
                    qrDetected: true,
                    qrDataUrl,
                };
            }

            await page.waitForTimeout(500);
        }

        // Final check after timeout
        if (await isAnyVisible(page, authBroadSelector)) {
            return { authenticated: true, qrDetected: false };
        }

        return { authenticated: false, qrDetected: false };
    } catch (error) {
        console.error("[ERROR] Error during WhatsApp auth check:", error);
        return { authenticated: false, qrDetected: false };
    }
}

/**
 * Waits for the user to scan the QR code and log in.
 */
export async function waitForWhatsAppLogin(page: Page, timeoutMs = 120000): Promise<boolean> {
    const chatListSelector = getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer);
    try {
        await page.waitForSelector(chatListSelector, {
            state: "visible",
            timeout: timeoutMs,
        });
        return true;
    } catch {
        return false;
    }
}
