import { test, expect, type Page } from "@playwright/test";
import { searchAndOpenGroup, type SearchAndOpenResult } from "../../../src/scraper/whatsapp_scraper.js";
import { WHATSAPP_LOCATORS } from "../../../src/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

const NON_EXISTENT_GROUP = "NonExistentGroup_TestXYZ_99999";

export interface TestContext {
  page: Page;
  isAuthenticated: boolean;
  targetGroupName: string;
}

/**
 * Registers individual testcases strictly related to 'unread' extraction scope.
 */
export function registerUnreadTests(getContext: () => TestContext): void {
  test.describe("Scope: Unread", () => {
    test("Returns 'not_found' when searching for non-existent group with scope='unread'", async () => {
      const { page, isAuthenticated } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight search box input", async () => {
        const searchInput = page.locator(WHATSAPP_LOCATORS.chatListSearchInput.primary).first();
        await highlightElement(searchInput, 200);
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute searchAndOpenGroup(page, '${NON_EXISTENT_GROUP}', 'unread')`, async () => {
        result = await searchAndOpenGroup(page, NON_EXISTENT_GROUP, "unread");
        await test.info().attach("search-and-open-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate search outcome -> Expected: { status: 'not_found', unreadCount: 0 } | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "searchAndOpenGroup must return a valid SearchAndOpenResult object").toBeDefined();
          expect(
            result.status,
            `Expected 'not_found' for non-existent query '${NON_EXISTENT_GROUP}', received '${result?.status}'`
          ).toBe("not_found");
          expect(
            result.unreadCount,
            `Non-existent group must yield 0 unread messages, received ${result?.unreadCount}`
          ).toBe(0);
        }
      );
    });

    test("Skips group with 'skipped_no_unread' if group is already open in conversation header", async () => {
      const { page, isAuthenticated, targetGroupName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step(`1. Ensure target group '${targetGroupName}' is active in header`, async () => {
        const openRes = await searchAndOpenGroup(page, targetGroupName, "today");
        if (openRes.status !== "opened") {
          test.skip(true, `Could not open target group '${targetGroupName}' to test unread skip behavior`);
        }
        const header = page.locator(WHATSAPP_LOCATORS.conversationHeader.primary).first();
        await highlightElement(header, 200);
      });

      let unreadResult!: SearchAndOpenResult;
      await test.step(`2. Execute searchAndOpenGroup(page, '${targetGroupName}', 'unread') on active chat`, async () => {
        unreadResult = await searchAndOpenGroup(page, targetGroupName, "unread");
        await test.info().attach("search-and-open-result", {
          body: JSON.stringify(unreadResult, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate already-open skip -> Expected: { status: 'skipped_no_unread', unreadCount: 0 } | Received: { status: '${unreadResult?.status}', unreadCount: ${unreadResult?.unreadCount} }`,
        async () => {
          expect(unreadResult, "searchAndOpenGroup must return a defined result object").toBeDefined();
          expect(
            unreadResult.status,
            `Active conversation has 0 unread badge in viewport, expected 'skipped_no_unread', received '${unreadResult?.status}'`
          ).toBe("skipped_no_unread");
          expect(
            unreadResult.unreadCount,
            `Unread count for an open chat must be 0, received ${unreadResult?.unreadCount}`
          ).toBe(0);
        }
      );
    });

    test("Evaluates unread search result badge and returns valid result", async () => {
      const { page, isAuthenticated, targetGroupName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight search box input", async () => {
        const searchInput = page.locator(WHATSAPP_LOCATORS.chatListSearchInput.primary).first();
        await highlightElement(searchInput, 200);
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute searchAndOpenGroup(page, '${targetGroupName}', 'unread')`, async () => {
        result = await searchAndOpenGroup(page, targetGroupName, "unread");
        await test.info().attach("search-and-open-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate search result contract -> Expected: status in ['opened', 'skipped_no_unread', 'not_found'], unreadCount as number | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "searchAndOpenGroup must return a defined result object").toBeDefined();
          expect(
            ["opened", "skipped_no_unread", "not_found"],
            `Result status '${result?.status}' must be one of ['opened', 'skipped_no_unread', 'not_found']`
          ).toContain(result.status);
          expect(
            typeof result.unreadCount,
            `unreadCount must be a numeric integer, received '${typeof result?.unreadCount}'`
          ).toBe("number");
        }
      );
    });
  });
}
