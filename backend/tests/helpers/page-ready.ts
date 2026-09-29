import type { Page } from "@playwright/test";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "../../src/config/whatsapp_locators.js";

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
    const loadingSelector = getCombinedSelector(WHATSAPP_LOCATORS.loadingProgressBar);
    const loadingLoc = page.locator(loadingSelector);

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
    const readySelectors = [
      getCombinedSelector(WHATSAPP_LOCATORS.chatListContainer),
      getCombinedSelector(WHATSAPP_LOCATORS.conversationHeader),
      getCombinedSelector(WHATSAPP_LOCATORS.qrCanvas),
      getCombinedSelector(WHATSAPP_LOCATORS.channelsListContainer),
      getCombinedSelector(WHATSAPP_LOCATORS.introTitle),
    ].join(", ");

    const readyLoc = page.locator(readySelectors);
    await readyLoc.first().waitFor({ state: "visible", timeout: Math.max(5000, maxWaitMs - (Date.now() - startTime)) });
  } catch {
    // ignore
  }

  // Extra grace period for virtual DOM elements to settle
  await page.waitForTimeout(1000);
}
