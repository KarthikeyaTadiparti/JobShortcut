import { test, expect, type Page } from "@playwright/test";
import { openFollowedChannel, type SearchAndOpenResult } from "../../../src/scraper/whatsapp_scraper.js";
import { WHATSAPP_LOCATORS } from "../../../src/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";

const NON_EXISTENT_CHANNEL = "NonExistentChannel_TestXYZ_99999";

export interface ChannelTestContext {
  page: Page;
  isAuthenticated: boolean;
  targetChannelName: string;
}

/**
 * Registers individual testcases strictly related to 'unread' extraction scope on followed channels.
 */
export function registerChannelUnreadTests(getContext: () => ChannelTestContext): void {
  test.describe("Channel Scope: Unread", () => {
    test("Returns 'not_found' when searching for non-existent channel with scope='unread'", async () => {
      const { page, isAuthenticated } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight channels search/filter input", async () => {
        const searchInput = page.locator(WHATSAPP_LOCATORS.channelsSearchInput.primary).first();
        if ((await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false))) {
          await highlightElement(searchInput, 200);
        }
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute openFollowedChannel(page, '${NON_EXISTENT_CHANNEL}', 'unread')`, async () => {
        result = await openFollowedChannel(page, NON_EXISTENT_CHANNEL, "unread");
        await test.info().attach("channel-search-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate channel not_found outcome -> Expected: { status: 'not_found', unreadCount: 0 } | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "openFollowedChannel must return a defined SearchAndOpenResult object").toBeDefined();
          expect(
            result.status,
            `Expected 'not_found' for non-existent channel '${NON_EXISTENT_CHANNEL}', received '${result?.status}'`
          ).toBe("not_found");
          expect(
            result.unreadCount,
            `Non-existent channel unread count must be 0, received ${result?.unreadCount}`
          ).toBe(0);
        }
      );
    });

    test("Skips channel with 'skipped_no_unread' if channel is already open in conversation header", async () => {
      const { page, isAuthenticated, targetChannelName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step(`1. Ensure target channel '${targetChannelName}' is active in conversation view`, async () => {
        const openRes = await openFollowedChannel(page, targetChannelName, "today");
        if (openRes.status !== "opened") {
          test.skip(true, `Could not open target channel '${targetChannelName}' to test unread skip behavior`);
        }
        const header = page.locator(WHATSAPP_LOCATORS.channelHeader.primary).first();
        await highlightElement(header, 200);
      });

      let unreadResult!: SearchAndOpenResult;
      await test.step(`2. Execute openFollowedChannel(page, '${targetChannelName}', 'unread') on active channel`, async () => {
        unreadResult = await openFollowedChannel(page, targetChannelName, "unread");
        await test.info().attach("channel-search-result", {
          body: JSON.stringify(unreadResult, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate already-open skip -> Expected: { status: 'skipped_no_unread', unreadCount: 0 } | Received: { status: '${unreadResult?.status}', unreadCount: ${unreadResult?.unreadCount} }`,
        async () => {
          expect(unreadResult, "openFollowedChannel must return a defined result object").toBeDefined();
          expect(
            unreadResult.status,
            `Active channel has 0 unread badge in viewport, expected 'skipped_no_unread', received '${unreadResult?.status}'`
          ).toBe("skipped_no_unread");
          expect(
            unreadResult.unreadCount,
            `Unread count for an open channel must be 0, received ${unreadResult?.unreadCount}`
          ).toBe(0);
        }
      );
    });

    test("Evaluates channel search result badge and returns valid result", async () => {
      const { page, isAuthenticated, targetChannelName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      let result!: SearchAndOpenResult;
      await test.step(`1. Execute openFollowedChannel(page, '${targetChannelName}', 'unread')`, async () => {
        result = await openFollowedChannel(page, targetChannelName, "unread");
        await test.info().attach("channel-search-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `2. Validate search result contract -> Expected: status in ['opened', 'skipped_no_unread', 'not_found'], unreadCount as number | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "openFollowedChannel must return a defined result object").toBeDefined();
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
