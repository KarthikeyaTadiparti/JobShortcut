import type { Locator } from "@playwright/test";

/**
 * Visually spotlights and highlights a located DOM element before assertions,
 * ensuring high-contrast visibility in Playwright traces, screenshots, and video recordings.
 *
 * @param locator Target Playwright Locator
 * @param durationMs Duration in ms to hold the highlight (default 300ms)
 */
export async function highlightElement(locator: Locator, durationMs = 300): Promise<void> {
  try {
    const count = await locator.count();
    if (count === 0) return;

    const first = locator.first();
    const isVisible = await first.isVisible().catch(() => false);
    if (!isVisible) return;

    // Apply high-contrast neon green glowing outline and shadow
    await first.evaluate((el: Element) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.outline = "3px solid #00E676";
      htmlEl.style.boxShadow = "0 0 14px #00E676";
      htmlEl.style.transition = "outline 0.1s ease-in, box-shadow 0.1s ease-in";
      htmlEl.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
      if (htmlEl.tagName === "INPUT" && htmlEl.parentElement) {
        htmlEl.parentElement.style.outline = "3px solid #00E676";
        htmlEl.parentElement.style.boxShadow = "0 0 14px #00E676";
      }
    }).catch(() => {});

    // Visual dwell for frame capture
    if (durationMs > 0) {
      await locator.page().waitForTimeout(durationMs);
    }

    // Clean up injected styling
    await first.evaluate((el: Element) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.outline = "";
      htmlEl.style.boxShadow = "";
      htmlEl.style.transition = "";
      if (htmlEl.tagName === "INPUT" && htmlEl.parentElement) {
        htmlEl.parentElement.style.outline = "";
        htmlEl.parentElement.style.boxShadow = "";
      }
    }).catch(() => {});
  } catch {
    // Non-fatal if element detaches during evaluation
  }
}
