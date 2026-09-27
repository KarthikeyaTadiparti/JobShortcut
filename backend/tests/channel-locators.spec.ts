import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WHATSAPP_LOCATORS } from "../src/config/whatsapp_locators.js";
import { validateLocatorWithFallback } from "./helpers/locator-tester.js";
import { printDiagnosticReport, type LocatorValidationResult } from "./helpers/reporter-formatter.js";
import { waitForWhatsAppLoadingToComplete } from "./helpers/page-ready.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionDir = path.resolve(__dirname, "../.whatsapp_session");

test.describe("WhatsApp Channels UI & Broadcast Feed Locators", () => {
  let context: BrowserContext;
  let page: Page;
  const results: LocatorValidationResult[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    context = await chromium.launchPersistentContext(sessionDir, {
      headless: true,
      viewport: { width: 1366, height: 768 },
      ignoreDefaultArgs: ["--enable-automation"],
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
      ],
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    });

    const pages = context.pages();
    page = pages[0] || (await context.newPage());
  });

  test.afterAll(async () => {
    printDiagnosticReport("channel", results, sessionDir);
    if (context) {
      await context.close();
    }
  });

  test("Validate Channels Tab Navigation & Broadcast Message Feed Locators", async () => {
    test.setTimeout(120000);
    await test.step("Connect to WhatsApp Web and wait for session ready", async () => {
      await page.goto("https://web.whatsapp.com", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await waitForWhatsAppLoadingToComplete(page, 45000);
    });

    // 1. Validate Channels Navigation Rail Button
    const tabRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelsTabBtn,
      { timeoutMs: 10000, highlightDurationMs: 400 }
    );
    results.push(tabRes.result);

    if (tabRes.activeLocator) {
      await test.step("Click Channels tab button to navigate to Channels view", async () => {
        await tabRes.activeLocator!.click().catch(() => {});
        await page.waitForTimeout(2000);
      });
    }

    // 2. Validate Channels List Container
    const containerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelsListContainer,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(containerRes.result);

    // 3. Validate Channels Search Input
    const searchInputRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelsSearchInput,
      { timeoutMs: 6000, highlightDurationMs: 400 }
    );
    results.push(searchInputRes.result);

    // 4. Validate Channel List Rows
    const rowRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelListRow,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(rowRes.result);

    // 5. Validate Channel Row Title & Unread Badge
    if (rowRes.activeLocator) {
      const titleRes = await validateLocatorWithFallback(
        page,
        WHATSAPP_LOCATORS.channelRowTitle,
        {
          scopeLocator: rowRes.activeLocator,
          timeoutMs: 4000,
          highlightDurationMs: 300,
        }
      );
      results.push(titleRes.result);

      const unreadBadgeRes = await validateLocatorWithFallback(
        page,
        WHATSAPP_LOCATORS.channelRowUnreadBadge,
        {
          scopeLocator: rowRes.activeLocator,
          timeoutMs: 3000,
          highlightDurationMs: 300,
        }
      );
      results.push(unreadBadgeRes.result);
    }

    // 6. Select and Open a Target Channel
    await test.step("Open target followed channel in conversation view", async () => {
      const channelItem = page.locator(
        '[data-testid="newsletter-tab-newsletter-cell"], [aria-label="Channel list"] [role="listitem"] [role="button"], div[aria-label*="Channel" i][role="button"], [aria-label="Channel list"] [role="listitem"], div[role="listitem"]'
      ).first();

      const isVisible = await channelItem.isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) {
        const text = await channelItem.textContent().catch(() => "");
        console.log(`[Test] Clicking channel item: ${text.slice(0, 50)}...`);
        await channelItem.click({ force: true }).catch(() => {});
        await page.waitForTimeout(3000);
      }
    });

    // 7. Validate Channel Header in #main
    const headerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelHeader,
      { timeoutMs: 10000, highlightDurationMs: 400 }
    );
    results.push(headerRes.result);

    // 8. Validate Active Channel Title
    const chatTitleRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelChatTitle,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(chatTitleRes.result);

    // 9. Validate Channel Message Container
    const msgContainerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelMessageContainer,
      { timeoutMs: 10000, highlightDurationMs: 400 }
    );
    results.push(msgContainerRes.result);

    // 10. Validate Channel Message Text Content
    const msgTextRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelCopyableText,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(msgTextRes.result);

    // 11. Validate Channel Message Links
    const msgLinkRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelMessageLink,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(msgLinkRes.result);
  });
});
