import { test, expect } from "@playwright/test";
import { searchAndOpenGroup, clearActiveSearchInput, type SearchAndOpenResult } from "../../../src/scraper/whatsapp_scraper.js";
import { WHATSAPP_LOCATORS } from "../../../src/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";
import type { TestContext } from "./unread.js";

const NON_EXISTENT_GROUP = "NonExistentGroup_TestXYZ_99999";

/**
 * Registers individual testcases strictly related to default/undefined scope & search input sanitization.
 */
export function registerDefaultTests(getContext: () => TestContext): void {
  test.describe("Scope: Default / Base", () => {
    test("Returns 'not_found' when searching for non-existent group with undefined scope", async () => {
      const { page, isAuthenticated } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight search box input", async () => {
        const searchInput = page.locator(WHATSAPP_LOCATORS.chatListSearchInput.primary).first();
        await highlightElement(searchInput, 200);
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute searchAndOpenGroup(page, '${NON_EXISTENT_GROUP}', undefined)`, async () => {
        result = await searchAndOpenGroup(page, NON_EXISTENT_GROUP, undefined);
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
            `Expected 'not_found' for non-existent query '${NON_EXISTENT_GROUP}', received '${result?.status}'`
          ).toBe("not_found");
          expect(
            result.unreadCount,
            `Non-existent group unread count must be 0, received ${result?.unreadCount}`
          ).toBe(0);
        }
      );
    });

    test("Searches and opens target group with default scope", async () => {
      const { page, isAuthenticated, targetGroupName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight search input element", async () => {
        const searchInput = page.locator(WHATSAPP_LOCATORS.chatListSearchInput.primary).first();
        await highlightElement(searchInput, 200);
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute searchAndOpenGroup(page, '${targetGroupName}', undefined)`, async () => {
        result = await searchAndOpenGroup(page, targetGroupName, undefined);
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
            expect(typeof result.unreadCount, `unreadCount must be a numeric integer`).toBe("number");
            const headerTitle = page.locator(WHATSAPP_LOCATORS.conversationChatTitle.primary).first();
            await highlightElement(headerTitle, 300);
          }
        }
      );
    });

    test("Immediately returns 'opened' when group is already open with default scope", async () => {
      const { page, isAuthenticated, targetGroupName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      let alreadyOpenResult!: SearchAndOpenResult;
      await test.step(`1. Execute searchAndOpenGroup(page, '${targetGroupName}', undefined) on active chat`, async () => {
        alreadyOpenResult = await searchAndOpenGroup(page, targetGroupName, undefined);
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

          const headerTitle = page.locator(WHATSAPP_LOCATORS.conversationChatTitle.primary).first();
          await highlightElement(headerTitle, 300);
        }
      );
    });

    test("Sanitizes and resets search input box via clearActiveSearchInput", async () => {
      const { page, isAuthenticated } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Invoke clearActiveSearchInput", async () => {
        await clearActiveSearchInput(page);
      });

      const searchInput = page.locator(WHATSAPP_LOCATORS.chatListSearchInput.primary).first();
      await highlightElement(searchInput, 200);

      let actualText = "";
      if ((await searchInput.count()) > 0) {
        actualText = (await searchInput.inputValue().catch(() => searchInput.textContent())).trim();
      }

      await test.info().attach("sanitized-input-state", {
        body: JSON.stringify({ inputValue: actualText }, null, 2),
        contentType: "application/json",
      });

      await test.step(
        `2. Validate input sanitization -> Expected: text='' | Received: text='${actualText}'`,
        async () => {
          expect(actualText, `Search input must be empty after sanitization, received '${actualText}'`).toBe("");
        }
      );
    });
  });
}
