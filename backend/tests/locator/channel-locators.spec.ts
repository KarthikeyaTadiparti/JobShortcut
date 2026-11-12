import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { DEFAULT_WHATSAPP_CHANNELS } from "@/automations/whatsapp/config/whatsapp_sources.js";
import { launchWhatsAppContext, checkWhatsAppAuthState } from "@/automations/whatsapp/whatsapp_session.js";
import { navigateToChannelsTab, isChannelsViewActive } from "@/automations/whatsapp/helpers/whatsapp_navigation.js";
import { validateLocatorWithFallback } from "../helpers/locator-tester.js";
import { printDiagnosticReport, type LocatorValidationResult } from "../helpers/reporter-formatter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionDir = path.resolve(__dirname, "../../.whatsapp_session");

const TARGET_CHANNEL_NAME = DEFAULT_WHATSAPP_CHANNELS[0]?.channelName || "Freshershunt";

test.describe("WhatsApp Channels UI & Broadcast Feed Locators", { tag: ["@locator", "@channel-locator"] }, () => {
  let context: BrowserContext;
  let page: Page;
  let isAuthenticated = false;
  const results: LocatorValidationResult[] = [];

  test.beforeAll(async () => {
    const session = await launchWhatsAppContext({ headless: true, sessionDir });
    context = session.context;
    page = session.page;

    const authState = await checkWhatsAppAuthState(page, 45000);
    isAuthenticated = authState.authenticated;
  });

  test.afterAll(async () => {
    printDiagnosticReport("channel", results, sessionDir);
    if (context) {
      await context.close().catch(() => {});
    }
  });

  test("Validate Left Pane Navigation, Channels List Scroll Area, and Channel Item Locators", async () => {
    test.setTimeout(120000);
    test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

    // 1. Validate Channels Navigation Rail Button
    const tabRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelsTabBtn,
      { timeoutMs: 10000, highlightDurationMs: 400 }
    );
    results.push(tabRes.result);
    expect(tabRes.result.status, "channelsTabBtn must not be BROKEN").not.toBe("BROKEN");

    if (tabRes.activeLocator) {
      await test.step("Click Channels tab button to navigate to Channels view", async () => {
        await tabRes.activeLocator!.click();
        await page.waitForTimeout(1500);
      });
    }

    // 2. Validate Channels List Virtual Scroll Container (Left Section Scroll Area)
    const containerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelsListContainer,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(containerRes.result);
    expect(containerRes.result.status, "channelsListContainer must not be BROKEN").not.toBe("BROKEN");
    expect(await isChannelsViewActive(page), "Channels view must be visibly active after clicking Channels tab").toBe(true);

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
    test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

    // 7. Select and Open Target Channel
    await test.step(`Ensure Channels tab is active and open '${TARGET_CHANNEL_NAME}'`, async () => {
      const switched = await navigateToChannelsTab(page);
      expect(switched, "Must switch to Channels view before locating target channel").toBe(true);

      const searchBoxes = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput));
      const count = await searchBoxes.count().catch(() => 0);
      let searchBox: ReturnType<Page["locator"]> | null = null;
      for (let i = 0; i < count; i++) {
        const candidate = searchBoxes.nth(i);
        if (await candidate.isVisible().catch(() => false)) {
          searchBox = candidate;
          break;
        }
      }

      if (searchBox) {
        const shortName = TARGET_CHANNEL_NAME.split(/\s*-\s*/)[0]?.trim() || TARGET_CHANNEL_NAME;
        await searchBox.click({ force: true });
        await page.waitForTimeout(200);

        await page.keyboard.press("Control+A").catch(() => {});
        await page.keyboard.press("Backspace").catch(() => {});

        await page.keyboard.type(shortName, { delay: 50 });
        await page.waitForTimeout(1500);

        const matchingRow = page
          .locator(getCombinedSelector(WHATSAPP_LOCATORS.channelListRow))
          .filter({ hasText: new RegExp(shortName, "i") })
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
    expect(headerRes.result.status, "channelHeader must not be BROKEN").not.toBe("BROKEN");

    // 9. Validate Active Channel Title
    const chatTitleRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelChatTitle,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(chatTitleRes.result);
    expect(chatTitleRes.result.status, "channelChatTitle must not be BROKEN").not.toBe("BROKEN");

    // 10. Validate Channel Feed Right Section Scroll Panel (Messages Scroll Container)
    const scrollPanelRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.conversationPanelMessages,
      { timeoutMs: 8000, highlightDurationMs: 400 }
    );
    results.push(scrollPanelRes.result);
    expect(scrollPanelRes.result.status, "conversationPanelMessages must not be BROKEN").not.toBe("BROKEN");

    // 11. Validate Channel Message Container
    const msgContainerRes = await validateLocatorWithFallback(
      page,
      WHATSAPP_LOCATORS.channelMessageContainer,
      { timeoutMs: 10000, highlightDurationMs: 400 }
    );
    results.push(msgContainerRes.result);
    expect(msgContainerRes.result.status, "channelMessageContainer must not be BROKEN").not.toBe("BROKEN");

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
