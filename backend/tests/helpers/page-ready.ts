import type { Page } from "@playwright/test";

/**
 * Actively waits for WhatsApp Web's initial loading screen, progress bars,
 * and splash overlays to fully detach and disappear before test assertions begin.
 */
export async function waitForWhatsAppLoadingToComplete(
  page: Page,
  maxWaitMs = 60000
): Promise<void> {
  const startTime = Date.now();

  // 1. Check for progress bar or 'Loading your chats' text / spinner
  try {
    const loadingLoc = page.locator(
      'progress, [role="progressbar"], [data-testid="initial-loading"], div[aria-label*="Loading"]'
    );

    // If a progress bar or loading spinner is detected, wait for it to detach
    const hasProgress = await loadingLoc.first().isVisible({ timeout: 2500 }).catch(() => false);
    if (hasProgress) {
      await loadingLoc.first().waitFor({ state: "detached", timeout: maxWaitMs }).catch(() => {});
    }
  } catch {
    // ignore
  }

  // 2. Wait until either the Chat List, Main Header, or Login QR canvas is mounted and visible
  try {
    const readyLoc = page.locator(
      '#pane-side, [data-testid="chat-list"], #main, canvas, div[data-ref], [data-testid="intro-title"], h1'
    );
    await readyLoc.first().waitFor({ state: "visible", timeout: Math.max(5000, maxWaitMs - (Date.now() - startTime)) });
  } catch {
    // ignore
  }

  // Extra grace period for virtual DOM elements to settle
  await page.waitForTimeout(1000);
}
