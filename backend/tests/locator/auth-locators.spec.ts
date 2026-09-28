import { test, expect } from "@playwright/test";
import { WHATSAPP_LOCATORS } from "../../src/config/whatsapp_locators.js";
import { validateLocatorWithFallback } from "../helpers/locator-tester.js";
import { printDiagnosticReport, type LocatorValidationResult } from "../helpers/reporter-formatter.js";
import { waitForWhatsAppLoadingToComplete } from "../helpers/page-ready.js";

test.describe("WhatsApp Authentication & Login Screen Locators", { tag: ["@locator", "@auth-locator"] }, () => {
  const results: LocatorValidationResult[] = [];

  test.afterAll(() => {
    printDiagnosticReport("auth", results, "Fresh Isolated Context");
  });

  test("Validate Login QR Code and Screen Locators", async ({ page, context }) => {
    // Stealth init script: mask navigator.webdriver and standardize browser attributes
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
      if (!(window as any).chrome) {
        (window as any).chrome = {
          runtime: {},
          loadTimes: function () {},
          csi: function () {},
          app: {},
        };
      }
    });

    await test.step("Navigate to WhatsApp Web login page and wait for loading to complete", async () => {
      await page.goto("https://web.whatsapp.com", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Wait for any splash loading screen or spinner to finish
      await waitForWhatsAppLoadingToComplete(page, 45000);
    });

    // 1. QR Code Canvas
    const qrResult = await validateLocatorWithFallback(page, WHATSAPP_LOCATORS.qrCanvas, {
      timeoutMs: 15000,
      highlightDurationMs: 500,
    });
    results.push(qrResult.result);

    // 2. Login Instructions Header / Card
    const instructionsResult = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.loginInstructions,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(instructionsResult.result);

    // 3. Login Wrapper Container
    const containerResult = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.loginContainer,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(containerResult.result);

    // Assert that the essential QR code canvas is operational or degraded (active fallback)
    expect(
      qrResult.result.status === "OPERATIONAL" || qrResult.result.status === "DEGRADED",
      `QR Code locator failed: ${qrResult.result.error || "Unknown"}`
    ).toBeTruthy();

    await page.waitForTimeout(500);
  });
});
