import {
    launchWhatsAppContext,
    checkWhatsAppAuthState,
    waitForWhatsAppLogin,
    getDefaultWhatsAppSessionDir
} from "./whatsapp_session.js";

export interface WhatsAppAuthResult {
    authenticated: boolean;
    sessionDir: string;
    message: string;
}

/**
 * Checks WhatsApp session authentication status.
 * If authenticated, returns success immediately.
 * If expired/unauthenticated, displays the QR code in browser window and waits for user to scan and update the session.
 */
export async function ensureWhatsAppAuth(options: {
    headless?: boolean;
    timeoutMs?: number;
} = {}): Promise<WhatsAppAuthResult> {
    const sessionDir = getDefaultWhatsAppSessionDir();
    const headless = options.headless ?? false; // Default to false for visual QR scanning
    const timeoutMs = options.timeoutMs ?? 120000;

    console.log("\n=================== WHATSAPP AUTH SESSION MANAGER ===================");
    console.log(`Session Directory: ${sessionDir}`);
    console.log(`Mode: ${headless ? "Headless" : "Visual Browser"}`);
    console.log("Checking WhatsApp Web authentication status...\n");

    const { context, page } = await launchWhatsAppContext({
        headless,
        sessionDir,
    });

    try {
        await page.goto("https://web.whatsapp.com", {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

        // Check if session is already authenticated or showing QR code
        const authState = await checkWhatsAppAuthState(page, 45000);

        if (authState.authenticated) {
            console.log("[AUTHENTICATED] WhatsApp session is already active and authenticated!");
            return {
                authenticated: true,
                sessionDir,
                message: "Session is already authenticated and active.",
            };
        }

        if (authState.qrDetected || authState.qrDataUrl) {
            // Session not authenticated - user needs to scan QR code
            console.log("[SESSION EXPIRED / NOT LOGGED IN]");
            console.log("Please scan the QR code displayed in the browser window using WhatsApp on your phone (Linked Devices).");
            console.log(`Waiting up to ${Math.round(timeoutMs / 1000)}s for scan completion...\n`);

            const loginSuccess = await waitForWhatsAppLogin(page, timeoutMs);

            if (loginSuccess) {
                // Give session state 2 seconds to flush cookies and storage to disk
                await page.waitForTimeout(2000);
                console.log("[SUCCESS] QR code scanned successfully! Session is now authenticated and saved.");
                return {
                    authenticated: true,
                    sessionDir,
                    message: "QR code scanned successfully. Session updated.",
                };
            } else {
                console.error("[TIMEOUT] Authentication timed out. QR code was not scanned in time.");
                return {
                    authenticated: false,
                    sessionDir,
                    message: "Authentication timed out waiting for QR code scan.",
                };
            }
        } else {
            console.error("[ERROR] WhatsApp loading timed out before establishing session state. Please check your internet connection.");
            return {
                authenticated: false,
                sessionDir,
                message: "WhatsApp session check timed out without loading chat list or QR code.",
            };
        }
    } catch (error: any) {
        console.error("[ERROR] Failed during authentication check:", error?.message || error);
        return {
            authenticated: false,
            sessionDir,
            message: error?.message || "Unknown error during authentication",
        };
    } finally {
        await context.close().catch(() => {});
        console.log("=====================================================================\n");
    }
}

// Direct CLI execution
if (process.argv[1] && process.argv[1].includes("whatsapp_auth")) {
    const isHeadless = process.argv.includes("--headless");
    ensureWhatsAppAuth({ headless: isHeadless })
        .then((result) => {
            if (!result.authenticated) {
                process.exit(1);
            }
            process.exit(0);
        })
        .catch((err) => {
            console.error("Fatal auth error:", err);
            process.exit(1);
        });
}
