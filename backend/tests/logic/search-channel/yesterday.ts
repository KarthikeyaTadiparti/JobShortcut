import { test, expect } from "@playwright/test";
import { openFollowedChannel, type SearchAndOpenResult } from "../../../src/scraper/whatsapp_scraper.js";
import { WHATSAPP_LOCATORS, getCombinedSelector } from "../../../src/config/whatsapp_locators.js";
import { highlightElement } from "../../helpers/dom-highlighter.js";
import type { ChannelTestContext } from "./unread.js";

const NON_EXISTENT_CHANNEL = "NonExistentChannel_TestXYZ_99999";

/**
 * Registers individual testcases strictly related to 'yesterday' extraction scope on followed channels.
 */
export function registerChannelYesterdayTests(getContext: () => ChannelTestContext): void {
  test.describe("Channel Scope: Yesterday", () => {
    test("Returns 'not_found' when searching for non-existent channel with scope='yesterday'", async () => {
      const { page, isAuthenticated } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step("1. Spotlight channels search input", async () => {
        const searchInput = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelsSearchInput)).first();
        if ((await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false))) {
          await highlightElement(searchInput, 200);
        }
      });

      let result!: SearchAndOpenResult;
      await test.step(`2. Execute openFollowedChannel(page, '${NON_EXISTENT_CHANNEL}', 'yesterday')`, async () => {
        result = await openFollowedChannel(page, NON_EXISTENT_CHANNEL, "yesterday");
        await test.info().attach("channel-search-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate not_found outcome -> Expected: { status: 'not_found', unreadCount: 0 } | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "openFollowedChannel must return a defined result object").toBeDefined();
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

    test("Searches and opens target channel with scope='yesterday'", async () => {
      const { page, isAuthenticated, targetChannelName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      let result!: SearchAndOpenResult;
      await test.step(`1. Execute openFollowedChannel(page, '${targetChannelName}', 'yesterday')`, async () => {
        result = await openFollowedChannel(page, targetChannelName, "yesterday");
        await test.info().attach("channel-search-result", {
          body: JSON.stringify(result, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `2. Validate open outcome -> Expected: status in ['opened', 'not_found'] | Received: { status: '${result?.status}', unreadCount: ${result?.unreadCount} }`,
        async () => {
          expect(result, "openFollowedChannel must return a defined result object").toBeDefined();
          expect(
            ["opened", "not_found"],
            `Expected status 'opened' (or 'not_found' if absent), received '${result?.status}'`
          ).toContain(result.status);

          if (result.status === "opened") {
            const header = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelHeader)).first();
            await highlightElement(header, 300);
          }
        }
      );
    });

    test("Instantly returns 'opened' when channel is already open with scope='yesterday'", async () => {
      const { page, isAuthenticated, targetChannelName } = getContext();
      test.skip(!isAuthenticated, "Requires authenticated WhatsApp session");

      await test.step(`1. Ensure target channel '${targetChannelName}' is active in conversation view`, async () => {
        const prepRes = await openFollowedChannel(page, targetChannelName, "yesterday");
        if (prepRes.status !== "opened") {
          test.skip(true, `Target channel '${targetChannelName}' could not be opened to test already-open behavior`);
        }
      });

      let alreadyOpenResult!: SearchAndOpenResult;
      await test.step(`2. Execute openFollowedChannel(page, '${targetChannelName}', 'yesterday') on active channel`, async () => {
        alreadyOpenResult = await openFollowedChannel(page, targetChannelName, "yesterday");
        await test.info().attach("channel-search-result", {
          body: JSON.stringify(alreadyOpenResult, null, 2),
          contentType: "application/json",
        });
      });

      await test.step(
        `3. Validate already-open optimization -> Expected: { status: 'opened', unreadCount: 0 } | Received: { status: '${alreadyOpenResult?.status}', unreadCount: ${alreadyOpenResult?.unreadCount} }`,
        async () => {
          expect(
            alreadyOpenResult.status,
            `Expected already open channel to immediately return 'opened', received '${alreadyOpenResult?.status}'`
          ).toBe("opened");
          expect(
            alreadyOpenResult.unreadCount,
            `Already open channel unread count must be 0, received ${alreadyOpenResult?.unreadCount}`
          ).toBe(0);

          const headerTitle = page.locator(getCombinedSelector(WHATSAPP_LOCATORS.channelChatTitle)).first();
          if ((await headerTitle.count()) > 0 && (await headerTitle.isVisible().catch(() => false))) {
            await highlightElement(headerTitle, 300);
          }
        }
      );
    });
  });
}
