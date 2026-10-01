import { test, type Page, type Locator } from "@playwright/test";
import type { LocatorDefinition } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { highlightElement } from "./dom-highlighter.js";
import type { LocatorValidationResult, FallbackAttempt } from "./reporter-formatter.js";

export interface ValidateLocatorOptions {
  timeoutMs?: number;
  highlightDurationMs?: number;
  scopeLocator?: Locator;
  failTestOnBroken?: boolean;
}

/**
 * Validates a single WhatsApp UI element using primary-first logic with fallback cascade,
 * element highlighting, and structured test.step reporting.
 */
export async function validateLocatorWithFallback(
  page: Page,
  def: LocatorDefinition,
  options: ValidateLocatorOptions = {}
): Promise<{ result: LocatorValidationResult; activeLocator: Locator | null }> {
  const timeout = options.timeoutMs ?? 5000;
  const highlightMs = options.highlightDurationMs ?? 400;
  const failOnBroken = options.failTestOnBroken ?? false;
  const startTime = Date.now();

  return await test.step(`[Verify Locator] ${def.name} (${def.id})`, async () => {
    const testedFallbacks: FallbackAttempt[] = [];
    let activeLocator: Locator | null = null;
    let workingSelector: string | null = null;
    let primaryPassed = false;

    // -------------------------------------------------------------------------
    // 1. EVALUATE PRIMARY LOCATOR (Actively wait for element to appear)
    // -------------------------------------------------------------------------
    try {
      const primaryLoc = options.scopeLocator
        ? options.scopeLocator.locator(def.primary)
        : page.locator(def.primary);

      // Actively wait for element to be visible in DOM up to timeout
      await primaryLoc.first().waitFor({ state: "visible", timeout });

      primaryPassed = true;
      workingSelector = def.primary;
      activeLocator = primaryLoc.first();

      // Highlight element on screen
      await highlightElement(activeLocator, highlightMs);

      const result: LocatorValidationResult = {
        locatorId: def.id,
        locatorName: def.name,
        status: "OPERATIONAL",
        workingSelector,
        primaryPassed: true,
        testedFallbacks: [],
        executionTimeMs: Date.now() - startTime,
      };

      return { result, activeLocator };
    } catch {
      // Primary failed or timed out
    }

    // -------------------------------------------------------------------------
    // 2. FALLBACK CASCADE (Only evaluated if Primary failed)
    // -------------------------------------------------------------------------
    for (const fallbackSel of def.fallbacks) {
      const fbStart = Date.now();
      try {
        const fbLoc = options.scopeLocator
          ? options.scopeLocator.locator(fallbackSel)
          : page.locator(fallbackSel);

        // Actively wait for fallback selector up to fallback timeout
        const fbTimeout = Math.min(timeout, 3000);
        await fbLoc.first().waitFor({ state: "visible", timeout: fbTimeout });

        testedFallbacks.push({
          selector: fallbackSel,
          passed: true,
          durationMs: Date.now() - fbStart,
        });

        workingSelector = fallbackSel;
        activeLocator = fbLoc.first();

        // Highlight element on screen
        await highlightElement(activeLocator, highlightMs);
        break;
      } catch {
        testedFallbacks.push({
          selector: fallbackSel,
          passed: false,
          durationMs: Date.now() - fbStart,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 3. STATUS RESOLUTION
    // -------------------------------------------------------------------------
    if (workingSelector) {
      const result: LocatorValidationResult = {
        locatorId: def.id,
        locatorName: def.name,
        status: "DEGRADED",
        workingSelector,
        primaryPassed: false,
        testedFallbacks,
        executionTimeMs: Date.now() - startTime,
      };
      return { result, activeLocator };
    }

    if (def.isOptional) {
      const result: LocatorValidationResult = {
        locatorId: def.id,
        locatorName: def.name,
        status: "SKIPPED",
        workingSelector: null,
        primaryPassed: false,
        testedFallbacks,
        executionTimeMs: Date.now() - startTime,
      };
      return { result, activeLocator: null };
    }

    const result: LocatorValidationResult = {
      locatorId: def.id,
      locatorName: def.name,
      status: "BROKEN",
      workingSelector: null,
      primaryPassed: false,
      testedFallbacks,
      executionTimeMs: Date.now() - startTime,
      error: `All selectors failed for '${def.name}' (Primary: ${def.primary}, Fallbacks: ${def.fallbacks.join(", ")})`,
    };

    if (failOnBroken) {
      throw new Error(result.error);
    }

    return { result, activeLocator: null };
  });
}
