import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { DEFAULT_WHATSAPP_CHANNELS } from "@/automations/whatsapp/config/whatsapp_sources.js";
import { validateLocatorWithFallback } from "../helpers/locator-tester.js";
import { printDiagnosticReport, type LocatorValidationResult } from "../helpers/reporter-formatter.js";
import { waitForWhatsAppLoadingToComplete } from "../helpers/page-ready.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionDir = path.resolve(__dirname, "../../.whatsapp_session");

const TARGET_CHANNEL_NAME = DEFAULT_WHATSAPP_CHANNELS[0]?.channelName || "Freshershunt";

test.describe("WhatsApp Channels UI & Broadcast Feed Locators", { tag: ["@locator", "@channel-locator"] }, () => {
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

  test("Validate Left Pane Navigation, Channels List Scroll Area, and Channel Item Locators", async () => {
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

    // 2. Validate Channels List Virtual Scroll Container (Left Section Scroll Area)
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

    // 5. Validate Channel Row Title
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

      // 6. Validate Channel Row Unread Badge (target row with unread count if available in viewport)
      const unreadRow = page
        .locator(getCombinedSelector(WHATSAPP_LOCATORS.channelListRow))
        .filter({ has: page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelRowUnreadBadge)) })
        .first();

      const hasUnreadRow = (await unreadRow.count()) > 0 && (await unreadRow.isVisible().catch(() => false));
      if (hasUnreadRow) {
        const unreadBadgeRes = await validateLocatorWithFallback(
          page,
          WHATSAPP_LOCATORS.channelRowUnreadBadge,
          {
            scopeLocator: unreadRow,
            timeoutMs: 4000,
            highlightDurationMs: 400,
          }
        );
        results.push(unreadBadgeRes.result);
      } else {
        results.push({
          locatorId: WHATSAPP_LOCATORS.channelRowUnreadBadge.id,
          locatorName: WHATSAPP_LOCATORS.channelRowUnreadBadge.name,
          status: "SKIPPED",
          workingSelector: null,
          primaryPassed: false,
          testedFallbacks: [],
          executionTimeMs: 0,
        });
      }
    } else {
      results.push({
        locatorId: WHATSAPP_LOCATORS.channelRowTitle.id,
        locatorName: WHATSAPP_LOCATORS.channelRowTitle.name,
        status: "SKIPPED",
        workingSelector: null,
        primaryPassed: false,
        testedFallbacks: [],
        executionTimeMs: 0,
      });
      results.push({
        locatorId: WHATSAPP_LOCATORS.channelRowUnreadBadge.id,
        locatorName: WHATSAPP_LOCATORS.channelRowUnreadBadge.name,
        status: "SKIPPED",
        workingSelector: null,
        primaryPassed: false,
        testedFallbacks: [],
        executionTimeMs: 0,
      });
    }
  });

  test(`Validate Channel Feed Pane, Header, Messages, and Right Section Scroll Area on '${TARGET_CHANNEL_NAME}'`, async () => {
    test.setTimeout(120000);
    // 7. Select and Open Target Channel
    await test.step(`Search and open target followed channel '${TARGET_CHANNEL_NAME}' in conversation view`, async () => {
      const searchBox = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput)).first();

      if ((await searchBox.count()) > 0 && (await searchBox.isVisible({ timeout: 5000 }).catch(() => false))) {
        await searchBox.click({ force: true });
        await page.waitForTimeout(200);

        await page.keyboard.press("Control+A").catch(() => {});
        await page.keyboard.press("Backspace").catch(() => {});

        await page.keyboard.type(TARGET_CHANNEL_NAME, { delay: 50 });
        await page.waitForTimeout(1500);

        const matchingRow = page
          .locator(getCombinedSelector(WHATSAPP_LOCATORS.channelListRow))
          .filter({ hasText: new RegExp(TARGET_CHANNEL_NAME, "i") })
          .first();

        if ((await matchingRow.count()) > 0 && (await matchingRow.isVisible({ timeout: 4000 }).catch(() => false))) {
          await matchingRow.click({ force: true });
        } else {
          await page.keyboard.press("Enter");
        }
        await page.waitForTimeout(2000);
      } else {
        const channelItem = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelListRow)).first();
        if ((await channelItem.count()) > 0 && (await channelItem.isVisible({ timeout: 4000 }).catch(() => false))) {
          await channelItem.click({ force: true }).catch(() => {});
          await page.waitForTimeout(2000);
        }
      }
    });

    // 8. Validate Channel Header in #main
    const headerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelHeader,
      { timeoutMs: 10000, highlightDurationMs: 400 }
    );
    results.push(headerRes.result);

    // 9. Validate Active Channel Title
    const chatTitleRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelChatTitle,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(chatTitleRes.result);

    // 10. Validate Channel Feed Right Section Scroll Panel (Messages Scroll Container)
    const scrollPanelRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.conversationPanelMessages,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(scrollPanelRes.result);

    // 11. Validate Channel Message Container
    const msgContainerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelMessageContainer,
      { timeoutMs: 10000, highlightDurationMs: 400 }
    );
    results.push(msgContainerRes.result);

    // 12. Validate Channel Message Text Content
    const msgTextRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelCopyableText,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(msgTextRes.result);

    // 13. Validate Channel Message Links
    const msgLinkRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelMessageLink,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(msgLinkRes.result);
  });
});
