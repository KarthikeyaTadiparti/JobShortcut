import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { chromium, type BrowserContext, type Page } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Returns the default persistent session directory for WhatsApp Web.
 */
export function getDefaultWhatsAppSessionDir(): string {
    const sessionDir = path.resolve(__dirname, "../../.whatsapp_session");
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
}

export interface WhatsAppSessionContext {
    context: BrowserContext;
    page: Page;
}

/**
 * Launches a persistent Playwright Chromium browser context for WhatsApp Web.
 */
export async function launchWhatsAppContext(options: {
    headless?: boolean | undefined;
    sessionDir?: string | undefined;
}): Promise<WhatsAppSessionContext> {
    const sessionDir = options.sessionDir || getDefaultWhatsAppSessionDir();
    const headless = options.headless !== undefined ? options.headless : true;

    const context = await chromium.launchPersistentContext(sessionDir, {
        headless,
        viewport: { width: 1366, height: 768 },
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
        ],
    });

    const pages = context.pages();
    const page: Page = pages[0] || (await context.newPage());

    return { context, page };
}

export interface WhatsAppAuthState {
    authenticated: boolean;
    qrDataUrl?: string | undefined;
}

/**
 * Checks if the page is currently logged into WhatsApp Web or showing the QR code.
 */
export async function checkWhatsAppAuthState(page: Page, timeoutMs = 25000): Promise<WhatsAppAuthState> {
    const chatListSelector = '[data-testid="chat-list"], #pane-side, #side, [aria-label*="Chat list"], [aria-label*="Chats"]';
    const qrCanvasSelector = 'canvas[aria-label*="Scan"], [data-testid="qrcode"], div[data-ref] canvas, canvas';

    try {
        // First check if already on WhatsApp Web or need to navigate
        const currentUrl = page.url();
        if (!currentUrl.includes("web.whatsapp.com")) {
            await page.goto("https://web.whatsapp.com", {
                waitUntil: "domcontentloaded",
                timeout: 45000,
            });
        }

        // Race between chat-list and QR code
        const chatListLocator = page.locator(chatListSelector);
        const qrLocator = page.locator(qrCanvasSelector);

        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if ((await chatListLocator.count()) > 0 && (await chatListLocator.first().isVisible())) {
                return { authenticated: true };
            }

            if ((await qrLocator.count()) > 0 && (await qrLocator.first().isVisible())) {
                const qrElement = qrLocator.first();
                const screenshotBuffer = await qrElement.screenshot();
                const qrDataUrl = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
                return {
                    authenticated: false,
                    qrDataUrl,
                };
            }

            await page.waitForTimeout(400);
        }

        // If neither resolved in time, re-check chat list
        if ((await chatListLocator.count()) > 0) {
            return { authenticated: true };
        }

        return { authenticated: false };
    } catch (error) {
        console.error("Error during WhatsApp auth check:", error);
        return { authenticated: false };
    }
}

/**
 * Waits for the user to scan the QR code and log in.
 */
export async function waitForWhatsAppLogin(page: Page, timeoutMs = 120000): Promise<boolean> {
    const chatListSelector = '[data-testid="chat-list"], #pane-side, #side, [aria-label*="Chat list"], [aria-label*="Chats"]';
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
