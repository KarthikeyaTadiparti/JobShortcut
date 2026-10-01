import { test, expect } from "@playwright/test";
import { searchAndOpenGroup, ExtractionScope, type SearchAndOpenResult } from "@/automations/whatsapp/whatsapp_scraper.js";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "@/automations/whatsapp/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";
import type { TestContext } from "./unread.js";

const NON_EXISTENT_GROUP = "NonExistentGroup_TestXYZ_99999";

/**
 * Registers individual testcases strictly related to 'today' extraction scope.
 */
export function registerTodayTests(getContext: () => TestContext): void {
  test.describe("Scope: Today", () => {
    test("Returns 'not_found' when searching for non-existent group with scope='today'", async () => {
      const { page, isAuthenticated } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight search box input", async () => {
        const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput)).first();
        await highlightElement(searchInput, 200);
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute searchAndOpenGroup(page, '${NON_EXISTENT_GROUP}', 'today')`, async () => {
        result = await searchAndOpenGroup(page, NON_EXISTENT_GROUP, ExtractionScope.TODAY);
        await test.info().attach("search-and-open-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate not_found outcome -> Expected: { status: 'not_found', unreadCount: 0 } | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "searchAndOpenGroup must return a defined result object").toBeDefined();
          expect(
            result.status,
            `Expected 'not_found' for non-existent group '${NON_EXISTENT_GROUP}', received '${result?.status}'`
          ).toBe("not_found");
          expect(
            result.unreadCount,
            `Non-existent group unread count must be 0, received ${result?.unreadCount}`
          ).toBe(0);
        }
      );
    });

    test("Searches and opens target group with scope='today'", async () => {
      const { page, isAuthenticated, targetGroupName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight search input element", async () => {
        const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.chatListSearchInput)).first();
        await highlightElement(searchInput, 200);
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute searchAndOpenGroup(page, '${targetGroupName}', 'today')`, async () => {
        result = await searchAndOpenGroup(page, targetGroupName, ExtractionScope.TODAY);
        await test.info().attach("search-and-open-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate open outcome -> Expected: status in ['opened', 'not_found'] | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "searchAndOpenGroup must return a defined result object").toBeDefined();
          expect(
            ["opened", "not_found"],
            `Expected status 'opened' (or 'not_found' if absent), received '${result?.status}'`
          ).toContain(result.status);

          if (result.status === "opened") {
            const header = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.conversationHeader)).first();
            await highlightElement(header, 300);
          }
        }
      );
    });

    test("Instantly returns 'opened' when group is already open with scope='today'", async () => {
      const { page, isAuthenticated, targetGroupName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      let alreadyOpenResult!: SearchAndOpenResult;
      await test.step(`1. Execute searchAndOpenGroup(page, '${targetGroupName}', 'today') on active chat`, async () => {
        alreadyOpenResult = await searchAndOpenGroup(page, targetGroupName, ExtractionScope.TODAY);
        await test.info().attach("search-and-open-result", {
          body: JSON.stringify(alreadyOpenResult, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `2. Validate already-open optimization -> Expected: { status: 'opened', unreadCount: 0 } | Received: { status: '${alreadyOpenResult?.status}', unreadCount: ${alreadyOpenResult?.unreadCount} }`,
        async () => {
          expect(
            alreadyOpenResult.status,
            `Expected already open group to immediately return 'opened', received '${alreadyOpenResult?.status}'`
          ).toBe("opened");
          expect(
            alreadyOpenResult.unreadCount,
            `Already open group unread count must be 0, received ${alreadyOpenResult?.unreadCount}`
          ).toBe(0);

          const headerTitle = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.conversationChatTitle)).first();
          await highlightElement(headerTitle, 300);
        }
      );
    });
  });
}
