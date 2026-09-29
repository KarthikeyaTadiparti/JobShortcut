import { test, expect, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "../../src/config/whatsapp_locators.js";
import { validateLocatorWithFallback } from "../helpers/locator-tester.js";
import { printDiagnosticReport, type LocatorValidationResult } from "../helpers/reporter-formatter.js";
import { waitForWhatsAppLoadingToComplete } from "../helpers/page-ready.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionDir = path.resolve(__dirname, "../../.whatsapp_session");

const TARGET_GROUP_NAME = "Jobcode 37";

test.describe("WhatsApp Authenticated Chat UI & Message Locators", { tag: ["@locator", "@chat-locator"] }, () => {
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
    printDiagnosticReport("chat", results, sessionDir);
    if (context) {
      await context.close();
    }
  });

  test("Validate Left Pane Navigation and Chat List Locators", async () => {
    await test.step("Connect to WhatsApp Web and wait for loading to complete", async () => {
      await page.goto("https://web.whatsapp.com", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await waitForWhatsAppLoadingToComplete(page, 45000);
    });

    // 1. Chat List Main Container
    const containerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.chatListContainer,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(containerRes.result);

    // 2. Chat List Search Input Box
    const searchInputRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.chatListSearchInput,
      { timeoutMs: 6000, highlightDurationMs: 400 }
    );
    results.push(searchInputRes.result);

    // 3. Chat List Row
    const rowRes = await validateLocatorWithFallback(page, WHATSAPP_LOCATORS.chatListRow, {
      timeoutMs: 6000,
      highlightDurationMs: 400,
    });
    results.push(rowRes.result);

    // 4. Chat Row Title Span
    if (rowRes.activeLocator) {
      const titleRes = await validateLocatorWithFallback(page, WHATSAPP_LOCATORS.chatRowTitle, {
        scopeLocator: rowRes.activeLocator,
        timeoutMs: 4000,
        highlightDurationMs: 400,
      });
      results.push(titleRes.result);

      // 5. Unread Badge (Optional - target row with unread count if available)
      const unreadRow = page
        .locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListRow))
        .filter({ has: page.locator(getCombinedSelector(WHATSAPP_LOCATORS.chatRowUnreadBadge)) })
        .first();

      const hasUnreadRow = (await unreadRow.count()) > 0 && (await unreadRow.isVisible().catch(() => false));
      const targetScope = hasUnreadRow ? unreadRow : rowRes.activeLocator;

      const badgeRes = await validateLocatorWithFallback(
        page,
        WHATSAPP_LOCATORS.chatRowUnreadBadge,
        { scopeLocator: targetScope, timeoutMs: 2500, highlightDurationMs: 400 }
      );
      results.push(badgeRes.result);
    } else {
      results.push({
        locatorId: WHATSAPP_LOCATORS.chatRowTitle.id,
        locatorName: WHATSAPP_LOCATORS.chatRowTitle.name,
        status: "SKIPPED",
        workingSelector: null,
        primaryPassed: false,
        testedFallbacks: [],
        executionTimeMs: 0,
      });
      results.push({
        locatorId: WHATSAPP_LOCATORS.chatRowUnreadBadge.id,
        locatorName: WHATSAPP_LOCATORS.chatRowUnreadBadge.name,
        status: "SKIPPED",
        workingSelector: null,
        primaryPassed: false,
        testedFallbacks: [],
        executionTimeMs: 0,
      });
    }
  });

  test(`Validate Conversation Pane, Header, Messages, Date Dividers, and Links on '${TARGET_GROUP_NAME}'`, async () => {
    // Search and open the target group 'Jobcode 37'
    await test.step(`Search and open target group '${TARGET_GROUP_NAME}'`, async () => {
      // 1. Locate search box using active selector or fallback
      const searchBox = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput)).first();

      if ((await searchBox.count()) > 0 && (await searchBox.isVisible({ timeout: 5000 }).catch(() => false))) {
        await searchBox.click({ force: true });
        await page.waitForTimeout(200);

        // Clear search box
        await page.keyboard.press("Control+A").catch(() => {});
        await page.keyboard.press("Backspace").catch(() => {});

        // Type target group name
        await page.keyboard.type(TARGET_GROUP_NAME, { delay: 50 });
        await page.waitForTimeout(1500);

        // Validate Clear Search Button (visible while search text is active in the search container)
        const clearBtnRes = await validateLocatorWithFallback(
          page,
          WHATSAPP_LOCATORS.chatListSearchClearBtn,
          { timeoutMs: 3000, highlightDurationMs: 400 }
        );
        results.push(clearBtnRes.result);

        // Click matching search result or press Enter
        const matchingRow = page
          .locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListRow))
          .filter({ hasText: new RegExp(TARGET_GROUP_NAME, "i") })
          .first();

        if ((await matchingRow.count()) > 0 && (await matchingRow.isVisible({ timeout: 4000 }).catch(() => false))) {
          await matchingRow.click({ force: true });
        } else {
          await page.keyboard.press("Enter");
        }

        await page.waitForTimeout(2000);
      } else {
        // Fallback: click first row
        const row = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListRow)).first();
        if ((await row.count()) > 0 && (await row.isVisible({ timeout: 2000 }).catch(() => false))) {
          await row.click({ force: true }).catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
    });

    // 7. Conversation Header
    const headerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.conversationHeader,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(headerRes.result);

    // 8. Conversation Chat Title
    const titleRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.conversationChatTitle,
      { timeoutMs: 6000, highlightDurationMs: 400 }
    );
    results.push(titleRes.result);

    // 9. Conversation Panel Scroll Container
    const scrollPanelRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.conversationPanelMessages,
      { timeoutMs: 6000, highlightDurationMs: 400 }
    );
    results.push(scrollPanelRes.result);

    // 10. Message Bubble Container (on real messages in Jobcode 37)
    const msgContainerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.messageContainer,
      { timeoutMs: 6000, highlightDurationMs: 400 }
    );
    results.push(msgContainerRes.result);

    // 11. Copyable Text Element (data-pre-plain-text and content)
    const copyableRes = await validateLocatorWithFallback(page, WHATSAPP_LOCATORS.copyableText, {
      timeoutMs: 6000,
      highlightDurationMs: 400,
    });
    results.push(copyableRes.result);

    // 12. Date Divider Span (Optional)
    const dateRes = await validateLocatorWithFallback(page, WHATSAPP_LOCATORS.dateDividerSpan, {
      timeoutMs: 3000,
      highlightDurationMs: 300,
    });
    results.push(dateRes.result);

    // 13. Message Anchor Link (embedded hyperlinks in Jobcode 37 job posts)
    const linkRes = await validateLocatorWithFallback(page, WHATSAPP_LOCATORS.messageAnchorLink, {
      timeoutMs: 4000,
      highlightDurationMs: 400,
    });
    results.push(linkRes.result);
  });
});
